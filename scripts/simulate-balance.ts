import { characters } from "../src/features/game/data/characters";
import {
  createGameStateFromStats,
  createSeededRng,
  resolveChoice,
  rollInitialLuck,
  type GameState,
  type Rng,
} from "../src/features/game/logic/engine";
import { getEnding } from "../src/features/game/logic/gameFlow";
import type { Choice, Stats } from "../src/shared/types";
import { getChance, normalizeStats } from "../src/shared/utils";

type Strategy = "random" | "safe" | "greedy";

const parseArgs = (argv: string[]) => {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const part = argv[i];
    if (!part.startsWith("--")) continue;
    const [key, inlineValue] = part.slice(2).split("=");
    const value =
      inlineValue ?? (i + 1 < argv.length && !argv[i + 1].startsWith("--")
        ? argv[i + 1]
        : "true");
    args[key] = value;
  }
  return args;
};

const pickChoice = (
  state: GameState,
  rng: Rng,
  strategy: Strategy,
): Choice => {
  const choices = state.scene.choices.filter(
    (choice) => !choice.minHealth || state.stats.health >= choice.minHealth,
  );
  if (choices.length === 0) {
    return state.scene.choices[0];
  }
  if (strategy === "safe") {
    return choices.reduce((best, current) => {
      const bestChance = getChance(best, normalizeStats(state.stats));
      const currentChance = getChance(current, normalizeStats(state.stats));
      return currentChance > bestChance ? current : best;
    }, choices[0]);
  }
  if (strategy === "greedy") {
    return choices.reduce((best, current) => {
      const scoreChoice = (choice: Choice) => {
        const chance = getChance(choice, normalizeStats(state.stats));
        const successScore =
          (choice.success.money ?? 0) +
          (choice.success.reputation ?? 0) +
          (choice.success.skill ?? 0) +
          (choice.success.health ?? 0);
        const failScore =
          (choice.fail.money ?? 0) +
          (choice.fail.reputation ?? 0) +
          (choice.fail.skill ?? 0) +
          (choice.fail.health ?? 0);
        return successScore * chance + failScore * (1 - chance);
      };
      return scoreChoice(current) > scoreChoice(best) ? current : best;
    }, choices[0]);
  }
  const index = Math.floor(rng() * choices.length);
  return choices[index] ?? choices[0];
};

const summarizeStats = (statsList: Stats[]) => {
  const totals = statsList.reduce(
    (acc, stats) => {
      acc.money += stats.money;
      acc.reputation += stats.reputation;
      acc.skill += stats.skill;
      acc.health += stats.health;
      acc.luck += stats.luck;
      acc.age += stats.age;
      acc.family += stats.family;
      acc.hungerDebt += stats.hungerDebt;
      acc.fatigue += stats.fatigue;
      return acc;
    },
    {
      money: 0,
      reputation: 0,
      skill: 0,
      health: 0,
      luck: 0,
      age: 0,
      family: 0,
      hungerDebt: 0,
      fatigue: 0,
    },
  );
  const count = statsList.length || 1;
  return Object.fromEntries(
    Object.entries(totals).map(([key, value]) => [
      key,
      Number((value / count).toFixed(2)),
    ]),
  );
};

const runSimulation = () => {
  const args = parseArgs(process.argv.slice(2));
  const runs = Number(args.runs ?? 500);
  const baseSeed = args.seed ? Number(args.seed) : undefined;
  const strategy = (args.strategy ?? "random") as Strategy;
  const characterId = args.character;

  const character =
    (characterId
      ? characters.find((item) => item.id === characterId)
      : characters[0]) ?? characters[0];

  const endings: Record<string, number> = {};
  const finalStats: Stats[] = [];

  for (let i = 0; i < runs; i += 1) {
    const { rng } = createSeededRng(
      typeof baseSeed === "number" ? baseSeed + i : undefined,
    );
    const startingStats = normalizeStats({
      ...character.stats,
      luck: rollInitialLuck(rng),
    });
    let state = createGameStateFromStats({
      stats: startingStats,
      characterId: character.id,
      rng,
      effectType: null,
      effectUntilTurn: 0,
    });

    while (!state.gameOver) {
      const choice = pickChoice(state, rng, strategy);
      const { nextState } = resolveChoice(state, choice, rng);
      state = nextState;
    }

    const ending = getEnding(state.stats, state.endingReason);
    endings[ending.title] = (endings[ending.title] ?? 0) + 1;
    finalStats.push(state.stats);
  }

  const statsSummary = summarizeStats(finalStats);
  console.log("Simulation summary");
  console.log(`Runs: ${runs}`);
  console.log(`Character: ${character.name} (${character.id})`);
  console.log(`Strategy: ${strategy}`);
  if (typeof baseSeed === "number") {
    console.log(`Seed: ${baseSeed}`);
  }
  console.log("Endings:");
  Object.entries(endings).forEach(([title, count]) => {
    const pct = ((count / runs) * 100).toFixed(1);
    console.log(`- ${title}: ${count} (${pct}%)`);
  });
  console.log("Average final stats:");
  Object.entries(statsSummary).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });
};

runSimulation();
