import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/src/components/themed-text';
import { ThemedView } from '@/src/components/themed-view';

import Delta from '@/src/features/game/components/Delta';
import StatInline from '@/src/features/game/components/StatInline';
import StatPill from '@/src/features/game/components/StatPill';
import StatRow from '@/src/features/game/components/StatRow';
import { styles } from '@/src/features/game/styles';
import type { Character, Choice, Effects, Scene, Season, Stage, Stats, WorldEvent } from '@/src/shared/types';
import { characters } from '@/src/features/game/data/characters';
import { scenes } from '@/src/features/game/data/scenes';
import { events } from '@/src/features/game/data/events';
import { EFFECT_TEXTURES, effectFromText } from '@/src/features/game/effects';
import {
  BASE_UPKEEP,
  EVENT_EVERY_TURNS,
  MAX_TURNS,
  SEASON_TURNS,
  defaultStats,
  seasonUa,
  stageUa,
} from '@/src/shared/constants';
import {
  applyEffects,
  canUseStage,
  getChance,
  getMoneyRange,
  isNeutralChoice,
  isSceneForSeason,
  normalizeStats,
  seasonFromTurn,
  stageLabel,
  shuffle,
} from '@/src/shared/utils';

const buildSceneDeck = () => {
  const buckets: Record<Stage, Scene[]> = {
    Early: [],
    Rising: [],
    Established: [],
    Noble: [],
  };
  scenes.forEach((scene) => {
    const stage = scene.minStage ?? 'Early';
    buckets[stage].push(scene);
  });
  return [
    ...shuffle(buckets.Early),
    ...shuffle(buckets.Rising),
    ...shuffle(buckets.Established),
    ...shuffle(buckets.Noble),
  ];
};

