// app/SkiaBootstrap.tsx
import React, { useEffect, useState } from "react";
import { Platform, View, Text } from "react-native";

export default function SkiaBootstrap({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(Platform.OS !== "web");

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const base =
      (globalThis as any).__SKIA_CANVASKIT_URL ||
      "https://unpkg.com/canvaskit-wasm@0.39.1/bin/full/";

    const loadScript = () =>
      new Promise<void>((resolve, reject) => {
        if ((window as any).CanvasKit || (window as any).CanvasKitInit) return resolve();

        const existing = document.getElementById("ck-script");
        if (existing) {
          existing.addEventListener("load", () => resolve());
          existing.addEventListener("error", (e) => reject(e));
          return;
        }

        const s = document.createElement("script");
        s.id = "ck-script";
        s.async = true;
        s.src = base + "canvaskit.js";
        s.onload = () => resolve();
        s.onerror = (e) => reject(e);
        document.head.appendChild(s);
      });

    const init = async () => {
      if ((window as any).CanvasKit) return;
      const initFn = (window as any).CanvasKitInit;
      if (typeof initFn !== "function") throw new Error("CanvasKitInit missing");
      const ck = await initFn({ locateFile: (f: string) => base + f });
      (window as any).CanvasKit = ck;
      (globalThis as any).CanvasKit = ck;
    };

    (async () => {
      try {
        await loadScript();
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
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#101418",
          pointerEvents: "auto", // moved here
        }}
      >
        <Text style={{ color: "#8aa1b1" }}>Loading renderer…</Text>
      </View>
    );
  }

  return <View style={{ flex: 1, pointerEvents: "box-none" }}>{children}</View>;
}
