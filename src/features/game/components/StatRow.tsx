import { View } from 'react-native';
import { ThemedText } from '@/src/components/themed-text';
import { styles } from '@/src/features/game/styles';

export default function StatRow({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.deltaRow}>
      <ThemedText style={styles.deltaLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.deltaValue}>
        {value}
      </ThemedText>
    </View>
  );
}