const getNextScene = (
  deck: Scene[],
  startIndex: number,
  stage: Stage,
  season: Season,
  characterId?: string | null
) => {
  let fallback: { scene: Scene; index: number } | null = null;
  for (let i = startIndex; i < deck.length; i += 1) {
    const scene = deck[i];
    if (scene.forCharacter && characterId && !scene.forCharacter.includes(characterId)) {
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

const initialSceneDeck = buildSceneDeck();
const initialEventDeck = shuffle(events);

const getEnding = (stats: Stats, reason: string) => {
  if (stats.health <= 0) {
    return {
      title: 'Смерть',
      text: `${reason} Ти помираєш від виснаження та травм.`,
    };
  }

  if (stats.money >= 55 && stats.reputation >= 35) {
    return {
      title: 'Феодал',
      text: `${reason} Ти завершуєш життя впливовим феодалом із землею та владою.`,
    };
  }
  if (stats.money >= 35 && stats.reputation >= 15) {
    return {
      title: 'Купець',
      text: `${reason} Ти стаєш заможним купцем із власною справою.`,
    };
  }
  if (stats.skill >= 12 && stats.reputation >= 12) {
    return {
      title: 'Лицар',
      text: `${reason} Ти здобуваєш славу і завершуєш життя як лицар або воїн.`,
    };
  }
  if (stats.reputation >= 18 && stats.money <= 10) {
    return {
      title: 'Монах',
      text: `${reason} Ти відходиш від мирського й стаєш монахом.`,
    };
  }

  const best = Math.max(stats.money, stats.skill, stats.reputation);
  if (best === stats.money) {
    return {
      title: 'Купець',
      text: `${reason} Ти йдеш шляхом торгівлі й стаєш купцем.`,
    };
  }
  if (best === stats.skill) {
    return {
      title: 'Лицар',
      text: `${reason} Твоя сила веде тебе шляхом воїна.`,
    };
  }
  if (best === stats.reputation) {
    return {
      title: 'Монах',
      text: `${reason} Ти обираєш служіння й тишу.`,
    };
  }

  return {
    title: 'Смерть',
    text: `${reason} Ти помираєш бідним і майже забутим.`,
  };
};

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
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
      selectedCharacter?.id
    );
    return next?.scene ?? initialSceneDeck[0];
  });
  const [gameOver, setGameOver] = useState(false);
  const [endingReason, setEndingReason] = useState<string>('');
  const [screen, setScreen] = useState<'start' | 'choose' | 'game'>('start');
  const [result, setResult] = useState<{
    title: string;
    text: string;
    deltas: Effects;
    moneyBreakdown?: { label: string; value: number }[];
    event?: WorldEvent;
  } | null>(null);
  const [eventDeck, setEventDeck] = useState<WorldEvent[]>(() => initialEventDeck);
  const [eventIndex, setEventIndex] = useState(0);
  const characterListRef = useRef<FlatList<Character>>(null);
  const characterScrollX = useRef(new Animated.Value(0)).current;
  const effectShift = useRef(new Animated.Value(0)).current;
  const [detailCharacter, setDetailCharacter] = useState<Character | null>(null);
  const [choiceDetail, setChoiceDetail] = useState<{ choice: Choice; chance: number } | null>(
    null
  );
  const [effectType, setEffectType] = useState<'rain' | 'snow' | 'leaves' | null>(null);
  const [effectUntilTurn, setEffectUntilTurn] = useState<number>(0);

  const rollInitialLuck = () => Math.floor(Math.random() * 5);
  const safeStats = normalizeStats(stats);

  useEffect(() => {
    if (!Number.isFinite(stats.luck)) {
      setStats((prev) => normalizeStats(prev));
    }
  }, [stats.luck]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(effectShift, {
          toValue: 1,
          duration: 7000,
          useNativeDriver: true,
        }),
        Animated.timing(effectShift, {
          toValue: 0,
          duration: 7000,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [effectShift]);

  useEffect(() => {
    const sceneEffect = effectFromText(`${scene.title} ${scene.text}`) as
      | 'rain'
      | 'snow'
      | 'leaves'
      | null;
    if (sceneEffect && (!effectType || turn > effectUntilTurn)) {
      setEffectType(sceneEffect);
      setEffectUntilTurn(turn + 1);
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
      setLog((prev) => [
        `Подія: ${currentEvent.title}. ${currentEvent.text}`,
        ...prev,
      ].slice(0, 6));
    }

    let newEffect: 'rain' | 'snow' | 'leaves' | null = null;
    if (eventResult) {
      newEffect = effectFromText(`${eventResult.title} ${eventResult.text}`) as
        | 'rain'
        | 'snow'
        | 'leaves'
        | null;
    }
    if (!newEffect) {
      newEffect = effectFromText(`${scene.title} ${scene.text}`) as
        | 'rain'
        | 'snow'
        | 'leaves'
        | null;
    }
    if (!newEffect && nextTurn % 5 === 0) {
      newEffect = 'leaves';
    }
    if (newEffect) {
      setEffectType(newEffect);
      setEffectUntilTurn(nextTurn + (eventResult ? 2 : 1));
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
      moneyBreakdown.push({ label: 'Результат вибору', value: adjustedEffects.money });
    }
    moneyBreakdown.push({ label: 'Утримання', value: upkeep });
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
        moneyBreakdown.push({ label: 'Їжа', value: -pay });
        resultLine += `, їжа -${pay}`;
      }
    }

    const effort = choice.effort ?? 'neutral';
    let fatigueAuto = effort === 'physical' ? 1 : -1;
    if (effort === 'rest') fatigueAuto = -2;
    nextStats.fatigue += fatigueAuto;
    if (nextStats.fatigue < 0) nextStats.fatigue = 0;
    if (nextStats.fatigue >= 6) {
      nextStats.health -= 1;
      resultLine += ', втома -1 здоровʼя';
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
        setEndingReason('Голод виснажив тебе до межі.');
      } else {
        setEndingReason(
          'Твоє здоровʼя впало до нуля через виснаження, травми та наслідки рішень.'
        );
      }
    } else if (nextTurn > MAX_TURNS) {
      setEndingReason('Твоє життя добігло кінця після повного циклу ходів.');
    }
    const nextScenePick = lifeOver
      ? null
      : getNextScene(
          sceneDeck,
          sceneIndex + 1,
          nextStage,
          seasonFromTurn(nextTurn),
          selectedCharacter?.id
        );
    if (!lifeOver && !nextScenePick) {
      lifeOver = true;
      setEndingReason('Ти пройшов усі 20 кроків життя.');
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
      title: success ? 'Успіх' : 'Невдача',
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
    if (!selectedCharacter) return;
    const startingStats = { ...selectedCharacter.stats };
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
      selectedCharacter.id
    );
    setSceneDeck(freshSceneDeck);
    setSceneIndex(firstScene?.index ?? 0);
    setScene(firstScene?.scene ?? freshSceneDeck[0]);
    setEventDeck(shuffle(events));
    setEventIndex(0);
    setGameOver(false);
    setResult(null);
    setEffectType(null);
    setEffectUntilTurn(0);
    setScreen('game');
  };

  const resetLife = () => {
    const resetStats = selectedCharacter ? { ...selectedCharacter.stats } : { ...defaultStats };
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
      selectedCharacter?.id
    );
    setSceneDeck(freshSceneDeck);
    setSceneIndex(firstScene?.index ?? 0);
    setScene(firstScene?.scene ?? freshSceneDeck[0]);
    setGameOver(false);
    setScreen('choose');
    setResult(null);
    setEventDeck(shuffle(events));
    setEventIndex(0);
    setDetailCharacter(null);
    setEndingReason('');
    setEffectType(null);
    setEffectUntilTurn(0);
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
    setScreen('start');
    setResult(null);
    setEventDeck(shuffle(events));
    setEventIndex(0);
    setSelectedCharacter(null);
    setDetailCharacter(null);
    setEndingReason('');
  };

  if (screen === 'start') {
    return (
      <ThemedView style={[styles.screen, { paddingTop: Math.max(12, insets.top + 6) }]}>
        <View style={styles.startHeroCompact}>
          <ThemedText type="title">Only One Life</ThemedText>
          <ThemedText style={styles.startText}>
            Одна спроба. Одне життя. Ніяких перезавантажень.
          </ThemedText>
          <View style={styles.startCard}>
            <ThemedText type="defaultSemiBold">Що на тебе чекає</ThemedText>
            <ThemedText style={styles.startBullet}>• Жорсткі вибори й наслідки</ThemedText>
            <ThemedText style={styles.startBullet}>• Ймовірності залежать від стану</ThemedText>
            <ThemedText style={styles.startBullet}>• Фінал — не бал, а роль у світі</ThemedText>
          </View>
          <Pressable onPress={() => setScreen('choose')} style={styles.primaryButton}>
            <ThemedText style={styles.primaryButtonText}>Старт</ThemedText>
          </Pressable>
        </View>
      </ThemedView>
    );
  }

  if (screen === 'choose') {
    const { width } = Dimensions.get('window');
    const cardWidth = Math.min(width - 64, 300);
    const cardGap = 12;
    const snapInterval = cardWidth + cardGap;
    return (
      <ThemedView
        style={[
          styles.screen,
          styles.screenCompact,
          { paddingTop: Math.max(12, insets.top + 6) },
        ]}>
        <View style={styles.startHeroCompact}>
          <ThemedText type="title">Обери персонажа</ThemedText>
          <ThemedText style={styles.startText}>
            Стартові стати визначають твої перші шанси.
          </ThemedText>
          <View style={styles.carouselWrap}>
            <Animated.FlatList
              ref={characterListRef}
              data={characters}
              keyExtractor={(item) => item.id}
              style={styles.characterScroll}
              contentContainerStyle={styles.characterList}
              horizontal
              snapToInterval={snapInterval}
              snapToAlignment="start"
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: characterScrollX } } }],
                { useNativeDriver: true }
              )}
              scrollEventThrottle={16}
              getItemLayout={(_, index) => ({
                length: snapInterval,
                offset: snapInterval * index,
                index,
              })}
              renderItem={({ item, index }) => {
                const active = item.id === selectedCharacter?.id;
                const inputRange = [
                  (index - 1) * snapInterval,
                  index * snapInterval,
                  (index + 1) * snapInterval,
                ];
                const scale = characterScrollX.interpolate({
                  inputRange,
                  outputRange: [0.96, 1, 0.96],
                  extrapolate: 'clamp',
                });
                const opacity = characterScrollX.interpolate({
                  inputRange,
                  outputRange: [0.7, 1, 0.7],
                  extrapolate: 'clamp',
                });
                return (
                  <Pressable
                    onPress={() => setSelectedCharacter(item)}
                    style={[
                      styles.characterCard,
                      { width: cardWidth, marginRight: cardGap },
                      active && styles.characterCardActive,
                    ]}>
                    <View style={styles.characterHeader}>
                      <ThemedText type="defaultSemiBold" style={styles.characterName}>
                        {item.name}
                      </ThemedText>
                      <View style={styles.roleChip}>
                        <ThemedText style={styles.roleChipText}>Старт</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.characterDesc}>{item.description}</ThemedText>
                    <View style={styles.characterStats}>
                      <StatPill label="Гроші" value={item.stats.money} />
                      <StatPill label="Репутація" value={item.stats.reputation} />
                      <StatPill label="Сила" value={item.stats.skill} />
                      <StatPill label="Здоровʼя" value={item.stats.health} />
                    </View>
                    <Pressable onPress={() => setDetailCharacter(item)} style={styles.selectButton}>
                      <ThemedText style={styles.selectButtonText}>Деталі</ThemedText>
                    </Pressable>
                  </Pressable>
                );
              }}
            />
          </View>
          <Pressable
            onPress={handleStart}
            style={[styles.primaryButton, !selectedCharacter && styles.primaryButtonDisabled]}
            disabled={!selectedCharacter}>
            <ThemedText style={styles.primaryButtonText}>Почати життя</ThemedText>
          </Pressable>
        </View>
        <View style={styles.characterPreviewWrap}>
          {characters.map((item, index) => {
            const inputRange = [
              (index - 1) * snapInterval,
              index * snapInterval,
              (index + 1) * snapInterval,
            ];
            const scale = characterScrollX.interpolate({
              inputRange,
              outputRange: [0.9, 1.05, 0.9],
              extrapolate: 'clamp',
            });
            const opacity = characterScrollX.interpolate({
              inputRange,
              outputRange: [0, 1, 0],
              extrapolate: 'clamp',
            });
            return (
              <Animated.Image
                key={item.id}
                source={item.image}
                style={[
                  styles.characterPreview,
                  { transform: [{ scale }], opacity },
                ]}
              />
            );
          })}
        </View>
        {detailCharacter ? (
          <View style={styles.resultOverlay}>
            <View style={styles.resultCard}>
              <View style={styles.resultHeader}>
                <ThemedText type="subtitle" style={styles.resultTitle}>
                  {detailCharacter.name}
                </ThemedText>
                <ThemedText style={styles.resultText}>{detailCharacter.lore}</ThemedText>
              </View>
              <View style={styles.deltaList}>
                <StatRow label="Гроші" value={detailCharacter.stats.money} />
                <StatRow label="Репутація" value={detailCharacter.stats.reputation} />
                <StatRow label="Сила/Вміння" value={detailCharacter.stats.skill} />
                <StatRow label="Здоровʼя" value={detailCharacter.stats.health} />
              </View>
              <View style={styles.choiceList}>
                <Pressable
                  onPress={() => {
                    setSelectedCharacter(detailCharacter);
                    setDetailCharacter(null);
                  }}
                  style={styles.resultButton}>
                  <ThemedText style={styles.resultButtonText}>Обрати цього персонажа</ThemedText>
                </Pressable>
                <Pressable onPress={() => setDetailCharacter(null)} style={styles.secondaryButton}>
                  <ThemedText style={styles.secondaryButtonText}>Закрити</ThemedText>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}
      </ThemedView>
    );
  }

  return (
    <View style={styles.gameScreen}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <ThemedText type="defaultSemiBold" style={styles.headerSubtitle}>
          Хід {Math.min(turn, MAX_TURNS)} / {MAX_TURNS} · Етап: {stageUa[stage]} ·{' '}
          {seasonUa[season]} · До наступної: {turnsToNextSeason}
        </ThemedText>
        <View style={styles.statsHeader}>
          <StatInline label="Гроші" value={stats.money} />
          <StatInline label="Репутація" value={stats.reputation} />
          <StatInline label="Сила" value={stats.skill} />
          <StatInline label="Здоровʼя" value={stats.health} />
          <StatInline label="Голод" value={stats.hungerDebt} />
          <StatInline label="Втома" value={stats.fatigue} />
          <StatInline label="Удача" value={stats.luck} />
          <StatInline label="Вік" value={stats.age} />
          <StatInline label="Сімʼя" value={stats.family} />
        </View>
      </ThemedView>
      {selectedCharacter ? (
        <ThemedView style={styles.heroCard}>
          <Image source={selectedCharacter.image} style={styles.heroImage} />
        </ThemedView>
      ) : null}


      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold">Сцена</ThemedText>
        <ThemedView style={styles.sceneCard}>
          {gameOver ? (
            <View style={styles.ending}>
              {(() => {
                const ending = getEnding(stats, endingReason);
                return (
                  <>
                    <ThemedText type="defaultSemiBold" style={styles.endingTitle}>
                      {ending.title}
                    </ThemedText>
                    <ThemedText>{ending.text}</ThemedText>
                  </>
                );
              })()}
              <Pressable onPress={resetLife} style={styles.primaryButton}>
                <ThemedText style={styles.primaryButtonText}>Почати інше життя</ThemedText>
              </Pressable>
              <Pressable onPress={exitToStart} style={styles.secondaryButton}>
                <ThemedText style={styles.secondaryButtonText}>Вийти</ThemedText>
              </Pressable>
            </View>
          ) : (
            <>
              <ThemedText type="subtitle">{scene.title}</ThemedText>
              <ThemedText style={styles.sceneText}>{scene.text}</ThemedText>
              <View style={styles.choiceGrid}>
                {scene.choices.map((choice) => {
                  const chance = Math.round(chanceMap[choice.id] * 100);
                  const neutral = isNeutralChoice(choice);
                  return (
                  <View key={choice.id} style={styles.choiceRow}>
                    <View style={styles.choiceRowText}>
                      <ThemedText type="defaultSemiBold">{choice.label}</ThemedText>
                      {!neutral ? (
                        <ThemedText style={styles.choiceChance}>Шанс: ~{chance}%</ThemedText>
                      ) : (
                        <ThemedText style={styles.choiceChance}>Без ризику</ThemedText>
                      )}
                    </View>
                    {choice.minHealth && stats.health < choice.minHealth ? (
                      <ThemedText style={styles.choiceLockedText}>
                        Потрібно здоровʼя {choice.minHealth}
                      </ThemedText>
                    ) : null}
                    <Pressable
                      onPress={() => handleChoice(choice)}
                      disabled={!!choice.minHealth && stats.health < choice.minHealth}
                      style={styles.choicePickCorner}>
                      <ThemedText style={styles.choicePickCornerText}>✓</ThemedText>
                    </Pressable>
                    <Pressable
                      onPress={() => setChoiceDetail({ choice, chance })}
                      style={styles.choiceDetailButton}>
                      <ThemedText style={styles.choiceDetailText}>Деталі</ThemedText>
                    </Pressable>
                  </View>
                );
              })}
            </View>
            </>
          )}
        </ThemedView>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold">Останні наслідки</ThemedText>
        <ThemedView style={styles.logCard}>
          {log.length === 0 ? (
            <ThemedText style={styles.logEmpty}>Ще немає наслідків.</ThemedText>
          ) : (
            log.map((entry) => (
              <ThemedText key={entry} style={styles.logEntry}>
                {entry}
              </ThemedText>
            ))
          )}
        </ThemedView>
      </ThemedView>
      </ScrollView>
      {effectType ? (
        <View pointerEvents="none" style={styles.weatherOverlay}>
          <View
            style={[
              styles.weatherTint,
              {
                backgroundColor:
                  effectType === 'snow'
                    ? 'transparent'
                    : effectType === 'rain'
                      ? 'rgba(40,70,110,0.08)'
                      : effectType === 'leaves'
                        ? 'transparent'
                      : 'rgba(220,220,220,0.08)',
              },
            ]}
          />
          <Animated.Image
            source={EFFECT_TEXTURES[effectType]}
            style={[
              styles.weatherLayer,
              {
                tintColor: effectType === 'snow' ? '#FFFFFF' : undefined,
                opacity:
                  effectType === 'rain'
                    ? 0.28
                    : effectType === 'snow'
                      ? 1
                      : effectType === 'leaves'
                        ? 0.7
                        : 0.32,
                transform: [
                  {
                    translateX: effectShift.interpolate({
                      inputRange: [0, 1],
                      outputRange:
                        effectType === 'leaves'
                          ? [-25, 25]
                          : effectType === 'snow'
                            ? [-20, 20]
                            : [-10, 10],
                    }),
                  },
                  {
                    translateY: effectShift.interpolate({
                      inputRange: [0, 1],
                      outputRange:
                        effectType === 'rain'
                          ? [-80, 80]
                          : effectType === 'snow'
                            ? [-30, 30]
                            : effectType === 'leaves'
                              ? [-60, 140]
                              : [-10, 10],
                    }),
                  },
                ],
              },
            ]}
          />
          <Animated.Image
            source={EFFECT_TEXTURES[effectType]}
            style={[
              styles.weatherLayer,
              {
                tintColor: effectType === 'snow' ? '#FFFFFF' : undefined,
                opacity:
                  effectType === 'rain'
                    ? 0.18
                    : effectType === 'snow'
                      ? 1
                      : effectType === 'leaves'
                        ? 0.5
                        : 0.22,
                transform: [
                  { translateX: effectType === 'leaves' ? 16 : 30 },
                  {
                    translateY: effectShift.interpolate({
                      inputRange: [0, 1],
                      outputRange:
                        effectType === 'rain'
                          ? [-60, 60]
                          : effectType === 'snow'
                            ? [-20, 20]
                            : effectType === 'leaves'
                              ? [-40, 120]
                              : [-6, 6],
                    }),
                  },
                ],
              },
            ]}
          />
        </View>
      ) : null}
      {result ? (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <ThemedText type="subtitle" style={styles.resultTitle}>
                {result.title}
              </ThemedText>
              <ThemedText style={styles.resultText}>{result.text}</ThemedText>
            </View>
            <View style={styles.deltaList}>
              <Delta label="Гроші" value={result.deltas.money ?? 0} />
              <Delta label="Репутація" value={result.deltas.reputation ?? 0} />
              <Delta label="Сила/Вміння" value={result.deltas.skill ?? 0} />
              <Delta label="Здоровʼя" value={result.deltas.health ?? 0} />
              <Delta label="Сімʼя" value={result.deltas.family ?? 0} />
              <Delta label="Голод" value={result.deltas.hungerDebt ?? 0} />
              <Delta label="Втома" value={result.deltas.fatigue ?? 0} />
              <Delta label="Удача" value={result.deltas.luck ?? 0} />
            </View>
            {result.moneyBreakdown && result.moneyBreakdown.length > 0 ? (
              <View style={styles.deltaList}>
                <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                  Транзакції грошей
                </ThemedText>
                {result.moneyBreakdown.map((item) => (
                  <View key={item.label} style={styles.deltaRow}>
                    <ThemedText style={styles.deltaLabel}>{item.label}</ThemedText>
                    <ThemedText
                      style={item.value >= 0 ? styles.deltaPositive : styles.deltaNegative}>
                      {item.value > 0 ? '+' : ''}
                      {item.value}
                    </ThemedText>
                  </View>
                ))}
              </View>
            ) : null}
            {result.event ? (
              <View style={styles.eventBox}>
                <ThemedText type="defaultSemiBold" style={styles.eventTitle}>
                  {result.event.title}
                </ThemedText>
                <ThemedText style={styles.eventText}>{result.event.text}</ThemedText>
                <View style={styles.deltaList}>
                  <Delta label="Гроші" value={result.event.effects.money ?? 0} />
                  <Delta label="Репутація" value={result.event.effects.reputation ?? 0} />
                  <Delta label="Сила/Вміння" value={result.event.effects.skill ?? 0} />
                  <Delta label="Здоровʼя" value={result.event.effects.health ?? 0} />
                  <Delta label="Сімʼя" value={result.event.effects.family ?? 0} />
                  <Delta label="Удача" value={result.event.effects.luck ?? 0} />
                </View>
              </View>
            ) : null}
            <Pressable onPress={() => setResult(null)} style={styles.resultButton}>
              <ThemedText style={styles.resultButtonText}>Продовжити</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
      {choiceDetail ? (
        <View style={styles.resultOverlay}>
          <View style={styles.resultCard}>
            <View style={styles.resultHeader}>
              <ThemedText type="subtitle" style={styles.resultTitle}>
                {choiceDetail.choice.label}
              </ThemedText>
              <ThemedText style={styles.resultText}>{choiceDetail.choice.description}</ThemedText>
            </View>
            {!isNeutralChoice(choiceDetail.choice) ? (
              <ThemedText style={styles.choiceChance}>Шанс: ~{choiceDetail.chance}%</ThemedText>
            ) : (
              <ThemedText style={styles.choiceChance}>Без ризику</ThemedText>
            )}
            {isNeutralChoice(choiceDetail.choice) ? (
              <View style={styles.deltaList}>
                <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                  Без ризику
                </ThemedText>
                {choiceDetail.choice.minHealth ? (
                  <ThemedText style={styles.choiceLockedText}>
                    Мін. здоровʼя: {choiceDetail.choice.minHealth}
                  </ThemedText>
                ) : null}
                {(() => {
                  const range = getMoneyRange(choiceDetail.choice, safeStats);
                  if (range) {
                    return (
                      <ThemedText style={styles.choiceMoneyRange}>
                        Гроші: +{range.min}…+{range.max}
                      </ThemedText>
                    );
                  }
                  return <Delta label="Гроші" value={choiceDetail.choice.success.money ?? 0} />;
                })()}
                <Delta label="Репутація" value={choiceDetail.choice.success.reputation ?? 0} />
                <Delta label="Сила/Вміння" value={choiceDetail.choice.success.skill ?? 0} />
                <Delta label="Здоровʼя" value={choiceDetail.choice.success.health ?? 0} />
                <Delta label="Сімʼя" value={choiceDetail.choice.success.family ?? 0} />
                <Delta label="Удача" value={choiceDetail.choice.success.luck ?? 0} />
                <ThemedText style={styles.resultText}>
                  {choiceDetail.choice.successText}
                </ThemedText>
              </View>
            ) : (
              <>
                <View style={styles.deltaList}>
                  <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                    Успіх
                  </ThemedText>
                  {choiceDetail.choice.minHealth ? (
                    <ThemedText style={styles.choiceLockedText}>
                      Мін. здоровʼя: {choiceDetail.choice.minHealth}
                    </ThemedText>
                  ) : null}
                  {(() => {
                    const range = getMoneyRange(choiceDetail.choice, safeStats);
                    if (range) {
                      return (
                        <ThemedText style={styles.choiceMoneyRange}>
                          Гроші: +{range.min}…+{range.max}
                        </ThemedText>
                      );
                    }
                    return <Delta label="Гроші" value={choiceDetail.choice.success.money ?? 0} />;
                  })()}
                  <Delta label="Репутація" value={choiceDetail.choice.success.reputation ?? 0} />
                  <Delta label="Сила/Вміння" value={choiceDetail.choice.success.skill ?? 0} />
                  <Delta label="Здоровʼя" value={choiceDetail.choice.success.health ?? 0} />
                  <Delta label="Сімʼя" value={choiceDetail.choice.success.family ?? 0} />
                  <Delta label="Удача" value={choiceDetail.choice.success.luck ?? 0} />
                  <ThemedText style={styles.resultText}>{choiceDetail.choice.successText}</ThemedText>
                </View>
                <View style={styles.deltaList}>
                  <ThemedText type="defaultSemiBold" style={styles.modalSectionTitle}>
                    Невдача
                  </ThemedText>
                  <Delta label="Гроші" value={choiceDetail.choice.fail.money ?? 0} />
                  <Delta label="Репутація" value={choiceDetail.choice.fail.reputation ?? 0} />
                  <Delta label="Сила/Вміння" value={choiceDetail.choice.fail.skill ?? 0} />
                  <Delta label="Здоровʼя" value={choiceDetail.choice.fail.health ?? 0} />
                  <Delta label="Сімʼя" value={choiceDetail.choice.fail.family ?? 0} />
                  <Delta label="Удача" value={choiceDetail.choice.fail.luck ?? 0} />
                  <ThemedText style={styles.resultText}>{choiceDetail.choice.failText}</ThemedText>
                </View>
              </>
            )}
            <Pressable onPress={() => setChoiceDetail(null)} style={styles.resultButton}>
              <ThemedText style={styles.resultButtonText}>Закрити</ThemedText>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}
