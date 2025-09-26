// Map generation system for Acorn Hunt
// New structured progression: 4 battles + boss with choices between battles
import { MapNode, NodeType } from './types';
import { SeededRNG } from './rng';

interface ChoiceOption {
  type: 'treasure' | 'event';
  title: string;
  description: string;
}

export class MapGenerator {
  private rng: SeededRNG;

  constructor(seed: number) {
    this.rng = new SeededRNG(seed);
  }

  generateMap(): MapNode[] {
    const nodes: MapNode[] = [];

    // Structure: Battle 1 -> Choice 1 -> Battle 2 -> Choice 2 -> Battle 3 -> Choice 3 -> Battle 4 -> Boss
    // Total: 9 nodes (4 battles + 4 choices + 1 boss)

    // Battle 1 (Easy)
    nodes.push({
      id: "battle_1",
      type: "battle",
      title: "Forest Entrance",
      description: "Small forest critters block your path into the deeper woods",
      next: ["choice_1"]
    });

    // Choice 1
    const choice1Options = this.generateChoiceOptions(1);
    nodes.push({
      id: "choice_1",
      type: choice1Options[0].type as NodeType,
      title: choice1Options[0].title,
      description: choice1Options[0].description,
      next: ["battle_2"],
      alternatives: choice1Options.slice(1).map((opt, i) => ({
        id: `choice_1_alt_${i}`,
        type: opt.type as NodeType,
        title: opt.title,
        description: opt.description
      }))
    });

    // Battle 2 (Medium-Easy)
    nodes.push({
      id: "battle_2",
      type: "battle",
      title: "Twisted Grove",
      description: "Stronger creatures emerge from the shadows of twisted trees",
      next: ["choice_2"]
    });

    // Choice 2
    const choice2Options = this.generateChoiceOptions(2);
    nodes.push({
      id: "choice_2",
      type: choice2Options[0].type as NodeType,
      title: choice2Options[0].title,
      description: choice2Options[0].description,
      next: ["battle_3"],
      alternatives: choice2Options.slice(1).map((opt, i) => ({
        id: `choice_2_alt_${i}`,
        type: opt.type as NodeType,
        title: opt.title,
        description: opt.description
      }))
    });

    // Battle 3 (Medium-Hard)
    nodes.push({
      id: "battle_3",
      type: "battle",
      title: "Ancient Clearing",
      description: "Elite guardians of the forest test your worthiness",
      next: ["choice_3"]
    });

    // Choice 3
    const choice3Options = this.generateChoiceOptions(3);
    nodes.push({
      id: "choice_3",
      type: choice3Options[0].type as NodeType,
      title: choice3Options[0].title,
      description: choice3Options[0].description,
      next: ["battle_4"],
      alternatives: choice3Options.slice(1).map((opt, i) => ({
        id: `choice_3_alt_${i}`,
        type: opt.type as NodeType,
        title: opt.title,
        description: opt.description
      }))
    });

    // Battle 4 (Hard)
    nodes.push({
      id: "battle_4",
      type: "battle",
      title: "Darkwood Depths",
      description: "The forest's most dangerous creatures emerge for a final test",
      next: ["boss"]
    });

    // Boss (Very Hard)
    nodes.push({
      id: "boss",
      type: "boss",
      title: "The Hollow Acorn",
      description: "A massive corrupted acorn looms before you, emanating dark energy. This is your final challenge.",
      next: []
    });

    return nodes;
  }

  private generateChoiceOptions(choiceNumber: number): ChoiceOption[] {
    // Each choice offers 2-3 random options between treasure and event
    const options: ChoiceOption[] = [];

    // Always include one treasure and one event option
    const treasureOption = this.generateTreasureOption(choiceNumber);
    const eventOption = this.generateEventOption(choiceNumber);

    options.push(treasureOption, eventOption);

    // 50% chance to add a third option
    if (this.rng.next() < 0.5) {
      const thirdOption = this.rng.next() < 0.5 ?
        this.generateTreasureOption(choiceNumber, true) :
        this.generateEventOption(choiceNumber, true);
      options.push(thirdOption);
    }

    // Shuffle the options so treasure isn't always first
    return this.shuffleArray(options);
  }

  private generateTreasureOption(choiceNumber: number, isAlternate: boolean = false): ChoiceOption {
    const treasureTitles = [
      ["Ancient Cache", "Squirrel Stash", "Hidden Vault"],
      ["Forgotten Armory", "Mystic Treasury", "Elder's Hoard"],
      ["Sacred Reliquary", "Champion's Vault", "Legendary Cache"],
      ["Divine Treasury", "Artifact Sanctum", "Final Reserves"]
    ];

    const treasureDescs = [
      ["A small collection of forgotten relics", "Supplies left by previous adventurers", "Ancient items of power"],
      ["Weapons and armor from fallen warriors", "Magical artifacts of the forest", "Treasures of the woodland elders"],
      ["Sacred items blessed by nature spirits", "Gear of legendary forest champions", "Rare artifacts of immense power"],
      ["Divine relics of incredible potency", "The final treasures before the boss", "Ultimate preparations for your destiny"]
    ];

    const titles = treasureTitles[choiceNumber - 1];
    const descs = treasureDescs[choiceNumber - 1];
    const index = isAlternate ? 1 : 0;

    return {
      type: 'treasure',
      title: titles[index % titles.length],
      description: descs[index % descs.length]
    };
  }

  private generateEventOption(choiceNumber: number, isAlternate: boolean = false): ChoiceOption {
    const eventTitles = [
      ["Woodland Shrine", "Mysterious Stranger", "Forest Spirit"],
      ["Ancient Ritual Site", "Wise Hermit", "Nature's Trial"],
      ["Sacred Grove", "Forest Oracle", "Champion's Test"],
      ["Divine Altar", "Final Blessing", "Destiny's Call"]
    ];

    const eventDescs = [
      ["A small shrine offers mysterious blessings", "A hooded figure offers cryptic advice", "A forest spirit tests your resolve"],
      ["Ancient magic still lingers in this place", "An old hermit shares wisdom", "Nature itself challenges you"],
      ["A sacred grove pulses with power", "An oracle speaks of your destiny", "Face a trial of worthiness"],
      ["A divine altar awaits your offering", "Receive final blessings before the end", "Your destiny awaits your choice"]
    ];

    const titles = eventTitles[choiceNumber - 1];
    const descs = eventDescs[choiceNumber - 1];
    const index = isAlternate ? 1 : 0;

    return {
      type: 'event',
      title: titles[index % titles.length],
      description: descs[index % descs.length]
    };
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(this.rng.next() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

// Legacy function for backward compatibility
export function generateAcornHuntMap(seed: number): MapNode[] {
  const generator = new MapGenerator(seed);
  return generator.generateMap();
}

// Helper function for UI
export function getNextNodes(map: MapNode[], currentNodeId: string): MapNode[] {
  const currentNode = map.find(n => n.id === currentNodeId);
  if (!currentNode) return [];

  return currentNode.next
    .map(nextId => map.find(n => n.id === nextId))
    .filter(node => node !== undefined) as MapNode[];
}