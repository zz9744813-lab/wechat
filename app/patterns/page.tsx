"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function PatternsPage() {
  const [patterns, setPatterns] = useState<any[]>([]);
  const [arcs, setArcs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewPattern, setShowNewPattern] = useState(false);
  const [showNewArc, setShowNewArc] = useState(false);
  const [activeTab, setActiveTab] = useState<"patterns" | "arcs">("patterns");

  // Pattern form
  const [pName, setPName] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [pTrigger, setPTrigger] = useState("");
  const [pResponse, setPResponse] = useState("");

  // Arc form
  const [aName, setAName] = useState("");
  const [aPhase, setAPhase] = useState("觉察");
  const [aDesc, setADesc] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [pRes, aRes] = await Promise.all([
        fetch("/api/patterns").then(r => r.json()),
        fetch("/api/growth-arcs").then(r => r.json()),
      ]);
      if (pRes.ok) setPatterns(pRes.data);
      if (aRes.ok) setArcs(aRes.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const createPattern = async () => {
    if (!pName.trim()) return;
    try {
      const res = await fetch("/api/patterns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: pName, description: pDesc,
          triggerSignatures: pTrigger.split("\n").filter(Boolean),
          typicalResponse: pResponse.split("\n").filter(Boolean),
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("模式创建成功");
        setPatterns([json.data, ...patterns]);
        setShowNewPattern(false);
        setPName(""); setPDesc(""); setPTrigger(""); setPResponse("");
      }
    } catch { toast.error("创建失败"); }
  };

  const deactivatePattern = async (id: string) => {
    try {
      await fetch(`/api/patterns?id=${id}`, { method: "DELETE" });
      setPatterns(patterns.filter(p => p.id !== id));
      toast.success("模式已停用");
    } catch { toast.error("操作失败"); }
  };

  const createArc = async () => {
    if (!aName.trim()) return;
    try {
      const res = await fetch("/api/growth-arcs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: aName, phase: aPhase, description: aDesc }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("成长弧线创建成功");
        setArcs([json.data, ...arcs]);
        setShowNewArc(false);
        setAName(""); setAPhase("觉察"); setADesc("");
      }
    } catch { toast.error("创建失败"); }
  };

  const updateArcPhase = async (id: string, phase: string) => {
    try {
      const res = await fetch("/api/growth-arcs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, phase }),
      });
      const json = await res.json();
      if (json.ok) {
        setArcs(arcs.map(a => a.id === id ? { ...a, phase } : a));
        toast.success("阶段已更新");
      }
    } catch { toast.error("更新失败"); }
  };

  if (loading) return <div className="p-8 text-muted-foreground">加载中...</div>;

  const phases = ["觉察", "挣扎", "实验", "巩固", "整合"];
  const phaseColors: Record<string, string> = {
    "觉察": "bg-blue-900/30 text-blue-400",
    "挣扎": "bg-amber-900/30 text-amber-400",
    "实验": "bg-purple-900/30 text-purple-400",
    "巩固": "bg-green-900/30 text-green-400",
    "整合": "bg-rose-900/30 text-rose-400",
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">个人模式</h1>
        <div className="flex gap-2">
          <Button
            variant={activeTab === "patterns" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("patterns")}
          >
            行为模式 ({patterns.length})
          </Button>
          <Button
            variant={activeTab === "arcs" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("arcs")}
          >
            成长弧线 ({arcs.length})
          </Button>
        </div>
      </div>

      {activeTab === "patterns" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm uppercase tracking-wide">行为模式</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowNewPattern(!showNewPattern)}>
                  {showNewPattern ? "取消" : "+ 新模式"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-sm">
                系统会在你写日记的过程中自动识别反复出现的行为模式。你也可以手动记录。
              </p>

              {showNewPattern && (
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">模式名称</label>
                      <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="如: 认可饥渴循环" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">描述</label>
                      <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={pDesc} onChange={(e) => setPDesc(e.target.value)} placeholder="≤50字" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">触发条件 (每行一个)</label>
                    <Textarea value={pTrigger} onChange={(e) => setPTrigger(e.target.value)} rows={2} placeholder="被忽视&#10;面对选择" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">典型反应 (每行一个)</label>
                    <Textarea value={pResponse} onChange={(e) => setPResponse(e.target.value)} rows={2} placeholder="过度表现&#10;拖延" />
                  </div>
                  <Button size="sm" onClick={createPattern}>创建模式</Button>
                </div>
              )}

              {patterns.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-border rounded-lg text-center text-muted-foreground">
                  写 5+ 篇日记后,模式将自动浮现。你也可以手动创建。
                </div>
              ) : (
                <div className="space-y-3">
                  {patterns.map((p) => (
                    <div key={p.id} className="border border-border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{p.name}</span>
                          {p.firstObserved && (
                            <span className="text-xs text-muted-foreground">
                              首次: {new Date(p.firstObserved).toLocaleDateString("zh-CN")}
                            </span>
                          )}
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => deactivatePattern(p.id)} className="text-xs text-muted-foreground">
                          停用
                        </Button>
                      </div>
                      {p.description && <p className="text-sm text-muted-foreground">{p.description}</p>}
                      <div className="flex gap-4 text-xs">
                        {Array.isArray(p.triggerSignatures) && p.triggerSignatures.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">触发: </span>
                            {p.triggerSignatures.map((t: string, i: number) => (
                              <Badge key={i} variant="outline" className="ml-1 text-[10px]">{t}</Badge>
                            ))}
                          </div>
                        )}
                        {Array.isArray(p.typicalResponse) && p.typicalResponse.length > 0 && (
                          <div>
                            <span className="text-muted-foreground">反应: </span>
                            {p.typicalResponse.map((r: string, i: number) => (
                              <Badge key={i} variant="outline" className="ml-1 text-[10px]">{r}</Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {Array.isArray(p.relatedThemes) && p.relatedThemes.length > 0 && (
                        <div className="flex gap-1">
                          {p.relatedThemes.map((t: string, i: number) => (
                            <Badge key={i} variant="outline" className="text-[10px] text-purple-400 border-purple-500/30">{t}</Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {activeTab === "arcs" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide">成长弧线</CardTitle>
              <Button variant="outline" size="sm" onClick={() => setShowNewArc(!showNewArc)}>
                {showNewArc ? "取消" : "+ 新弧线"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-sm">
              成长弧线追踪你在某个主题上的长期成长:觉察→挣扎→实验→巩固→整合。
            </p>

            {/* 阶段图例 */}
            <div className="flex gap-2">
              {phases.map(p => (
                <Badge key={p} variant="outline" className={phaseColors[p] ?? ""}>{p}</Badge>
              ))}
            </div>

            {showNewArc && (
              <div className="border border-border rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">弧线名称</label>
                    <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={aName} onChange={(e) => setAName(e.target.value)} placeholder="如: 自我价值感" />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">当前阶段</label>
                    <select className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={aPhase} onChange={(e) => setAPhase(e.target.value)}>
                      {phases.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">描述</label>
                  <Textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} rows={2} placeholder="这条弧线在追踪什么..." />
                </div>
                <Button size="sm" onClick={createArc}>创建弧线</Button>
              </div>
            )}

            {arcs.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-border rounded-lg text-center text-muted-foreground">
                还没有成长弧线。创建你的第一条成长轨迹。
              </div>
            ) : (
              <div className="space-y-3">
                {arcs.map((a) => {
                  const phaseIndex = phases.indexOf(a.phase);
                  return (
                    <div key={a.id} className="border border-border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.name}</span>
                          <Badge className={phaseColors[a.phase] ?? ""}>{a.phase}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          更新: {new Date(a.updatedAt).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                      {a.description && <p className="text-sm text-muted-foreground">{a.description}</p>}

                      {/* 进度条 */}
                      <div className="flex items-center gap-1">
                        {phases.map((p, i) => (
                          <div key={p} className="flex-1 flex items-center gap-1">
                            <div className={`h-2 flex-1 rounded-full ${i <= phaseIndex ? "bg-purple-500" : "bg-muted"}`} />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between">
                        {phases.map(p => (
                          <span key={p} className={`text-[10px] ${p === a.phase ? "text-purple-400 font-medium" : "text-muted-foreground"}`}>
                            {p}
                          </span>
                        ))}
                      </div>

                      {/* 阶段推进按钮 */}
                      {phaseIndex < phases.length - 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateArcPhase(a.id, phases[phaseIndex + 1])}
                        >
                          推进到「{phases[phaseIndex + 1]}」
                        </Button>
                      )}
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
