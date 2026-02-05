import { events, majorEvents } from "@/src/features/game/data/events";
import { effectFromText, snowIntensityFromText } from "@/src/features/game/effects";
import {
  buildSceneDeck,
  getNextScene,
  phaseFromTurn,
  pickStartScene,
} from "@/src/features/game/logic/gameFlow";
import {
  BASE_UPKEEP,
  MAX_TURNS,
} from "@/src/shared/constants";
import type {
  Choice,
  Effects,
  Path,
  Scene,
  Stats,
  WorldEvent,
} from "@/src/shared/types";
import {
  applyEffects,
  getChance,
  normalizeStats,
  seasonFromTurn,
  shuffle,
  stageLabel,
} from "@/src/shared/utils";

export type EffectType = "rain" | "snow" | "leaves" | null;
export type SnowIntensity = "gentle" | "blizzard";
export type Rng = () => number;

export type GameState = {
  characterId?: string | null;
  stats: Stats;
  pathScores: Record<Path, number>;
  turn: number;
  log: string[];
  sceneDeck: Scene[];
  sceneIndex: number;
  scene: Scene;
  eventDeck: WorldEvent[];
  eventIndex: number;
  nextEventTurn: number;
  gameOver: boolean;
  endingReason: string;
  majorEventUsed: boolean;
  effectType: EffectType;
  effectUntilTurn: number;
  snowIntensity: SnowIntensity;
};

export type ResultPayload = {
  title: string;
  text: string;
  deltas: Effects;
  moneyBreakdown?: { label: string; value: number }[];
  event?: WorldEvent;
};

export type TurnResolution = {
  nextState: GameState;
  result: ResultPayload;
};

export const createSeededRng = (seed?: number) => {
  const finalSeed =
    typeof seed === "number" && Number.isFinite(seed)
      ? seed
      : Math.floor(Math.random() * 2 ** 32);
  let t = finalSeed >>> 0;
  const rng = () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
  return { seed: finalSeed, rng };
};

export const rollInitialLuck = (rng: Rng) => Math.floor(rng() * 5);

export const createGameStateFromStats = ({
  stats,
  characterId,
  rng,
  sceneDeck,
  eventDeck,
  effectType = "leaves",
  effectUntilTurn = 999,
  snowIntensity = "gentle",
}: {
  stats: Stats;
  characterId?: string | null;
  rng: Rng;
  sceneDeck?: Scene[];
  eventDeck?: WorldEvent[];
  effectType?: EffectType;
  effectUntilTurn?: number;
  snowIntensity?: SnowIntensity;
}): GameState => {
  const safeStats = normalizeStats(stats);
  const deck = sceneDeck ?? buildSceneDeck(rng, 1);
  const season = seasonFromTurn(1);
  const stage = stageLabel(safeStats);
  const startScene = pickStartScene(rng, 1, characterId);
  const firstScene = getNextScene(
    deck,
    0,
    stage,
    season,
    safeStats,
    1,
    characterId,
    "early",
    null,
  );
  return {
    characterId,
    stats: safeStats,
    pathScores: { craft: 0, service: 0, trade: 0, crime: 0 },
    turn: 1,
    log: [],
    sceneDeck: deck,
    sceneIndex: startScene ? -1 : firstScene?.index ?? 0,
    scene: startScene ?? firstScene?.scene ?? deck[0],
    eventDeck: eventDeck ?? shuffle(events, rng),
    eventIndex: 0,
    nextEventTurn: 2 + Math.floor(rng() * 2),
    gameOver: false,
    endingReason: "",
    majorEventUsed: false,
    effectType,
    effectUntilTurn,
    snowIntensity,
  };
};

const getPreferredPath = (pathScores: Record<Path, number>) => {
  const entries = Object.entries(pathScores) as [Path, number][];
  entries.sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;
  if (entries[0][1] === 0) return null;
  return entries[0][0];
};

