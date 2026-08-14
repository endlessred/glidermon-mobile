// stores/characterReactionStore.ts
//
// A decoupled trigger bus for one-shot Glidermon reaction animations (e.g.
// "goal completed" on the Home screen), mirroring acornFxStore's pattern:
// callers that have no ref to the 3D scene just fire-and-forget a named
// reaction here, and IsometricRoomView3D (which owns the SpineCharacterController)
// subscribes and plays it via the existing playReaction() API. No new
// animation infrastructure -- this only wires up access to what already exists.
import { create } from "zustand";

type CharacterReactionState = {
  reaction: string | null;
  nonce: number;
  triggerReaction: (name: string) => void;
};

export const useCharacterReactionStore = create<CharacterReactionState>((set) => ({
  reaction: null,
  nonce: 0,
  triggerReaction: (name) => set((s) => ({ reaction: name, nonce: s.nonce + 1 })),
}));
