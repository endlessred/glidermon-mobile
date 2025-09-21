// game/cosmetics/cosmeticSystem.ts
import type { AssetKey } from "../../assets/assetMap";

// Enhanced socket system for all cosmetic types
export type CosmeticSocket =
  // Head region
  | "headTop"        // Hats, caps, helmets
  | "headFront"      // Glasses, masks, face paint
  | "headBack"       // Hair, hood back layer
  | "earL" | "earR"  // Earrings, ear accessories

  // Body region
  | "bodyFront"      // Chest accessories, necklaces
  | "bodyBack"       // Capes, wings, backpacks
  | "hand"           // Held items, gloves
  | "waist"          // Belts, waist accessories

  // Special regions
  | "background"     // Environment effects, auras
  | "foreground"     // Overlay effects, particles
  | "fullBody";      // Complete outfit replacements

// Rendering layers (z-depth order)
export type RenderLayer =
  | "background"     // -100: Behind character
  | "bodyBack"       // -50:  Behind body
  | "bodyBase"       // 0:    Character base layer
  | "bodyFront"      // 50:   In front of body
  | "headBack"       // 100:  Behind head
  | "headBase"       // 150:  Head base layer
  | "headFront"      // 200:  In front of head
  | "accessory"      // 250:  Accessories layer
  | "foreground";    // 300:  Front overlay effects

// Enhanced cosmetic definition
export type CosmeticDefinition = {
  id: string;
  name: string;
  socket: CosmeticSocket;
  renderLayer: RenderLayer;

  // Asset configuration
  texKey: AssetKey;
  frameMode: "static" | "animated" | "conditional";

  // Frame mapping for animated cosmetics
  frameMapping?: {
    idle?: number[];     // Maps character frames to cosmetic frames
    walk?: number[];
    jump?: number[];
    [key: string]: number[] | undefined;
  };

  // Positioning
  anchor: {
    socket: CosmeticSocket;
    offset: { x: number; y: number };
    pivot: { x: number; y: number };
    scale?: number;
    rotation?: number;
  };

  // Per-frame adjustments (like your current overrides)
  frameOverrides?: Array<{
    characterFrames: number | [number, number]; // Single frame or range
    adjustments: {
      offset?: { x?: number; y?: number };
      rotation?: number;
      scale?: number;
      visible?: boolean; // Hide on certain frames
    };
  }>;

  // Advanced features
  masking?: {
    bodyPart: "head" | "body" | "arms" | "legs";
    mode: "clip" | "overlay" | "replace";
  };

  // Conditional rendering
  conditions?: {
    requiresSocket?: CosmeticSocket[]; // Only show if other cosmetics equipped
    conflictsWith?: CosmeticSocket[];  // Hide if conflicting cosmetics
    animationStates?: string[];        // Only show during certain animations
  };

  // Metadata
  cost: number;
  rarity: "common" | "uncommon" | "rare" | "epic" | "legendary";
  category: string; // "hats", "accessories", "effects", etc.
};

// Anchor points defined per character animation set
export type CharacterAnchorSet = {
  characterId: string;
  animationSet: string; // "idle", "walk", "jump", etc.

  // Base anchors for each socket
  anchors: Record<CosmeticSocket, {
    x: number;
    y: number;
    rotation?: number;
  }>;

  // Per-frame overrides (extends your current system)
  frameOverrides?: Array<{
    frames: number | [number, number];
    anchorAdjustments: Partial<Record<CosmeticSocket, {
      x?: number;
      y?: number;
      rotation?: number;
      scale?: number;
    }>>;
  }>;
};

// Cosmetic rendering instruction
export type CosmeticRenderInstruction = {
  cosmetic: CosmeticDefinition;
  worldPosition: { x: number; y: number };
  scale: number;
  rotation: number;
  frameIndex: number;
  visible: boolean;
  zDepth: number;

  // Computed rendering info
  srcRect: { x: number; y: number; w: number; h: number };
  destRect: { x: number; y: number; w: number; h: number };

  // Masking/clipping info
  maskRect?: { x: number; y: number; w: number; h: number };
};

// Main cosmetic system manager
export class CosmeticSystem {
  private characterAnchors: Map<string, CharacterAnchorSet> = new Map();
  private cosmeticDefinitions: Map<string, CosmeticDefinition> = new Map();

  // Register character anchor sets
  registerCharacterAnchors(anchorSet: CharacterAnchorSet) {
    const key = `${anchorSet.characterId}_${anchorSet.animationSet}`;
    this.characterAnchors.set(key, anchorSet);
  }

  // Register cosmetic definitions
  registerCosmetic(cosmetic: CosmeticDefinition) {
    this.cosmeticDefinitions.set(cosmetic.id, cosmetic);
  }

  // Get all cosmetics for a specific socket
  getCosmeticsForSocket(socket: CosmeticSocket): CosmeticDefinition[] {
    return Array.from(this.cosmeticDefinitions.values())
      .filter(cosmetic => cosmetic.socket === socket);
  }

  // Get all registered cosmetics
  getAllCosmetics(): CosmeticDefinition[] {
    return Array.from(this.cosmeticDefinitions.values());
  }

