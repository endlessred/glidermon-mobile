import React from "react";
import { CharacterName, EmotionType } from "../../data/types/conversation";
import SpineCharacterPortrait from "./SpineCharacterPortrait";

interface CharacterPortraitProps {
  character: CharacterName;
  emotion: EmotionType;
  isActive: boolean; // Whether this character is currently speaking
  size?: number;
  hideLabels?: boolean;
  simple?: boolean;
  onLoaded?: () => void;
  shouldFlip?: boolean;
}

export default function CharacterPortrait(props: CharacterPortraitProps) {
  // Forward all props to the new Spine-based portrait component
  return <SpineCharacterPortrait {...props} />;
}