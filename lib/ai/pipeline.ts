import { getAnthropic, getModel, getFastModel } from "./client";
import { GLOBAL_RULES, EXTRACT_EVENTS_PROMPT, EMOTION_SPECTRUM_PROMPT, THOUGHT_PATTERN_PROMPT, THEME_EXTRACTION_PROMPT, BRIDGE_SIGNAL_PROMPT, CHAPTER_OUTLINE_PROMPT, CHAPTER_DRAFT_PROMPT, VOICE_CHECK_PROMPT, WORLD_CONSISTENCY_PROMPT, THEME_AUDIT_PROMPT, EMOTION_ARC_PROMPT } from "./prompts";

const PRICE_INPUT = 3.0 / 1_000_000;
const PRICE_OUTPUT = 15.0 / 1_000_000;

async function callAI(system: string, user: string, model?: string, maxTokens = 2000): Promise<{ text: string; inputTokens: number; outputTokens: number; costUsd: number }> {
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

/** 日记 7-pass 处理管线 */
export async function processJournal(rawSignal: string, existingPatterns: string[] = []) {
  const passes: { name: string; result: any; tokens: number; cost: number }[] = [];
  let totalTokens = 0;
  let totalCost = 0;

  const fast = getFastModel();

  // Pass 1: 事件抽取
  const p1 = await callAI(GLOBAL_RULES, `${EXTRACT_EVENTS_PROMPT}\n\n# 信号包\n${rawSignal}`, fast);
  const events = extractJSON(p1.text);
  passes.push({ name: "events_extract", result: events, tokens: p1.inputTokens + p1.outputTokens, cost: p1.costUsd });
  totalTokens += p1.inputTokens + p1.outputTokens;
  totalCost += p1.costUsd;

  // Pass 2: 情绪光谱
  const p2 = await callAI(GLOBAL_RULES, `${EMOTION_SPECTRUM_PROMPT}\n\n# 信号包\n${rawSignal}`, fast);
  const emotions = extractJSON(p2.text);
  passes.push({ name: "emotion_spectrum", result: emotions, tokens: p2.inputTokens + p2.outputTokens, cost: p2.costUsd });
  totalTokens += p2.inputTokens + p2.outputTokens;
  totalCost += p2.costUsd;

  // Pass 3: 念头识别
  const p3 = await callAI(GLOBAL_RULES, `${THOUGHT_PATTERN_PROMPT}\n\n# 信号包\n${rawSignal}`, fast);
  const thoughts = extractJSON(p3.text);
  passes.push({ name: "thought_pattern", result: thoughts, tokens: p3.inputTokens + p3.outputTokens, cost: p3.costUsd });
  totalTokens += p3.inputTokens + p3.outputTokens;
  totalCost += p3.costUsd;

  // Pass 4: 模式匹配
  const patternContext = existingPatterns.length > 0 ? `\n# 已知模式\n${existingPatterns.join("\n")}` : "";
  const p4 = await callAI(GLOBAL_RULES, `从以下信号包中判断是否命中已知模式。输出 JSON: {"matched": ["pattern_id"...], "new_signals": ["可能的新模式描述"...]}\n\n# 信号包\n${rawSignal}${patternContext}`, fast);
  const patterns = extractJSON(p4.text);
  passes.push({ name: "pattern_match", result: patterns, tokens: p4.inputTokens + p4.outputTokens, cost: p4.costUsd });
  totalTokens += p4.inputTokens + p4.outputTokens;
  totalCost += p4.costUsd;

  // Pass 5: 主题提取
  const p5 = await callAI(GLOBAL_RULES, `${THEME_EXTRACTION_PROMPT}\n\n# 信号包\n${rawSignal}\n\n# 已提取的事件和情绪\n${JSON.stringify(events)}\n${JSON.stringify(emotions)}`, fast);
  const themes = extractJSON(p5.text);
  passes.push({ name: "theme_extract", result: themes, tokens: p5.inputTokens + p5.outputTokens, cost: p5.costUsd });
  totalTokens += p5.inputTokens + p5.outputTokens;
  totalCost += p5.costUsd;

  // Pass 6: 桥接信号
  const p6 = await callAI(GLOBAL_RULES, `${BRIDGE_SIGNAL_PROMPT}\n\n# 事件\n${JSON.stringify(events)}\n\n# 情绪\n${JSON.stringify(emotions)}\n\n# 主题\n${JSON.stringify(themes)}\n\n# 念头\n${JSON.stringify(thoughts)}`);
  const bridge = extractJSON(p6.text);
  passes.push({ name: "bridge_signal", result: bridge, tokens: p6.inputTokens + p6.outputTokens, cost: p6.costUsd });
  totalTokens += p6.inputTokens + p6.outputTokens;
  totalCost += p6.costUsd;

  // Pass 7: 综合反思提示
  const p7 = await callAI(GLOBAL_RULES, `基于以下分析,写 1-3 句反思提示给用户。不要诊断,不要建议,只是轻轻地提问或映射。以"也许"开头。\n\n# 主题: ${themes.themes?.map((t: any) => t.name).join(", ")}\n# 主导情绪: ${emotions.dominant_emotion}`, fast);
  const reflection = p7.text.trim();
  passes.push({ name: "reflection", result: { text: reflection }, tokens: p7.inputTokens + p7.outputTokens, cost: p7.costUsd });
  totalTokens += p7.inputTokens + p7.outputTokens;
  totalCost += p7.costUsd;

  return {
    events: events.events ?? [],
    emotions: emotions.emotions ?? [],
    thoughts: thoughts.thoughts ?? [],
    themes: themes.themes ?? [],
    patterns,
    bridge: bridge.signal ?? bridge,
    reflection,
    passes,
    totalTokens,
    totalCost: Number(totalCost.toFixed(6)),
  };
}

/** 章节 3-pass 简化管线 (MVP) */
export async function writeChapter(outline: string, characterVoice: string, worldContext: string) {
  const passes: { name: string; result: any; tokens: number; cost: number }[] = [];
  let totalTokens = 0;
  let totalCost = 0;

  // Pass 1: 初稿
  const p1 = await callAI(GLOBAL_RULES, `${CHAPTER_DRAFT_PROMPT}\n\n# 大纲\n${outline}\n\n# 角色语言模式\n${characterVoice}\n\n# 世界设定\n${worldContext}`, undefined, 4096);
  passes.push({ name: "draft", result: { text: p1.text }, tokens: p1.inputTokens + p1.outputTokens, cost: p1.costUsd });
  totalTokens += p1.inputTokens + p1.outputTokens;
  totalCost += p1.costUsd;

  // Pass 2: 角色声音审查
  const p2 = await callAI(GLOBAL_RULES, `${VOICE_CHECK_PROMPT}\n\n# 角色设定\n${characterVoice}\n\n# 章节\n${p1.text}`);
  let voiceCheck: any;
  try { voiceCheck = extractJSON(p2.text); } catch { voiceCheck = { issues: [], overall_voice_score: 7, notes: "解析失败" }; }
  passes.push({ name: "voice_check", result: voiceCheck, tokens: p2.inputTokens + p2.outputTokens, cost: p2.costUsd });
  totalTokens += p2.inputTokens + p2.outputTokens;
  totalCost += p2.costUsd;

  // Pass 3: 散文打磨 + 终稿
  const p3 = await callAI(GLOBAL_RULES, `你是一位散文打磨师。对以下章节做工艺级润色:优化句法、意象、节奏。保持原文结构和情节不变。\n\n${voiceCheck.issues?.length > 0 ? `# 需要修复的问题\n${JSON.stringify(voiceCheck.issues)}\n\n` : ""}# 原文\n${p1.text}`, undefined, 4096);
  passes.push({ name: "prose_polish", result: { text: p3.text }, tokens: p3.inputTokens + p3.outputTokens, cost: p3.costUsd });
  totalTokens += p3.inputTokens + p3.outputTokens;
  totalCost += p3.costUsd;

  return {
    finalText: p3.text,
    voiceCheck,
    passes,
    totalTokens,
    totalCost: Number(totalCost.toFixed(6)),
  };
}
