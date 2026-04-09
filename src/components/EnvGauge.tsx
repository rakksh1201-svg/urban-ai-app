import React from 'react';

interface EnvGaugeProps {
  score: number;
  size?: number;
}

const EnvGauge: React.FC<EnvGaugeProps> = React.memo(({ score, size = 180 }) => {
  const clampedScore = Math.max(0, Math.min(10, score));
  const percentage = clampedScore / 10;
  const radius = (size - 20) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const startAngle = -210;
  const endAngle = 30;
  const totalAngle = endAngle - startAngle;
  const currentAngle = startAngle + totalAngle * percentage;

  const polarToCartesian = (angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };

  const arcPath = (startA: number, endA: number) => {
    const s = polarToCartesian(startA);
    const e = polarToCartesian(endA);
    const largeArc = endA - startA > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${radius} ${radius} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  const getColor = () => {
    if (clampedScore < 3) return 'hsl(160, 84%, 39%)';
    if (clampedScore < 5) return 'hsl(38, 92%, 50%)';
    if (clampedScore < 7) return 'hsl(25, 95%, 53%)';
    if (clampedScore < 9) return 'hsl(0, 84%, 60%)';
    return 'hsl(263, 70%, 50%)';
  };

  return (
    <svg width={size} height={size * 0.7} viewBox={`0 0 ${size} ${size * 0.7}`}>
      <path
        d={arcPath(startAngle, endAngle)}
        fill="none"
        stroke="hsl(220, 20%, 18%)"
        strokeWidth="12"
        strokeLinecap="round"
      />
      <path
        d={arcPath(startAngle, currentAngle)}
        fill="none"
        stroke={getColor()}
        strokeWidth="12"
        strokeLinecap="round"
        style={{ transition: 'all 0.5s ease' }}
      />
      <text
        x={cx}
        y={cy - 10}
        textAnchor="middle"
        fill={getColor()}
        fontSize={size * 0.22}
        fontWeight="900"
        style={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {clampedScore.toFixed(1)}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        fill="hsl(215, 14%, 65%)"
        fontSize={size * 0.07}
        fontWeight="600"
        letterSpacing="0.15em"
        style={{ textTransform: 'uppercase' }} 
      >
        ENV SCORE
      </text>
    </svg>
  );
});

EnvGauge.displayName = 'EnvGauge';
export default EnvGauge;
