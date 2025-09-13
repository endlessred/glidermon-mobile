// DexcomEgvsScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import { Button, Text, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import {
  findAndConnect,
  readStats,
  writeReading,
  disconnectBle,
  forceReconnect,
} from "./bleClient";
import type { TrendCode } from "./bleClient";

// ⬇️ Game store (wraps the pure TS engine)
import { useGameStore } from "../stores/gameStore";

WebBrowser.maybeCompleteAuthSession();

// ---- Config ----
const BACKEND_BASE = "http://localhost:8787"; // your backend
const CLIENT_ID = "Xn5y9VSU4kwDaBNK9PgB1UvRc1SEGkm3"; // Dexcom sandbox client

const redirectUri = AuthSession.makeRedirectUri({
  scheme: "glidermon",
  path: "auth",
  preferLocalhost: true,
});

const discovery = {
  authorizationEndpoint: "https://sandbox-api.dexcom.com/v2/oauth2/login",
  tokenEndpoint: "https://sandbox-api.dexcom.com/v2/oauth2/token",
};

// Auto-send cadence
const POLL_MS_MIN = 60_000;      // 1 minute
const POLL_MS_BACKOFF = 120_000; // 2 minutes if nothing new

// ---- Trend mapper (0=down, 1=flat, 2=up, 3=unknown) ----
function mapDexTrendToCode(trend?: string): TrendCode {
  const t = (trend || "").toLowerCase();
  if (t.includes("up") || t.includes("rising")) return 2 as TrendCode;        // singleUp/doubleUp/fortyFiveUp/risingQuickly
  if (t.includes("down") || t.includes("falling")) return 0 as TrendCode;     // singleDown/doubleDown/fortyFiveDown/fallingQuickly
  if (t.includes("flat") || t.includes("steady")) return 1 as TrendCode;      // flat/steady
  if (t.includes("notcomputable") || t.includes("rateoutofrange")) return 3 as TrendCode;
  return 3 as TrendCode;
}

// Narrow the AuthSession result safely to get a code
function getAuthCode(r: AuthSession.AuthSessionResult | null): string | null {
  if (!r || r.type !== "success") return null;
  const anyR = r as any;
  const params = anyR?.params;
  const code = params?.code;
  return typeof code === "string" ? code : null;
}

