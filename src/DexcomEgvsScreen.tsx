import React, { useEffect, useState } from "react";
import { Button, Text, View } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import { findAndConnect, writeReading, mapDexTrendToCode } from "./bleClient";

WebBrowser.maybeCompleteAuthSession();

const DEX_DISCOVERY = {
  authorizationEndpoint: "https://sandbox-api.dexcom.com/v2/oauth2/login",
  tokenEndpoint:        "https://sandbox-api.dexcom.com/v2/oauth2/token"
};

// point this to your deployed backend
const BACKEND_BASE = "https://YOUR-BACKEND-HOST";
const CLIENT_ID = "YOUR-DEXCOM-CLIENT-ID";

const useProxy = true; // OK in dev; for prod builds, you can set false and keep scheme below
const redirectUri = AuthSession.makeRedirectUri({ useProxy, scheme: "glidermon" });

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
      usePKCE: true
    },
    DEX_DISCOVERY
  );

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
        setStatus("Exchanging auth code…");
        const r = await fetch(`${BACKEND_BASE}/dexcom/token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: response.params.code, redirectUri })
        });
        const json = await r.json();
        if (!r.ok) { setStatus(`Token error: ${JSON.stringify(json)}`); return; }
        setTokens(json);
        setStatus("Authorized with Dexcom.");
      }
    })();
  }, [response]);

  async function fetchAndSend() {
    try {
      if (!tokens?.access_token) { setStatus("Not authorized yet."); return; }
      const end = new Date();
      const start = new Date(end.getTime() - 10 * 60 * 1000);
      const qs = new URLSearchParams({ startDate: start.toISOString(), endDate: end.toISOString() });
      const r = await fetch(`https://sandbox-api.dexcom.com/v3/users/self/egvs?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` }
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
      <Button title="Authorize Dexcom" onPress={() => promptAsync({ useProxy })} disabled={!request} />
      <Button title="Fetch latest EGV & Send" onPress={fetchAndSend} />
    </View>
  );
}
