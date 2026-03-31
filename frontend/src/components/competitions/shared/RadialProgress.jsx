import { useEffect, useState } from 'react';

/**
 * RadialProgress — circular progress indicator.
 *
 * Props:
 *   value      — 0-100 (static). Omit for indeterminate (spinning animation).
 *   size       — diameter in px (default 80)
 *   thickness  — stroke width in px (default 7)
 *   label      — text shown inside the circle (defaults to "value%" or nothing)
 *   color      — CSS color string (default: var(--primary-color, #6366f1))
 *   className  — extra classes on the wrapper
 *
 * Indeterminate mode (no value prop):
 *   Shows a spinning arc that animates continuously — ideal for unknown duration.
 *
 * Determinate mode (value prop):
 *   Shows exact percentage filled.
 */
export default function RadialProgress({
  value,
  size = 80,
  thickness = 7,
  label,
  color,
  className = '',
}) {
  const isIndeterminate = value === undefined || value === null;
  const pct = isIndeterminate ? 75 : Math.min(100, Math.max(0, value));

  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const cx = size / 2;
  const cy = size / 2;

  // Animated value for determinate — counts up from 0
  const [displayed, setDisplayed] = useState(isIndeterminate ? pct : 0);
  useEffect(() => {
    if (isIndeterminate) return;
    setDisplayed(0);
    const timer = setTimeout(() => setDisplayed(pct), 30);
    return () => clearTimeout(timer);
  }, [pct, isIndeterminate]);

  const strokeColor = color || 'var(--primary-color, #6366f1)';
  const dashoffset = isIndeterminate
    ? circ - (75 / 100) * circ
    : circ - (displayed / 100) * circ;

  return (
    <div
      className={`relative inline-flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={isIndeterminate ? undefined : pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={isIndeterminate ? 'Carregando…' : `${pct}%`}
    >
      <svg width={size} height={size} style={isIndeterminate ? { animation: 'radial-spin 1.2s linear infinite' } : {}}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={thickness}
          className="text-primary/10"
        />
        {/* Progress arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={strokeColor}
          strokeWidth={thickness}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={dashoffset}
          transform={`rotate(-90 ${cx} ${cy})`}
          style={isIndeterminate ? {} : { transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>

      {/* Inner label */}
      {!isIndeterminate && (
        <span
          className="absolute text-xs font-bold text-foreground tabular-nums"
          style={{ fontSize: size * 0.18 }}
        >
          {label !== undefined ? label : `${pct}%`}
        </span>
      )}

      <style>{`
        @keyframes radial-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
