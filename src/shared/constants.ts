import type { Stage, Season, Stats } from './types';

export const MAX_TURNS = 20;
export const SEASON_TURNS = 5;
export const EVENT_EVERY_TURNS = 3;
export const BASE_UPKEEP = -1;
export const MIN_HEALTH_FOR_FAMILY = 8;
export const MIN_HEALTH_FOR_COMBAT = 6;

export const stageUa: Record<Stage, string> = {
  Early: 'Початок',
  Rising: 'Підйом',
  Established: 'Становлення',
  Noble: 'Шляхта',
};

export const seasonUa: Record<Season, string> = {
  Spring: 'Весна',
  Summer: 'Літо',
  Autumn: 'Осінь',
  Winter: 'Зима',
};

export const stageIndex: Record<Stage, number> = {
  Early: 0,
  Rising: 1,
  Established: 2,
  Noble: 3,
};

export const defaultStats: Stats = {
  money: 0,
  reputation: 0,
  skill: 0,
  health: 10,
  age: 16,
  family: 0,
  hungerDebt: 0,
  fatigue: 0,
  luck: 0,
};
