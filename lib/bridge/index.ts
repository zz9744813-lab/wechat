/**
 * 桥接层 — 系统的灵魂
 * 负责现实→小说的变形,以及小说→现实的反向流动
 *
 * 三层变形:
 * 1. 事件 → 抽象核心 (去除所有可识别细节)
 * 2. 抽象核心 → 主题映射 (连接普遍人性)
 * 3. 主题 → 意象重塑 (文学性表达)
 */

import { getAnthropic, getModel, getFastModel } from "@/lib/ai/client";
import { GLOBAL_RULES, IMAGERY_DEFORMATION_PROMPT, RESONANCE_EXTRACTION_PROMPT } from "@/lib/ai/prompts";

// ============ 事件变形 ============

export interface DeformedEvent {
  originalCategory: string;
  abstractCore: string;
  thematicMapping: string;
  imagery: string;
  narrativeHook: string;
  emotionalResidue: string;
}

/** 事件 → 意象变形:将真实事件抽象化、主题化、意象重塑 */
export function deformEvent(eventDescription: string, themes: string[]): DeformedEvent {
  const abstractCore = themes[0] ?? "未知主题";
  return {
    abstractCore,
    thematicMapping: themes.join(" × "),
    imagery: `意象待 AI 生成 (主题: ${themes.join(", ")})`,
    narrativeHook: `叙事钩子待生成`,
    emotionalResidue: `情感残余待分析`,
    originalCategory: "abstracted",
  };
}

/** 批量事件变形 — 将一组事件变形为小说可用的素材 */
export function deformEvents(events: any[], themes: any[]): DeformedEvent[] {
  const themeNames = themes.map((t: any) => t.name ?? t);
  return events.map((e) => ({
    originalCategory: e.category ?? "other",
    abstractCore: extractAbstractCore(e.description, themeNames),
    thematicMapping: findBestThemeMapping(e, themes),
    imagery: generateBasicImagery(e, themeNames),
    narrativeHook: generateNarrativeHook(e),
    emotionalResidue: e.significance > 5 ? "深刻" : "轻浅",
  }));
}

function extractAbstractCore(description: string, themes: string[]): string {
  if (themes.length > 0) return themes[0];
  return description.replace(/[^\u4e00-\u9fa5a-zA-Z\s]/g, "").slice(0, 20);
}

function findBestThemeMapping(event: any, themes: any[]): string {
  if (themes.length === 0) return "未映射";
  const best = themes.reduce((prev: any, curr: any) =>
    (curr.intensity ?? 0) > (prev.intensity ?? 0) ? curr : prev,
  );
  return best.name ?? "未知主题";
}

function generateBasicImagery(event: any, themes: string[]): string {
  const imageryMap: Record<string, string> = {
    work: "格子间里的困兽",
    relationship: "两面镜子之间的无限回廊",
    health: "身体这座沉默的庙宇",
    creative: "在黑暗中点亮的第一根火柴",
    daily: "重复的钟摆里藏着的变奏",
    other: "雾中的路标",
  };
  return imageryMap[event.category] ?? `需要 AI 生成意象 (主题: ${themes.join(", ")})`;
}

function generateNarrativeHook(event: any): string {
  const hooks: Record<string, string> = {
    work: "当晋升通知到达的那天,主角发现自己的手在发抖",
    relationship: "那封未发出的消息,在草稿箱里躺了三个月",
    health: "体检报告上的数字,像一扇突然打开的门",
    creative: "第一笔落下时,画布上的裂纹比颜色更诚实",
    daily: "超市收银台前的三秒钟犹豫",
    other: "那把钥匙打不开任何一扇门",
  };
  return hooks[event.category] ?? "一个看似平常的瞬间";
}

// ============ 信号包构建 ============

