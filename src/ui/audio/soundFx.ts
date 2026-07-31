// ui/audio/soundFx.ts
import { createAudioPlayer, type AudioPlayer } from "expo-audio";

// Placeholder blip — swap this file for a real collection sound whenever one is available.
const ACORN_COLLECT_SOUND = require("../../assets/sfx/acorn-collect.wav");

let acornPlayer: AudioPlayer | null = null;

function getAcornPlayer(): AudioPlayer {
  if (!acornPlayer) {
    acornPlayer = createAudioPlayer(ACORN_COLLECT_SOUND);
  }
  return acornPlayer;
}

export function playAcornCollectSound() {
  try {
    const player = getAcornPlayer();
    player.volume = 0.6;
    player.seekTo(0);
    player.play();
  } catch (e) {
    console.warn("[soundFx] failed to play acorn collect sound:", e);
  }
}
