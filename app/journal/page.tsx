"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
  const [processing, setProcessing] = useState(false);
  const [rawText, setRawText] = useState("");
  const [mood, setMood] = useState("平静");
  const [energy, setEnergy] = useState(5);
  const [lastResult, setLastResult] = useState<any>(null);
  const [inputMode, setInputMode] = useState<"text" | "voice">("text");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [crisisAlert, setCrisisAlert] = useState<any>(null);
  const recognitionRef = useRef<any>(null);

  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch("/api/journals");
      const json = await res.json();
      if (json.ok) setEntries(json.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // 语音识别初始化
  useEffect(() => {
    if (typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
      const recognition = new SpeechRecognition();
      recognition.lang = "zh-CN";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (event: any) => {
        let finalTranscript = "";
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(prev => prev + finalTranscript);
        }
      };
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsRecording(false);
      };
      recognition.onend = () => {
        setIsRecording(false);
      };
      recognitionRef.current = recognition;
    }
  }, []);

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error("当前浏览器不支持语音输入");
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      setTranscript("");
      recognitionRef.current.start();
      setIsRecording(true);
    }
  };

  const submit = async () => {
    const text = inputMode === "voice" ? transcript : rawText;
    if (!text.trim()) return;
    setProcessing(true);
    setCrisisAlert(null);
    try {
      const endpoint = inputMode === "voice" ? "/api/voice" : "/api/journals";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(inputMode === "voice" ? { transcript: text, source: "voice" } : { rawText: text }),
          mood, energy,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setLastResult(json.data);
        setRawText("");
        setTranscript("");
        toast.success(`处理完成 (${json.data.tokensUsed} tokens, $${json.data.costUsd})`);

        // 危机检测
        if (json.data.crisis?.detected) {
          setCrisisAlert(json.data.crisis);
        }

        fetchEntries();
      } else {
        toast.error(json.error ?? "处理失败");
      }
    } catch { toast.error("网络错误"); } finally { setProcessing(false); }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">日记</h1>

      {/* 危机警报 */}
      {crisisAlert && (
        <Card className="border-red-500 bg-red-950/30">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-red-400 font-bold">安全提醒</span>
            </div>
            <p className="text-sm">
              系统检测到你可能正在经历困难时期。请记住,寻求帮助是勇敢的行为。
            </p>
            <div className="space-y-1">
              {crisisAlert.helplines?.map((h: any, i: number) => (
                <div key={i} className="text-sm">
                  <span className="text-muted-foreground">{h.name}:</span>
                  <span className="ml-2 font-mono text-red-400">{h.phone}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCrisisAlert(null)}>我知道了</Button>
          </CardContent>
        </Card>
      )}

      {/* 写日记 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wide">今天的你</CardTitle>
            <div className="flex gap-1">
              <Button
                variant={inputMode === "text" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("text")}
              >
                文字
              </Button>
              <Button
                variant={inputMode === "voice" ? "default" : "outline"}
                size="sm"
                onClick={() => setInputMode("voice")}
              >
                语音
              </Button>
            </div>
          </div>
        </CardHeader>
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

          {inputMode === "text" ? (
            <Textarea
              placeholder="写点什么... 不需要完整,不需要优美。几句话就行。"
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={6}
              className="text-base"
            />
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Button
                  variant={isRecording ? "destructive" : "default"}
                  size="sm"
                  onClick={toggleRecording}
                >
                  {isRecording ? "停止录音" : "开始录音"}
                </Button>
                {isRecording && (
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                    <span className="text-sm text-muted-foreground">录音中...</span>
                  </div>
                )}
              </div>
              <Textarea
                placeholder="语音转写结果会显示在这里...你也可以直接编辑"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={4}
                className="text-base"
              />
              {transcript && (
                <div className="text-xs text-muted-foreground">{transcript.length} 字</div>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button onClick={submit} disabled={processing || (inputMode === "text" ? !rawText.trim() : !transcript.trim())}>
              {processing ? "处理中 (约 30 秒)..." : "写入日记"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {inputMode === "text" ? rawText.length : transcript.length} 字 · AI 将进行 10-pass 分析
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
            {lastResult.events?.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">事件</div>
                <div className="space-y-1">
                  {lastResult.events.map((e: any, i: number) => (
                    <div key={i} className="text-sm flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{e.category}</Badge>
                      <span>{e.description}</span>
                      <span className="text-xs text-muted-foreground ml-auto">重要性 {e.significance}/10</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lastResult.deepPatterns?.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">深层模式</div>
                <div className="space-y-2">
                  {lastResult.deepPatterns.map((p: any, i: number) => (
                    <div key={i} className="border border-border rounded p-2 text-sm">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">{p.trigger} → {p.response}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {lastResult.imagery?.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">意象</div>
                <div className="flex flex-wrap gap-2">
                  {lastResult.imagery.map((img: any, i: number) => (
                    <Badge key={i} variant="outline" className="text-xs">{img.imagery}</Badge>
                  ))}
                </div>
              </div>
            )}
            {lastResult.reflectionPrompts?.length > 0 && (
              <div>
                <div className="text-xs text-muted-foreground mb-1">反思提示</div>
                <div className="space-y-1">
                  {lastResult.reflectionPrompts.map((p: any, i: number) => (
                    <div key={i} className="text-sm border-l-2 border-purple-500/30 pl-2">
                      {p.question}
                      {p.suggested_time && <span className="text-xs text-muted-foreground ml-2">({p.suggested_time})</span>}
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
            <div className="text-xs text-muted-foreground flex gap-4">
              <span>Token: {lastResult.tokensUsed}</span>
              <span>成本: ${lastResult.costUsd}</span>
              {lastResult.privacyWarnings?.length > 0 && (
                <span className="text-amber-400">隐私提醒: {lastResult.privacyWarnings.join(", ")}</span>
              )}
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
