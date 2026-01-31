import { View } from 'react-native';
import { ThemedText } from '@/src/components/themed-text';
import { styles } from '@/src/features/game/styles';

export default function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statPill}>
      <ThemedText style={styles.statPillLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.statPillValue}>
        {value}
      </ThemedText>
    </View>
  );
}
