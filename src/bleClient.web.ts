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

function resetCache() {
  gServer = null; gService = null; gIngest = null; gStats = null;
}

export function mapDexTrendToCode(trend?: string | null): TrendCode {
  const t = (trend || "").toLowerCase();
  if (t.includes("flat")) return 1;
  if (t.includes("up"))   return 2;
  if (t.includes("down")) return 0;
  return 3;
}

async function ensureConnected(): Promise<void> {
  if (!gDevice) throw new Error("No device chosen");
  const gatt = gDevice.gatt!;
  if (!gatt.connected) {
    gServer = await gatt.connect();
  } else {
    gServer = gatt;
  }
}

async function ensureCharacteristics(): Promise<void> {
  await ensureConnected();
  if (!gServer) throw new Error("No GATT server");
  // If we lost handles (after a disconnect), reacquire them
  if (!gService) gService = await gServer.getPrimaryService(SERVICE_UUID);
  if (!gIngest)  gIngest  = await gService.getCharacteristic(INGEST_CHAR);
  if (!gStats)   gStats   = await gService.getCharacteristic(STATS_CHAR);
}

export async function findAndConnect(): Promise<BluetoothDevice> {
  const nav = navigator as Navigator & { bluetooth: Bluetooth };
  if (!nav.bluetooth) throw new Error("Web Bluetooth not supported in this browser");

  // Must be called from a user gesture (button click)
  const device = await nav.bluetooth.requestDevice({
    filters: [{ services: [SERVICE_UUID] }],
    optionalServices: [SERVICE_UUID],
  });

  // Cache + listen for disconnects
  gDevice = device;
  device.addEventListener("gattserverdisconnected", () => {
    resetCache();
    // (Optional) you can auto-reconnect here, but it's nicer to require a user tap
  });

  await ensureCharacteristics();
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
  await ensureCharacteristics(); // <— recheck/restore connection before every write
  if (!gIngest) throw new Error("Ingest characteristic unavailable");
  const bytes = pack8(mgdl, trendCode, epochSec);

  const props = (gIngest as any).properties;
  if (props?.writeWithoutResponse && "writeValueWithoutResponse" in gIngest) {
    // @ts-ignore
    await gIngest.writeValueWithoutResponse(bytes);
  } else if ("writeValueWithResponse" in (gIngest as any)) {
    // @ts-ignore
    await (gIngest as any).writeValueWithResponse(bytes);
  } else {
    // @ts-ignore
    await (gIngest as any).writeValue(bytes);
  }
}

export async function readStats(): Promise<string | null> {
  await ensureCharacteristics(); // <— recheck/restore
  if (!gStats) return null;
  const dv = await gStats.readValue();
  return new TextDecoder().decode(dv);
}
