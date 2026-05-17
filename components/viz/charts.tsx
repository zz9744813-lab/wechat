"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EnergyChartProps {
  data: { date: string | Date; energy: number }[];
}

export function EnergyChart({ data }: EnergyChartProps) {
  if (!data || data.length === 0) return null;

  const maxEnergy = 10;
  const chartHeight = 120;

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm uppercase tracking-wide">能量趋势</CardTitle></CardHeader>
      <CardContent>
        <div className="relative" style={{ height: chartHeight + 30 }}>
          {/* Y 轴标签 */}
          <div className="absolute left-0 top-0 bottom-6 flex flex-col justify-between text-[10px] text-muted-foreground">
            <span>10</span>
            <span>5</span>
            <span>0</span>
          </div>

          {/* 图表区域 */}
          <div className="ml-6 flex items-end gap-1" style={{ height: chartHeight }}>
            {data.map((point, i) => (
              <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: chartHeight }}>
                <div
                  className="w-full rounded-t transition-all duration-300"
                  style={{
                    height: `${(point.energy / maxEnergy) * 100}%`,
                    minHeight: "4px",
                    background: `linear-gradient(to top, ${
                      point.energy >= 7 ? "#22c55e" : point.energy >= 4 ? "#eab308" : "#ef4444"
                    }, transparent)`,
                  }}
                />
              </div>
            ))}
          </div>

          {/* X 轴标签 */}
          <div className="ml-6 flex justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">
              {new Date(data[0].date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(data[data.length - 1].date).toLocaleDateString("zh-CN", { month: "short", day: "numeric" })}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ThemeCloudProps {
  themes: Record<string, number>;
}

export function ThemeCloud({ themes }: ThemeCloudProps) {
  const entries = Object.entries(themes).sort(([, a], [, b]) => b - a);
  if (entries.length === 0) return null;

  const max = entries[0][1];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm uppercase tracking-wide">主题云</CardTitle></CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {entries.map(([name, count], i) => {
            const ratio = count / max;
            const size = 12 + ratio * 8;
            const opacity = 0.5 + ratio * 0.5;
            return (
              <span
                key={i}
                className="px-2 py-1 rounded-full border border-purple-500/30 text-purple-400 transition-all"
                style={{ fontSize: size, opacity }}
              >
                {name}
              </span>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface MoodDistributionProps {
  moods: { mood: string; count: number; emoji: string }[];
}

export function MoodDistribution({ moods }: MoodDistributionProps) {
  if (!moods || moods.length === 0) return null;

  const total = moods.reduce((sum, m) => sum + m.count, 0);

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm uppercase tracking-wide">心情分布</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-2">
          {moods.map((m, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-lg w-8">{m.emoji}</span>
              <span className="text-sm w-12">{m.mood}</span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full transition-all"
                  style={{ width: `${(m.count / total) * 100}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground w-8 text-right">{m.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

interface QualityRadarProps {
  scores: {
    voice: number;
    consistency: number;
    theme: number;
    emotion: number;
    prose: number;
  };
}

export function QualityRadar({ scores }: QualityRadarProps) {
  const categories = [
    { label: "角色声音", value: scores.voice },
    { label: "世界一致", value: scores.consistency },
    { label: "主题含蓄", value: scores.theme },
    { label: "情感弧线", value: scores.emotion },
    { label: "散文质量", value: scores.prose },
  ];

  const centerX = 100;
  const centerY = 100;
  const radius = 80;
  const angleStep = (2 * Math.PI) / categories.length;

  const points = categories.map((cat, i) => {
    const angle = i * angleStep - Math.PI / 2;
    const r = (cat.value / 10) * radius;
    return {
      x: centerX + r * Math.cos(angle),
      y: centerY + r * Math.sin(angle),
      labelX: centerX + (radius + 20) * Math.cos(angle),
      labelY: centerY + (radius + 20) * Math.sin(angle),
      ...cat,
    };
  });

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm uppercase tracking-wide">质量雷达</CardTitle></CardHeader>
      <CardContent>
        <svg viewBox="0 0 200 200" className="w-full max-w-xs mx-auto">
          {/* 背景网格 */}
          {[2, 4, 6, 8, 10].map(level => {
            const r = (level / 10) * radius;
            const gridPoints = categories.map((_, i) => {
              const angle = i * angleStep - Math.PI / 2;
              return `${centerX + r * Math.cos(angle)},${centerY + r * Math.sin(angle)}`;
            });
            return (
              <polygon
                key={level}
                points={gridPoints.join(" ")}
                fill="none"
                stroke="currentColor"
                className="text-border"
                strokeWidth="0.5"
              />
            );
          })}

          {/* 数据区域 */}
          <path d={pathD} fill="rgba(168, 85, 247, 0.2)" stroke="rgba(168, 85, 247, 0.8)" strokeWidth="1.5" />

          {/* 数据点 */}
          {points.map((p, i) => (
            <circle key={i} cx={p.x} cy={p.y} r="3" fill="rgba(168, 85, 247, 0.8)" />
          ))}

          {/* 标签 */}
          {points.map((p, i) => (
            <text
              key={i}
              x={p.labelX}
              y={p.labelY}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[8px] fill-muted-foreground"
            >
              {p.label}
            </text>
          ))}
        </svg>
        <div className="text-center text-xs text-muted-foreground mt-2">
          综合评分: {(categories.reduce((s, c) => s + c.value, 0) / categories.length).toFixed(1)}/10
        </div>
      </CardContent>
    </Card>
  );
}

interface GrowthTimelineProps {
  arcs: { name: string; phase: string; updatedAt: string }[];
}

export function GrowthTimeline({ arcs }: GrowthTimelineProps) {
  if (!arcs || arcs.length === 0) return null;

  const phases = ["觉察", "挣扎", "实验", "巩固", "整合"];
  const phaseColors: Record<string, string> = {
    "觉察": "#3b82f6",
    "挣扎": "#eab308",
    "实验": "#a855f7",
    "巩固": "#22c55e",
    "整合": "#f43f5e",
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm uppercase tracking-wide">成长时间线</CardTitle></CardHeader>
      <CardContent>
        <div className="space-y-3">
          {arcs.map((arc, i) => {
            const phaseIndex = phases.indexOf(arc.phase);
            const progress = ((phaseIndex + 1) / phases.length) * 100;
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{arc.name}</span>
                  <span className="text-xs" style={{ color: phaseColors[arc.phase] }}>{arc.phase}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${progress}%`, backgroundColor: phaseColors[arc.phase] }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
