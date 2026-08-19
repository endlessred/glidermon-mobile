---
name: test-on-device
description: Use after editing any UI components, screens, navigation, or anything that affects visible behavior on the app. Guides the physical iOS device testing workflow via Expo tunnel.
---

## Device Testing Protocol

Follow these steps exactly when testing is needed on the physical iOS device.

### Step 1 — Ask the user to restart the tunnel

Tell the user:
> "Please run `pnpm run iostunnel` in your terminal to restart the tunnel, then reload the app on your phone. Let me know once it's loaded."

Wait for confirmation before proceeding.

### Step 2 — Describe exactly what to test

Based on what was just changed, give the user a focused, numbered checklist of specific things to do and observe. Be concrete — not "check the UI" but "tap the Shop tab, confirm the hat thumbnail is centered, then tap a hat and verify the equip button shows the correct price."

Always include:
- The exact screen(s) to navigate to
- The specific action(s) to perform
- What a passing result looks like
- What a failing result looks like (if predictable)

### Step 3 — Ask for a report

After giving the checklist, ask:
> "Please report back: did each step pass or fail? If anything looked wrong, describe what you saw. If there were any red error overlays or console errors, paste them here."

### Step 4 — Interpret results

When the user reports back:
- **Red error overlay (RCTFatalException / invariant violation)**: likely a JS crash — read the stack trace for the component
- **White screen / blank canvas**: Skia/CanvasKit bootstrap likely failed — check the CanvasKit wait-gate
- **"Unable to resolve module"**: missing import or new file not picked up — ask user to fully quit and reopen the app
- **Tunnel disconnected / "Something went wrong"**: ask user to run `pnpm run iostunnel` again
- **Visual misalignment only**: note it as a follow-up, don't block current task
- **Passed**: confirm the change is working and move on
