import { View } from 'react-native';
import { ThemedText } from '@/src/components/themed-text';
import { styles } from '@/src/features/game/styles';

export default function Delta({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  const sign = value > 0 ? '+' : '';
  return (
    <View style={styles.deltaRow}>
      <ThemedText style={styles.deltaLabel}>{label}</ThemedText>
      <ThemedText style={value > 0 ? styles.deltaPositive : styles.deltaNegative}>
        {sign}
        {value}
      </ThemedText>
    </View>
  );
}
