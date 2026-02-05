import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Dimensions, FlatList, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ChoiceDetailModal from "@/src/features/game/components/ChoiceDetailModal";
import ResultModal from "@/src/features/game/components/ResultModal";
import WeatherOverlay from "@/src/features/game/components/WeatherOverlay";
import { characters } from "@/src/features/game/data/characters";
import { getEnding } from "@/src/features/game/logic/gameFlow";
import {
  createGameStateFromStats,
  createSeededRng,
  resolveChoice,
  rollInitialLuck,
  type GameState,
} from "@/src/features/game/logic/engine";
import ChooseCharacterScreen from "@/src/features/game/screens/ChooseCharacterScreen";
import GameScreen from "@/src/features/game/screens/GameScreen";
import StartScreen from "@/src/features/game/screens/StartScreen";
import { styles } from "@/src/features/game/styles";
import {
  MAX_TURNS,
  SEASON_TURNS,
  defaultStats,
  seasonUa,
  stageUa,
} from "@/src/shared/constants";
import type { Character, Choice, Effects, WorldEvent } from "@/src/shared/types";
import {
  getChance,
  normalizeStats,
  seasonFromTurn,
  stageLabel,
} from "@/src/shared/utils";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(
    null,
  );
  const [currentCharacterIndex, setCurrentCharacterIndex] = useState(0);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const initialRng = useRef(createSeededRng()).current;
  const rngRef = useRef(initialRng.rng);
  const [gameState, setGameState] = useState<GameState>(() =>
    createGameStateFromStats({
      stats: defaultStats,
      rng: initialRng.rng,
      effectType: null,
      effectUntilTurn: 0,
    }),
  );
  const stage = stageLabel(gameState.stats);
  const season = seasonFromTurn(gameState.turn);
  const turnsToNextSeason =
    SEASON_TURNS - ((gameState.turn - 1) % SEASON_TURNS);
  const [screen, setScreen] = useState<"start" | "choose" | "game">("start");
  const [result, setResult] = useState<{
    title: string;
    text: string;
    deltas: Effects;
    moneyBreakdown?: { label: string; value: number }[];
    event?: WorldEvent;
  } | null>(null);
  const characterListRef = useRef<FlatList<Character>>(null);
  const characterScrollX = useRef(new Animated.Value(0)).current;
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(
    null,
  );
  const [choiceDetail, setChoiceDetail] = useState<{
    choice: Choice;
    chance: number;
  } | null>(null);

  const safeStats = normalizeStats(gameState.stats);
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
  const ending = gameState.gameOver
    ? getEnding(gameState.stats, gameState.endingReason)
    : null;
  const turnLabel = `Хід ${Math.min(
    gameState.turn,
    MAX_TURNS,
  )} / ${MAX_TURNS} · Етап: ${stageUa[stage]} · ${
    seasonUa[season]
  } · До наступної: ${turnsToNextSeason}`;

  useEffect(() => {
    if (!Number.isFinite(gameState.stats.luck)) {
      setGameState((prev) => ({
        ...prev,
        stats: normalizeStats(prev.stats),
      }));
    }
  }, [gameState.stats.luck]);

  const chanceMap = useMemo(() => {
    return gameState.scene.choices.reduce<Record<string, number>>(
      (acc, choice) => {
      acc[choice.id] = getChance(choice, safeStats);
      return acc;
    },
    {});
  }, [gameState.scene, safeStats]);

  const handleChoice = (choice: Choice) => {
    if (gameState.gameOver) return;
    if (choice.minHealth && safeStats.health < choice.minHealth) return;
    const { nextState, result: nextResult } = resolveChoice(
      gameState,
      choice,
      rngRef.current,
    );
    setGameState(nextState);
    setResult(nextResult);
  };

  const handleStart = () => {
    const picked = characters[currentCharacterIndex] ?? selectedCharacter;
    if (!picked) return;
    setSelectedCharacter(picked);
    const freshRng = createSeededRng();
    rngRef.current = freshRng.rng;
    const startingStats = {
      ...picked.stats,
      luck: rollInitialLuck(freshRng.rng),
    };
    const nextState = createGameStateFromStats({
      stats: normalizeStats(startingStats),
      characterId: picked.id,
      rng: freshRng.rng,
      effectType: "leaves",
      effectUntilTurn: 999,
      snowIntensity: "gentle",
    });
    setGameState(nextState);
    setResult(null);
    setScreen("game");
  };

  const resetLife = () => {
    const baseStats = selectedCharacter
      ? { ...selectedCharacter.stats }
      : { ...defaultStats };
    const freshRng = createSeededRng();
    rngRef.current = freshRng.rng;
    const resetStats = {
      ...baseStats,
      luck: rollInitialLuck(freshRng.rng),
    };
    const nextState = createGameStateFromStats({
      stats: normalizeStats(resetStats),
      characterId: selectedCharacter?.id ?? null,
      rng: freshRng.rng,
      effectType: "leaves",
      effectUntilTurn: 999,
      snowIntensity: "gentle",
    });
    setGameState(nextState);
    setScreen("choose");
    setResult(null);
    setDetailCharacter(null);
  };

  const exitToStart = () => {
    const freshRng = createSeededRng();
    rngRef.current = freshRng.rng;
    const nextState = createGameStateFromStats({
      stats: normalizeStats(defaultStats),
      rng: freshRng.rng,
      effectType: null,
      effectUntilTurn: 0,
    });
    setGameState(nextState);
    setScreen("start");
    setResult(null);
    setSelectedCharacter(null);
    setDetailCharacter(null);
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
        stats={gameState.stats}
        statLabels={statLabels}
        statsExpanded={statsExpanded}
        onToggleStats={() => setStatsExpanded((prev) => !prev)}
        turnLabel={turnLabel}
        heroImage={selectedCharacter?.image}
        scene={gameState.scene}
        gameOver={gameState.gameOver}
        ending={ending}
        log={gameState.log}
        chanceMap={chanceMap}
        onChoose={handleChoice}
        onShowChoiceDetail={(choice, chance) =>
          setChoiceDetail({ choice, chance })
        }
        onResetLife={resetLife}
        onExit={exitToStart}
      />
      <WeatherOverlay
        effectType={gameState.effectType}
        width={weatherWidth}
        height={weatherHeight}
        snowIntensity={gameState.snowIntensity}
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
