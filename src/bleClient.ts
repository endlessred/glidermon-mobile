import { BleManager, Device, Characteristic } from "react-native-ble-plx";

const SERVICE_UUID = "12345678-1234-5678-1234-56789abcdef0";
const INGEST_CHAR  = "12345678-1234-5678-1234-56789abcdef1";
const STATS_CHAR   = "12345678-1234-5678-1234-56789abcdef2";

const manager = new BleManager();

function b64(bytes: number[]) {
  const bin = String.fromCharCode(...bytes);
  // @ts-ignore
  return global.btoa(bin);
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
  return b64(Array.from(b));
}

export type TrendCode = 0 | 1 | 2 | 3; // 0=down,1=flat,2=up,3=unknown
export function mapDexTrendToCode(trend?: string | null): TrendCode {
  const t = (trend || "").toLowerCase();
  if (t.includes("flat")) return 1;
  if (t.includes("up")) return 2;
  if (t.includes("down")) return 0;
  return 3;
}

export async function findAndConnect(timeoutMs = 10000): Promise<Device> {
  return new Promise((resolve, reject) => {
    const sub = manager.onStateChange(async (s) => {
      if (s === "PoweredOn") {
        sub.remove();
        const scanSub = manager.startDeviceScan([SERVICE_UUID], {}, (err, dev) => {
          if (err) { scanSub.remove(); return reject(err); }
          if (dev && (dev.serviceUUIDs?.includes(SERVICE_UUID) || dev.name === "GliderMon")) {
            manager.stopDeviceScan();
            dev.connect()
              .then(d => d.discoverAllServicesAndCharacteristics())
              .then(resolve)
              .catch(reject);
          }
        });
        setTimeout(() => { manager.stopDeviceScan(); reject(new Error("Scan timeout")); }, timeoutMs);
      }
    }, true);
  });
}

export async function writeReading(device: Device, mgdl: number, trendCode: TrendCode, epochSec: number) {
  const val = pack8le(mgdl, trendCode, epochSec);
  await device.writeCharacteristicWithoutResponseForService(SERVICE_UUID, INGEST_CHAR, val);
}

export async function readStats(device: Device): Promise<string | null> {
  try {
    const ch: Characteristic = await device.readCharacteristicForService(SERVICE_UUID, STATS_CHAR);
    // @ts-ignore
    return ch.value ? global.atob(ch.value) : null;
  } catch { return null; }
}
