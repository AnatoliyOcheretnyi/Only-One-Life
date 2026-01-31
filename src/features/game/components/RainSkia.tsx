import {
  Canvas,
  Line,
  PaintStyle,
  Skia,
  StrokeCap,
  vec,
} from "@shopify/react-native-skia";
import { useEffect, useMemo, useRef, useState } from "react";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

export type RainIntensity = "drizzle" | "moderate" | "heavy" | "storm";

type Drop = {
  x: number;
  y: number;
  length: number;
  speed: number;
  drift: number;
  paint: ReturnType<typeof Skia.Paint>;
};

export default function RainSkia({
  width,
  height,
  intensity = "drizzle",
}: {
  width: number;
  height: number;
  intensity?: RainIntensity;
}) {
  const intensityConfig =
    intensity === "storm"
      ? { density: 1.75, speed: 0.5, size: 1.25, alpha: 0.55 }
      : intensity === "heavy"
        ? { density: 1.25, speed: 1.25, size: 1.1, alpha: 0.5 }
        : intensity === "drizzle"
          ? { density: 0.5, speed: 0.5, size: 0.8, alpha: 0.3 }
          : { density: 1, speed: 1, size: 1, alpha: 0.45 };

  const drops = useMemo<Drop[]>(() => {
    const count = Math.max(
      18,
      Math.floor((width / 10) * intensityConfig.density),
    );
    return Array.from({ length: count }).map(() => {
      const length = (12 + Math.random() * 20) * intensityConfig.size;
      const speed = (180 + Math.random() * 160) * intensityConfig.speed;
      const alpha = intensityConfig.alpha + Math.random() * 0.25;
      const stroke = (0.8 + Math.random() * 1.1) * intensityConfig.size;
      const paint = Skia.Paint();
      paint.setStyle(PaintStyle.Stroke);
      paint.setStrokeCap(StrokeCap.Round);
      paint.setStrokeWidth(stroke);
      paint.setColor(Skia.Color(`rgba(86, 164, 255, ${alpha.toFixed(2)})`));
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        length,
        speed,
        drift: (Math.random() - 0.5) * 12,
        paint,
      };
    });
  }, [width, height, intensityConfig]);

  const startRef = useRef(Date.now());
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      setTick((prev) => prev + 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const t = (Date.now() - startRef.current) / 1000;

  return (
    <Canvas style={{ width, height }}>
      {drops.map((drop, index) => {
        const y =
          ((drop.y + t * drop.speed) % (height + drop.length)) - drop.length;
        const x = clamp(drop.x + t * drop.drift, -10, width + 10);
        return (
          <Line
            key={`drop-${index}-${tick}`}
            p1={vec(x, y)}
            p2={vec(x, y + drop.length)}
            paint={drop.paint}
          />
        );
      })}
    </Canvas>
  );
}
