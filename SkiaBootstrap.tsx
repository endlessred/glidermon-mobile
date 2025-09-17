// SkiaBootstrap.tsx
import React, { useEffect, useState } from "react";
import { Platform, View, Text } from "react-native";

export default function SkiaBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const base =
      (globalThis as any).__SKIA_CANVASKIT_URL ||
      // use your local static path if you prefer:
      // "/web/static/js/"
      "https://unpkg.com/canvaskit-wasm@0.39.1/bin/full/";

    const loadScript = () =>
      new Promise<void>((resolve, reject) => {
        if ((window as any).CanvasKitInit) return resolve();
        const s = document.createElement("script");
        s.id = "ck-script";
        s.async = true;
        s.src = base + "canvaskit.js";
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      });

    const init = async () => {
      const initFn = (window as any).CanvasKitInit;
      if (typeof initFn !== "function") throw new Error("CanvasKitInit missing");
      const ck = await initFn({ locateFile: (f: string) => base + f });
      // expose to both globals we actually need
      (globalThis as any).CanvasKit = ck;
      (window as any).CanvasKit = ck;
      console.log("[SkiaBootstrap] CanvasKit fully ready");
    };

    (async () => {
      try {
        console.log("[SkiaBootstrap] loading canvaskit.js");
        await loadScript();
        console.log("[SkiaBootstrap] initializing CanvasKit");
        await init();
        setReady(true);
      } catch (e) {
        console.error("CanvasKit bootstrap failed:", e);
        setReady(false);
      }
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#101418" }}>
        <Text style={{ color: "#8aa1b1" }}>Loading renderer…</Text>
      </View>
    );
  }

  return <>{children}</>;
}
