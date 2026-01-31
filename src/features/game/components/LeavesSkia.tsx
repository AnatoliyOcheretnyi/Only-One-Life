import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, Circle } from '@shopify/react-native-skia';

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

type Leaf = {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  alpha: number;
  color: string;
};

export default function LeavesSkia({ width, height }: { width: number; height: number }) {
  const leaves = useMemo<Leaf[]>(() => {
    const count = Math.max(16, Math.floor(width / 16));
    const colors = ['#E3A14E', '#C97C34', '#F0C06A', '#A5652A'];
    return Array.from({ length: count }).map(() => {
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2 + Math.random() * 4,
        speed: 30 + Math.random() * 40,
        drift: (Math.random() - 0.5) * 18,
        alpha: 0.6 + Math.random() * 0.3,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });
  }, [width, height]);

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
      {leaves.map((leaf, index) => {
        const y = (leaf.y + t * leaf.speed) % (height + leaf.size) - leaf.size;
        const x = clamp(leaf.x + t * leaf.drift, -10, width + 10);
        return (
          <Circle
            key={`leaf-${index}-${tick}`}
            cx={x}
            cy={y}
            r={leaf.size}
            color={`rgba(${parseInt(leaf.color.slice(1, 3), 16)}, ${parseInt(
              leaf.color.slice(3, 5),
              16,
            )}, ${parseInt(leaf.color.slice(5, 7), 16)}, ${leaf.alpha.toFixed(2)})`}
          />
        );
      })}
    </Canvas>
  );
}
