import { getAnthropic, getModel, getFastModel } from "./client";
import {
  GLOBAL_RULES,
  EXTRACT_EVENTS_PROMPT, EMOTION_SPECTRUM_PROMPT, THOUGHT_PATTERN_PROMPT,
  THEME_EXTRACTION_PROMPT, BRIDGE_SIGNAL_PROMPT, CRISIS_DETECTION_PROMPT,
  PATTERN_DEEP_DETECTION_PROMPT, PATTERN_EVOLUTION_PROMPT,
  CHAPTER_OUTLINE_PROMPT, CHAPTER_SCENE_EXPANSION_PROMPT, CHAPTER_DRAFT_PROMPT,
  VOICE_CHECK_PROMPT, WORLD_CONSISTENCY_PROMPT, THEME_AUDIT_PROMPT,
  EMOTION_ARC_PROMPT, PROSE_POLISH_PROMPT, STYLE_SPECTRUM_PROMPT,
  FINAL_SYNTHESIS_PROMPT,
  BRANCH_GENERATION_PROMPT, QUARTERLY_NARRATIVE_PROMPT, ANNUAL_NARRATIVE_PROMPT,
  CHARACTER_PSYCHOLOGY_PROMPT, REFLECTION_PROMPTS_GENERATION,
  IMAGERY_DEFORMATION_PROMPT, RESONANCE_EXTRACTION_PROMPT,
} from "./prompts";

const PRICE_INPUT = 3.0 / 1_000_000;
const PRICE_OUTPUT = 15.0 / 1_000_000;

export interface PassResult {
  name: string;
  result: any;
  tokens: number;
  cost: number;
}

export interface PipelineResult {
  passes: PassResult[];
  totalTokens: number;
  totalCost: number;
}

