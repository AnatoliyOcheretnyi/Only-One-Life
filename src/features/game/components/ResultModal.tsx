import { Pressable, View } from "react-native";

import { ThemedText } from "@/src/components/themed-text";
import Delta from "@/src/features/game/components/Delta";
import { styles } from "@/src/features/game/styles";
import type { Effects, WorldEvent } from "@/src/shared/types";

type ResultPayload = {
  title: string;
  text: string;
  deltas: Effects;
  moneyBreakdown?: { label: string; value: number }[];
  event?: WorldEvent;
};

type ResultModalProps = {
  result: ResultPayload | null;
  onClose: () => void;
};

export default function ResultModal({ result, onClose }: ResultModalProps) {
  if (!result) return null;
  return (
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
                  style={
                    item.value >= 0 ? styles.deltaPositive : styles.deltaNegative
                  }
                >
                  {item.value > 0 ? "+" : ""}
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
              <Delta
                label="Репутація"
                value={result.event.effects.reputation ?? 0}
              />
              <Delta label="Сила/Вміння" value={result.event.effects.skill ?? 0} />
              <Delta
                label="Здоровʼя"
                value={result.event.effects.health ?? 0}
              />
              <Delta label="Сімʼя" value={result.event.effects.family ?? 0} />
              <Delta label="Удача" value={result.event.effects.luck ?? 0} />
            </View>
          </View>
        ) : null}
        <Pressable onPress={onClose} style={styles.resultButton}>
          <ThemedText style={styles.resultButtonText}>Продовжити</ThemedText>
        </Pressable>
      </View>
    </View>
  );
}
