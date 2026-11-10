import type { CSSProperties } from 'react';

import './AmbientBackground.css';

type SparkColor = 'pink' | 'violet' | 'orange';

interface CurveConfig {
  id: string;
  path: string;
  gradient: string;
  sparkColor: SparkColor;
  duration: number;
  delay: number;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  moveX: number;
  moveY: number;
  color: number;
}

/* ==========================================================
   1. MOVING SPARK
========================================================== */

function MovingSpark({
  path,
  duration,
  delay,
  color,
}: {
  path: string;
  duration: number;
  delay: number;
  color: SparkColor;
}) {
  const durationValue = `${duration}s`;
  const delayValue = `${delay}s`;

  return (
    <g className="loglens-ambient__spark" opacity="0">
      {/* Small ambient halo */}
      <circle r="6" fill={`url(#ll-spark-${color})`} />

      {/* Bright core */}
      <circle r="1.5" fill="#FFFFFF" opacity="0.9" />

      {/* Movement along the curve */}
      <animateMotion
        path={path}
        dur={durationValue}
        begin={delayValue}
        repeatCount="indefinite"
        calcMode="linear"
      />

      {/* Fade in and out */}
      <animate
        attributeName="opacity"
        values="0;0.85;0.7;0"
        keyTimes="0;0.12;0.7;1"
        dur={durationValue}
        begin={delayValue}
        repeatCount="indefinite"
      />
    </g>
  );
}

/* ==========================================================
   2. CURVE CONFIGURATION
========================================================== */

const curves: CurveConfig[] = [
  {
    id: 'top-left',
    path: 'M -34 355 C 96 150 188 48 380 -24',
    gradient: 'll-top-gradient',
    sparkColor: 'pink',
    duration: 8,
    delay: -2,
  },
  {
    id: 'bottom-left',
    path: 'M -28 852 C 136 778 225 795 385 935',
    gradient: 'll-bottom-left-gradient',
    sparkColor: 'orange',
    duration: 10,
    delay: -5,
  },
  {
    id: 'bottom-right',
    path: 'M 1095 944 C 1322 890 1444 762 1645 715',
    gradient: 'll-bottom-right-gradient',
    sparkColor: 'violet',
    duration: 9,
    delay: -4,
  },
];

/* ==========================================================
   3. PARTICLE GENERATION
========================================================== */

// Deterministic values prevent particles from changing
// position on every React render.

function noise(index: number, seed: number): number {
  const value =
    Math.sin((index + 1) * 127.1 + seed * 311.7) * 43758.5453;

  return value - Math.floor(value);
}

const PARTICLE_COUNT = 42;

/*
 * Particle distribution:
 *
 * Left:    14
 * Right:   14
 * Top:     10
 * Bottom:   4
 *
 * Particles move toward the center and fade out.
 */

const particles: Particle[] = Array.from(
  { length: PARTICLE_COUNT },
  (_, index) => {
    const randomX = noise(index, 1);
    const randomY = noise(index, 2);

    // Initial position based on the assigned edge.
    const [x, y] =
      index < 14
        ? [2 + randomX * 18, 7 + randomY * 84]
        : index < 28
          ? [80 + randomX * 18, 7 + randomY * 84]
          : index < 38
            ? [8 + randomX * 84, 2 + randomY * 14]
            : [
                15 + (index - 38) * 23 + (randomX - 0.5) * 8,
                88 + randomY * 10,
              ];

    // Destination near the center.
    const targetX = 50 + (noise(index, 3) - 0.5) * 18;
    const targetY = 50 + (noise(index, 4) - 0.5) * 18;

    return {
      id: index,
      x,
      y,

      // Larger particles: 8–13 pixels.
      size: 8 + noise(index, 5) * 5,

      // Different movement durations.
      duration: 12 + noise(index, 6) * 12,

      // Staggered animation start.
      delay: noise(index, 7) * 24,

      // Movement toward the center.
      moveX: (targetX - x) * 0.9,
      moveY: (targetY - y) * 0.9,

      // Pink, violet or orange.
      color: index % 3,
    };
  },
);

/* ==========================================================
   4. AMBIENT BACKGROUND
========================================================== */

