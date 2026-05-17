"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function NovelPage() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"chapters" | "branches">("chapters");
  const [writeResult, setWriteResult] = useState<any>(null);

  const fetchChapters = useCallback(async () => {
    try {
      const [cRes, bRes] = await Promise.all([
        fetch("/api/chapters").then(r => r.json()),
        fetch("/api/branches").then(r => r.json()),
      ]);
      if (cRes.ok) setChapters(cRes.data);
      if (bRes.ok) setBranches(bRes.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchChapters(); }, [fetchChapters]);

  const generateOutline = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ volume: 1 }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("大纲生成完成");
        fetchChapters();
        setSelectedChapter({ ...json.chapter, ...json.outline });
      } else {
        toast.error(json.error ?? "生成失败");
      }
    } catch { toast.error("网络错误"); } finally { setGenerating(false); }
  };

  const writeChapter = async (chapterId: string) => {
    setGenerating(true);
    setWriteResult(null);
    try {
      const res = await fetch("/api/chapters/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`章节写作完成 (${json.data.passCount} passes, ${json.data.tokensUsed} tokens)`);
        setWriteResult(json.data);
        fetchChapters();
        setSelectedChapter((prev: any) => ({
          ...prev,
          finalText: json.data.finalText,
          status: "final",
        }));
      } else {
        toast.error(json.error ?? "写作失败");
      }
    } catch { toast.error("网络错误"); } finally { setGenerating(false); }
  };

  const generateBranch = async (chapterId: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("平行宇宙分支生成完成");
        fetchChapters();
      } else {
        toast.error(json.error ?? "生成失败");
      }
    } catch { toast.error("网络错误"); } finally { setGenerating(false); }
  };

  const updateBranchStatus = async (id: string, status: string) => {
    try {
      await fetch("/api/branches", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      fetchChapters();
      toast.success("状态已更新");
    } catch { toast.error("操作失败"); }
  };

  if (loading) return <div className="p-8 text-muted-foreground">加载中...</div>;

  const statusColors: Record<string, string> = {
    outline: "bg-muted text-muted-foreground",
    draft_1: "bg-blue-900/30 text-blue-400",
    reviewing: "bg-amber-900/30 text-amber-400",
    final: "bg-green-900/30 text-green-400",
    exploring: "bg-purple-900/30 text-purple-400",
    merged: "bg-green-900/30 text-green-400",
    archived: "bg-muted text-muted-foreground",
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">小说</h1>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "chapters" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("chapters")}
          >
            章节 ({chapters.length})
          </Button>
          <Button
            variant={activeTab === "branches" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("branches")}
          >
            平行宇宙 ({branches.length})
          </Button>
          <Button onClick={generateOutline} disabled={generating} size="sm">
            {generating ? "生成中..." : "新章节大纲"}
          </Button>
        </div>
      </div>

      {activeTab === "chapters" && (
        <div className="grid grid-cols-3 gap-6">
          {/* 章节列表 */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">章节</h2>
            {chapters.length === 0 ? (
              <p className="text-muted-foreground text-sm">还没有章节。先写日记,然后生成大纲。</p>
            ) : (
              chapters.map((c) => (
                <div
                  key={c.id}
                  className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedChapter?.id === c.id
                      ? "border-purple-500 bg-accent"
                      : "border-border hover:border-muted-foreground"
                  }`}
                  onClick={() => { setSelectedChapter(c); setWriteResult(null); }}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">第{c.chapterNum}章 {c.title}</span>
                    <Badge className={`text-xs ${statusColors[c.status] ?? ""}`}>{c.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.synopsis}</p>
                  {c.tokenCount > 0 && (
                    <div className="text-[10px] text-muted-foreground mt-1">{c.tokenCount.toLocaleString()} tokens</div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 章节详情 */}
          <div className="col-span-2 space-y-4">
            {selectedChapter ? (
              <>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>第{selectedChapter.chapterNum}章 {selectedChapter.title}</CardTitle>
                      <div className="flex gap-2">
                        {selectedChapter.status === "outline" && (
                          <Button size="sm" onClick={() => writeChapter(selectedChapter.id)} disabled={generating}>
                            {generating ? "写作中..." : "开始写作 (5+ pass)"}
                          </Button>
                        )}
                        {selectedChapter.status === "final" && (
                          <Button size="sm" variant="outline" onClick={() => generateBranch(selectedChapter.id)} disabled={generating}>
                            生成平行宇宙
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="text-xs text-muted-foreground mb-1">概要</h3>
                      <p className="text-sm">{selectedChapter.synopsis || "未生成"}</p>
                    </div>

                    {/* 大纲详情 */}
                    {selectedChapter.passOutline && (() => {
                      let outline: any = null;
                      try { outline = JSON.parse(selectedChapter.passOutline); } catch {}
                      return outline ? (
                        <div className="space-y-2">
                          <h3 className="text-xs text-muted-foreground">大纲</h3>
                          {outline.key_scenes && (
                            <div>
                              <div className="text-xs text-muted-foreground mb-1">关键场景</div>
                              <ul className="list-disc list-inside text-sm space-y-1">
                                {outline.key_scenes.map((s: string, i: number) => <li key={i}>{s}</li>)}
                              </ul>
                            </div>
                          )}
                          {outline.emotional_arc && (
                            <div><span className="text-xs text-muted-foreground">情感弧线:</span> <span className="text-sm">{outline.emotional_arc}</span></div>
                          )}
                          {outline.theme_to_explore && (
                            <div><span className="text-xs text-muted-foreground">主题:</span> <span className="text-sm">{outline.theme_to_explore}</span></div>
                          )}
                          {outline.mirror_connection && (
                            <div><span className="text-xs text-muted-foreground">镜像连接:</span> <span className="text-sm">{outline.mirror_connection}</span></div>
                          )}
                        </div>
                      ) : null;
                    })()}

                    {/* 正文 */}
                    {selectedChapter.finalText && (
                      <div>
                        <h3 className="text-xs text-muted-foreground mb-2">正文</h3>
                        <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap max-h-[600px] overflow-y-auto">
                          {selectedChapter.finalText}
                        </div>
                      </div>
                    )}

                    {selectedChapter.tokenCount > 0 && (
                      <div className="text-xs text-muted-foreground">Token 消耗: {selectedChapter.tokenCount.toLocaleString()}</div>
                    )}
                  </CardContent>
                </Card>

                {/* 写作结果详情 */}
                {writeResult && (
                  <Card className="border-purple-500/30">
                    <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-purple-400">写作管线结果</CardTitle></CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-4 gap-3">
                        <div>
                          <div className="text-xs text-muted-foreground">质量评分</div>
                          <div className="text-lg font-bold text-purple-400">{writeResult.qualityScore}/10</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Pass 数</div>
                          <div className="text-lg font-bold">{writeResult.passCount}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">Token</div>
                          <div className="text-lg font-mono">{writeResult.tokensUsed?.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-xs text-muted-foreground">成本</div>
                          <div className="text-lg font-mono">${writeResult.costUsd?.toFixed(4)}</div>
                        </div>
                      </div>

                      {writeResult.voiceCheck && (
                        <div>
                          <div className="text-xs text-muted-foreground mb-1">角色声音 ({writeResult.voiceCheck.overall_voice_score}/10)</div>
                          {writeResult.voiceCheck.issues?.length > 0 && (
                            <ul className="text-xs space-y-1">
                              {writeResult.voiceCheck.issues.map((i: any, idx: number) => (
                                <li key={idx} className="text-amber-400">{i.character}: {i.problem}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}

                      {writeResult.themeAudit && (
                        <div className="flex gap-4 text-xs">
                          <span>主题落地: {writeResult.themeAudit.theme_landed ? "是" : "否"}</span>
                          <span>说教度: {writeResult.themeAudit.preachiness_score}/10</span>
                          <span>含蓄度: {writeResult.themeAudit.subtlety_score}/10</span>
                        </div>
                      )}

                      {writeResult.emotionArc && (
                        <div className="flex gap-4 text-xs">
                          <span>弧线形状: {writeResult.emotionArc.arc_shape}</span>
                          <span>参与度: {writeResult.emotionArc.engagement_score}/10</span>
                        </div>
                      )}

                      {writeResult.styleSpectrum?.current_style && (
                        <div className="flex gap-4 text-xs">
                          <span>意象密度: {writeResult.styleSpectrum.current_style.imagery_density}</span>
                          <span>情感层次: {writeResult.styleSpectrum.current_style.emotional_register}</span>
                          <span>叙事距离: {writeResult.styleSpectrum.current_style.narrative_distance}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  选择一个章节查看详情,或生成新大纲
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeTab === "branches" && (
        <Card>
          <CardHeader><CardTitle className="text-sm uppercase tracking-wide">平行宇宙分支</CardTitle></CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm mb-4">
              分支是故事的「如果……会怎样」。在已完成的章节上探索不同的可能性。
            </p>
            {branches.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-border rounded-lg text-center text-muted-foreground">
                还没有分支。完成章节后,点击「生成平行宇宙」创建第一个分支。
              </div>
            ) : (
              <div className="space-y-3">
                {branches.map((b) => {
                  let scenes: any[] = [];
                  try { scenes = JSON.parse(b.generatedChapters ?? "[]"); } catch {}
                  const sourceChapter = chapters.find(c => c.id === b.divergeFromId);
                  return (
                    <div key={b.id} className="border border-border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className={statusColors[b.status] ?? ""}>{b.status}</Badge>
                          {sourceChapter && (
                            <span className="text-xs text-muted-foreground">
                              分支自: 第{sourceChapter.chapterNum}章 {sourceChapter.title}
                            </span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          {b.status === "exploring" && (
                            <>
                              <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateBranchStatus(b.id, "merged")}>
                                合并入主线
                              </Button>
                              <Button variant="ghost" size="sm" className="text-xs" onClick={() => updateBranchStatus(b.id, "archived")}>
                                归档
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      {b.divergeQuestion && (
                        <p className="text-sm"><span className="text-muted-foreground">分歧点:</span> {b.divergeQuestion}</p>
                      )}
                      {scenes.length > 0 && (
                        <div className="space-y-1">
                          {scenes.map((s: any, i: number) => (
                            <div key={i} className="text-xs text-muted-foreground">
                              <span className="text-foreground">场景 {i + 1}:</span> {s.scene ?? s}
                              {s.emotional_shift && <span className="ml-2 text-purple-400">({s.emotional_shift})</span>}
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        创建: {new Date(b.createdAt).toLocaleDateString("zh-CN")}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
