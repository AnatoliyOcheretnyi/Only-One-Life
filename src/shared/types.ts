export type Stats = {
  money: number;
  reputation: number;
  skill: number;
  health: number;
  age: number;
  family: number;
  hungerDebt: number;
  fatigue: number;
  luck: number;
  karma: number;
};

export type Effects = Partial<Stats>;

export type Path = 'craft' | 'service' | 'trade' | 'crime';
export type ScenePhase = 'start' | 'early' | 'mid' | 'late';

export type Choice = {
  id: string;
  label: string;
  description: string;
  baseChance: number;
  minHealth?: number;
  effort?: 'physical' | 'mental' | 'social' | 'rest' | 'neutral';
  path?: Path;
  successText: string;
  failText: string;
  success: Effects;
  fail: Effects;
};

export type Scene = {
  id: string;
  title: string;
  text: string;
  arc?: number;
  phase?: ScenePhase;
  vector?: Path | 'neutral';
  backlog?: boolean;
  minTurn?: number;
  maxTurn?: number;
  minStats?: Partial<Stats>;
  maxStats?: Partial<Stats>;
  minStage?: Stage;
  season?: Season | Season[];
  forCharacter?: string[];
  choices: Choice[];
};

export type WorldEvent = {
  id: string;
  title: string;
  text: string;
  effects: Effects;
};

export type Stage = 'Early' | 'Rising' | 'Established' | 'Noble';
export type Season = 'Spring' | 'Summer' | 'Autumn' | 'Winter';

export type Character = {
  id: string;
  name: string;
  description: string;
  lore: string;
  stats: Stats;
  image: number;
};
