import { Image, Pressable, ScrollView, View } from "react-native";

import { ThemedText } from "@/src/components/themed-text";
import { ThemedView } from "@/src/components/themed-view";
import StatInline from "@/src/features/game/components/StatInline";
import { styles } from "@/src/features/game/styles";
import type { Choice, Scene, Stats } from "@/src/shared/types";
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
                  return (
                    <View key={choice.id} style={styles.choiceRow}>
                      <View style={styles.choiceRowText}>
                        <ThemedText type="defaultSemiBold">
                          {choice.label}
                        </ThemedText>
                        {!neutral ? (
                          <ThemedText style={styles.choiceChance}>
                            Шанс: ~{chance}%
                          </ThemedText>
                        ) : (
                          <ThemedText style={styles.choiceChance}>
                            Без ризику
                          </ThemedText>
                        )}
                      </View>
                      {choice.minHealth && stats.health < choice.minHealth ? (
                        <ThemedText style={styles.choiceLockedText}>
                          Потрібно здоровʼя {choice.minHealth}
                        </ThemedText>
                      ) : null}
                      <Pressable
                        onPress={() => onChoose(choice)}
                        disabled={
                          !!choice.minHealth && stats.health < choice.minHealth
                        }
                        style={styles.choicePickCorner}
                      >
                        <ThemedText style={styles.choicePickCornerText}>
                          ✓
                        </ThemedText>
                      </Pressable>
                      <Pressable
                        onPress={() => onShowChoiceDetail(choice, chance)}
                        style={styles.choiceDetailButton}
                      >
                        <ThemedText style={styles.choiceDetailText}>
                          Деталі
                        </ThemedText>
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
  );
}
