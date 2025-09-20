/// <reference types="web-bluetooth" />

const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const INGEST_CHAR  = "12345678-1234-5678-1234-56789abcdef1";
const STATS_CHAR   = "12345678-1234-5678-1234-56789abcdef2";

export type TrendCode = 0 | 1 | 2 | 3;

let gDevice:  BluetoothDevice | null = null;
let gServer:  BluetoothRemoteGATTServer | null = null;
let gService: BluetoothRemoteGATTService | null = null;
let gIngest:  BluetoothRemoteGATTCharacteristic | null = null;
let gStats:   BluetoothRemoteGATTCharacteristic | null = null;

const LS_KEY = "glidermonDeviceId";

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms));
function resetCache() { gServer = gService = gIngest = gStats = null; }

export function mapDexTrendToCode(trend?: string | null): TrendCode {
  const t = (trend || "").toLowerCase();
  if (t.includes("flat")) return 1;
  if (t.includes("up"))   return 2;
  if (t.includes("down")) return 0;
  return 3;
}

async function connectWithRetry(dev: BluetoothDevice, tries = 3): Promise<BluetoothRemoteGATTServer> {
  let lastErr: any;
  for (let i = 0; i < tries; i++) {
    try {
      // if already connected, reuse
      if (dev.gatt?.connected) return dev.gatt!;
      const server = await dev.gatt!.connect();
      return server;
    } catch (e) {
      lastErr = e;
      await sleep(300 + i * 200); // backoff
    }
  }
  throw lastErr ?? new Error("Failed to connect");
}

async function resumeKnownDevice(): Promise<void> {
  const nav = navigator as Navigator & { bluetooth: Bluetooth & { getDevices?: () => Promise<BluetoothDevice[]> } };
  const savedId = localStorage.getItem(LS_KEY);
  if (!nav.bluetooth || !nav.bluetooth.getDevices || !savedId) return;
  const devices = await nav.bluetooth.getDevices();
  const dev = devices.find(d => d.id === savedId);
  if (!dev) return;
  gDevice = dev;
  dev.addEventListener("gattserverdisconnected", () => resetCache());
}

async function ensureConnected(): Promise<void> {
  if (!gDevice) {
    await resumeKnownDevice();
    if (!gDevice) throw new Error("No device selected");
  }
  gServer = await connectWithRetry(gDevice);
}

async function ensureCharacteristics(): Promise<void> {
  await ensureConnected();
  if (!gServer) throw new Error("No GATT server");
  if (!gService) gService = await gServer.getPrimaryService(SERVICE_UUID);
  if (!gIngest)  gIngest  = await gService.getCharacteristic(INGEST_CHAR);
  if (!gStats)   gStats   = await gService.getCharacteristic(STATS_CHAR);
}

export async function findAndConnect(): Promise<BluetoothDevice> {
  const nav = navigator as Navigator & { bluetooth: Bluetooth };
  if (!nav.bluetooth) throw new Error("Web Bluetooth not supported");

  // Use name/namePrefix filter to avoid reliance on 128-bit UUIDs in the advert
  const device = await nav.bluetooth.requestDevice({
    filters: [{ name: "GliderMon" }, { namePrefix: "Glider" }],
    optionalServices: [SERVICE_UUID]
  });

  gDevice = device;
  localStorage.setItem(LS_KEY, device.id || "");
  device.addEventListener("gattserverdisconnected", () => resetCache());

  await ensureCharacteristics(); // connect + discover with retries
  return device;
}

function pack8(mgdl: number, trend: TrendCode, epochSec: number): Uint8Array {
  const buf = new ArrayBuffer(8);
  const dv = new DataView(buf);
  dv.setUint16(0, mgdl, true);
  dv.setUint8(2, trend);
  dv.setUint32(3, epochSec, true);
  dv.setUint8(7, 0);
  return new Uint8Array(buf);
}

export async function writeReading(
  _device: BluetoothDevice | null,
  mgdl: number,
  trendCode: TrendCode,
  epochSec: number
) {
  await ensureCharacteristics();
  const bytes = pack8(mgdl, trendCode, epochSec);
  const props = (gIngest as any).properties;
  if (props?.writeWithoutResponse && "writeValueWithoutResponse" in gIngest!) {
    // @ts-ignore
    await gIngest!.writeValueWithoutResponse(bytes);
  } else if ("writeValueWithResponse" in (gIngest as any)) {
    // @ts-ignore
    await (gIngest as any).writeValueWithResponse(bytes);
  } else {
    // @ts-ignore
    await (gIngest as any).writeValue(bytes);
  }
}

export async function readStats(): Promise<string | null> {
  await ensureCharacteristics();
  const dv = await gStats!.readValue();
  return new TextDecoder().decode(dv);
}

export function isBleReady() {
  return !!(gDevice && gServer?.connected && gIngest && gStats);
}

export async function disconnectBle(opts?: { forget?: boolean; waitMs?: number }) {
  const { forget = false, waitMs = 300 } = opts || {};
  try {
    if (gDevice?.gatt?.connected) {
      // Wait for the real disconnect event so the OS frees the link
      await new Promise<void>((resolve) => {
        const once = () => resolve();
        gDevice!.addEventListener("gattserverdisconnected", once, { once: true });
        try { gDevice!.gatt!.disconnect(); } catch { resolve(); }
        // Safety timeout in case the event never fires
        setTimeout(resolve, waitMs);
      });
    }
  } finally {
    resetCache();
  }
  if (forget) {
    try { localStorage.removeItem(LS_KEY); } catch {}
    // If available, also disconnect any remembered devices for this origin
    const nav = navigator as Navigator & { bluetooth: Bluetooth & { getDevices?: () => Promise<BluetoothDevice[]> } };
    if (nav.bluetooth.getDevices) {
      const list = await nav.bluetooth.getDevices();
      for (const d of list) {
        if ((gDevice && d.id === gDevice.id) || (d.name || "").includes("GliderMon")) {
          try { if (d.gatt?.connected) d.gatt.disconnect(); } catch {}
        }
      }
    }
    gDevice = null;
  }
}

export async function forceReconnect(): Promise<BluetoothDevice> {
  await disconnectBle({ /* keep permission */ forget: false });
  return findAndConnect(); // your existing requestDevice() + discover
}