export const resolveChoice = (
  state: GameState,
  choice: Choice,
  rng: Rng,
): TurnResolution => {
  const safeStats = normalizeStats(state.stats);
  const nextPathScores = { ...state.pathScores };
  if (choice.path) {
    nextPathScores[choice.path] += 1;
  }
  const chance = getChance(choice, safeStats);
  const success = rng() < chance;
  const effects = success ? choice.success : choice.fail;
  const adjustedEffects: Effects = { ...effects };
  if (success && adjustedEffects.money && adjustedEffects.money > 0) {
    const skillBonus = Math.min(2, Math.floor(safeStats.skill / 5));
    const luckBonus = Math.min(3, Math.floor(safeStats.luck / 2));
    const variability = rng() < 0.45 ? 1 : 0;
    adjustedEffects.money += skillBonus + luckBonus + variability;
  }

  const afterChoice = applyEffects(safeStats, adjustedEffects);
  const upkeep = BASE_UPKEEP - afterChoice.family;
  let nextStats = applyEffects(afterChoice, { money: upkeep });
  nextStats.age += 1;
  const nextStage = stageLabel(nextStats);
  const resultText = success ? choice.successText : choice.failText;
  let resultLine = `Хід ${state.turn}: ${resultText} (утримання ${upkeep})`;

  const nextTurn = state.turn + 1;
  let eventResult: WorldEvent | undefined;
  let nextEventDeck = state.eventDeck;
  let nextEventIndex = state.eventIndex;
  let nextEventTurn = state.nextEventTurn;
  let majorEventUsed = state.majorEventUsed;
  if (nextTurn >= 16 && nextTurn <= 19 && !majorEventUsed) {
    const index = Math.floor(rng() * majorEvents.length);
    eventResult = majorEvents[index] ?? majorEvents[0];
    majorEventUsed = true;
    nextStats = applyEffects(nextStats, eventResult.effects);
    nextEventTurn = nextTurn + (rng() < 0.5 ? 2 : 3);
  } else if (nextTurn >= nextEventTurn) {
    if (nextEventIndex >= nextEventDeck.length) {
      nextEventDeck = shuffle(events, rng);
      nextEventIndex = 0;
    }
    const currentEvent = nextEventDeck[nextEventIndex];
    eventResult = currentEvent;
    nextStats = applyEffects(nextStats, currentEvent.effects);
    nextEventIndex += 1;
    nextEventTurn = nextTurn + (rng() < 0.5 ? 2 : 3);
  }

  const beforeHunger = nextStats.hungerDebt;
  const beforeFatigue = nextStats.fatigue;
  let hungerDelta = 0;
  let fatigueDelta = 0;
  let hungerHealthLoss = 0;
  const moneyBreakdown: { label: string; value: number }[] = [];
  if (adjustedEffects.money && adjustedEffects.money !== 0) {
    moneyBreakdown.push({
      label: "Результат вибору",
      value: adjustedEffects.money,
    });
  }
  moneyBreakdown.push({ label: "Утримання", value: upkeep });
    if (nextStats.money <= 0) {
      nextStats.hungerDebt += 1;
      hungerDelta = 1;
      hungerHealthLoss = Math.max(1, Math.ceil(nextStats.hungerDebt / 2));
      nextStats.health -= hungerHealthLoss;
      resultLine += `, голод -${hungerHealthLoss}`;
  } else if (nextStats.hungerDebt > 0) {
    const pay = Math.min(nextStats.money, nextStats.hungerDebt);
    nextStats.money -= pay;
    nextStats.hungerDebt -= pay;
    hungerDelta = -pay;
    if (pay > 0) {
      moneyBreakdown.push({ label: "Їжа", value: -pay });
      resultLine += `, їжа -${pay}`;
    }
  }

  const effort = choice.effort ?? "neutral";
  let fatigueAuto = effort === "physical" ? 1 : -1;
  if (effort === "rest") fatigueAuto = -2;
  nextStats.fatigue += fatigueAuto;
  if (nextStats.fatigue < 0) nextStats.fatigue = 0;
  if (nextStats.fatigue >= 6) {
    nextStats.health -= 1;
    resultLine += ", втома -1 здоровʼя";
  }
  fatigueDelta = nextStats.fatigue - beforeFatigue;

  const luckRoll = rng();
  let luckDelta = 0;
  if (luckRoll < 0.15) {
    luckDelta = 1;
  } else if (luckRoll > 0.92) {
    luckDelta = -1;
  }
  if (luckDelta !== 0) {
    nextStats.luck += luckDelta;
  }

  const eventLine = eventResult
    ? `Подія: ${eventResult.title}. ${eventResult.text}`
    : null;

  let newEffect: EffectType = null;
  if (eventResult) {
    newEffect = effectFromText(`${eventResult.title} ${eventResult.text}`) as
      | "rain"
      | "snow"
      | "leaves"
      | null;
  }
  if (!newEffect) {
    newEffect = effectFromText(`${state.scene.title} ${state.scene.text}`) as
      | "rain"
      | "snow"
      | "leaves"
      | null;
  }
  if (!newEffect && nextTurn % 5 === 0) {
    newEffect = "leaves";
  }

  let effectType = state.effectType;
  let effectUntilTurn = state.effectUntilTurn;
  let snowIntensity = state.snowIntensity;
  if (newEffect) {
    effectType = newEffect;
    effectUntilTurn = nextTurn + (eventResult ? 2 : 1);
    if (newEffect === "snow") {
      const sourceText = eventResult
        ? `${eventResult.title} ${eventResult.text}`
        : `${state.scene.title} ${state.scene.text}`;
      snowIntensity = snowIntensityFromText(sourceText);
    }
  } else if (effectType && nextTurn > effectUntilTurn) {
    effectType = null;
  }

  let lifeOver = nextStats.health <= 0 || nextTurn > MAX_TURNS;
  let endingReason = state.endingReason;
  if (nextStats.health <= 0) {
    if (nextStats.hungerDebt > 0) {
      endingReason = "Голод виснажив тебе до межі.";
    } else {
      endingReason =
        "Твоє здоровʼя впало до нуля через виснаження, травми та наслідки рішень.";
    }
  } else if (nextTurn > MAX_TURNS) {
    endingReason = "Твоє життя добігло кінця після повного циклу ходів.";
  }

    const nextScenePick = lifeOver
      ? null
      : getNextScene(
          state.sceneDeck,
          state.sceneIndex + 1,
          nextStage,
          seasonFromTurn(nextTurn),
          nextStats,
          nextTurn,
          state.characterId,
          phaseFromTurn(nextTurn),
          getPreferredPath(nextPathScores),
        );
  if (!lifeOver && !nextScenePick) {
    lifeOver = true;
    endingReason = "Ти пройшов усі 20 кроків життя.";
  }
  const nextScene = nextScenePick?.scene ?? state.scene;

  if (eventResult?.effects.money) {
    moneyBreakdown.push({
      label: `Подія: ${eventResult.title}`,
      value: eventResult.effects.money,
    });
  }
  const moneyNet = moneyBreakdown.reduce((sum, item) => sum + item.value, 0);

  const nextLog = [
    resultLine,
    ...(eventLine ? [eventLine] : []),
    ...state.log,
  ].slice(0, 6);

  const nextState: GameState = {
    characterId: state.characterId,
    stats: nextStats,
    pathScores: nextPathScores,
    turn: nextTurn,
    log: nextLog,
    sceneDeck: state.sceneDeck,
    sceneIndex: nextScenePick?.index ?? state.sceneIndex,
    scene: nextScene,
    eventDeck: nextEventDeck,
    eventIndex: nextEventIndex,
    nextEventTurn,
    gameOver: lifeOver,
    endingReason,
    majorEventUsed,
    effectType,
    effectUntilTurn,
    snowIntensity,
  };

  const result: ResultPayload = {
    title: success ? "Успіх" : "Невдача",
    text: resultText,
    deltas: {
      ...adjustedEffects,
      money: moneyNet,
      hungerDebt: hungerDelta,
      fatigue: fatigueDelta,
      luck: luckDelta,
    },
    moneyBreakdown,
    event: eventResult,
  };

  return { nextState, result };
};
