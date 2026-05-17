"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const MOODS = [
  { value: "振奋", emoji: "\u{1F604}" }, { value: "平静", emoji: "\u{1F60C}" },
  { value: "低落", emoji: "\u{1F614}" }, { value: "焦虑", emoji: "\u{1F615}" },
  { value: "愤怒", emoji: "\u{1F620}" }, { value: "混乱", emoji: "\u{1F635}" },
];

export default function JournalPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [writing, setWriting] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [rawText, setRawText] = useState("");
  const [mood, setMood] = useState("平静");
  const [energy, setEnergy] = useState(5);
  const [lastResult, setLastResult] = useState<any>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/journals");
      const json = await res.json();
      if (json.ok) setEntries(json.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  const submit = async () => {
    if (!rawText.trim()) return;
    setProcessing(true);
    try {
      const res = await fetch("/api/journals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText, mood, energy }),
      });
      const json = await res.json();
      if (json.ok) {
        setLastResult(json.data);
        setRawText("");
        toast.success(`处理完成 (${json.data.tokensUsed} tokens, $${json.data.costUsd})`);
        fetchEntries();
      } else {
        toast.error(json.error ?? "处理失败");
      }
    } catch { toast.error("网络错误"); } finally { setProcessing(false); }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">日记</h1>

      {/* 写日记 */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide">今天的你</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4 items-center">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">心情</label>
              <div className="flex gap-1">
                {MOODS.map((m) => (
                  <button key={m.value} onClick={() => setMood(m.value)}
                    className={`text-2xl p-1 rounded-md transition-all ${mood === m.value ? "bg-accent ring-2 ring-purple-500 scale-110" : "opacity-50 hover:opacity-80"}`}>
                    {m.emoji}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">能量 {energy}/10</label>
              <input type="range" min={1} max={10} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} className="w-32" />
            </div>
          </div>

          <Textarea
            placeholder="写点什么... 不需要完整,不需要优美。几句话就行。"
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={6}
            className="text-base"
          />

          <div className="flex items-center gap-3">
            <Button onClick={submit} disabled={processing || !rawText.trim()}>
              {processing ? "处理中 (约 30 秒)..." : "写入日记"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {rawText.length} 字 · AI 将进行 7-pass 分析
            </span>
          </div>
        </CardContent>
      </Card>

      {/* 处理结果 */}
      {lastResult && (
        <Card className="border-purple-500/30">
          <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-purple-400">AI 分析结果</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {lastResult.themes?.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">主题</div>
                <div className="flex flex-wrap gap-1">
                  {lastResult.themes.map((t: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-purple-400 border-purple-500/30">{t.name}</Badge>
                  ))}
                </div>
              </div>
            )}
            {lastResult.emotions?.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">情绪光谱</div>
                <div className="flex flex-wrap gap-2">
                  {lastResult.emotions.map((e: any, i: number) => (
                    <div key={i} className="text-sm">
                      <span>{e.name}</span>
                      <span className="text-muted-foreground ml-1">({(e.intensity * 100).toFixed(0)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lastResult.reflection && (
              <div className="border-l-4 border-purple-500 pl-3 py-2">
                <div className="text-xs text-purple-400 mb-1">也许...</div>
                <p className="text-sm">{lastResult.reflection}</p>
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              Token: {lastResult.tokensUsed} · 成本: ${lastResult.costUsd}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 历史日记 */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide">历史日记</CardTitle></CardHeader>
        <CardContent>
          {loading ? <p className="text-muted-foreground">加载中...</p> :
           entries.length === 0 ? <p className="text-muted-foreground text-sm">还没有日记</p> : (
            <div className="space-y-3">
              {entries.map((e) => {
                let themes: any[] = [];
                try { themes = JSON.parse(e.extractedThemes ?? "[]"); } catch {}
                const moodEmoji = MOODS.find(m => m.value === e.mood)?.emoji ?? "\u{1F610}";
                return (
                  <div key={e.id} className="border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{moodEmoji}</span>
                      <span className="text-sm font-medium">{new Date(e.timestamp).toLocaleString("zh-CN")}</span>
                      <span className="text-xs text-muted-foreground">能量 {e.energy}/10</span>
                      {themes.length > 0 && (
                        <div className="flex gap-1 ml-auto">
                          {themes.slice(0, 3).map((t: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-xs text-purple-400 border-purple-500/30">{t.name ?? t}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-3">{e.rawText}</p>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
