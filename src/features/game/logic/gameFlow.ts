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
      if (scene.phase && phaseOrder.indexOf(scene.phase) > preferredPhaseIndex) {
        continue;
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
      return { scene, index: i };
    }
  }
  return fallback;
};

export const getEnding = (stats: Stats, reason: string) => {
  if (stats.health <= 0) {
    return {
      title: "Смерть",
      text: `${reason} Ти помираєш від виснаження та травм.`,
    };
  }

  if (stats.money >= 55 && stats.reputation >= 35) {
    return {
      title: "Феодал",
      text: `${reason} Ти завершуєш життя впливовим феодалом із землею та владою.`,
    };
  }
  if (stats.money >= 35 && stats.reputation >= 15) {
    return {
      title: "Купець",
      text: `${reason} Ти стаєш заможним купцем із власною справою.`,
    };
  }
  if (stats.skill >= 12 && stats.reputation >= 12) {
    return {
      title: "Лицар",
      text: `${reason} Ти здобуваєш славу і завершуєш життя як лицар або воїн.`,
    };
  }
  if (stats.reputation >= 18 && stats.money <= 10) {
    return {
      title: "Монах",
      text: `${reason} Ти відходиш від мирського й стаєш монахом.`,
    };
  }

  const best = Math.max(stats.money, stats.skill, stats.reputation);
  if (best === stats.money) {
    return {
      title: "Купець",
      text: `${reason} Ти йдеш шляхом торгівлі й стаєш купцем.`,
    };
  }
  if (best === stats.skill) {
    return {
      title: "Лицар",
      text: `${reason} Твоя сила веде тебе шляхом воїна.`,
    };
  }
  if (best === stats.reputation) {
    return {
      title: "Монах",
      text: `${reason} Ти обираєш служіння й тишу.`,
    };
  }

  return {
    title: "Смерть",
    text: `${reason} Ти помираєш бідним і майже забутим.`,
  };
};
