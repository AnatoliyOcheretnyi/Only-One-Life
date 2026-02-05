import { Pressable, View } from "react-native";

import { ThemedText } from "@/src/components/themed-text";
import { ThemedView } from "@/src/components/themed-view";
import { styles } from "@/src/features/game/styles";

type StartScreenProps = {
  insetTop: number;
  onStart: () => void;
};

export default function StartScreen({ insetTop, onStart }: StartScreenProps) {
  return (
    <ThemedView style={[styles.screen, { paddingTop: Math.max(12, insetTop) }]}>
      <View style={styles.startHeroCompact}>
        <ThemedText type="title">Only One Life</ThemedText>
        <ThemedText style={styles.startText}>
          Одна спроба. Одне життя. Ніяких перезавантажень.
        </ThemedText>
        <View style={styles.startCard}>
          <ThemedText type="defaultSemiBold">Що на тебе чекає</ThemedText>
          <ThemedText style={styles.startBullet}>
            • Жорсткі вибори й наслідки
          </ThemedText>
          <ThemedText style={styles.startBullet}>
            • Ймовірності залежать від стану
          </ThemedText>
          <ThemedText style={styles.startBullet}>
            • Фінал — не бал, а роль у світі
          </ThemedText>
        </View>
        <Pressable onPress={onStart} style={styles.primaryButton}>
          <ThemedText style={styles.primaryButtonText}>Старт</ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}