// --- helpers (Dexcom time formatting) ---
function dexFmt(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

export default function DexcomEgvsScreen() {
  const [device, setDevice] = useState<any>(null);
  const [tokens, setTokens] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [autoSend, setAutoSend] = useState(false);

  const lastSentIsoRef = useRef<string | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // grab the game feed function (no re-render needed on each call)
  const onEgvs = useGameStore.getState().onEgvs;

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: CLIENT_ID,
      redirectUri,
      scopes: ["offline_access"],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
    },
    discovery
  );

  useEffect(() => {
    console.log("Dexcom redirectUri =>", redirectUri);
  }, []);

  // Connect to GliderMon once on mount
  useEffect(() => {
    (async () => {
      try {
        setStatus("Scanning for GliderMon…");
        const dev = await findAndConnect();
        setDevice(dev);
        setStatus(`Connected to ${dev.name || dev.id}`);
      } catch (e: any) {
        setStatus(`BLE: ${e.message}`);
      }
    })();
  }, []);

  // When tokens arrive, try to silently resume BLE
  useEffect(() => {
    if (!tokens) return;
    (async () => {
      try {
        const s = await readStats();
        if (s) setStatus(`Reconnected. Stats: ${s}`);
      } catch {
        /* user can tap Connect/Reconnect if needed */
      }
    })();
  }, [tokens]);

  // Handle OAuth response → exchange code for tokens
  useEffect(() => {
    (async () => {
      const code = getAuthCode(response);
      if (!code) return;
      try {
        setStatus("Exchanging code…");
        const r = await fetch(`${BACKEND_BASE}/dexcom/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, redirectUri }),
        });
        const text = await r.text();
        let json: any;
        try { json = JSON.parse(text); }
        catch {
          console.error("Non-JSON from token endpoint:", text);
          setStatus(`Token error: non-JSON (${r.status} ${r.statusText})`);
          return;
        }
        if (!r.ok) { setStatus(`Token error: ${JSON.stringify(json)}`); return; }
        setTokens(json);
        setStatus("Authorized.");
      } catch (e: any) {
        setStatus(`Token exchange failed: ${e.message}`);
      }
    })();
  }, [response]);

  // --- data range + latest EGV fetcher ---
  async function fetchLatestAndSend(): Promise<boolean> {
    if (!tokens?.access_token) { setStatus("Not authorized."); return false; }
    try {
      // 1) Anchor with Dexcom dataRange
      const drRes = await fetch(`${BACKEND_BASE}/dexcom/data-range`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const dr = await drRes.json();
      const endIso: string | undefined =
        dr?.egvs?.end?.systemTime || dr?.egvs?.end?.displayTime;
      if (!endIso) { setStatus("No egvs end time in dataRange."); return false; }

      // 2) Ask for 30m → 24h → 10d until we get records
      const latest = new Date(endIso);
      let records: any[] = [];
      for (const spanMs of [30 * 60_000, 24 * 60 * 60_000, 10 * 24 * 60 * 60_000]) {
        const start = new Date(latest.getTime() - spanMs);
        const r = await fetch(`${BACKEND_BASE}/dexcom/egvs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            access_token: tokens.access_token,
            startDate: dexFmt(start),
            endDate: dexFmt(latest),
          }),
        });
        const j = await r.json();
        records = j.records || [];
        if (records.length) break;
      }
      if (!records.length) { setStatus("No EGVs in selected window."); return false; }

      // Pick the newest by timestamp (don’t trust order)
      const ts = (r: any) => new Date(r.systemTime || r.displayTime).getTime();
      const newest = records.reduce((a, b) => (ts(b) > ts(a) ? b : a), records[0]);
      const iso: string = newest.systemTime || newest.displayTime;

      if (lastSentIsoRef.current === iso) {
        setStatus("No new EGV yet.");
        return false;
      }

      // 3) Ensure BLE is connected, then write
      try { await readStats(); } catch {}
      const mgdl = Number(newest.value);
      const trendCode: TrendCode = mapDexTrendToCode(newest.trend);
      const epochSec = Math.floor(new Date(iso).getTime() / 1000);

      // Send to device HUD
      await writeReading(null, mgdl, trendCode, epochSec);

      // Feed the phone-side game
      onEgvs(mgdl, trendCode, epochSec);

      lastSentIsoRef.current = iso;
      setStatus(`Sent mg/dL=${mgdl} trend=${trendCode} ts=${epochSec}`);
      return true;
    } catch (e: any) {
      setStatus(`EGV fetch/send failed: ${e.message}`);
      return false;
    }
  }

  // ---- utilities for seeding history & windows ----
  // fetch a window of EGVs and return ascending by time
  async function fetchEgvsWindow(access_token: string, minutes = 75) {
    const end = new Date();
    const start = new Date(end.getTime() - minutes * 60_000);
    const r = await fetch(`${BACKEND_BASE}/dexcom/egvs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token,
        startDate: dexFmt(start),
        endDate:   dexFmt(end),
      }),
    });
    const j = await r.json();
    const recs = (j.records || []).slice();
    // Dexcom responses are often newest-first; we want oldest-first to play nicely with history
    recs.sort((a: any, b: any) =>
      new Date(a.systemTime || a.displayTime).getTime() -
      new Date(b.systemTime || b.displayTime).getTime()
    );
    return recs;
  }

  // send a burst to seed history on the Pi and the phone game
  async function seedHistoryOnConnect(access_token: string) {
    const recs = await fetchEgvsWindow(access_token, 75);
    if (!recs.length) return 0;

    for (const r of recs) {
      const iso = r.systemTime || r.displayTime;
      const epochSec = Math.floor(new Date(iso).getTime() / 1000);
      const mgdl = Number(r.value);
      const trendCode = mapDexTrendToCode(r.trend); // 0/1/2/3

      // write using the same packet
      await writeReading(null, mgdl, trendCode, epochSec);

      // feed the game engine too
      onEgvs(mgdl, trendCode, epochSec);

      // tiny pacing so Web Bluetooth/BlueZ don’t choke on rapid writes
      await new Promise(res => setTimeout(res, 20));
    }
    return recs.length;
  }

  // Auto-send loop (1m; back off to 2m if nothing new)
  useEffect(() => {
    if (!autoSend || !tokens) return;
    let running = false;
    let intervalMs = POLL_MS_MIN;

    const tick = async () => {
      if (running) return;
      running = true;
      try {
        const sent = await fetchLatestAndSend();
        intervalMs = sent ? POLL_MS_MIN : POLL_MS_BACKOFF;
      } finally {
        running = false;
        if (autoTimerRef.current) clearInterval(autoTimerRef.current);
        autoTimerRef.current = setInterval(tick, intervalMs);
      }
    };

    // start now, then on interval
    tick();

    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [autoSend, tokens]);

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontWeight: "600" }}>GliderMon — Dexcom → BLE → Game</Text>
      <Text selectable>{status}</Text>

      <Button
        title="Authorize Dexcom"
        onPress={async () => {
          try { await disconnectBle({ forget: false }); } catch {}
          await promptAsync();
        }}
      />

      <Button
        title={autoSend ? "Stop Auto-Send" : "Start Auto-Send (1m)"}
        onPress={() => setAutoSend(v => !v)}
      />

      <Button title="Fetch latest EGV & Send (manual)" onPress={fetchLatestAndSend} />

      <Button
        title="Connect / Reconnect"
        onPress={async () => {
          try {
            const dev = await forceReconnect();
            setDevice(dev);
            setStatus(`Connected to ${dev.name || dev.id}`);
          } catch (e: any) {
            setStatus(`BLE: ${e.message}`);
          }
        }}
      />

      <Button
        title="Seed 75m History (device + game)"
        onPress={async () => {
          if (!tokens?.access_token) { setStatus("Not authorized."); return; }
          const n = await seedHistoryOnConnect(tokens.access_token);
          setStatus(`Seeded ${n} readings.`);
        }}
      />

      <Button
        title="Check Data Range"
        onPress={async () => {
          const r = await fetch(`${BACKEND_BASE}/dexcom/data-range`, {
            headers: { Authorization: `Bearer ${tokens?.access_token || ""}` },
          });
          const json = await r.json();
          setStatus(`dataRange: ${JSON.stringify(json)}`);
        }}
      />

      <Button
        title="Force Disconnect"
        onPress={async () => {
          await disconnectBle({ forget: false });
          setStatus("BLE disconnected");
        }}
      />
    </View>
  );
}