export function AmbientBackground() {
  return (
    <div className="loglens-ambient" aria-hidden="true">
      {/* ==========================================
          AMBIENT GLOWS
      ========================================== */}

      <div className="loglens-ambient__glow loglens-ambient__glow--top-left" />

      <div className="loglens-ambient__glow loglens-ambient__glow--top-right" />

      <div className="loglens-ambient__glow loglens-ambient__glow--bottom-left" />

      <div className="loglens-ambient__glow loglens-ambient__glow--bottom-right" />

      {/* ==========================================
          FLOATING PARTICLES
      ========================================== */}

      <div className="loglens-ambient__particles">
        {particles.map((particle) => (
          <span
            key={particle.id}
            className={`loglens-ambient__particle loglens-ambient__particle--${particle.color}`}
            style={
              {
                left: `${particle.x}%`,
                top: `${particle.y}%`,

                width: `${particle.size}px`,
                height: `${particle.size}px`,

                animationDuration: `${particle.duration}s`,
                animationDelay: `-${particle.delay}s`,

                '--move-x': `${particle.moveX}vw`,
                '--move-y': `${particle.moveY}vh`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      {/* ==========================================
          SVG CURVES
      ========================================== */}

      <svg
        className="loglens-ambient__lines"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Top-left gradient */}
          <linearGradient
            id="ll-top-gradient"
            x1="0"
            y1="350"
            x2="380"
            y2="0"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FF914D" />
            <stop offset="30%" stopColor="#F51A83" />
            <stop offset="65%" stopColor="#B63BEE" />
            <stop offset="100%" stopColor="#6737E8" />
          </linearGradient>

          {/* Bottom-left gradient */}
          <linearGradient
            id="ll-bottom-left-gradient"
            x1="0"
            y1="790"
            x2="400"
            y2="920"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FF914D" />
            <stop offset="40%" stopColor="#F51A83" />
            <stop offset="100%" stopColor="#8138EC" />
          </linearGradient>

          {/* Bottom-right gradient */}
          <linearGradient
            id="ll-bottom-right-gradient"
            x1="1050"
            y1="950"
            x2="1600"
            y2="710"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#6737E8" />
            <stop offset="45%" stopColor="#B73AEF" />
            <stop offset="75%" stopColor="#F51A83" />
            <stop offset="100%" stopColor="#FF914D" />
          </linearGradient>

          {/* ======================================
              SPARK GRADIENTS
          ====================================== */}

          <radialGradient id="ll-spark-pink">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="25%" stopColor="#FF90DA" stopOpacity="0.45" />
            <stop offset="65%" stopColor="#F51A83" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#F51A83" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="ll-spark-violet">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="25%" stopColor="#C99AFF" stopOpacity="0.45" />
            <stop offset="65%" stopColor="#8B35F5" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#8B35F5" stopOpacity="0" />
          </radialGradient>

          <radialGradient id="ll-spark-orange">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="25%" stopColor="#FFC98A" stopOpacity="0.45" />
            <stop offset="65%" stopColor="#FF914D" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#FF914D" stopOpacity="0" />
          </radialGradient>

          {/* Curve glow */}
          <filter
            id="ll-curve-blur"
            x="-50%"
            y="-50%"
            width="200%"
            height="200%"
          >
            <feGaussianBlur stdDeviation="8" />
          </filter>
        </defs>

        {/* ==========================================
            RENDER CURVES
        ========================================== */}

        {curves.map((curve) => (
          <g key={curve.id}>
            {/* Soft glow */}
            <path
              d={curve.path}
              fill="none"
              stroke={`url(#${curve.gradient})`}
              strokeWidth="14"
              opacity="0.28"
              filter="url(#ll-curve-blur)"
            />

            {/* Thin luminous curve */}
            <path
              d={curve.path}
              fill="none"
              stroke={`url(#${curve.gradient})`}
              strokeWidth="2"
              strokeLinecap="round"
              opacity="0.8"
            />

            {/* Single moving spark */}
            <MovingSpark
              path={curve.path}
              color={curve.sparkColor}
              duration={curve.duration}
              delay={curve.delay}
            />
          </g>
        ))}
      </svg>
    </div>
  );
}