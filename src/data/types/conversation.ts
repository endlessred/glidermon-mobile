export type CharacterName = "Luma" | "Sable";

export type EmotionType = "Neutral" | "Angry" | "Fearful" | "Happy" | "Sad" | "Disgusted";

export interface ConversationLine {
  character: CharacterName;
  emotion: EmotionType;
  text: string;
  duration: number; // in milliseconds
}

export interface AmbientConversation {
  id: string;
  title: string;
  context: string; // e.g., "ShadedShop"
  lines: ConversationLine[];
}

export interface ConversationData {
  conversations: AmbientConversation[];
}