  // Calculate render instructions for equipped cosmetics
  calculateRenderInstructions(
    characterId: string,
    animationSet: string,
    characterFrame: number,
    equippedCosmetics: string[],
    characterWorldPos: { x: number; y: number },
    characterScale: number
  ): CosmeticRenderInstruction[] {
    const anchorKey = `${characterId}_${animationSet}`;
    const anchors = this.characterAnchors.get(anchorKey);

    if (!anchors) return [];

    const instructions: CosmeticRenderInstruction[] = [];

    for (const cosmeticId of equippedCosmetics) {
      const cosmetic = this.cosmeticDefinitions.get(cosmeticId);
      if (!cosmetic) continue;

      const instruction = this.calculateSingleInstruction(
        cosmetic,
        anchors,
        characterFrame,
        characterWorldPos,
        characterScale
      );

      if (instruction.visible) {
        instructions.push(instruction);
      }
    }

    // Sort by z-depth for proper rendering order
    return instructions.sort((a, b) => a.zDepth - b.zDepth);
  }

  private calculateSingleInstruction(
    cosmetic: CosmeticDefinition,
    anchors: CharacterAnchorSet,
    characterFrame: number,
    characterWorldPos: { x: number; y: number },
    characterScale: number
  ): CosmeticRenderInstruction {
    // Get base anchor position
    const baseAnchor = anchors.anchors[cosmetic.anchor.socket];

    // Apply frame overrides from character anchors
    let anchorPos = { ...baseAnchor };
    for (const override of anchors.frameOverrides || []) {
      if (this.frameInRange(characterFrame, override.frames)) {
        const adjustment = override.anchorAdjustments[cosmetic.anchor.socket];
        if (adjustment) {
          anchorPos.x += adjustment.x || 0;
          anchorPos.y += adjustment.y || 0;
          anchorPos.rotation = (anchorPos.rotation || 0) + (adjustment.rotation || 0);
        }
      }
    }

    // Apply cosmetic-specific frame overrides
    let cosmeticAdjustments = { offset: { x: 0, y: 0 }, rotation: 0, scale: 1, visible: true };
    for (const override of cosmetic.frameOverrides || []) {
      if (this.frameInRange(characterFrame, override.characterFrames)) {
        cosmeticAdjustments = {
          offset: {
            x: override.adjustments.offset?.x || 0,
            y: override.adjustments.offset?.y || 0
          },
          rotation: override.adjustments.rotation || 0,
          scale: override.adjustments.scale || 1,
          visible: override.adjustments.visible !== false
        };
      }
    }

    // Calculate final world position
    const finalX = characterWorldPos.x +
                  (anchorPos.x + cosmetic.anchor.offset.x + cosmeticAdjustments.offset.x) * characterScale;
    const finalY = characterWorldPos.y +
                  (anchorPos.y + cosmetic.anchor.offset.y + cosmeticAdjustments.offset.y) * characterScale;

    // Calculate cosmetic frame index
    const cosmeticFrame = this.calculateCosmeticFrame(cosmetic, characterFrame);

    return {
      cosmetic,
      worldPosition: { x: finalX, y: finalY },
      scale: characterScale * (cosmetic.anchor.scale || 1) * cosmeticAdjustments.scale,
      rotation: (anchorPos.rotation || 0) + (cosmetic.anchor.rotation || 0) + cosmeticAdjustments.rotation,
      frameIndex: cosmeticFrame,
      visible: cosmeticAdjustments.visible,
      zDepth: this.getLayerDepth(cosmetic.renderLayer),

      // These would be calculated based on sprite sheet layout
      srcRect: this.calculateSrcRect(cosmetic, cosmeticFrame),
      destRect: this.calculateDestRect(finalX, finalY, characterScale, cosmetic),
    };
  }

  private frameInRange(frame: number, range: number | [number, number]): boolean {
    if (typeof range === "number") {
      return frame === range;
    }
    return frame >= range[0] && frame <= range[1];
  }

  private calculateCosmeticFrame(cosmetic: CosmeticDefinition, characterFrame: number): number {
    switch (cosmetic.frameMode) {
      case "static":
        return 0;
      case "animated":
        // Map character frame to cosmetic frame
        return characterFrame; // Simplified - could use frameMapping
      case "conditional":
        // Complex logic based on conditions
        return 0; // Placeholder
      default:
        return 0;
    }
  }

  private getLayerDepth(layer: RenderLayer): number {
    const depths: Record<RenderLayer, number> = {
      background: -100,
      bodyBack: -50,
      bodyBase: 0,
      bodyFront: 50,
      headBack: 100,
      headBase: 150,
      headFront: 200,
      accessory: 250,
      foreground: 300
    };
    return depths[layer];
  }

  private calculateSrcRect(cosmetic: CosmeticDefinition, frame: number) {
    // Implement sprite sheet frame calculation
    return { x: 0, y: 0, w: 64, h: 64 }; // Placeholder
  }

  private calculateDestRect(x: number, y: number, scale: number, cosmetic: CosmeticDefinition) {
    // Calculate destination rectangle
    return { x, y, w: 64 * scale, h: 64 * scale }; // Placeholder
  }
}

// Global cosmetic system instance
export const cosmeticSystem = new CosmeticSystem();