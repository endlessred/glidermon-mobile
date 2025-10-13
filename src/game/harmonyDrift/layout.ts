// src/game/harmonyDrift/layout.ts
import { HarmonySlot } from "./types";

export const HARMONY_SLOTS: HarmonySlot[] = [
  { id: "A1", row: "A", col: 1, neighbors: ["A2", "B1", "B2"] },
  { id: "A2", row: "A", col: 2, neighbors: ["A1", "A3", "B2", "B3"] },
  { id: "A3", row: "A", col: 3, neighbors: ["A2", "A4", "B3", "B4"] },
  { id: "A4", row: "A", col: 4, neighbors: ["A3", "B4", "B5"] },

  { id: "B1", row: "B", col: 1, neighbors: ["B2", "A1", "C1", "C2"] },
  { id: "B2", row: "B", col: 2, neighbors: ["B1", "B3", "A1", "A2", "C1", "C2"] },
  { id: "B3", row: "B", col: 3, neighbors: ["B2", "B4", "A2", "A3", "C2", "C3"] },
  { id: "B4", row: "B", col: 4, neighbors: ["B3", "B5", "A3", "A4", "C3", "C4"] },
  { id: "B5", row: "B", col: 5, neighbors: ["B4", "A4", "C4"] },

  { id: "C1", row: "C", col: 1, neighbors: ["C2", "B1", "B2"] },
  { id: "C2", row: "C", col: 2, neighbors: ["C1", "C3", "B1", "B2", "B3"] },
  { id: "C3", row: "C", col: 3, neighbors: ["C2", "C4", "B2", "B3", "B4"] },
  { id: "C4", row: "C", col: 4, neighbors: ["C3", "B3", "B4", "B5"] },
];

export const HARMONY_SLOT_MAP = HARMONY_SLOTS.reduce<Record<string, HarmonySlot>>((map, slot) => {
  map[slot.id] = slot;
  return map;
}, {});

export const ROW_INDEX: Record<"A" | "B" | "C", number> = { A: 0, B: 1, C: 2 };

export const SLOT_IDS = HARMONY_SLOTS.map((slot) => slot.id);

export const isValidSlotId = (slotId: string): slotId is typeof SLOT_IDS[number] => {
  return Boolean(HARMONY_SLOT_MAP[slotId]);
};

export const findSlotByOffset = (
  sourceId: string,
  rowOffset: number,
  colOffset: number
): string | undefined => {
  const origin = HARMONY_SLOT_MAP[sourceId];
  if (!origin) return undefined;
  const targetRowIndex = ROW_INDEX[origin.row] + rowOffset;
  const rows: ("A" | "B" | "C")[] = ["A", "B", "C"];
  const targetRow = rows[targetRowIndex];
  if (!targetRow) return undefined;

  const targetCol = origin.col + colOffset;
  const candidate = `${targetRow}${targetCol}`;
  return isValidSlotId(candidate) ? candidate : undefined;
};
