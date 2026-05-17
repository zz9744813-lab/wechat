/**
 * 桥接层 — 系统的灵魂
 * 负责现实→小说的变形,以及小说→现实的反向流动
 */

/** 事件 → 意象变形:将真实事件抽象化、主题化、意象重塑 */
export function deformEvent(eventDescription: string, themes: string[]): {
  abstractCore: string;
  imagery: string;
  narrativeHook: string;
} {
  // 这是一个纯逻辑层,实际的 AI 变形在 pipeline.ts 的 bridge signal 中完成
  // 这里提供结构化的变形框架
  return {
    abstractCore: themes[0] || "未知主题",
    imagery: `需要 AI 生成意象 (主题: ${themes.join(", ")})`,
    narrativeHook: `需要 AI 生成叙事钩子`,
  };
}

/** 构建去敏信号包 — 从日记提取结果中构建给小说侧的安全输入 */
export function buildSanitizedSignal(
  events: any[],
  emotions: any[],
  themes: any[],
  bridgeSignal: any,
): string {
  // 严格去除所有可识别的现实细节
  const sanitizedEvents = events.map((e: any) => ({
    category: e.category,
    significance: e.significance,
    abstract: e.description, // 已由 AI 去敏
  }));

  const sanitizedEmotions = emotions.map((e: any) => ({
    name: e.name,
    intensity: e.intensity,
    valence: e.valence,
  }));

  return JSON.stringify({
    events: sanitizedEvents,
    emotions: sanitizedEmotions,
    themes: themes.map((t: any) => ({ name: t.name, intensity: t.intensity })),
    signal: bridgeSignal,
    _sanitized: true,
    _timestamp: new Date().toISOString(),
  });
}

/** 反向流动:从小说章节中提取可能触动用户的段落 */
export function buildResonancePackage(
  chapterText: string,
  userThemes: string[],
): {
  passages: string[];
  themes: string[];
  reflectionPrompt: string;
} {
  return {
    passages: [`需要 AI 从章节中提取与主题 [${userThemes.join(", ")}] 共鸣的段落`],
    themes: userThemes,
    reflectionPrompt: `也许这段故事让你想到了什么。你怎么看?`,
  };
}
