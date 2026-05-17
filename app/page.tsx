"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";

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

  const { counts, ai, content, trends, recentJournals, recentChapters, recentBranches, recentArcs, activePatterns } = data ?? {};
  const moods: Record<string, string> = {
    "振奋": "\u{1F604}", "平静": "\u{1F60C}", "低落": "\u{1F614}",
    "焦虑": "\u{1F615}", "愤怒": "\u{1F620}", "混乱": "\u{1F635}",
  };

  const topThemes = trends?.themes
    ? Object.entries(trends.themes as Record<string, number>)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 6)
    : [];

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mirror Epic</h1>
          <p className="text-muted-foreground text-sm mt-1">你写一行,世界长一卷</p>
        </div>
        <div className="flex gap-2">
          <Link href="/journal"><Button size="sm">写日记</Button></Link>
          <Link href="/novel"><Button size="sm" variant="outline">写小说</Button></Link>
        </div>
      </div>

      {/* 核心指标 */}
      <div className="grid grid-cols-6 gap-3">
        <StatCard label="日记" value={counts?.journals ?? 0} color="text-purple-400" />
        <StatCard label="章节" value={counts?.chapters ?? 0} color="text-blue-400" />
        <StatCard label="已完成" value={counts?.finalChapters ?? 0} color="text-green-400" />
        <StatCard label="角色" value={counts?.characters ?? 0} color="text-amber-400" />
        <StatCard label="模式" value={counts?.activePatterns ?? 0} color="text-rose-400" />
        <StatCard label="分支" value={counts?.branches ?? 0} color="text-cyan-400" />
      </div>

      {/* 能量趋势 */}
      {trends?.energy && trends.energy.length > 1 && (
        <Card>
          <CardHeader><CardTitle className="text-sm uppercase tracking-wide">能量趋势</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-20">
              {trends.energy.map((e: any, i: number) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-t bg-gradient-to-t from-purple-600 to-purple-400 transition-all"
                    style={{ height: `${(e.energy / 10) * 100}%`, minHeight: "4px" }}
                  />
                  <span className="text-[10px] text-muted-foreground">{e.energy}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[10px] text-muted-foreground">最早</span>
              <span className="text-[10px] text-muted-foreground">最近</span>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* 最近日记 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide">最近日记</CardTitle>
              <Link href="/journal" className="text-xs text-muted-foreground hover:text-foreground">查看全部</Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentJournals?.length === 0 ? (
              <p className="text-muted-foreground text-sm">还没有日记。去写一篇吧。</p>
            ) : (
              <div className="space-y-2">
                {recentJournals?.slice(0, 5).map((j: any) => {
                  let themes: string[] = [];
                  try { themes = JSON.parse(j.extractedThemes ?? "[]").map((t: any) => t.name ?? t); } catch {}
                  return (
                    <div key={j.id} className="flex items-center gap-2 text-sm">
                      <span className="text-lg">{moods[j.mood] ?? "\u{1F610}"}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{new Date(j.timestamp).toLocaleDateString("zh-CN")}</span>
                          <span className="text-xs text-muted-foreground">能量 {j.energy}/10</span>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{j.rawText?.slice(0, 40)}...</p>
                      </div>
                      {themes.length > 0 && (
                        <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-500/30 shrink-0">
                          {themes[0]}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 小说进度 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide">小说进度</CardTitle>
              <Link href="/novel" className="text-xs text-muted-foreground hover:text-foreground">查看全部</Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentChapters?.length === 0 ? (
              <p className="text-muted-foreground text-sm">还没有章节。从写日记开始。</p>
            ) : (
              <div className="space-y-2">
                {recentChapters?.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground text-xs w-8">第{c.chapterNum}章</span>
                    <span className="flex-1 truncate">{c.title}</span>
                    <Badge
                      variant={c.status === "final" ? "default" : "outline"}
                      className={`text-xs ${c.status === "final" ? "bg-green-900/30 text-green-400" : ""}`}
                    >
                      {c.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 主题图谱 */}
        <Card>
          <CardHeader><CardTitle className="text-sm uppercase tracking-wide">主题图谱</CardTitle></CardHeader>
          <CardContent>
            {topThemes.length === 0 ? (
              <p className="text-muted-foreground text-sm">写更多日记后,主题会自动浮现。</p>
            ) : (
              <div className="space-y-2">
                {topThemes.map(([name, count], i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-sm flex-1">{name}</span>
                    <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${Math.min(100, ((count as number) / (topThemes[0][1] as number)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-6 text-right">{count as number}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 成长弧线 & 分支 */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide">成长弧线</CardTitle>
              <Link href="/patterns" className="text-xs text-muted-foreground hover:text-foreground">管理</Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentArcs?.length === 0 ? (
              <p className="text-muted-foreground text-sm">还没有成长弧线。系统会在日记中自动识别。</p>
            ) : (
              <div className="space-y-2">
                {recentArcs?.map((a: any) => (
                  <div key={a.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{a.name}</span>
                      <Badge variant="outline" className="text-xs">{a.phase}</Badge>
                    </div>
                    {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide">平行宇宙分支</CardTitle>
              <Link href="/novel" className="text-xs text-muted-foreground hover:text-foreground">管理</Link>
            </div>
          </CardHeader>
          <CardContent>
            {recentBranches?.length === 0 ? (
              <p className="text-muted-foreground text-sm">还没有分支。完成章节后可以生成平行宇宙。</p>
            ) : (
              <div className="space-y-2">
                {recentBranches?.map((b: any) => (
                  <div key={b.id} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">{b.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(b.createdAt).toLocaleDateString("zh-CN")}</span>
                    </div>
                    {b.divergeQuestion && <p className="text-xs text-muted-foreground mt-1">{b.divergeQuestion}</p>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* AI 消耗 */}
      {ai && (
        <Card>
          <CardHeader><CardTitle className="text-sm uppercase tracking-wide">AI 消耗</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-muted-foreground">总成本</div>
                <div className="text-lg font-mono">${ai.totalCostUsd.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">总 Token</div>
                <div className="text-lg font-mono">{ai.totalTokens.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">总字数</div>
                <div className="text-lg font-mono">{(content?.totalWordCount ?? 0).toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">最新章节</div>
                <div className="text-lg">{content?.latestChapter?.title ?? "无"}</div>
              </div>
            </div>

            {ai.recentLogs?.length > 0 && (
              <div className="mt-4">
                <div className="text-xs text-muted-foreground mb-2">最近操作</div>
                <div className="space-y-1">
                  {ai.recentLogs.slice(0, 8).map((log: any) => (
                    <div key={log.id} className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">{new Date(log.createdAt).toLocaleString("zh-CN", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                      <Badge variant="outline" className="text-[10px]">{log.operation}</Badge>
                      <span className="text-muted-foreground">{log.passName}</span>
                      <span className="ml-auto font-mono">${log.costUsd.toFixed(4)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="pt-6 text-center">
        <div className={`text-2xl font-bold ${color}`}>{value}</div>
        <div className="text-xs text-muted-foreground mt-1">{label}</div>
      </CardContent>
    </Card>
  );
}
