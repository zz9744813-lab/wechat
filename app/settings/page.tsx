"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">设置</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide">关于</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><strong>Mirror Epic</strong> — 镜像史诗 v0.1.0</p>
          <p className="text-muted-foreground">你写一行,世界长一卷。</p>
          <p className="text-muted-foreground mt-4">
            这是一个把个人成长管理和长篇小说写作深度耦合的系统。
            你写日记,AI 写小说;你过人生,AI 替你的&quot;镜像&quot;过平行人生。
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide">数据管理</CardTitle></CardHeader>
        <CardContent>
          <Button variant="outline" size="sm" onClick={() => {
            fetch("/api/dashboard").then(r => r.json()).then(j => {
              const blob = new Blob([JSON.stringify(j.data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url; a.download = "mirror-epic-export.json"; a.click();
            });
          }}>
            导出全部数据 (JSON)
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
