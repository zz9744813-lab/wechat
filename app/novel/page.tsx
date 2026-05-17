"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function NovelPage() {
  const [chapters, setChapters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState<any>(null);

  const fetchChapters = useCallback(async () => {
    try {
      const res = await fetch("/api/chapters");
      const json = await res.json();
      if (json.ok) setChapters(json.data);
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
        setSelectedChapter(json.data);
      } else {
        toast.error(json.error ?? "生成失败");
      }
    } catch { toast.error("网络错误"); } finally { setGenerating(false); }
  };

  const writeChapter = async (chapterId: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/chapters/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chapterId }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(`章节写作完成 (${json.data.tokensUsed} tokens)`);
        fetchChapters();
        setSelectedChapter({ ...selectedChapter, finalText: json.data.finalText, status: "final" });
      } else {
        toast.error(json.error ?? "写作失败");
      }
    } catch { toast.error("网络错误"); } finally { setGenerating(false); }
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">小说</h1>
        <Button onClick={generateOutline} disabled={generating} size="sm">
          {generating ? "生成中..." : "新章节大纲"}
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* 章节列表 */}
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">章节</h2>
          {loading ? <p className="text-muted-foreground text-sm">加载中...</p> :
           chapters.length === 0 ? <p className="text-muted-foreground text-sm">还没有章节。先写日记,然后生成大纲。</p> : (
            chapters.map((c) => (
              <div key={c.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${selectedChapter?.id === c.id ? "border-purple-500 bg-accent" : "border-border hover:border-muted-foreground"}`}
                onClick={() => setSelectedChapter(c)}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">第{c.chapterNum}章 {c.title}</span>
                  <Badge variant={c.status === "final" ? "default" : "outline"} className="text-xs">{c.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.synopsis}</p>
              </div>
            ))
          )}
        </div>

        {/* 章节详情 */}
        <div className="col-span-2">
          {selectedChapter ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>第{selectedChapter.chapterNum}章 {selectedChapter.title}</CardTitle>
                  {selectedChapter.status === "outline" && (
                    <Button size="sm" onClick={() => writeChapter(selectedChapter.id)} disabled={generating}>
                      {generating ? "写作中..." : "开始写作 (3-pass)"}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xs text-muted-foreground mb-1">概要</h3>
                  <p className="text-sm">{selectedChapter.synopsis || "未生成"}</p>
                </div>

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
                    </div>
                  ) : null;
                })()}

                {selectedChapter.finalText && (
                  <div>
                    <h3 className="text-xs text-muted-foreground mb-2">正文</h3>
                    <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedChapter.finalText}
                    </div>
                  </div>
                )}

                {selectedChapter.tokenCount > 0 && (
                  <div className="text-xs text-muted-foreground">Token 消耗: {selectedChapter.tokenCount.toLocaleString()}</div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center text-muted-foreground">
                选择一个章节查看详情,或生成新大纲
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
