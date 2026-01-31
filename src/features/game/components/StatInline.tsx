import { View } from 'react-native';
import { ThemedText } from '@/src/components/themed-text';
import { styles } from '@/src/features/game/styles';

export default function StatInline({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statInline}>
      <ThemedText style={styles.statInlineLabel}>{label}</ThemedText>
      <ThemedText type="defaultSemiBold" style={styles.statInlineValue}>
        {value}
      </ThemedText>
    </View>
  );
}