/** 构建去敏信号包 — 从日记提取结果中构建给小说侧的安全输入 */
export function buildSanitizedSignal(
  events: any[],
  emotions: any[],
  themes: any[],
  bridgeSignal: any,
): string {
  const sanitizedEvents = events.map((e: any) => ({
    category: e.category,
    significance: e.significance,
    abstract: e.description,
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

/** 构建共鸣包 — 从多个日记的桥接信号中构建章节生成用的综合信号 */
export function buildResonancePackage(
  journalEntries: any[],
): {
  combinedThemes: string[];
  emotionalTrajectory: string;
  imageryPool: string[];
  tensionDescription: string;
} {
  const allThemes: { name: string; intensity: number }[] = [];
  const allImagery: string[] = [];

  for (const entry of journalEntries) {
    try {
      const themes = JSON.parse(entry.extractedThemes ?? "[]");
      allThemes.push(...themes);
      const bridge = JSON.parse(entry.bridgeSignal ?? "{}");
      if (bridge.signal?.imagery_pool) {
        allImagery.push(...bridge.signal.imagery_pool);
      }
    } catch {}
  }

  // 去重并按强度排序
  const uniqueThemes = Array.from(new Map(allThemes.map(t => [t.name, t])).values())
    .sort((a, b) => (b.intensity ?? 0) - (a.intensity ?? 0));
  const uniqueImagery = [...new Set(allImagery)];

  return {
    combinedThemes: uniqueThemes.slice(0, 5).map(t => t.name),
    emotionalTrajectory: describeTrajectory(journalEntries),
    imageryPool: uniqueImagery.slice(0, 8),
    tensionDescription: extractMainTension(uniqueThemes),
  };
}

function describeTrajectory(entries: any[]): string {
  if (entries.length === 0) return "尚无数据";
  const energies = entries.map((e: any) => e.energy ?? 5);
  const trend = energies[0] - energies[energies.length - 1];
  if (trend > 2) return "能量上升";
  if (trend < -2) return "能量下降";
  return "能量平稳";
}

function extractMainTension(themes: any[]): string {
  if (themes.length === 0) return "内在平静";
  const top = themes[0];
  return `围绕"${top.name}"的内在张力`;
}

// ============ 反向流动:小说→现实 ============

/** 从小说章节中提取可能触动用户的段落 */
export function buildResonancePackageFromChapter(
  chapterText: string,
  userThemes: string[],
): {
  passages: string[];
  themes: string[];
  reflectionPrompt: string;
} {
  // 基础版本:按段落分割,选择与主题相关的
  const paragraphs = chapterText.split(/\n\n+/).filter(p => p.trim().length > 20);
  const relevantPassages = paragraphs.filter(p => {
    const lower = p.toLowerCase();
    return userThemes.some(t => lower.includes(t.toLowerCase()));
  });

  return {
    passages: relevantPassages.length > 0
      ? relevantPassages.slice(0, 3)
      : paragraphs.slice(0, 2),
    themes: userThemes,
    reflectionPrompt: "也许这段故事让你想到了什么。你怎么看?",
  };
}

// ============ 意象库管理 ============

export interface ImageryEntry {
  id: string;
  sourceTheme: string;
  imagery: string;
  sensoryLayer: string;
  emotionalResonance: string;
  narrativeUse: string;
  usageCount: number;
  lastUsed: string;
}

/** 从 AI 生成的意象集中提取并格式化 */
export function formatImagerySet(rawImagery: any[]): ImageryEntry[] {
  return rawImagery.map((item: any, index: number) => ({
    id: `img_${Date.now()}_${index}`,
    sourceTheme: item.source_theme ?? "未知",
    imagery: item.imagery ?? "",
    sensoryLayer: item.sensory_layer ?? "视觉",
    emotionalResonance: item.emotional_resonance ?? "",
    narrativeUse: item.narrative_use ?? "",
    usageCount: 0,
    lastUsed: new Date().toISOString(),
  }));
}

// ============ 隐私守护 ============

/** 检查文本中是否包含可能被反向识别的现实细节 */
export function privacyCheck(text: string): {
  safe: boolean;
  warnings: string[];
  sanitizedText: string;
} {
  const warnings: string[] = [];
  let sanitized = text;

  // 检查常见隐私模式
  const patterns = [
    { regex: /1[3-9]\d{9}/g, label: "手机号" },
    { regex: /[\w.-]+@[\w.-]+\.\w+/g, label: "邮箱" },
    { regex: /\d{6}(\d{8})\d{3}[\dXx]/g, label: "身份证号" },
    { regex: /\d{4}-\d{4}-\d{4}/g, label: "银行卡号" },
  ];

  for (const p of patterns) {
    if (p.regex.test(text)) {
      warnings.push(`检测到${p.label}格式内容`);
      sanitized = sanitized.replace(p.regex, `[已脱敏:${p.label}]`);
    }
  }

  return {
    safe: warnings.length === 0,
    warnings,
    sanitizedText: sanitized,
  };
}

/** 评估日记的隐私级别 (0-3) */
export function assessPrivacyLevel(text: string, userDeclaredLevel?: number): number {
  if (userDeclaredLevel !== undefined) return userDeclaredLevel;

  let level = 1; // 默认:轻度去敏

  // 包含人名暗示
  if (/他|她|他们|同事|老板|朋友|家人/.test(text)) level = Math.max(level, 2);
  // 包含具体地点
  if (/公司|学校|医院|家|办公室/.test(text)) level = Math.max(level, 2);
  // 包含敏感话题
  if (/死亡|自杀|抑郁|药物|手术/.test(text)) level = Math.max(level, 3);

  return level;
}
