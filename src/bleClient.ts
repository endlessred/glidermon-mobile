import { BleManager, Device, State, Subscription, Characteristic } from "react-native-ble-plx";
// If you use base64 decode elsewhere:
import { decode as atob, encode as btoa } from "base-64";

const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const INGEST_CHAR  = "12345678-1234-5678-1234-56789abcdef1";
const STATS_CHAR   = "12345678-1234-5678-1234-56789abcdef2";

const manager = new BleManager();

async function waitForPoweredOn(timeoutMs = 8000): Promise<void> {
  const cur = await manager.state();
  if (cur === State.PoweredOn) return;

  await new Promise<void>((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const sub: Subscription = manager.onStateChange((s) => {
      if (s === State.PoweredOn) {
        if (timer) clearTimeout(timer);
        sub.remove();
        resolve();
      }
    }, true);

    timer = setTimeout(() => {
      sub.remove();
      reject(new Error("BLE state wait timeout"));
    }, timeoutMs);
  });
}

export async function findAndConnect(timeoutMs = 10000): Promise<Device> {
  await waitForPoweredOn();

  return new Promise<Device>((resolve, reject) => {
    const timer = setTimeout(() => {
      manager.stopDeviceScan();
      reject(new Error("Scan timeout"));
    }, timeoutMs);

    manager.startDeviceScan([SERVICE_UUID], { allowDuplicates: false }, async (error, dev) => {
      if (error) {
        clearTimeout(timer);
        manager.stopDeviceScan();
        reject(error);
        return;
      }
      if (dev && (dev.serviceUUIDs?.includes(SERVICE_UUID) || dev.name === "GliderMon")) {
        clearTimeout(timer);
        manager.stopDeviceScan();
        try {
          const connected = await dev.connect();
          await connected.discoverAllServicesAndCharacteristics();
          resolve(connected);
        } catch (e) { reject(e); }
      }
    });
  });
}

// pack/write helpers (unchanged)
function bytesToB64(bytes: number[]) {
  return btoa(String.fromCharCode(...bytes));
}
function pack8le(mgdl: number, trendCode: number, epochSec: number) {
  const b = new Uint8Array(8);
  b[0] = mgdl & 0xff; b[1] = (mgdl >> 8) & 0xff;
  b[2] = trendCode & 0xff;
  b[3] = epochSec & 0xff;
  b[4] = (epochSec >> 8) & 0xff;
  b[5] = (epochSec >> 16) & 0xff;
  b[6] = (epochSec >> 24) & 0xff;
  b[7] = 0;
  return bytesToB64(Array.from(b));
}

export async function writeReading(
  device: Device,
  mgdl: number,
  trendCode: TrendCode,
  epochSec: number
) {
  const payloadB64 = pack8le(mgdl, trendCode, epochSec);
  await device.writeCharacteristicWithoutResponseForService(SERVICE_UUID, INGEST_CHAR, payloadB64);
}

export async function readStats(device: Device): Promise<string | null> {
  try {
    const ch: Characteristic = await device.readCharacteristicForService(SERVICE_UUID, STATS_CHAR);
    return ch.value ? atob(ch.value) : null;
  } catch { return null; }
}

export type TrendCode = 0 | 1 | 2 | 3; // 0=down, 1=flat, 2=up, 3=unknown
export function mapDexTrendToCode(trend?: string | null): TrendCode {
  const t = (trend || "").toLowerCase();
  // covers: singleUp/doubleUp/fortyFiveUp, etc.
  if (t.includes("flat")) return 1;
  if (t.includes("up"))   return 2;
  if (t.includes("down")) return 0;
  return 3; // none, unknown, notComputable, rateOutOfRange
}