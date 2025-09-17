// DexcomEgvsScreen.tsx
import React, { useEffect, useRef, useState } from "react";
import { Button, Text, View, Switch } from "react-native";
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
import { useGameStore } from "../stores/gameStore";
import { Platform } from "react-native";



WebBrowser.maybeCompleteAuthSession();

const BACKEND_BASE = "http://localhost:8787";
const CLIENT_ID = "Xn5y9VSU4kwDaBNK9PgB1UvRc1SEGkm3";

const REDIRECT_WEB    = "http://localhost:8081/auth"; // dev web
const REDIRECT_NATIVE = "glidermon://auth";           // native scheme

const redirectUri = Platform.select({ web: REDIRECT_WEB, default: REDIRECT_NATIVE });
const discovery = {
  authorizationEndpoint: "https://sandbox-api.dexcom.com/v2/oauth2/login",
  tokenEndpoint: "https://sandbox-api.dexcom.com/v2/oauth2/token",
};

const POLL_MS_MIN = 60_000;
const POLL_MS_BACKOFF = 120_000;

// ---- helpers ----
function mapDexTrendToCode(trend?: string): TrendCode {
  const t = (trend || "").toLowerCase();
  if (t.includes("up") || t.includes("rising")) return 2 as TrendCode;
  if (t.includes("down") || t.includes("falling")) return 0 as TrendCode;
  if (t.includes("flat") || t.includes("steady")) return 1 as TrendCode;
  if (t.includes("notcomputable") || t.includes("rateoutofrange")) return 3 as TrendCode;
  return 3 as TrendCode;
}
function dexFmt(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(
    d.getUTCMinutes()
  )}:${p(d.getUTCSeconds())}`;
}
// Narrow the AuthSession result safely
function getAuthCode(r: AuthSession.AuthSessionResult | null): string | null {
  if (!r || r.type !== "success") return null;
  const anyR = r as any;
  const code = anyR?.params?.code;
  return typeof code === "string" ? code : null;
}

export default function DexcomEgvsScreen() {
  const [device, setDevice] = useState<any>(null);
  const [tokens, setTokens] = useState<any>(null);
  const [status, setStatus] = useState<string>("");
  const [autoSend, setAutoSend] = useState(false);

  // NEW: whether we attempt BLE writes (optional)
  const [sendToDevice, setSendToDevice] = useState(false);

  const lastSentIsoRef = useRef<string | null>(null);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

  useEffect(() => {
  console.log("Dexcom OAuth →", { clientId: CLIENT_ID, redirectUri });
}, []);

  // NOTE: removed "connect on mount" behavior. BLE is optional.

  // tokens → try to read BLE stats (optional, ignore errors)
  useEffect(() => {
    if (!tokens) return;
    (async () => {
      try {
        const s = await readStats();
        if (s) setStatus(`BLE stats: ${typeof s === "string" ? s : JSON.stringify(s)}`);
      } catch {
        /* it's fine if not connected */
      }
    })();
  }, [tokens]);

  // Handle OAuth response → exchange code
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

  // NEW: safe BLE write that no-ops if not connected or fails
  async function safeWriteToDevice(mgdl: number, trendCode: TrendCode, epochSec: number) {
    if (!sendToDevice) return; // user disabled device writes
    try {
      // optional: a cheap ping to ensure connection (ignore result)
      try { await readStats(); } catch {}
      await writeReading(null, mgdl, trendCode, epochSec);
    } catch {
      // swallow — app-side still updates
    }
  }

  // --- fetch latest and update app (BLE optional) ---
  async function fetchLatestAndSend(): Promise<boolean> {
    if (!tokens?.access_token) { setStatus("Not authorized."); return false; }
    try {
      // 1) dataRange to anchor latest time
      const drRes = await fetch(`${BACKEND_BASE}/dexcom/data-range`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const dr = await drRes.json();
      const endIso: string | undefined = dr?.egvs?.end?.systemTime || dr?.egvs?.end?.displayTime;
      if (!endIso) { setStatus("No egvs end time in dataRange."); return false; }

      // 2) query windows until we get records
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

      // newest record
      const ts = (r: any) => new Date(r.systemTime || r.displayTime).getTime();
      const newest = records.reduce((a, b) => (ts(b) > ts(a) ? b : a), records[0]);
      const iso: string = newest.systemTime || newest.displayTime;

      if (lastSentIsoRef.current === iso) {
        setStatus("No new EGV yet.");
        return false;
      }

      const mgdl = Number(newest.value);
      const trendCode: TrendCode = mapDexTrendToCode(newest.trend);
      const epochSec = Math.floor(new Date(iso).getTime() / 1000);

      // A) update the phone-side game (always)
      onEgvs(mgdl, trendCode, epochSec);

      // B) attempt BLE write (optional, no-op on failure)
      await safeWriteToDevice(mgdl, trendCode, epochSec);

      lastSentIsoRef.current = iso;
      setStatus(`App updated mg/dL=${mgdl} trend=${trendCode} ts=${epochSec}${sendToDevice ? " • (device attempted)" : ""}`);
      return true;
    } catch (e: any) {
      setStatus(`EGV fetch failed: ${e.message}`);
      return false;
    }
  }

  // fetch a window and feed the app (no BLE required)
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
    recs.sort((a: any, b: any) =>
      new Date(a.systemTime || a.displayTime).getTime() -
      new Date(b.systemTime || b.displayTime).getTime()
    );
    return recs;
  }

  // NEW: seed the app only; BLE write optional
  async function seedAppHistory(minutes = 75) {
    if (!tokens?.access_token) { setStatus("Not authorized."); return; }
    const recs = await fetchEgvsWindow(tokens.access_token, minutes);
    if (!recs.length) { setStatus("No EGVs to seed."); return; }
    for (const r of recs) {
      const iso = r.systemTime || r.displayTime;
      const epochSec = Math.floor(new Date(iso).getTime() / 1000);
      const mgdl = Number(r.value);
      const trendCode = mapDexTrendToCode(r.trend);
      onEgvs(mgdl, trendCode, epochSec);          // always update app
      await safeWriteToDevice(mgdl, trendCode, epochSec); // optional device write
      await new Promise(res => setTimeout(res, 10));
    }
    setStatus(`Seeded ${recs.length} readings to app${sendToDevice ? " (+device)" : ""}.`);
  }

  // Auto-send loop (works with or without BLE)
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

    tick();
    return () => {
      if (autoTimerRef.current) {
        clearInterval(autoTimerRef.current);
        autoTimerRef.current = null;
      }
    };
  }, [autoSend, tokens, sendToDevice]); // re-evaluate if toggle changes

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontWeight: "600" }}>GliderMon — Dexcom → App (BLE optional)</Text>
      <Text selectable>{status}</Text>

      {/* BLE write toggle */}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <Switch value={sendToDevice} onValueChange={setSendToDevice} />
        <Text>Also send to device HUD (BLE)</Text>
      </View>

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

      <Button title="Fetch latest EGV & Update App" onPress={fetchLatestAndSend} />

      {/* BLE controls (manual, optional) */}
      <Button
        title="Connect / Reconnect (BLE)"
        onPress={async () => {
          try {
            const dev = device ? await forceReconnect() : await findAndConnect();
            setDevice(dev);
            setStatus(`Connected to ${dev?.name || dev?.id || "GliderMon"}`);
          } catch (e: any) {
            setStatus(`BLE: ${e.message}`);
          }
        }}
      />
      <Button
        title="Read BLE Stats"
        onPress={async () => {
          try { const s = await readStats(); setStatus(`BLE stats: ${JSON.stringify(s)}`); }
          catch (e: any) { setStatus(`BLE: ${e.message}`); }
        }}
      />
      <Button
        title="Disconnect (BLE)"
        onPress={async () => { await disconnectBle({ forget: false }); setDevice(null); setStatus("BLE disconnected"); }}
      />

      {/* App history seeding (no BLE required) */}
      <Button
        title="Seed 75m History (App; +Device if enabled)"
        onPress={() => seedAppHistory(75)}
      />
    </View>
  );
}
