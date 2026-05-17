"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function WorldPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"world" | "characters">("world");

  // World form
  const [metaphysics, setMetaphysics] = useState("");
  const [tonalPalette, setTonalPalette] = useState("");
  const [geography, setGeography] = useState("");
  const [factions, setFactions] = useState("");
  const [history, setHistory] = useState("");

  // Character form
  const [characters, setCharacters] = useState<any[]>([]);
  const [showCharForm, setShowCharForm] = useState(false);
  const [editingChar, setEditingChar] = useState<any>(null);
  const [charName, setCharName] = useState("");
  const [charArchetype, setCharArchetype] = useState("");
  const [charWound, setCharWound] = useState("");
  const [charVoice, setCharVoice] = useState("");
  const [charGrowth, setCharGrowth] = useState("");
  const [charPhysical, setCharPhysical] = useState("");
  const [charDefenses, setCharDefenses] = useState("");
  const [charSecret, setCharSecret] = useState("");
  const [charArcPos, setCharArcPos] = useState("");

  // Psychology
  const [psychology, setPsychology] = useState<any>(null);
  const [analyzingChar, setAnalyzingChar] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/world").then(r => r.json()),
      fetch("/api/characters").then(r => r.json()),
    ]).then(([w, c]) => {
      if (w.ok) {
        setData(w.data.world);
        setMetaphysics(w.data.world?.metaphysics ?? "");
        setTonalPalette(w.data.world?.tonalPalette ?? "");
        setGeography(w.data.world?.geography ?? "");
        setFactions(w.data.world?.factions ?? "");
        setHistory(w.data.world?.history ?? "");
      }
      if (c.ok) setCharacters(c.data);
      setLoading(false);
    });
  }, []);

  const saveWorld = async () => {
    try {
      const res = await fetch("/api/world", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metaphysics, tonalPalette, geography, factions, history }),
      });
      const json = await res.json();
      if (json.ok) { toast.success("世界设定已保存"); setEditing(false); }
    } catch { toast.error("保存失败"); }
  };

  const createCharacter = async () => {
    if (!charName.trim()) return;
    try {
      const res = await fetch("/api/characters", {
        method: editingChar ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingChar ? { id: editingChar.id } : {}),
          name: charName, archetype: charArchetype,
          coreWound: charWound, voicePattern: charVoice, growthEdge: charGrowth,
          physicalDesc: charPhysical, defenseMechanisms: charDefenses.split(",").filter(Boolean),
          secretKnowledge: charSecret, arcPosition: charArcPos,
          isProtagonist: true,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success(editingChar ? "角色更新成功" : "角色创建成功");
        if (editingChar) {
          setCharacters(characters.map(c => c.id === json.data.id ? json.data : c));
        } else {
          setCharacters([...characters, json.data]);
        }
        resetCharForm();
      }
    } catch { toast.error("操作失败"); }
  };

  const deleteCharacter = async (id: string) => {
    try {
      await fetch(`/api/characters?id=${id}`, { method: "DELETE" });
      setCharacters(characters.filter(c => c.id !== id));
      toast.success("角色已删除");
    } catch { toast.error("删除失败"); }
  };

  const editCharacter = (char: any) => {
    setEditingChar(char);
    setCharName(char.name);
    setCharArchetype(char.archetype ?? "");
    setCharWound(char.coreWound ?? "");
    setCharVoice(char.voicePattern ?? "");
    setCharGrowth(char.growthEdge ?? "");
    setCharPhysical(char.physicalDesc ?? "");
    setCharDefenses(Array.isArray(char.defenseMechanisms) ? char.defenseMechanisms.join(",") : "");
    setCharSecret(char.secretKnowledge ?? "");
    setCharArcPos(char.arcPosition ?? "");
    setShowCharForm(true);
  };

  const resetCharForm = () => {
    setShowCharForm(false);
    setEditingChar(null);
    setCharName(""); setCharArchetype(""); setCharWound(""); setCharVoice("");
    setCharGrowth(""); setCharPhysical(""); setCharDefenses(""); setCharSecret(""); setCharArcPos("");
  };

  const analyzePsychology = async (charId: string) => {
    setAnalyzingChar(charId);
    try {
      const res = await fetch("/api/characters/psychology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId: charId }),
      });
      const json = await res.json();
      if (json.ok) {
        setPsychology(json.data);
        toast.success("心理分析完成");
      } else {
        toast.error(json.error ?? "分析失败");
      }
    } catch { toast.error("分析失败"); } finally { setAnalyzingChar(null); }
  };

  if (loading) return <div className="p-8 text-muted-foreground">加载中...</div>;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">世界设定</h1>
        <div className="flex gap-2">
          <Button variant={activeTab === "world" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("world")}>
            World Bible
          </Button>
          <Button variant={activeTab === "characters" ? "default" : "outline"} size="sm" onClick={() => setActiveTab("characters")}>
            角色 ({characters.length})
          </Button>
        </div>
      </div>

      {activeTab === "world" && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm uppercase tracking-wide">World Bible</CardTitle>
              <Button variant="outline" size="sm" onClick={() => editing ? saveWorld() : setEditing(true)}>
                {editing ? "保存" : "编辑"}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">宇宙规则 (Metaphysics)</label>
              {editing ? (
                <Textarea value={metaphysics} onChange={(e) => setMetaphysics(e.target.value)} rows={4} placeholder="这个世界的物理/魔法/因果规则..." />
              ) : (
                <p className="text-sm">{data?.metaphysics || "待构建 — 通过与用户深度对话共建"}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">调性 (Tonal Palette)</label>
              {editing ? (
                <Textarea value={tonalPalette} onChange={(e) => setTonalPalette(e.target.value)} rows={2} placeholder="克制、深远、不喧哗" />
              ) : (
                <p className="text-sm">{data?.tonalPalette || "克制、深远、不喧哗"}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">地理 (Geography)</label>
              {editing ? (
                <Textarea value={geography} onChange={(e) => setGeography(e.target.value)} rows={3} placeholder="世界的地理设定..." />
              ) : (
                <p className="text-sm">{data?.geography || "待构建"}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">势力 (Factions)</label>
              {editing ? (
                <Textarea value={factions} onChange={(e) => setFactions(e.target.value)} rows={3} placeholder="主要势力和派系..." />
              ) : (
                <p className="text-sm">{data?.factions || "待构建"}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">历史 (History)</label>
              {editing ? (
                <Textarea value={history} onChange={(e) => setHistory(e.target.value)} rows={3} placeholder="世界历史大事记..." />
              ) : (
                <p className="text-sm">{data?.history || "待构建"}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab === "characters" && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm uppercase tracking-wide">角色 ({characters.length})</CardTitle>
                <Button variant="outline" size="sm" onClick={() => { resetCharForm(); setShowCharForm(!showCharForm); }}>
                  {showCharForm ? "取消" : "+ 新角色"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {showCharForm && (
                <div className="border border-border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">名字</label>
                      <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={charName} onChange={(e) => setCharName(e.target.value)} placeholder="角色名" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">原型 (Archetype)</label>
                      <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={charArchetype} onChange={(e) => setCharArchetype(e.target.value)} placeholder="如: 渴望被认可者" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">核心创伤</label>
                      <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={charWound} onChange={(e) => setCharWound(e.target.value)} placeholder="角色的核心创伤" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">成长边缘</label>
                      <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={charGrowth} onChange={(e) => setCharGrowth(e.target.value)} placeholder="角色正在学习什么" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">外貌描述</label>
                      <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={charPhysical} onChange={(e) => setCharPhysical(e.target.value)} placeholder="外貌特征" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">弧线位置</label>
                      <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={charArcPos} onChange={(e) => setCharArcPos(e.target.value)} placeholder="角色在弧线上的位置" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">语言模式</label>
                    <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={charVoice} onChange={(e) => setCharVoice(e.target.value)} placeholder="说话节奏、口头禅、句法偏好" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">防御机制 (逗号分隔)</label>
                      <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={charDefenses} onChange={(e) => setCharDefenses(e.target.value)} placeholder="否认,合理化,投射" />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground block mb-1">秘密知识</label>
                      <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={charSecret} onChange={(e) => setCharSecret(e.target.value)} placeholder="角色知道但不说的事" />
                    </div>
                  </div>
                  <Button size="sm" onClick={createCharacter}>{editingChar ? "更新角色" : "创建角色"}</Button>
                </div>
              )}

              {characters.length === 0 ? (
                <p className="text-muted-foreground text-sm">还没有角色。创建你的第一个主角。</p>
              ) : (
                <div className="space-y-3">
                  {characters.map((c) => (
                    <div key={c.id} className="border border-border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{c.name}</span>
                          {c.isProtagonist && <span className="text-xs text-purple-400">主角</span>}
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => editCharacter(c)}>编辑</Button>
                          <Button variant="ghost" size="sm" className="text-xs" onClick={() => analyzePsychology(c.id)} disabled={analyzingChar === c.id}>
                            {analyzingChar === c.id ? "分析中..." : "心理分析"}
                          </Button>
                          <Button variant="ghost" size="sm" className="text-xs text-destructive" onClick={() => deleteCharacter(c.id)}>删除</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {c.archetype && <div><span className="text-muted-foreground">原型:</span> {c.archetype}</div>}
                        {c.coreWound && <div><span className="text-muted-foreground">创伤:</span> {c.coreWound}</div>}
                        {c.growthEdge && <div><span className="text-muted-foreground">成长:</span> {c.growthEdge}</div>}
                        {c.arcPosition && <div><span className="text-muted-foreground">弧线位置:</span> {c.arcPosition}</div>}
                      </div>
                      {c.voicePattern && <div className="text-xs"><span className="text-muted-foreground">语言:</span> {c.voicePattern}</div>}
                      {c.secretKnowledge && <div className="text-xs"><span className="text-muted-foreground">秘密:</span> {c.secretKnowledge}</div>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 心理分析结果 */}
          {psychology && (
            <Card className="border-purple-500/30">
              <CardHeader><CardTitle className="text-sm uppercase tracking-wide text-purple-400">角色心理分析</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {psychology.inner_state && (
                  <div><span className="text-xs text-muted-foreground">内在状态:</span> {psychology.inner_state}</div>
                )}
                {psychology.unconscious_desire && (
                  <div><span className="text-xs text-muted-foreground">无意识欲望:</span> {psychology.unconscious_desire}</div>
                )}
                {psychology.defense_mechanisms_active?.length > 0 && (
                  <div>
                    <span className="text-xs text-muted-foreground">活跃防御机制:</span>
                    {psychology.defense_mechanisms_active.map((d: string, i: number) => (
                      <Badge key={i} variant="outline" className="ml-1 text-xs">{d}</Badge>
                    ))}
                  </div>
                )}
                {psychology.growth_edge_status && (
                  <div><span className="text-xs text-muted-foreground">成长边缘状态:</span> {psychology.growth_edge_status}</div>
                )}
                {psychology.next_arc_beat && (
                  <div><span className="text-xs text-muted-foreground">下一个情节点:</span> {psychology.next_arc_beat}</div>
                )}
                {psychology.relationship_dynamics?.length > 0 && (
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">关系动态</div>
                    {psychology.relationship_dynamics.map((r: any, i: number) => (
                      <div key={i} className="text-xs ml-2 mb-1">
                        与{r.with_character}: {r.tension} → {r.evolution}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
