Install: npm i then npx expo start

Set Dexcom app settings:

Redirect: use the URL Expo shows (dev) or your scheme glidermon://auth (prod) — must match in Dexcom portal.

Scope: offline_access

Set BACKEND_BASE + CLIENT_ID in the screen.

BLE: ensure Pi is advertising GliderMon service.