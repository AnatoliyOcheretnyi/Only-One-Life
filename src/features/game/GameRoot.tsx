import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ChoiceDetailModal from "@/src/features/game/components/ChoiceDetailModal";
import ResultModal from "@/src/features/game/components/ResultModal";
import WeatherOverlay from "@/src/features/game/components/WeatherOverlay";
import { characters } from "@/src/features/game/data/characters";
import { events } from "@/src/features/game/data/events";
import { effectFromText, snowIntensityFromText } from "@/src/features/game/effects";
import { buildSceneDeck, getEnding, getNextScene } from "@/src/features/game/logic/gameFlow";
import ChooseCharacterScreen from "@/src/features/game/screens/ChooseCharacterScreen";
import GameScreen from "@/src/features/game/screens/GameScreen";
import StartScreen from "@/src/features/game/screens/StartScreen";
import { styles } from "@/src/features/game/styles";
import {
  BASE_UPKEEP,
  EVENT_EVERY_TURNS,
  MAX_TURNS,
  SEASON_TURNS,
  defaultStats,
  seasonUa,
  stageUa,
} from "@/src/shared/constants";
import type {
  Character,
  Choice,
  Effects,
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

const initialSceneDeck = buildSceneDeck();
const initialEventDeck = shuffle(events);

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null,
  );
  const [currentCharacterIndex, setCurrentCharacterIndex] = useState(0);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [stats, setStats] = useState<Stats>(defaultStats);
  const [turn, setTurn] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const stage = stageLabel(stats);
  const season = seasonFromTurn(turn);
  const turnsToNextSeason = SEASON_TURNS - ((turn - 1) % SEASON_TURNS);
  const [sceneDeck, setSceneDeck] = useState<Scene[]>(() => initialSceneDeck);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [scene, setScene] = useState<Scene>(() => {
    const next = getNextScene(
      initialSceneDeck,
      0,
      stage,
      seasonFromTurn(1),
      selectedCharacter?.id,
    );
    return next?.scene ?? initialSceneDeck[0];
  });
  const [gameOver, setGameOver] = useState(false);
  const [endingReason, setEndingReason] = useState<string>("");
  const [screen, setScreen] = useState<"start" | "choose" | "game">("start");
  const [result, setResult] = useState<{
    title: string;
    text: string;
    deltas: Effects;
    moneyBreakdown?: { label: string; value: number }[];
    event?: WorldEvent;
  } | null>(null);
  const [eventDeck, setEventDeck] = useState<WorldEvent[]>(
    () => initialEventDeck,
  );
  const [eventIndex, setEventIndex] = useState(0);
  const characterListRef = useRef<FlatList<Character>>(null);
  const characterScrollX = useRef(new Animated.Value(0)).current;
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(
    null,
  );
  const [choiceDetail, setChoiceDetail] = useState<{
    choice: Choice;
    chance: number;
  } | null>(null);
  const [effectType, setEffectType] = useState<
    "rain" | "snow" | "leaves" | null
  >(null);
  const [effectUntilTurn, setEffectUntilTurn] = useState<number>(0);
  const [snowIntensity, setSnowIntensity] = useState<"gentle" | "blizzard">(
    "gentle",
  );

  const rollInitialLuck = () => Math.floor(Math.random() * 5);
  const safeStats = normalizeStats(stats);
  const weatherWidth = Dimensions.get("window").width;
  const weatherHeight = 520;
  const statLabels = statsExpanded
    ? {
        money: "Гроші",
        reputation: "Репутація",
        skill: "Сила",
        health: "Здоровʼя",
        hungerDebt: "Голод",
        fatigue: "Втома",
        luck: "Удача",
        age: "Вік",
        family: "Сімʼя",
      }
    : {
        money: "💰",
        reputation: "⭐",
        skill: "💪",
        health: "❤️",
        hungerDebt: "🍗",
        fatigue: "😮‍💨",
        luck: "🍀",
        age: "⏳",
        family: "👪",
      };
  const insetTop = Math.max(12, insets.top + 6);
  const ending = gameOver ? getEnding(stats, endingReason) : null;
  const turnLabel = `Хід ${Math.min(turn, MAX_TURNS)} / ${MAX_TURNS} · Етап: ${
    stageUa[stage]
  } · ${seasonUa[season]} · До наступної: ${turnsToNextSeason}`;

  useEffect(() => {
    if (!Number.isFinite(stats.luck)) {
      setStats((prev) => normalizeStats(prev));
    }
  }, [stats.luck]);

  useEffect(() => {
    const sceneEffect = effectFromText(`${scene.title} ${scene.text}`) as
      | "rain"
      | "snow"
      | "leaves"
      | null;
    if (sceneEffect && (!effectType || turn > effectUntilTurn)) {
      setEffectType(sceneEffect);
      setEffectUntilTurn(turn + 1);
      if (sceneEffect === "snow") {
        setSnowIntensity(
          snowIntensityFromText(`${scene.title} ${scene.text}`),
        );
      }
    }
  }, [scene, turn, effectType, effectUntilTurn]);

  const chanceMap = useMemo(() => {
    return scene.choices.reduce<Record<string, number>>((acc, choice) => {
      acc[choice.id] = getChance(choice, safeStats);
      return acc;
    }, {});
  }, [scene, safeStats]);

  const handleChoice = (choice: Choice) => {
    if (gameOver) return;
    if (choice.minHealth && safeStats.health < choice.minHealth) return;
    const chance = chanceMap[choice.id];
    const success = Math.random() < chance;
    const effects = success ? choice.success : choice.fail;
    const adjustedEffects = { ...effects };
    if (success && adjustedEffects.money && adjustedEffects.money > 0) {
      const skillBonus = Math.min(2, Math.floor(safeStats.skill / 5));
      const luckBonus = Math.min(3, Math.floor(safeStats.luck / 2));
      const variability = Math.random() < 0.45 ? 1 : 0;
      adjustedEffects.money += skillBonus + luckBonus + variability;
    }
    const afterChoice = applyEffects(safeStats, adjustedEffects);
    const upkeep = BASE_UPKEEP - afterChoice.family;
    const upkeepEffects: Effects = { money: upkeep };
    const nextStats = applyEffects(afterChoice, upkeepEffects);
    nextStats.age += 1;
    const nextStage = stageLabel(nextStats);
    const resultText = success ? choice.successText : choice.failText;
    let resultLine = `Хід ${turn}: ${resultText} (утримання ${upkeep})`;

    const nextTurn = turn + 1;
    let eventResult: WorldEvent | undefined;
    if (nextTurn % EVENT_EVERY_TURNS === 0) {
      const deck = eventIndex >= eventDeck.length ? shuffle(events) : eventDeck;
      const index = eventIndex >= eventDeck.length ? 0 : eventIndex;
      if (deck !== eventDeck) {
        setEventDeck(deck);
        setEventIndex(index);
      }
      const currentEvent = deck[index];
      eventResult = currentEvent;
      const updated = applyEffects(nextStats, currentEvent.effects);
      nextStats.money = updated.money;
      nextStats.reputation = updated.reputation;
      nextStats.skill = updated.skill;
      nextStats.health = updated.health;
      nextStats.age = updated.age;
      nextStats.luck = updated.luck;
      setEventIndex((prev) => prev + 1);
      setLog((prev) =>
        [`Подія: ${currentEvent.title}. ${currentEvent.text}`, ...prev].slice(
          0,
          6,
        ),
      );
    }

    let newEffect: "rain" | "snow" | "leaves" | null = null;
    if (eventResult) {
      newEffect = effectFromText(`${eventResult.title} ${eventResult.text}`) as
        | "rain"
        | "snow"
        | "leaves"
        | null;
    }
    if (!newEffect) {
      newEffect = effectFromText(`${scene.title} ${scene.text}`) as
        | "rain"
        | "snow"
        | "leaves"
        | null;
    }
    if (!newEffect && nextTurn % 5 === 0) {
      newEffect = "leaves";
    }
    if (newEffect) {
      setEffectType(newEffect);
      setEffectUntilTurn(nextTurn + (eventResult ? 2 : 1));
      if (newEffect === "snow") {
        const sourceText = eventResult
          ? `${eventResult.title} ${eventResult.text}`
          : `${scene.title} ${scene.text}`;
        setSnowIntensity(snowIntensityFromText(sourceText));
      }
    } else if (effectType && nextTurn > effectUntilTurn) {
      setEffectType(null);
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
      hungerHealthLoss = nextStats.hungerDebt;
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

    const luckRoll = Math.random();
    let luckDelta = 0;
    if (luckRoll < 0.15) {
      luckDelta = 1;
    } else if (luckRoll > 0.92) {
      luckDelta = -1;
    }
    if (luckDelta !== 0) {
      nextStats.luck += luckDelta;
    }

    let lifeOver = nextStats.health <= 0 || nextTurn > MAX_TURNS;
    if (nextStats.health <= 0) {
      if (nextStats.hungerDebt > 0) {
        setEndingReason("Голод виснажив тебе до межі.");
      } else {
        setEndingReason(
          "Твоє здоровʼя впало до нуля через виснаження, травми та наслідки рішень.",
        );
      }
    } else if (nextTurn > MAX_TURNS) {
      setEndingReason("Твоє життя добігло кінця після повного циклу ходів.");
    }
    const nextScenePick = lifeOver
      ? null
      : getNextScene(
          sceneDeck,
          sceneIndex + 1,
          nextStage,
          seasonFromTurn(nextTurn),
          selectedCharacter?.id,
        );
    if (!lifeOver && !nextScenePick) {
      lifeOver = true;
      setEndingReason("Ти пройшов усі 20 кроків життя.");
    }
    const nextScene = nextScenePick?.scene ?? scene;

    setStats(nextStats);
    setTurn(nextTurn);
    setLog((prev) => [resultLine, ...prev].slice(0, 6));
    if (nextScenePick) {
      setScene(nextScenePick.scene);
      setSceneIndex(nextScenePick.index);
    } else {
      setScene(nextScene);
    }
    setGameOver(lifeOver);
    if (eventResult?.effects.money) {
      moneyBreakdown.push({
        label: `Подія: ${eventResult.title}`,
        value: eventResult.effects.money,
      });
    }
    const moneyNet = moneyBreakdown.reduce((sum, item) => sum + item.value, 0);
    setResult({
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
    });
  };

  const handleStart = () => {
    const picked = characters[currentCharacterIndex] ?? selectedCharacter;
    if (!picked) return;
    setSelectedCharacter(picked);
    const startingStats = { ...picked.stats };
    startingStats.luck = rollInitialLuck();
    const startingStage = stageLabel(startingStats);
    const startingSeason = seasonFromTurn(1);
    setStats(normalizeStats(startingStats));
    setTurn(1);
    setLog([]);
    const freshSceneDeck = buildSceneDeck();
    const firstScene = getNextScene(
      freshSceneDeck,
      0,
      startingStage,
      startingSeason,
      picked.id,
    );
    setSceneDeck(freshSceneDeck);
    setSceneIndex(firstScene?.index ?? 0);
    setScene(firstScene?.scene ?? freshSceneDeck[0]);
    setEventDeck(shuffle(events));
    setEventIndex(0);
    setGameOver(false);
    setResult(null);
    setEffectType("leaves");
    setEffectUntilTurn(999);
    setSnowIntensity("gentle");
    setScreen("game");
  };

  const resetLife = () => {
    const resetStats = selectedCharacter
      ? { ...selectedCharacter.stats }
      : { ...defaultStats };
    resetStats.luck = rollInitialLuck();
    const resetStage = stageLabel(resetStats);
    const resetSeason = seasonFromTurn(1);
    setStats(normalizeStats(resetStats));
    setTurn(1);
    setLog([]);
    const freshSceneDeck = buildSceneDeck();
    const firstScene = getNextScene(
      freshSceneDeck,
      0,
      resetStage,
      resetSeason,
      selectedCharacter?.id,
    );
    setSceneDeck(freshSceneDeck);
    setSceneIndex(firstScene?.index ?? 0);
    setScene(firstScene?.scene ?? freshSceneDeck[0]);
    setGameOver(false);
    setScreen("choose");
    setResult(null);
    setEventDeck(shuffle(events));
    setEventIndex(0);
    setDetailCharacter(null);
    setEndingReason("");
    setEffectType("leaves");
    setEffectUntilTurn(999);
    setSnowIntensity("gentle");
  };

  const exitToStart = () => {
    setStats(normalizeStats(defaultStats));
    setTurn(1);
    setLog([]);
    const freshDeck = buildSceneDeck();
    setSceneDeck(freshDeck);
    setSceneIndex(0);
    setScene(freshDeck[0]);
    setGameOver(false);
    setScreen("start");
    setResult(null);
    setEventDeck(shuffle(events));
    setEventIndex(0);
    setSelectedCharacter(null);
    setDetailCharacter(null);
    setEndingReason("");
  };

  if (screen === "start") {
    return (
      <StartScreen insetTop={insetTop} onStart={() => setScreen("choose")} />
    );
  }

  if (screen === "choose") {
    return (
      <ChooseCharacterScreen
        insetTop={insetTop}
        characters={characters}
        onIndexChange={setCurrentCharacterIndex}
        onStart={handleStart}
        detailCharacter={detailCharacter}
        onShowDetail={setDetailCharacter}
        onCloseDetail={() => setDetailCharacter(null)}
        listRef={characterListRef}
        scrollX={characterScrollX}
      />
    );
  }

  return (
    <View style={styles.gameScreen}>
      <GameScreen
        stats={stats}
        statLabels={statLabels}
        statsExpanded={statsExpanded}
        onToggleStats={() => setStatsExpanded((prev) => !prev)}
        turnLabel={turnLabel}
        heroImage={selectedCharacter?.image}
        scene={scene}
        gameOver={gameOver}
        ending={ending}
        log={log}
        chanceMap={chanceMap}
        onChoose={handleChoice}
        onShowChoiceDetail={(choice, chance) =>
          setChoiceDetail({ choice, chance })
        }
        onResetLife={resetLife}
        onExit={exitToStart}
      />
      <WeatherOverlay
        effectType={effectType}
        width={weatherWidth}
        height={weatherHeight}
        snowIntensity={snowIntensity}
      />
      <ResultModal result={result} onClose={() => setResult(null)} />
      <ChoiceDetailModal
        detail={choiceDetail}
        safeStats={safeStats}
        onClose={() => setChoiceDetail(null)}
      />
    </View>
  );
}
