"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PatternsPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">个人模式</h1>
      <Card>
        <CardHeader><CardTitle className="text-sm uppercase tracking-wide">模式识别</CardTitle></CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            系统会在你写日记的过程中自动识别反复出现的行为模式。
            当你写了足够多的日记后,这里会显示你的个人模式图谱。
          </p>
          <div className="mt-4 p-8 border-2 border-dashed border-border rounded-lg text-center text-muted-foreground">
            写 5+ 篇日记后,模式将自动浮现
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
