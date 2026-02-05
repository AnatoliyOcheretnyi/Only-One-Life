import { Pressable, View } from "react-native";

import { ThemedText } from "@/src/components/themed-text";
import Delta from "@/src/features/game/components/Delta";
import { styles } from "@/src/features/game/styles";
import type { Choice, Stats } from "@/src/shared/types";
import { getMoneyRange, isNeutralChoice } from "@/src/shared/utils";

type ChoiceDetailPayload = {
  choice: Choice;
  chance: number;
} | null;

type ChoiceDetailModalProps = {
  detail: ChoiceDetailPayload;
  safeStats: Stats;
  onClose: () => void;
};

export default function ChoiceDetailModal({
  detail,
  safeStats,
  onClose,
}: ChoiceDetailModalProps) {
  if (!detail) return null;
  const { choice, chance } = detail;
  const neutral = isNeutralChoice(choice);

  const renderMoney = (effects: Choice["success"]) => {
    const range = getMoneyRange(choice, safeStats);
    if (range) {
      return (
        <ThemedText style={styles.choiceMoneyRange}>
          Гроші: +{range.min}…+{range.max}
        </ThemedText>
      );
    }
    return <Delta label="Гроші" value={effects.money ?? 0} />;
  };

  return (
    <View style={styles.resultOverlay}>
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <ThemedText type="subtitle" style={styles.resultTitle}>
            {choice.label}
          </ThemedText>
          <ThemedText style={styles.resultText}>{choice.description}</ThemedText>
        </View>
        {!neutral ? (
          <ThemedText
            style={[styles.choiceChance, styles.choiceChanceTight]}
          >
            Шанс: ~{chance}%
          </ThemedText>
        ) : (
          <ThemedText
            style={[styles.choiceChance, styles.choiceChanceTight]}
          >
            Без ризику
          </ThemedText>
        )}
        {neutral ? (
          <View style={styles.deltaListTight}>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.modalSectionTitle, styles.modalSectionTitleTight]}
            >
              Без ризику
            </ThemedText>
            {choice.minHealth ? (
              <ThemedText style={styles.choiceLockedText}>
                Мін. здоровʼя: {choice.minHealth}
              </ThemedText>
            ) : null}
            {renderMoney(choice.success)}
            <Delta label="Репутація" value={choice.success.reputation ?? 0} />
            <Delta label="Сила/Вміння" value={choice.success.skill ?? 0} />
            <Delta label="Здоровʼя" value={choice.success.health ?? 0} />
            <Delta label="Сімʼя" value={choice.success.family ?? 0} />
            <Delta label="Удача" value={choice.success.luck ?? 0} />
            <Delta label="Карма" value={choice.success.karma ?? 0} />
            <ThemedText style={styles.resultText}>
              {choice.successText}
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.deltaListTight}>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.modalSectionTitle, styles.modalSectionTitleTight]}
              >
                Успіх
              </ThemedText>
              {choice.minHealth ? (
                <ThemedText style={styles.choiceLockedText}>
                  Мін. здоровʼя: {choice.minHealth}
                </ThemedText>
              ) : null}
              {renderMoney(choice.success)}
              <Delta label="Репутація" value={choice.success.reputation ?? 0} />
              <Delta label="Сила/Вміння" value={choice.success.skill ?? 0} />
              <Delta label="Здоровʼя" value={choice.success.health ?? 0} />
              <Delta label="Сімʼя" value={choice.success.family ?? 0} />
              <Delta label="Удача" value={choice.success.luck ?? 0} />
              <Delta label="Карма" value={choice.success.karma ?? 0} />
              <ThemedText style={styles.resultText}>
                {choice.successText}
              </ThemedText>
            </View>
            <View style={styles.resultDivider} />
            <View style={styles.deltaListTight}>
              <ThemedText
                type="defaultSemiBold"
                style={[styles.modalSectionTitle, styles.modalSectionTitleTight]}
              >
                Невдача
              </ThemedText>
              <Delta label="Гроші" value={choice.fail.money ?? 0} />
              <Delta label="Репутація" value={choice.fail.reputation ?? 0} />
              <Delta label="Сила/Вміння" value={choice.fail.skill ?? 0} />
              <Delta label="Здоровʼя" value={choice.fail.health ?? 0} />
              <Delta label="Сімʼя" value={choice.fail.family ?? 0} />
              <Delta label="Удача" value={choice.fail.luck ?? 0} />
              <Delta label="Карма" value={choice.fail.karma ?? 0} />
              <ThemedText style={styles.resultText}>
                {choice.failText}
              </ThemedText>
            </View>
          </>
        )}
        <Pressable onPress={onClose} style={styles.resultButton}>
          <ThemedText style={styles.resultButtonText}>Закрити</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}
