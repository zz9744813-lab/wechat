"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function WorldPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [metaphysics, setMetaphysics] = useState("");
  const [tonalPalette, setTonalPalette] = useState("");
  const [characters, setCharacters] = useState<any[]>([]);
  const [showCharForm, setShowCharForm] = useState(false);
  const [charName, setCharName] = useState("");
  const [charArchetype, setCharArchetype] = useState("");
  const [charWound, setCharWound] = useState("");
  const [charVoice, setCharVoice] = useState("");
  const [charGrowth, setCharGrowth] = useState("");

  useEffect(() => {
    Promise.all([
      fetch("/api/world").then(r => r.json()),
      fetch("/api/characters").then(r => r.json()),
    ]).then(([w, c]) => {
      if (w.ok) {
        setData(w.data.world);
        setMetaphysics(w.data.world?.metaphysics ?? "");
        setTonalPalette(w.data.world?.tonalPalette ?? "");
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
        body: JSON.stringify({ metaphysics, tonalPalette }),
      });
      const json = await res.json();
      if (json.ok) { toast.success("世界设定已保存"); setEditing(false); }
    } catch { toast.error("保存失败"); }
  };

  const createCharacter = async () => {
    if (!charName.trim()) return;
    try {
      const res = await fetch("/api/characters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: charName, archetype: charArchetype,
          coreWound: charWound, voicePattern: charVoice, growthEdge: charGrowth,
          isProtagonist: true,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        toast.success("角色创建成功");
        setCharacters([...characters, json.data]);
        setShowCharForm(false);
        setCharName(""); setCharArchetype(""); setCharWound(""); setCharVoice(""); setCharGrowth("");
      }
    } catch { toast.error("创建失败"); }
  };

  if (loading) return <div className="p-8 text-muted-foreground">加载中...</div>;

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">世界设定</h1>

      {/* World Bible */}
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
              <Textarea value={metaphysics} onChange={(e) => setMetaphysics(e.target.value)} rows={4} />
            ) : (
              <p className="text-sm">{data?.metaphysics || "待构建 — 通过与用户深度对话共建"}</p>
            )}
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">调性 (Tonal Palette)</label>
            {editing ? (
              <Textarea value={tonalPalette} onChange={(e) => setTonalPalette(e.target.value)} rows={2} />
            ) : (
              <p className="text-sm">{data?.tonalPalette || "克制、深远、不喧哗"}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Characters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm uppercase tracking-wide">角色 ({characters.length})</CardTitle>
            <Button variant="outline" size="sm" onClick={() => setShowCharForm(!showCharForm)}>
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
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">语言模式</label>
                <input className="w-full bg-background border border-input rounded-md px-3 py-1.5 text-sm" value={charVoice} onChange={(e) => setCharVoice(e.target.value)} placeholder="说话节奏、口头禅、句法偏好" />
              </div>
              <Button size="sm" onClick={createCharacter}>创建角色</Button>
            </div>
          )}

          {characters.length === 0 ? (
            <p className="text-muted-foreground text-sm">还没有角色。创建你的第一个主角。</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {characters.map((c) => (
                <div key={c.id} className="border border-border rounded-lg p-4 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{c.name}</span>
                    {c.isProtagonist && <span className="text-xs text-purple-400">主角</span>}
                  </div>
                  {c.archetype && <div className="text-xs text-muted-foreground">原型: {c.archetype}</div>}
                  {c.coreWound && <div className="text-xs text-muted-foreground">创伤: {c.coreWound}</div>}
                  {c.growthEdge && <div className="text-xs text-muted-foreground">成长: {c.growthEdge}</div>}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
