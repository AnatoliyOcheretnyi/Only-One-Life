import { scenes } from "@/src/features/game/data/scenes";
import type { Scene, Season, Stage, Stats } from "@/src/shared/types";
import { canUseStage, isSceneForSeason, shuffle } from "@/src/shared/utils";

export const buildSceneDeck = () => {
  const buckets: Record<Stage, Scene[]> = {
    Early: [],
    Rising: [],
    Established: [],
    Noble: [],
  };
  scenes.forEach((scene) => {
    const stage = scene.minStage ?? "Early";
    buckets[stage].push(scene);
  });
  return [
    ...shuffle(buckets.Early),
    ...shuffle(buckets.Rising),
    ...shuffle(buckets.Established),
    ...shuffle(buckets.Noble),
  ];
};

export const getNextScene = (
  deck: Scene[],
  startIndex: number,
  stage: Stage,
  season: Season,
  characterId?: string | null,
) => {
  let fallback: { scene: Scene; index: number } | null = null;
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
    if (!fallback) {
      fallback = { scene, index: i };
    }
    if (!scene.minStage) return { scene, index: i };
    if (canUseStage(stage, scene.minStage)) {
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
