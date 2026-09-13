// ui/components/adventureBoard/boardStyles.ts
// A few local constants for the Daily Adventure Board interior. NOT a new
// design system -- it sits on handcrafted/tokens.ts. The Spine frame is
// already visually detailed, so the interior is deliberately calm.
import { INK, INK_MUTED, CREAM, FELT_GREEN, PALE_GREEN } from "../handcrafted/tokens";

export const BOARD_INK = INK;
export const BOARD_INK_MUTED = INK_MUTED;
export const BOARD_SURFACE = CREAM;
export const BOARD_GREEN = FELT_GREEN;
export const BOARD_GREEN_PALE = PALE_GREEN;
// Warm amber for a provisional "off track" state -- not an error red; the
// window is still open.
export const BOARD_AMBER = "#D99A4E";
// Low-contrast INK for the single interior divider / row rules -- reads as a
// paper crease, not a card outline. (RN borders take no opacity, so bake it.)
export const BOARD_HAIRLINE = "rgba(74,49,44,0.16)";

// Staggered check-in reveal: content index -> the revealStep it appears at.
export const REVEAL_PRIMARY = 1;
export const REVEAL_MINOR_1 = 2;
export const REVEAL_MINOR_2 = 3;
export const REVEAL_SUMMARY = 4;
export const REVEAL_DONE = REVEAL_SUMMARY;
