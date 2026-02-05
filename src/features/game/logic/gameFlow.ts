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
  seenScenes?: Set<string>,
) => {
  let fallback: { scene: Scene; index: number } | null = null;
  const preferredPhaseIndex = phaseOrder.indexOf(phase);
  for (let pass = 0; pass < 2; pass += 1) {
    for (let i = startIndex; i < deck.length; i += 1) {
      const scene = deck[i];
      if (seenScenes && seenScenes.has(scene.id)) {
        continue;
      }
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
  return null;
};

export const getEnding = (stats: Stats, reason: string) => {
  const repTone =
    stats.reputation <= -5
      ? "Люди ставляться до тебе з недовірою й страхом."
      : stats.reputation <= -2
      ? "Чутки про тебе ходять недобрі."
      : stats.reputation >= 12
      ? "Про тебе говорять із повагою."
      : "";
  const karmaTone =
    stats.karma <= -5
      ? "Ти пройшов слизькою стежкою, і це лишило тінь на твоєму імені."
      : stats.karma <= -2
      ? "Твої рішення були суворими й не завжди чесними."
      : stats.karma >= 3
      ? "Ти зберіг людяність навіть у складні часи."
      : "";
  const tone = [repTone, karmaTone].filter(Boolean).join(" ");
  const toneKind =
    stats.reputation <= -2 || stats.karma <= -2
      ? "dark"
      : stats.reputation >= 12 || stats.karma >= 3
      ? "light"
      : "neutral";
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
      text: "Ти входиш у коло землевласників і керуєш справами з повагою та впливом.",
      min: { money: 60, reputation: 40 },
    },
    {
      key: "merchant",
      title: "Купець",
      text: "Ти будуєш власну справу й стаєш знаним торговцем у місті.",
      min: { money: 30, reputation: 10 },
    },
    {
      key: "knight",
      title: "Лицар",
      text: "Ти здобуваєш славу й стаєш воїном, про якого говорять із повагою.",
      min: { skill: 12, reputation: 10 },
    },
    {
      key: "artisan",
      title: "Ремісник",
      text: "Ти стаєш майстром, до якого йдуть за якісною роботою.",
      min: { skill: 10, money: 12 },
    },
    {
      key: "guard",
      title: "Служака",
      text: "Ти знаходиш своє місце у службі та заробляєш довіру.",
      min: { skill: 9, reputation: 12 },
    },
    {
      key: "monk",
      title: "Монах",
      text: "Ти обираєш спокій і служіння, знаходячи сенс у тиші.",
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
        text: `${reason} ${rule.text}${tone ? ` ${tone}` : ""}`,
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
      text: `${reason} Ти був зовсім близько до ролі "${nearRule.title}". Ще трохи зусиль — і ти досяг би цієї мети.${tone ? ` ${tone}` : ""}`,
    };
  }

  if (stats.money <= 0 && stats.reputation <= 0) {
    return {
      title: "Бомж",
      text: `${reason} Ти залишаєшся на самому дні, без статку й підтримки.${tone ? ` ${tone}` : ""}`,
    };
  }
  if (stats.money <= 3) {
    const base =
      toneKind === "dark"
        ? "Ти виживаєш важкою працею, але твоє імʼя має тінь."
        : "Ти виживаєш важкою працею, але багатства так і не здобуваєш.";
    return {
      title: "Бідняк",
      text: `${reason} ${base}${tone ? ` ${tone}` : ""}`,
    };
  }
  const peasantBase =
    toneKind === "dark"
      ? "Ти живеш скромно, але твоє минуле кидає тінь на спокій."
      : "Ти живеш скромно, тримаючись простого життя.";
  return {
    title: "Селянин",
    text: `${reason} ${peasantBase}${tone ? ` ${tone}` : ""}`,
  };
};
