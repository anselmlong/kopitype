"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { PacePoint, niceMax, timeTickStep } from "@/lib/pace";

interface PaceChartProps {
  points: PacePoint[];
}

// viewBox coordinates; the svg itself scales to its container
const W = 560;
const H = 170;
const M = { top: 12, right: 14, bottom: 24, left: 38 };
const IW = W - M.left - M.right;
const IH = H - M.top - M.bottom;

/**
 * Pace over time: one 2px accent line of running wpm, an end dot with the
 * final value, and an × wherever a second contained wrong keystrokes.
 * Hover/pointer gets a crosshair + tooltip; the chart is keyboard-focusable
 * and arrow keys walk the same readout.
 */
export default function PaceChart({ points }: PaceChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const geom = useMemo(() => {
    if (points.length < 2) return null;
    const t0 = points[0].t;
    const t1 = points[points.length - 1].t;
    const span = Math.max(t1 - t0, 1e-6);
    const { max: yMax, step: yStep } = niceMax(Math.max(...points.map((p) => p.wpm)));
    const x = (t: number) => M.left + ((t - t0) / span) * IW;
    const y = (v: number) => M.top + IH - (v / yMax) * IH;
    const xy = points.map((p) => [x(p.t), y(p.wpm)] as const);
    const line = xy.map(([px, py], i) => `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`).join("");
    const area = `${line}L${xy[xy.length - 1][0].toFixed(1)},${(M.top + IH).toFixed(1)}L${xy[0][0].toFixed(1)},${(M.top + IH).toFixed(1)}Z`;

    const yTicks: number[] = [];
    for (let v = 0; v <= yMax; v += yStep) yTicks.push(v);
    const xTicks: number[] = [];
    const tStep = timeTickStep(t1);
    for (let t = tStep; t <= t1; t += tStep) xTicks.push(t);
    // a very short challenge still deserves one time reference
    if (xTicks.length === 0 && t1 >= 2) xTicks.push(Math.floor(t1));

    return { x, y, xy, line, area, yMax, yTicks, xTicks, t1 };
  }, [points]);

  const nearest = useCallback(
    (clientX: number) => {
      const wrap = wrapRef.current;
      if (!wrap || !geom) return null;
      const rect = wrap.getBoundingClientRect();
      const vx = ((clientX - rect.left) / rect.width) * W;
      let best = 0;
      let bestD = Infinity;
      geom.xy.forEach(([px], i) => {
        const d = Math.abs(px - vx);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      });
      return best;
    },
    [geom]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!geom) return;
      const last = points.length - 1;
      let next: number | null = null;
      if (e.key === "ArrowLeft") next = Math.max(0, (hover ?? points.length) - 1);
      else if (e.key === "ArrowRight") next = Math.min(last, (hover ?? -1) + 1);
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = last;
      else return;
      e.preventDefault();
      setHover(next);
    },
    [geom, hover, points.length]
  );

  if (!geom) return null;

  const lastPt = points[points.length - 1];
  const h = hover != null ? points[hover] : null;
  const hx = h ? geom.x(h.t) : 0;
  const totalErrors = points.reduce((n, p) => n + p.errors, 0);

  return (
    <div className="pace">
      <div className="pace-head">
        <span className="pace-title">pace</span>
        <span className="pace-note" aria-hidden>
          wpm per second{totalErrors > 0 ? " · × = wrong keys" : ""}
        </span>
      </div>
      <div
        ref={wrapRef}
        className="pace-wrap"
        tabIndex={0}
        role="img"
        aria-label={`pace over ${Math.round(geom.t1)} seconds, finishing at ${Math.round(
          lastPt.wpm
        )} wpm. use arrow keys to read each second.`}
        onKeyDown={onKeyDown}
        onPointerMove={(e) => setHover(nearest(e.clientX))}
        onPointerLeave={() => setHover(null)}
        onBlur={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="pace-svg" aria-hidden>
          {/* recessive hairline grid + axis labels */}
          {geom.yTicks.map((v) => (
            <g key={`y${v}`}>
              <line
                x1={M.left}
                x2={M.left + IW}
                y1={geom.y(v)}
                y2={geom.y(v)}
                className="pace-grid"
              />
              <text x={M.left - 8} y={geom.y(v) + 3} className="pace-tick" textAnchor="end">
                {v}
              </text>
            </g>
          ))}
          {geom.xTicks.map((t) => (
            <text
              key={`x${t}`}
              x={geom.x(t)}
              y={M.top + IH + 16}
              className="pace-tick"
              textAnchor="middle"
            >
              {t}s
            </text>
          ))}

          {/* area wash + the line itself */}
          <path d={geom.area} className="pace-area" />
          <path d={geom.line} className="pace-line" />

          {/* × where a second contained wrong keystrokes (shape, not color alone) */}
          {points.map((p, i) =>
            p.errors > 0 ? (
              <g key={`e${i}`} className="pace-x">
                <line
                  x1={geom.x(p.t) - 3.5}
                  x2={geom.x(p.t) + 3.5}
                  y1={geom.y(p.wpm) - 3.5}
                  y2={geom.y(p.wpm) + 3.5}
                />
                <line
                  x1={geom.x(p.t) - 3.5}
                  x2={geom.x(p.t) + 3.5}
                  y1={geom.y(p.wpm) + 3.5}
                  y2={geom.y(p.wpm) - 3.5}
                />
              </g>
            ) : null
          )}

          {/* end marker with a surface ring, direct-labelled with the final wpm */}
          <circle
            cx={geom.x(lastPt.t)}
            cy={geom.y(lastPt.wpm)}
            r={4}
            className="pace-end"
          />
          <text
            x={Math.min(geom.x(lastPt.t) + 8, W - 4)}
            y={geom.y(lastPt.wpm) - 8}
            className="pace-endlabel"
            textAnchor="end"
          >
            {Math.round(lastPt.wpm)} wpm
          </text>

          {/* crosshair */}
          {h && (
            <g>
              <line x1={hx} x2={hx} y1={M.top} y2={M.top + IH} className="pace-cross" />
              <circle cx={hx} cy={geom.y(h.wpm)} r={4} className="pace-dot" />
            </g>
          )}
        </svg>

        {h && (
          <div
            className="pace-tip"
            style={{
              left: `${(hx / W) * 100}%`,
              transform: `translateX(${hx > W * 0.72 ? "-108%" : "8px"})`,
            }}
            role="status"
          >
            <span className="pace-tip-value">{Math.round(h.wpm)} wpm</span>
            <span className="pace-tip-sub">
              at {Math.round(h.t)}s
              {h.errors > 0
                ? ` · ${h.errors} wrong ${h.errors === 1 ? "key" : "keys"}`
                : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
