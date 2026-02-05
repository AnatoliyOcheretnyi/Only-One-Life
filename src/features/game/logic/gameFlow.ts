import { scenes } from "@/src/features/game/data/scenes";
import type { Path, Scene, ScenePhase, Season, Stage, Stats } from "@/src/shared/types";
import { canUseStage, isSceneForSeason, shuffle } from "@/src/shared/utils";

const phaseOrder: ScenePhase[] = ["early", "mid", "late"];

export const phaseFromTurn = (turn: number): ScenePhase => {
  if (turn <= 6) return "early";
  if (turn <= 12) return "mid";
  return "late";
};

export const pickStartScene = (
  rng: () => number = Math.random,
  arcId = 1,
  characterId?: string | null,
) => {
  const candidates = scenes.filter(
    (scene) =>
      scene.arc === arcId &&
      scene.phase === "start" &&
      !scene.backlog &&
      (!scene.forCharacter || scene.forCharacter.includes(characterId ?? "")),
  );
  if (candidates.length === 0) {
    return scenes.find((scene) => scene.phase === "start") ?? scenes[0];
  }
  const index = Math.floor(rng() * candidates.length);
  return candidates[index] ?? candidates[0];
};

export const buildSceneDeck = (rng: () => number = Math.random, arcId = 1) => {
  const buckets: Record<Stage, Scene[]> = {
    Early: [],
    Rising: [],
    Established: [],
    Noble: [],
  };
  scenes.forEach((scene) => {
    if (scene.arc !== arcId) return;
    if (scene.backlog) return;
    if (scene.phase === "start") return;
    const stage = scene.minStage ?? "Early";
    buckets[stage].push(scene);
  });
  return [
    ...shuffle(buckets.Early, rng),
    ...shuffle(buckets.Rising, rng),
    ...shuffle(buckets.Established, rng),
    ...shuffle(buckets.Noble, rng),
  ];
};

export const getNextScene = (
  deck: Scene[],
  startIndex: number,
  stage: Stage,
  season: Season,
  stats: Stats,
  turn: number,
  characterId?: string | null,
  phase: ScenePhase = "early",
  preferredPath?: Path | null,
) => {
  let fallback: { scene: Scene; index: number } | null = null;
  const preferredPhaseIndex = phaseOrder.indexOf(phase);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = startIndex; i < deck.length; i += 1) {
      const scene = deck[i];
      if (
        scene.forCharacter &&
        characterId &&
        !scene.forCharacter.includes(characterId)
      ) {
        continue;
      }
      if (!isSceneForSeason(scene.season, season)) {
        continue;
      }
      if (
        pass === 0 &&
        scene.phase &&
        phaseOrder.indexOf(scene.phase) > preferredPhaseIndex
      ) {
        continue;
      }
      if (scene.minTurn && turn < scene.minTurn) {
        continue;
      }
      if (scene.maxTurn && turn > scene.maxTurn) {
        continue;
      }
      if (scene.minStats) {
        const entries = Object.entries(scene.minStats) as [keyof Stats, number][];
        if (entries.some(([key, value]) => stats[key] < value)) {
          continue;
        }
      }
      if (scene.maxStats) {
        const entries = Object.entries(scene.maxStats) as [keyof Stats, number][];
        if (entries.some(([key, value]) => stats[key] > value)) {
          continue;
        }
      }
      if (!fallback) {
        fallback = { scene, index: i };
      }
      if (scene.minStage && !canUseStage(stage, scene.minStage)) {
        continue;
      }
      if (pass === 0 && preferredPath && scene.vector !== preferredPath) {
        continue;
      }
      if (
        preferredPath &&
        scene.vector &&
        scene.vector !== "neutral" &&
        scene.vector !== preferredPath
      ) {
        continue;
      }
      return { scene, index: i };
    }
  }
  if (fallback) return fallback;
  if (deck.length > 0) {
    return { scene: deck[0], index: 0 };
  }
  return null;
};

export const getEnding = (stats: Stats, reason: string) => {
  if (stats.health <= 0) {
    return {
      title: "Смерть",
      text: `${reason} Ти помираєш від виснаження та травм.`,
    };
  }

  const rules = [
    {
      key: "noble",
      title: "Феодал",
      text: "Ти завершуєш життя впливовим феодалом із землею та владою.",
      min: { money: 60, reputation: 40 },
    },
    {
      key: "merchant",
      title: "Купець",
      text: "Ти стаєш заможним купцем із власною справою.",
      min: { money: 30, reputation: 10 },
    },
    {
      key: "knight",
      title: "Лицар",
      text: "Ти здобуваєш славу і завершуєш життя як лицар або воїн.",
      min: { skill: 12, reputation: 10 },
    },
    {
      key: "artisan",
      title: "Ремісник",
      text: "Ти стаєш майстром своєї справи і знаходиш стабільність у ремеслі.",
      min: { skill: 10, money: 12 },
    },
    {
      key: "guard",
      title: "Служака",
      text: "Ти знаходиш своє місце у службі й живеш дисципліновано.",
      min: { skill: 9, reputation: 12 },
    },
    {
      key: "monk",
      title: "Монах",
      text: "Ти відходиш від мирського й стаєш монахом.",
      min: { reputation: 18, karma: 3 },
      max: { money: 8 },
    },
  ] as const;

  const missingScore = (
    req: { min?: Record<string, number>; max?: Record<string, number> },
  ) => {
    let missing = 0;
    if (req.min) {
      for (const [k, v] of Object.entries(req.min)) {
        const value = (stats as Record<string, number>)[k] ?? 0;
        if (value < v) missing += v - value;
      }
    }
    if (req.max) {
      for (const [k, v] of Object.entries(req.max)) {
        const value = (stats as Record<string, number>)[k] ?? 0;
        if (value > v) missing += value - v;
      }
    }
    return missing;
  };

  const meetsRule = (
    req: { min?: Record<string, number>; max?: Record<string, number> },
  ) => missingScore(req) === 0;

  for (const rule of rules) {
    if (meetsRule(rule)) {
      return {
        title: rule.title,
        text: `${reason} ${rule.text}`,
      };
    }
  }

  const nearRule = rules.find((rule) => {
    const missing = missingScore(rule);
    return missing > 0 && missing <= 2;
  });
  if (nearRule) {
    return {
      title: `Майже ${nearRule.title}`,
      text: `${reason} Ти був зовсім близько до ролі "${nearRule.title}". Ще трохи зусиль — і ти досяг би цієї мети.`,
    };
  }

  if (stats.money <= 0 && stats.reputation <= 0) {
    return {
      title: "Бомж",
      text: `${reason} Ти залишаєшся на самому дні, без статку й підтримки.`,
    };
  }
  if (stats.money <= 3) {
    return {
      title: "Бідняк",
      text: `${reason} Ти виживаєш важкою працею, але багатства так і не здобуваєш.`,
    };
  }
  return {
    title: "Селянин",
    text: `${reason} Ти живеш скромно, тримаючись простого життя.`,
  };
};
