import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, Circle } from '@shopify/react-native-skia';

export type SnowIntensity = 'gentle' | 'blizzard';

type Flake = {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  alpha: number;
};

export default function SnowSkia({
  width,
  height,
  intensity = 'gentle',
}: {
  width: number;
  height: number;
  intensity?: SnowIntensity;
}) {
  const config =
    intensity === 'blizzard'
      ? { density: 1.4, speed: 0.9, size: 1.0, drift: 0.8, alpha: 0.7 }
      : { density: 0.9, speed: 0.25, size: 1.1, drift: 0.2, alpha: 0.6 };

  const flakes = useMemo<Flake[]>(() => {
    const count = Math.max(18, Math.floor((width / 12) * config.density));
    return Array.from({ length: count }).map(() => {
      const size = (1.5 + Math.random() * 3.2) * config.size;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size,
        speed: (18 + Math.random() * 36) * config.speed,
        drift: (Math.random() - 0.5) * 18 * config.drift,
        alpha: config.alpha + Math.random() * 0.25,
      };
    });
  }, [width, height, config]);

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
      {flakes.map((flake, index) => {
        const y = (flake.y + t * flake.speed) % (height + flake.size) - flake.size;
        const x = flake.x + t * flake.drift;
        return (
          <Circle
            key={`flake-${index}-${tick}`}
            cx={x}
            cy={y}
            r={flake.size}
            color={`rgba(255, 255, 255, ${flake.alpha.toFixed(2)})`}
          />
        );
      })}
    </Canvas>
  );
}
