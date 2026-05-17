"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function SettingsPage() {
  const [generating, setGenerating] = useState(false);
  const [narrative, setNarrative] = useState<any>(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchResult, setBatchResult] = useState<any>(null);
  const [crisisData, setCrisisData] = useState<any>(null);

  const generateNarrative = async (type: "quarterly" | "annual") => {
    setGenerating(true);
    try {
      const res = await fetch("/api/narratives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          periodLabel: type === "quarterly" ? "最近三个月" : undefined,
          year: type === "annual" ? new Date().getFullYear().toString() : undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setNarrative(json.data);
        toast.success(`${type === "quarterly" ? "季度" : "年度"}叙事生成完成`);
      } else {
        toast.error(json.error ?? "生成失败");
      }
    } catch { toast.error("生成失败"); } finally { setGenerating(false); }
  };

  const batchReprocess = async () => {
    setBatchProcessing(true);
    try {
      const res = await fetch("/api/journals/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reprocess_all" }),
      });
      const json = await res.json();
      if (json.ok) {
        setBatchResult(json.data);
        toast.success(`批量处理完成: ${json.data.length} 篇`);
      } else {
        toast.error(json.error ?? "处理失败");
      }
    } catch { toast.error("处理失败"); } finally { setBatchProcessing(false); }
  };

  const checkCrisis = async () => {
    try {
      const res = await fetch("/api/crisis");
      const json = await res.json();
      if (json.ok) {
        setCrisisData(json.data);
      }
    } catch { toast.error("查询失败"); }
  };

  const exportData = () => {
    fetch("/api/dashboard").then(r => r.json()).then(j => {
      const blob = new Blob([JSON.stringify(j.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = "mirror-epic-export.json"; a.click();
    });
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">设置</h1>

      {/* 关于 */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide">关于</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Mirror Epic</strong> — 镜像史诗 v0.2.0</p>
          <p className="text-muted-foreground">你写一行,世界长一卷。</p>
          <p className="text-muted-foreground mt-4">
            一个把个人成长管理和长篇小说写作深度耦合的系统。
            你写日记,AI 写小说;你过人生,AI 替你的&quot;镜像&quot;过平行人生。
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>Framework: Next.js 15 (App Router)</div>
            <div>Language: TypeScript</div>
            <div>DB: SQLite + Prisma</div>
            <div>AI: Anthropic Claude</div>
            <div>UI: Tailwind CSS</div>
            <div>Validation: Zod</div>
          </div>
        </CardContent>
      </Card>

      {/* 生命叙事 */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide">生命叙事</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            系统会基于你的日记数据,生成文学性的生命叙事。不是数据报告,而是用隐喻和意象描绘你的生命状态。
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => generateNarrative("quarterly")} disabled={generating}>
              {generating ? "生成中..." : "生成季度叙事"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => generateNarrative("annual")} disabled={generating}>
              {generating ? "生成中..." : "生成年度叙事"}
            </Button>
          </div>

          {narrative && (
            <div className="border border-border rounded-lg p-4 space-y-3">
              <h3 className="font-medium">{narrative.period ?? narrative.year ?? "生命叙事"}</h3>
              {narrative.narrative && (
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{narrative.narrative}</p>
              )}
              {narrative.dominant_themes?.length > 0 && (
                <div>
                  <span className="text-xs text-muted-foreground">主题: </span>
                  {narrative.dominant_themes.map((t: string, i: number) => (
                    <Badge key={i} variant="outline" className="ml-1 text-xs">{t}</Badge>
                  ))}
                </div>
              )}
              {narrative.growth_milestones?.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">成长里程碑</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {narrative.growth_milestones.map((m: string, i: number) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              )}
              {narrative.unresolved_tensions?.length > 0 && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">未解决的张力</div>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {narrative.unresolved_tensions.map((t: string, i: number) => <li key={i}>{t}</li>)}
                  </ul>
                </div>
              )}
              {narrative.imagery_summary && (
                <div className="border-l-4 border-purple-500 pl-3 py-1">
                  <span className="text-xs text-purple-400">意象: </span>
                  <span className="text-sm">{narrative.imagery_summary}</span>
                </div>
              )}
              {narrative.looking_forward && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">展望</div>
                  <p className="text-sm">{narrative.looking_forward}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 数据管理 */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide">数据管理</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportData}>
              导出全部数据 (JSON)
            </Button>
            <Button variant="outline" size="sm" onClick={batchReprocess} disabled={batchProcessing}>
              {batchProcessing ? "处理中..." : "重新处理未分析日记"}
            </Button>
            <Button variant="outline" size="sm" onClick={checkCrisis}>
              安全状态检查
            </Button>
          </div>

          {batchResult && (
            <div className="border border-border rounded-lg p-3 text-sm">
              <div className="text-xs text-muted-foreground mb-2">批量处理结果</div>
              {batchResult.map((r: any, i: number) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span className="font-mono">{r.id?.slice(0, 8)}</span>
                  <Badge variant={r.status === "ok" ? "default" : "destructive"} className="text-[10px]">{r.status}</Badge>
                  {r.tokens && <span className="text-muted-foreground">{r.tokens} tokens</span>}
                  {r.error && <span className="text-red-400">{r.error}</span>}
                </div>
              ))}
            </div>
          )}

          {crisisData && (
            <div className="border border-border rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">安全状态</span>
                {crisisData.hasHighRisk ? (
                  <Badge variant="destructive" className="text-xs">需要关注</Badge>
                ) : (
                  <Badge variant="default" className="text-xs bg-green-900/30 text-green-400">正常</Badge>
                )}
              </div>
              <div className="text-xs text-muted-foreground">
                最近 {crisisData.recentCrises?.length ?? 0} 次检测
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">求助热线</div>
                {crisisData.helplines?.map((h: any, i: number) => (
                  <div key={i} className="text-sm">
                    {h.name}: <span className="font-mono">{h.phone}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 系统信息 */}
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide">管线信息</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-xs text-muted-foreground">
          <div className="grid grid-cols-2 gap-2">
            <div>日记处理: 10-pass 管线</div>
            <div>章节写作: 5-9 pass 管线</div>
            <div>危机检测: 每篇日记自动扫描</div>
            <div>模式识别: 自动 + 手动</div>
            <div>桥接层: 三层变形 (事件→抽象→意象)</div>
            <div>分支叙事: 平行宇宙探索</div>
            <div>生命叙事: 季度 + 年度</div>
            <div>角色心理: 深层分析</div>
            <div>语音输入: Web Speech API</div>
            <div>隐私守护: 自动检测 + 脱敏</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
