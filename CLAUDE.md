We use pnpm instead of npm, and cannot access npx directly. Please see the package.json for commands

The app runs through `pnpm run iostunnel` - if you need to reload or see logs, ask the user to do so.

full MVP goal features are listed at docs/MVP-PLAN.md

## Android emulator workflow

An Android emulator (AVD `Pixel_8`) is available and driven directly via `adb` — unlike the iOS/iostunnel flow above, you can reload, inspect logs, and screenshot it yourself without asking the user.

If `adb`/`emulator` aren't on PATH in a given shell (fresh Claude Code shells sometimes don't pick up the user env vars yet), export them for that shell:
```
ANDROID_HOME=C:\Users\watch\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Android\Android Studio\jbr
PATH=$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:$PATH
```

After each meaningful UI change:
1. Confirm the emulator is connected: `adb devices`.
2. Don't start another Metro server if one is already running (check `curl -s localhost:8081/status`, or look for an existing `pnpm run android` process) — reuse it. If none is running, start one in the background redirecting output to a log file: `pnpm run android > .logs/expo.log 2>&1 &`.
3. Wait for Fast Refresh to finish — Metro rebundles automatically on save; a manual reload is only needed after native/dependency changes (rerun `pnpm run android`).
4. Check `.logs/expo.log` for Metro bundling or JS runtime errors.
5. If the issue could be native (crashes, native module errors, GL/shader errors), check Android logs too, e.g. `adb logcat -d | grep -iE "AndroidRuntime|FATAL EXCEPTION|ReactNativeJS"`, narrowed to the area being debugged.
6. Take a screenshot: `adb exec-out screencap -p > .logs/current-screen.png`.
7. Inspect the screenshot (Read tool) to confirm the UI looks right.
8. Where practical, exercise the changed flow first before screenshotting. Prefer finding real tap targets over guessing coordinates:
   - Dump the native view hierarchy: `adb shell uiautomator dump /sdcard/window_dump.xml && adb pull /sdcard/window_dump.xml .logs/window_dump.xml`.
   - Find the element by its `text`, `resource-id`, or `content-desc` (the latter is populated by `testID`/`accessibilityLabel` props), read its `bounds="[x1,y1][x2,y2]"`, and tap the center: `adb shell input tap <(x1+x2)/2> <(y1+y2)/2>`.
   - This only sees native RN views, not anything drawn on the Skia/Three.js canvas (the Spine character, room scene). For canvas content, fall back to `adb shell input tap/swipe/keyevent/text` with coordinates read off a screenshot.
   - If a target element has no `text`/`resource-id`/`content-desc` to key off, that's worth flagging — adding a `testID` there makes it automatable going forward.
9. Before calling the task done, run `pnpm exec tsc --noEmit` and `pnpm run lint`.

Do not clear app data (`adb shell pm clear com.kevin.glidermon`) unless the task specifically calls for testing first-run/fresh-install state.