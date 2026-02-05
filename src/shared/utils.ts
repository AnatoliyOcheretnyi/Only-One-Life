import type { Choice, Effects, Season, Stage, Stats } from './types';
import { SEASON_TURNS, stageIndex } from './constants';

export const clamp = (value: number, min = 0, max = 1) =>
  Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : min;

export const normalizeStats = (stats: Stats): Stats => ({
  ...stats,
  luck: Number.isFinite(stats.luck) ? stats.luck : 0,
});

export const seasonFromTurn = (turn: number): Season => {
  const index = Math.floor((turn - 1) / SEASON_TURNS) % 4;
  return ['Spring', 'Summer', 'Autumn', 'Winter'][index] as Season;
};

export const stageLabel = (stats: Stats): Stage => {
  if (stats.money >= 50 && stats.reputation >= 30) return 'Noble';
  if (stats.money >= 25 && stats.reputation >= 15) return 'Established';
  if (stats.money >= 10 || stats.reputation >= 8) return 'Rising';
  return 'Early';
};

export const applyEffects = (stats: Stats, effects: Effects): Stats => ({
  money: stats.money + (effects.money ?? 0),
  reputation: stats.reputation + (effects.reputation ?? 0),
  skill: stats.skill + (effects.skill ?? 0),
  health: stats.health + (effects.health ?? 0),
  age: stats.age + (effects.age ?? 0),
  family: stats.family + (effects.family ?? 0),
  hungerDebt: stats.hungerDebt + (effects.hungerDebt ?? 0),
  fatigue: stats.fatigue + (effects.fatigue ?? 0),
  luck: stats.luck + (effects.luck ?? 0),
});

export const shuffle = <T,>(items: T[], rng: () => number = Math.random) => {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

export const getChance = (choice: Choice, stats: Stats) => {
  const effort = choice.effort ?? 'neutral';
  const skillFactor = effort === 'physical' ? 0.03 : effort === 'mental' ? 0.015 : 0;
  const fatigueFactor = effort === 'physical' ? 0.035 : effort === 'mental' ? 0.02 : 0;
  const penalty = stats.money < 0 ? Math.abs(stats.money) * 0.015 : 0;
  const modifier =
    stats.skill * skillFactor +
    stats.reputation * 0.01 +
    stats.health * 0.008 -
    stats.money * 0.004 -
    stats.fatigue * fatigueFactor -
    penalty +
    stats.luck * 0.006 -
    0.05;
  return clamp(choice.baseChance + modifier, 0.1, 0.85);
};

export const getMoneyRange = (choice: Choice, stats: Stats) => {
  const base = choice.success.money ?? 0;
  if (base <= 0) return null;
  const skillBonus = Math.min(1, Math.floor(stats.skill / 6));
  const luckBonus = Math.min(1, Math.floor(stats.luck / 3));
  const maxBonus = skillBonus + luckBonus + 1;
  const max = base + maxBonus;
  if (max <= base) return null;
  return { min: base, max };
};

export const effectsEqual = (a: Effects, b: Effects) => {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    const av = (a as Record<string, number>)[key] ?? 0;
    const bv = (b as Record<string, number>)[key] ?? 0;
    if (av !== bv) return false;
  }
  return true;
};

export const isNeutralChoice = (choice: Choice) =>
  choice.successText === choice.failText && effectsEqual(choice.success, choice.fail);

export const getMoneyRangeLabel = (choice: Choice, stats: Stats) => {
  const range = getMoneyRange(choice, stats);
  return range ? `+${range.min}…+${range.max}` : null;
};

export const isSceneForSeason = (sceneSeason: Season | Season[] | undefined, season: Season) => {
  if (!sceneSeason) return true;
  const seasons = Array.isArray(sceneSeason) ? sceneSeason : [sceneSeason];
  return seasons.includes(season);
};

export const canUseStage = (stage: Stage, minStage?: Stage) => {
  if (!minStage) return true;
  return stageIndex[stage] >= stageIndex[minStage];
};
