import React, { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { findAndConnect, writeReading, mapDexTrendToCode } from "./bleClient";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const DEX_DISCOVERY = {
  authorizationEndpoint: "https://sandbox-api.dexcom.com/v2/oauth2/login",
  tokenEndpoint:        "https://sandbox-api.dexcom.com/v2/oauth2/token"
};

// point this to your deployed backend
const BACKEND_BASE = "http://localhost:8787";
const CLIENT_ID = "Xn5y9VSU4kwDaBNK9PgB1UvRc1SEGkm3";

const useProxy = Platform.OS !== "web"; // OK in dev; for prod builds, you can set false and keep scheme below
const redirectUri = AuthSession.makeRedirectUri({
  scheme: "glidermon",   // for native
  path: "auth",
  preferLocalhost: true, // web dev: http://localhost rather than 127.0.0.1
});
console.log("Dexcom redirectUri =>", redirectUri);

const discovery = {
  authorizationEndpoint: "https://sandbox-api.dexcom.com/v2/oauth2/login",
  tokenEndpoint:        "https://sandbox-api.dexcom.com/v2/oauth2/token",
};

export default function DexcomEgvsScreen() {
  const [device, setDevice] = useState<any>(null);
  const [tokens, setTokens] = useState<any>(null);
  const [status, setStatus] = useState<string>("");

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

function dexFmtSeconds(d: Date) {
  const p=(n:number)=>String(n).padStart(2,"0");
  return `${d.getUTCFullYear()}-${p(d.getUTCMonth()+1)}-${p(d.getUTCDate())}T${p(d.getUTCHours())}:${p(d.getUTCMinutes())}:${p(d.getUTCSeconds())}`;
}

async function fetchLatestAndSend() {
  try {
    if (!tokens?.access_token) { setStatus("Not authorized yet."); return; }

    // 1) Ask Dexcom where EGVs actually exist
    const drRes = await fetch(`${BACKEND_BASE}/dexcom/data-range`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const dr = await drRes.json();

    // Prefer systemTime; fall back to displayTime
    const latestStr: string | undefined =
      dr?.egvs?.end?.systemTime || dr?.egvs?.end?.displayTime;
    if (!latestStr) { setStatus("No egvs end time in dataRange."); return; }

    // Parse and build robust windows: 30m, then 24h, then 10 days
    const latest = new Date(latestStr); // Dexcom accepts seconds-only; we'll trim below
    const windows = [30*60e3, 24*60*60e3, 10*24*60*60e3];

    let recs: any[] = [];
    for (const span of windows) {
      const start = new Date(latest.getTime() - span);
      const r = await fetch(`${BACKEND_BASE}/dexcom/egvs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          access_token: tokens.access_token,
          startDate: dexFmtSeconds(start),
          endDate:   dexFmtSeconds(latest),
        })
      });
      const data = await r.json();
      recs = data.records || [];
      if (recs.length) break;
    }

    if (!recs.length) {
      setStatus("No EGVs in last 10 days for this sandbox user. Try 'User7' in the sandbox login.");
      return;
    }

    const last = recs[recs.length - 1];
    const mgdl = Number(last.value);
    const trendCode = mapDexTrendToCode(last.trend);
    const epochSec = Math.floor(new Date(last.systemTime || last.displayTime).getTime()/1000);

    if (!device) { setStatus("BLE device not connected."); return; }
    await writeReading(device, mgdl, trendCode, epochSec);
    setStatus(`Sent mg/dL=${mgdl} trend=${trendCode} ts=${epochSec}`);
  } catch (e:any) {
    setStatus(`Send error: ${e.message}`);
  }
}

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

  useEffect(() => {
    (async () => {
      if (response?.type === "success" && response.params?.code) {
        setStatus("Exchanging code…");
const r = await fetch(`${BACKEND_BASE}/dexcom/token`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ code: response.params.code, redirectUri })
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
      }
    })();
  }, [response]);

  async function fetchAndSend() {
    try {
      if (!tokens?.access_token) { setStatus("Not authorized yet."); return; }
      const end = new Date();
      const start = new Date(end.getTime() - 10 * 60 * 1000);
      const qs = new URLSearchParams({ startDate: start.toISOString(), endDate: end.toISOString() });
      const r = await fetch(`${BACKEND_BASE}/dexcom/egvs`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    access_token: tokens.access_token,
    startDate: dexDate(start),
    endDate: dexDate(end)
  })
});
      const data = await r.json();
      if (!r.ok) { setStatus(`EGV error: ${JSON.stringify(data)}`); return; }
      const recs = data.records || [];
      if (!recs.length) { setStatus("No EGV records."); return; }
      const last = recs[recs.length - 1];
      const mgdl = Number(last.value);
      const trendCode = mapDexTrendToCode(last.trend);
      const epochSec = Math.floor(new Date(last.systemTime || last.displayTime).getTime() / 1000);
      if (!device) { setStatus("BLE device missing."); return; }
      await writeReading(device, mgdl, trendCode, epochSec);
      setStatus(`Sent mg/dL=${mgdl}, trend=${trendCode}, ts=${epochSec}`);
    } catch (e: any) {
      setStatus(`Send error: ${e.message}`);
    }
  }

  return (
    <View style={{ padding: 16, gap: 12 }}>
      <Text style={{ fontWeight: "600" }}>GliderMon — Dexcom → BLE</Text>
      <Text selectable>{status}</Text>
      <Button
  title="Authorize Dexcom"
  onPress={() => promptAsync()} // <-- no options here
  disabled={!request}
/>
      <Button title="Fetch latest EGV & Send" onPress={fetchLatestAndSend} />
      <Button title="Connect to GliderMon" onPress={async () => {
  try {
    const dev = await findAndConnect();
    setStatus(`Connected to ${dev.name || dev.id}`);
  } catch (e: any) {
    setStatus(`BLE: ${e.message}`);
  }
}} />
<Button title="Check Data Range" onPress={async () => {
  const r = await fetch(`${BACKEND_BASE}/dexcom/data-range`, {
    headers: { Authorization: `Bearer ${tokens?.access_token || ""}` }
  });
  const json = await r.json();
  setStatus(`dataRange: ${JSON.stringify(json)}`);
}}/>
    </View>
  );
}
