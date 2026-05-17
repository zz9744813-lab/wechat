"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard").then(r => r.json()).then(j => {
      if (j.ok) setData(j.data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-8 text-muted-foreground">加载中...</div>;

  const { counts, ai, recentJournals, recentChapters } = data ?? {};
  const moods: Record<string, string> = {
    "振奋": "\u{1F604}", "平静": "\u{1F60C}", "低落": "\u{1F614}",
    "焦虑": "\u{1F615}", "愤怒": "\u{1F620}", "混乱": "\u{1F635}",
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">Mirror Epic</h1>
        <p className="text-muted-foreground text-sm mt-1">你写一行,世界长一卷</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-purple-400">{counts?.journals ?? 0}</div><div className="text-xs text-muted-foreground mt-1">日记</div></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-blue-400">{counts?.chapters ?? 0}</div><div className="text-xs text-muted-foreground mt-1">章节</div></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-amber-400">{counts?.characters ?? 0}</div><div className="text-xs text-muted-foreground mt-1">角色</div></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><div className="text-3xl font-bold text-green-400">{counts?.activePatterns ?? 0}</div><div className="text-xs text-muted-foreground mt-1">活跃模式</div></CardContent></Card>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm uppercase tracking-wide">最近日记</CardTitle></CardHeader>
          <CardContent>
            {recentJournals?.length === 0 ? (
              <p className="text-muted-foreground text-sm">还没有日记。去写一篇吧。</p>
            ) : (
              <div className="space-y-2">
                {recentJournals?.map((j: any) => {
                  let themes: string[] = [];
                  try { themes = JSON.parse(j.extractedThemes ?? "[]"); } catch {}
                  return (
                    <div key={j.id} className="flex items-center gap-3 text-sm">
                      <span className="text-lg">{moods[j.mood] ?? "\u{1F610}"}</span>
                      <div className="flex-1">
                        <span className="text-muted-foreground">{new Date(j.timestamp).toLocaleDateString("zh-CN")}</span>
                        <span className="ml-2 text-xs text-purple-400">{themes.map((t: any) => t.name ?? t).join(", ")}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">能量 {j.energy}/10</span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm uppercase tracking-wide">小说进度</CardTitle></CardHeader>
          <CardContent>
            {recentChapters?.length === 0 ? (
              <p className="text-muted-foreground text-sm">还没有章节。从写日记开始。</p>
            ) : (
              <div className="space-y-2">
                {recentChapters?.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 text-sm">
                    <span className="text-muted-foreground">第{c.chapterNum}章</span>
                    <span className="flex-1">{c.title}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === "final" ? "bg-green-900/30 text-green-400" : "bg-muted text-muted-foreground"}`}>
                      {c.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {ai && (
        <Card>
          <CardHeader><CardTitle className="text-sm uppercase tracking-wide">AI 消耗</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-8 text-sm">
              <div><span className="text-muted-foreground">总成本:</span> <span className="font-mono">${ai.totalCostUsd.toFixed(4)}</span></div>
              <div><span className="text-muted-foreground">总 Token:</span> <span className="font-mono">{ai.totalTokens.toLocaleString()}</span></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
