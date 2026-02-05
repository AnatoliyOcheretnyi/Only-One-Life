import { View } from "react-native";

import LeavesSkia from "@/src/features/game/components/LeavesSkia";
import RainSkia from "@/src/features/game/components/RainSkia";
import SnowSkia from "@/src/features/game/components/SnowSkia";
import { styles } from "@/src/features/game/styles";

type WeatherOverlayProps = {
  effectType: "rain" | "snow" | "leaves" | null;
  width: number;
  height: number;
  snowIntensity: "gentle" | "blizzard";
};

export default function WeatherOverlay({
  effectType,
  width,
  height,
  snowIntensity,
}: WeatherOverlayProps) {
  if (!effectType) return null;
  return (
    <View pointerEvents="none" style={styles.weatherOverlay}>
      <View style={styles.weatherTint} />
      {effectType === "rain" ? (
        <RainSkia width={width} height={height} />
      ) : effectType === "snow" ? (
        <SnowSkia width={width} height={height} intensity={snowIntensity} />
      ) : (
        <LeavesSkia width={width} height={height} />
      )}
    </View>
  );
}
