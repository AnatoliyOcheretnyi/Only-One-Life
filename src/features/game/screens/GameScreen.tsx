import { Image, Pressable, ScrollView, View } from "react-native";

import { ThemedText } from "@/src/components/themed-text";
import { ThemedView } from "@/src/components/themed-view";
import StatInline from "@/src/features/game/components/StatInline";
import { styles } from "@/src/features/game/styles";
import type { Choice, Path, Scene, Stats } from "@/src/shared/types";
import { isNeutralChoice } from "@/src/shared/utils";

type Ending = { title: string; text: string } | null;

type GameScreenProps = {
  stats: Stats;
  statLabels: Record<keyof Stats, string>;
  statsExpanded: boolean;
  onToggleStats: () => void;
  turnLabel: string;
  heroImage?: any | null;
  scene: Scene;
  gameOver: boolean;
  ending: Ending;
  log: string[];
  chanceMap: Record<string, number>;
  onChoose: (choice: Choice) => void;
  onShowChoiceDetail: (choice: Choice, chance: number) => void;
  onResetLife: () => void;
  onExit: () => void;
};

const pathLabels: Record<Path, string> = {
  craft: "Ремесло",
  service: "Служба",
  trade: "Торгівля",
  crime: "Тінь",
};

const effortLabels: Record<NonNullable<Choice["effort"]>, string> = {
  physical: "Фізично",
  mental: "Розумово",
  social: "Соціально",
  rest: "Відпочинок",
  neutral: "Нейтрально",
};

const statLabelsShort: Record<string, string> = {
  money: "💰",
  reputation: "⭐",
  skill: "💪",
  health: "❤️",
  hungerDebt: "🍗",
  fatigue: "😮‍💨",
  luck: "🍀",
  age: "⏳",
  family: "👪",
  karma: "К",
};

export default function GameScreen({
  stats,
  statLabels,
  statsExpanded,
  onToggleStats,
  turnLabel,
  heroImage,
  scene,
  gameOver,
  ending,
  log,
  chanceMap,
  onChoose,
  onShowChoiceDetail,
  onResetLife,
  onExit,
}: GameScreenProps) {
  return (
    <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
      <ThemedView style={styles.header}>
        <View style={styles.headerRow}>
          <ThemedText type="defaultSemiBold" style={styles.headerSubtitle}>
            {turnLabel}
          </ThemedText>
          <Pressable onPress={onToggleStats} style={styles.headerToggle}>
            <ThemedText style={styles.headerToggleText}>
              {statsExpanded ? "Згорнути" : "Розгорнути"}
            </ThemedText>
          </Pressable>
        </View>
        <View style={styles.statsHeader}>
          <StatInline label={statLabels.money} value={stats.money} />
          <StatInline label={statLabels.reputation} value={stats.reputation} />
          <StatInline label={statLabels.skill} value={stats.skill} />
          <StatInline label={statLabels.health} value={stats.health} />
          <StatInline label={statLabels.hungerDebt} value={stats.hungerDebt} />
          <StatInline label={statLabels.fatigue} value={stats.fatigue} />
          <StatInline label={statLabels.luck} value={stats.luck} />
          <StatInline label={statLabels.age} value={stats.age} />
          <StatInline label={statLabels.family} value={stats.family} />
          <StatInline label={statLabels.karma} value={stats.karma} />
        </View>
      </ThemedView>
      {heroImage ? (
        <ThemedView style={styles.heroCard}>
          <Image source={heroImage} style={styles.heroImage} />
        </ThemedView>
      ) : null}

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold">Сцена</ThemedText>
        <ThemedView style={styles.sceneCard}>
          {gameOver && ending ? (
            <View style={styles.ending}>
              <ThemedText type="defaultSemiBold" style={styles.endingTitle}>
                {ending.title}
              </ThemedText>
              <ThemedText>{ending.text}</ThemedText>
              <Pressable onPress={onResetLife} style={styles.primaryButton}>
                <ThemedText style={styles.primaryButtonText}>
                  Почати інше життя
                </ThemedText>
              </Pressable>
              <Pressable onPress={onExit} style={styles.secondaryButton}>
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
                  const disabled =
                    !!choice.minHealth && stats.health < choice.minHealth;
                  const chanceTone =
                    chance >= 70 ? "good" : chance >= 45 ? "warn" : "bad";
                  const chanceFillStyle =
                    chanceTone === "good"
                      ? styles.choiceChanceFillgood
                      : chanceTone === "warn"
                        ? styles.choiceChanceFillwarn
                        : styles.choiceChanceFillbad;
                  const positiveEffects = Object.entries(choice.success).filter(
                    ([, value]) => (value ?? 0) > 0,
                  );
                  return (
                    <View key={choice.id} style={styles.choiceRow}>
                      <View style={styles.choiceBody}>
                        <View style={styles.choiceHeader}>
                          <ThemedText type="defaultSemiBold" numberOfLines={1}>
                            {choice.label}
                          </ThemedText>
                          <View style={styles.choiceTags}>
                            {choice.path ? (
                              <View
                                style={[
                                  styles.choiceTag,
                                  styles.choiceTagPath,
                                ]}
                              >
                                <ThemedText style={styles.choiceTagText}>
                                  {pathLabels[choice.path]}
                                </ThemedText>
                              </View>
                            ) : null}
                            {choice.effort &&
                            choice.effort !== "neutral" &&
                            !choice.path ? (
                              <View style={styles.choiceTag}>
                                <ThemedText style={styles.choiceTagText}>
                                  {effortLabels[choice.effort]}
                                </ThemedText>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <ThemedText
                          style={styles.choiceDescription}
                          numberOfLines={1}
                        >
                          {choice.description}
                        </ThemedText>
                        {positiveEffects.length > 0 ? (
                          <View style={styles.choicePerksRow}>
                            {positiveEffects.slice(0, 3).map(([key, value]) => (
                              <View key={key} style={styles.choicePerkChip}>
                                <ThemedText style={styles.choicePerkText}>
                                  {statLabelsShort[key] ?? key} +{value}
                                </ThemedText>
                              </View>
                            ))}
                          </View>
                        ) : null}
                        <View style={styles.choiceChanceRow}>
                          <ThemedText style={styles.choiceChance}>
                            {neutral ? "Без ризику" : `~${chance}%`}
                          </ThemedText>
                          <View style={styles.choiceChanceBar}>
                            <View
                              style={[
                                styles.choiceChanceFill,
                                chanceFillStyle,
                                { width: `${neutral ? 100 : chance}%` },
                              ]}
                            />
                          </View>
                        </View>
                        {choice.minHealth && stats.health < choice.minHealth ? (
                          <ThemedText style={styles.choiceLockedText}>
                            Потрібно здоровʼя {choice.minHealth}
                          </ThemedText>
                        ) : null}
                      </View>
                      <View style={styles.choiceActionsRow}>
                        <Pressable
                          onPress={() => onChoose(choice)}
                          disabled={disabled}
                          style={[
                            styles.choiceActionButtonCompact,
                            disabled && styles.choiceActionButtonDisabled,
                          ]}
                        >
                          <ThemedText style={styles.choiceActionButtonText}>
                            Обрати
                          </ThemedText>
                        </Pressable>
                        <Pressable
                          onPress={() => onShowChoiceDetail(choice, chance)}
                          style={styles.choiceDetailInline}
                        >
                          <ThemedText style={styles.choiceDetailText}>
                            Деталі
                          </ThemedText>
                        </Pressable>
                      </View>
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
  );
}