async function callAI(
  system: string,
  user: string,
  model?: string,
  maxTokens = 2000,
): Promise<{ text: string; inputTokens: number; outputTokens: number; costUsd: number }> {
  const client = getAnthropic();
  const m = model ?? getModel();
  const response = await client.messages.create({
    model: m,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  const text = response.content[0].type === "text" ? response.content[0].text : "";
  const inputTokens = response.usage.input_tokens;
  const outputTokens = response.usage.output_tokens;
  const costUsd = inputTokens * PRICE_INPUT + outputTokens * PRICE_OUTPUT;
  return { text, inputTokens, outputTokens, costUsd: Number(costUsd.toFixed(6)) };
}

function extractJSON(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI 未返回有效 JSON");
  return JSON.parse(match[0]);
}

function trackPass(
  passes: PassResult[],
  total: { tokens: number; cost: number },
  name: string,
  result: any,
  ai: { inputTokens: number; outputTokens: number; costUsd: number },
) {
  const tokens = ai.inputTokens + ai.outputTokens;
  passes.push({ name, result, tokens, cost: ai.costUsd });
  total.tokens += tokens;
  total.cost += ai.costUsd;
}

// ============ 日记 7-pass 处理管线 ============

export async function processJournal(rawSignal: string, existingPatterns: string[] = []) {
  const passes: PassResult[] = [];
  const total = { tokens: 0, cost: 0 };
  const fast = getFastModel();

  // Pass 1: 事件抽取
  const p1 = await callAI(GLOBAL_RULES, `${EXTRACT_EVENTS_PROMPT}\n\n# 信号包\n${rawSignal}`, fast);
  const events = extractJSON(p1.text);
  trackPass(passes, total, "events_extract", events, p1);

  // Pass 2: 情绪光谱
  const p2 = await callAI(GLOBAL_RULES, `${EMOTION_SPECTRUM_PROMPT}\n\n# 信号包\n${rawSignal}`, fast);
  const emotions = extractJSON(p2.text);
  trackPass(passes, total, "emotion_spectrum", emotions, p2);

  // Pass 3: 念头识别
  const p3 = await callAI(GLOBAL_RULES, `${THOUGHT_PATTERN_PROMPT}\n\n# 信号包\n${rawSignal}`, fast);
  const thoughts = extractJSON(p3.text);
  trackPass(passes, total, "thought_pattern", thoughts, p3);

  // Pass 4: 模式匹配 + 深度识别
  const patternContext = existingPatterns.length > 0 ? `\n# 已知模式\n${existingPatterns.join("\n")}` : "";
  const p4a = await callAI(GLOBAL_RULES, `从以下信号包中判断是否命中已知模式。输出 JSON: {"matched": ["pattern_id"...], "new_signals": ["可能的新模式描述"...]}\n\n# 信号包\n${rawSignal}${patternContext}`, fast);
  const patterns = extractJSON(p4a.text);
  trackPass(passes, total, "pattern_match", patterns, p4a);

  // Pass 4b: 深度模式识别
  const p4b = await callAI(GLOBAL_RULES, `${PATTERN_DEEP_DETECTION_PROMPT}\n\n# 信号包\n${rawSignal}`, fast);
  let deepPatterns: any;
  try { deepPatterns = extractJSON(p4b.text); } catch { deepPatterns = { patterns: [] }; }
  trackPass(passes, total, "pattern_deep_detect", deepPatterns, p4b);

  // Pass 5: 主题提取
  const p5 = await callAI(GLOBAL_RULES, `${THEME_EXTRACTION_PROMPT}\n\n# 信号包\n${rawSignal}\n\n# 已提取的事件和情绪\n${JSON.stringify(events)}\n${JSON.stringify(emotions)}`, fast);
  const themes = extractJSON(p5.text);
  trackPass(passes, total, "theme_extract", themes, p5);

  // Pass 6: 桥接信号
  const p6 = await callAI(GLOBAL_RULES, `${BRIDGE_SIGNAL_PROMPT}\n\n# 事件\n${JSON.stringify(events)}\n\n# 情绪\n${JSON.stringify(emotions)}\n\n# 主题\n${JSON.stringify(themes)}\n\n# 念头\n${JSON.stringify(thoughts)}`);
  const bridge = extractJSON(p6.text);
  trackPass(passes, total, "bridge_signal", bridge, p6);

  // Pass 7: 意象变形
  const p7 = await callAI(GLOBAL_RULES, `${IMAGERY_DEFORMATION_PROMPT}\n\n# 主题\n${JSON.stringify(themes.themes ?? themes)}`, fast);
  let imagery: any;
  try { imagery = extractJSON(p7.text); } catch { imagery = { imagery_set: [] }; }
  trackPass(passes, total, "imagery_deformation", imagery, p7);

  // Pass 8: 危机检测
  const p8 = await callAI(GLOBAL_RULES, `${CRISIS_DETECTION_PROMPT}\n\n# 信号包\n${rawSignal}\n\n# 情绪\n${JSON.stringify(emotions)}`, fast);
  let crisis: any;
  try { crisis = extractJSON(p8.text); } catch { crisis = { risk_level: "none", signals: [], should_continue: true }; }
  trackPass(passes, total, "crisis_detection", crisis, p8);

  // Pass 9: 反思提示
  const themeNames = (themes.themes ?? themes).map?.((t: any) => t.name).join(", ") ?? "";
  const dominantEmotion = emotions.dominant_emotion ?? "";
  const p9 = await callAI(GLOBAL_RULES, `${REFLECTION_PROMPTS_GENERATION}\n\n# 主题: ${themeNames}\n# 主导情绪: ${dominantEmotion}`, fast);
  let reflectionPrompts: any;
  try { reflectionPrompts = extractJSON(p9.text); } catch { reflectionPrompts = { prompts: [] }; }
  trackPass(passes, total, "reflection_prompts", reflectionPrompts, p9);

  // Pass 10: 综合反思
  const p10 = await callAI(GLOBAL_RULES, `基于以下分析,写 1-3 句反思提示给用户。不要诊断,不要建议,只是轻轻地提问或映射。以"也许"开头。\n\n# 主题: ${themeNames}\n# 主导情绪: ${dominantEmotion}`, fast);
  const reflection = p10.text.trim();
  trackPass(passes, total, "reflection", { text: reflection }, p10);

  return {
    events: events.events ?? [],
    emotions: emotions.emotions ?? [],
    thoughts: thoughts.thoughts ?? [],
    themes: themes.themes ?? [],
    patterns,
    deepPatterns: deepPatterns.patterns ?? [],
    bridge: bridge.signal ?? bridge,
    imagery: imagery.imagery_set ?? [],
    crisis,
    reflectionPrompts: reflectionPrompts.prompts ?? [],
    reflection,
    passes,
    totalTokens: total.tokens,
    totalCost: Number(total.cost.toFixed(6)),
  };
}

// ============ 章节写作管线 (5-pass MVP, 可扩展到 10-pass) ============

export async function writeChapter(
  outline: string,
  characterVoice: string,
  worldContext: string,
  previousChapterText?: string,
) {
  const passes: PassResult[] = [];
  const total = { tokens: 0, cost: 0 };

  // Pass 1: 场景扩展
  const p1 = await callAI(GLOBAL_RULES, `${CHAPTER_SCENE_EXPANSION_PROMPT}\n\n# 大纲\n${outline}`, undefined, 2000);
  let sceneExpansion: any;
  try { sceneExpansion = extractJSON(p1.text); } catch { sceneExpansion = { scenes: [] }; }
  trackPass(passes, total, "scene_expansion", sceneExpansion, p1);

  // Pass 2: 初稿
  const sceneContext = sceneExpansion.scenes?.length > 0
    ? `\n# 详细场景计划\n${JSON.stringify(sceneExpansion)}`
    : "";
  const prevContext = previousChapterText
    ? `\n# 前一章结尾\n${previousChapterText.slice(-500)}`
    : "";
  const p2 = await callAI(
    GLOBAL_RULES,
    `${CHAPTER_DRAFT_PROMPT}\n\n# 大纲\n${outline}\n\n# 角色语言模式\n${characterVoice}\n\n# 世界设定\n${worldContext}${sceneContext}${prevContext}`,
    undefined,
    4096,
  );
  trackPass(passes, total, "draft", { text: p2.text }, p2);

  // Pass 3: 角色声音审查
  const p3 = await callAI(GLOBAL_RULES, `${VOICE_CHECK_PROMPT}\n\n# 角色设定\n${characterVoice}\n\n# 章节\n${p2.text}`);
  let voiceCheck: any;
  try { voiceCheck = extractJSON(p3.text); } catch { voiceCheck = { issues: [], overall_voice_score: 7, notes: "解析失败" }; }
  trackPass(passes, total, "voice_check", voiceCheck, p3);

  // Pass 4: 世界一致性审查
  const p4 = await callAI(GLOBAL_RULES, `${WORLD_CONSISTENCY_PROMPT}\n\n# 世界设定\n${worldContext}\n\n# 章节\n${p2.text}`);
  let consistency: any;
  try { consistency = extractJSON(p4.text); } catch { consistency = { contradictions: [], consistency_score: 8, notes: "解析失败" }; }
  trackPass(passes, total, "world_consistency", consistency, p4);

  // Pass 5: 主题审计
  const p5 = await callAI(GLOBAL_RULES, `${THEME_AUDIT_PROMPT}\n\n# 大纲中的主题\n${outline}\n\n# 章节\n${p2.text}`);
  let themeAudit: any;
  try { themeAudit = extractJSON(p5.text); } catch { themeAudit = { theme_landed: true, preachiness_score: 3, subtlety_score: 7, issues: [], suggestions: [] }; }
  trackPass(passes, total, "theme_audit", themeAudit, p5);

  // Pass 6: 情感弧线检查
  const p6 = await callAI(GLOBAL_RULES, `${EMOTION_ARC_PROMPT}\n\n# 章节\n${p2.text}`);
  let emotionArc: any;
  try { emotionArc = extractJSON(p6.text); } catch { emotionArc = { has_arc: true, arc_shape: "wave", engagement_score: 7, pacing_notes: "解析失败", suggestions: [] }; }
  trackPass(passes, total, "emotion_arc", emotionArc, p6);

  // Pass 7: 散文打磨
  const allIssues = [
    ...(voiceCheck.issues ?? []),
    ...(consistency.contradictions ?? []).map((c: any) => ({ problem: c.detail, suggestion: c.fix })),
    ...(themeAudit.suggestions ?? []).map((s: string) => ({ problem: s, suggestion: "" })),
    ...(emotionArc.suggestions ?? []).map((s: string) => ({ problem: s, suggestion: "" })),
  ];
  const issuesContext = allIssues.length > 0 ? `\n# 需要修复的问题\n${JSON.stringify(allIssues)}\n\n` : "";
  const p7 = await callAI(GLOBAL_RULES, `${PROSE_POLISH_PROMPT}\n${issuesContext}\n# 原文\n${p2.text}`, undefined, 4096);
  trackPass(passes, total, "prose_polish", { text: p7.text }, p7);

  // Pass 8: 风格光谱分析
  const p8 = await callAI(GLOBAL_RULES, `${STYLE_SPECTRUM_PROMPT}\n\n# 章节\n${p7.text}`, getFastModel());
  let styleSpectrum: any;
  try { styleSpectrum = extractJSON(p8.text); } catch {
    styleSpectrum = {
      current_style: { sentence_avg_length: "中等", imagery_density: "moderate", emotional_register: "moderate", narrative_distance: "mid", dominant_rhetoric: [] },
      style_evolution: "", recommended_adjustment: "", consistency_with_previous: 0.8,
    };
  }
  trackPass(passes, total, "style_spectrum", styleSpectrum, p8);

  // Pass 9: 终稿合成 (如果有重大问题,做最终修复)
  const hasSignificantIssues = (voiceCheck.overall_voice_score ?? 10) < 6
    || (consistency.contradictions ?? []).some((c: any) => c.severity === "critical")
    || (themeAudit.preachiness_score ?? 0) > 7;

  let finalText = p7.text;
  if (hasSignificantIssues) {
    const p9 = await callAI(
      GLOBAL_RULES,
      `${FINAL_SYNTHESIS_PROMPT}\n\n# 散文打磨版\n${p7.text}\n\n# 角色声音审查\n${JSON.stringify(voiceCheck)}\n\n# 世界一致性\n${JSON.stringify(consistency)}\n\n# 主题审计\n${JSON.stringify(themeAudit)}`,
      undefined,
      4096,
    );
    finalText = p9.text;
    trackPass(passes, total, "final_synthesis", { text: finalText }, p9);
  }

  // 计算总分
  const qualityScore = Math.round(
    ((voiceCheck.overall_voice_score ?? 7) +
     (consistency.consistency_score ?? 7) +
     (themeAudit.subtlety_score ?? 7) +
     (emotionArc.engagement_score ?? 7)) / 4,
  );

  return {
    finalText,
    voiceCheck,
    consistency,
    themeAudit,
    emotionArc,
    styleSpectrum,
    qualityScore,
    passes,
    totalTokens: total.tokens,
    totalCost: Number(total.cost.toFixed(6)),
  };
}

// ============ 平行宇宙分支生成 ============

export async function generateBranch(
  chapterText: string,
  characterContext: string,
  worldContext: string,
) {
  const passes: PassResult[] = [];
  const total = { tokens: 0, cost: 0 };

  const p1 = await callAI(
    GLOBAL_RULES,
    `${BRANCH_GENERATION_PROMPT}\n\n# 当前章节\n${chapterText}\n\n# 角色设定\n${characterContext}\n\n# 世界设定\n${worldContext}`,
  );
  const branch = extractJSON(p1.text);
  trackPass(passes, total, "branch_generation", branch, p1);

  return {
    branch,
    passes,
    totalTokens: total.tokens,
    totalCost: Number(total.cost.toFixed(6)),
  };
}

// ============ 季度生命叙事 ============

export async function generateQuarterlyNarrative(
  themeSummary: string,
  patternSummary: string,
  journalCount: number,
  periodLabel: string,
) {
  const p = await callAI(
    GLOBAL_RULES,
    `${QUARTERLY_NARRATIVE_PROMPT}\n\n# 时间段: ${periodLabel}\n# 日记数量: ${journalCount}\n\n# 主题汇总\n${themeSummary}\n\n# 模式汇总\n${patternSummary}`,
  );
  const narrative = extractJSON(p.text);
  return { narrative, tokens: p.inputTokens + p.outputTokens, cost: p.costUsd };
}

// ============ 年度全景叙事 ============

export async function generateAnnualNarrative(
  yearData: string,
  year: string,
) {
  const p = await callAI(
    GLOBAL_RULES,
    `${ANNUAL_NARRATIVE_PROMPT}\n\n# 年份: ${year}\n\n# 年度数据\n${yearData}`,
    undefined,
    4000,
  );
  const narrative = extractJSON(p.text);
  return { narrative, tokens: p.inputTokens + p.outputTokens, cost: p.costUsd };
}

// ============ 角色心理分析 ============

export async function analyzeCharacterPsychology(
  character: any,
  recentChapters: string[],
  worldContext: string,
) {
  const p = await callAI(
    GLOBAL_RULES,
    `${CHARACTER_PSYCHOLOGY_PROMPT}\n\n# 角色信息\n${JSON.stringify(character)}\n\n# 最近章节片段\n${recentChapters.join("\n---\n")}\n\n# 世界设定\n${worldContext}`,
  );
  const psychology = extractJSON(p.text);
  return { psychology, tokens: p.inputTokens + p.outputTokens, cost: p.costUsd };
}

// ============ 共鸣段落提取 ============

export async function extractResonance(
  chapterText: string,
  userThemes: string[],
) {
  const p = await callAI(
    GLOBAL_RULES,
    `${RESONANCE_EXTRACTION_PROMPT}\n\n# 章节\n${chapterText}\n\n# 用户主题\n${userThemes.join(", ")}`,
    getFastModel(),
  );
  const resonance = extractJSON(p.text);
  return { resonance, tokens: p.inputTokens + p.outputTokens, cost: p.costUsd };
}

// ============ 模式演变追踪 ============

export async function trackPatternEvolution(
  patternId: string,
  patternDescription: string,
  currentSignal: string,
) {
  const p = await callAI(
    GLOBAL_RULES,
    `${PATTERN_EVOLUTION_PROMPT}\n\n# 模式ID: ${patternId}\n# 模式描述: ${patternDescription}\n\n# 当前信号包\n${currentSignal}`,
    getFastModel(),
  );
  const evolution = extractJSON(p.text);
  return { evolution, tokens: p.inputTokens + p.outputTokens, cost: p.costUsd };
}
