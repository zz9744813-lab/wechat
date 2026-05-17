import { z } from "zod";

// ============ 日记处理 Schema ============

export const EventSchema = z.object({
  description: z.string().max(100),
  category: z.enum(["work", "relationship", "health", "creative", "daily", "other"]),
  significance: z.number().int().min(1).max(10),
  time_ref: z.string(),
});

export const EmotionSchema = z.object({
  name: z.string(),
  intensity: z.number().min(0).max(1),
  trigger: z.string().max(60),
  body_sensation: z.string().optional(),
  valence: z.enum(["positive", "negative", "mixed", "neutral"]),
});

export const ThoughtSchema = z.object({
  content: z.string().max(100),
  type: z.enum(["observation", "belief", "assumption", "prediction", "memory"]),
  distortion_signal: z.string().nullable().optional(),
  confidence: z.number().min(0).max(1),
});

export const ThemeSchema = z.object({
  name: z.string(),
  description: z.string().max(60),
  intensity: z.number().min(0).max(1),
  imagery_suggestions: z.array(z.string()),
});

export const BridgeSignalSchema = z.object({
  signal: z.object({
    primary_theme: z.string(),
    secondary_themes: z.array(z.string()),
    emotional_tone: z.string(),
    suggested_carrier_archetype: z.string(),
    imagery_pool: z.array(z.string()),
    energy_level: z.enum(["high", "medium", "low", "turbulent"]),
    narrative_tension: z.string().max(100),
  }),
  privacy_note: z.string(),
});

// ============ 章节写作 Schema ============

export const ChapterOutlineSchema = z.object({
  outline: z.object({
    chapter_title: z.string(),
    pov_character: z.string(),
    synopsis: z.string().max(500),
    key_scenes: z.array(z.string()),
    emotional_arc: z.string(),
    theme_to_explore: z.string(),
    mirror_connection: z.string(),
    word_target: z.number().int(),
  }),
});

export const VoiceCheckSchema = z.object({
  issues: z.array(z.object({
    character: z.string(),
    line: z.string(),
    problem: z.string(),
    suggestion: z.string(),
  })),
  overall_voice_score: z.number().int().min(1).max(10),
  notes: z.string().max(100),
});

export const ConsistencySchema = z.object({
  contradictions: z.array(z.object({
    detail: z.string(),
    severity: z.enum(["minor", "major", "critical"]),
    fix: z.string(),
  })),
  consistency_score: z.number().int().min(1).max(10),
  notes: z.string().max(100),
});

export const ThemeAuditSchema = z.object({
  theme_landed: z.boolean(),
  preachiness_score: z.number().int().min(1).max(10),
  subtlety_score: z.number().int().min(1).max(10),
  issues: z.array(z.string()),
  suggestions: z.array(z.string()),
});

export const EmotionArcSchema = z.object({
  has_arc: z.boolean(),
  arc_shape: z.string(),
  engagement_score: z.number().int().min(1).max(10),
  pacing_notes: z.string().max(100),
  suggestions: z.array(z.string()),
});

// ============ 模式识别 Schema ============

export const PatternDetectionSchema = z.object({
  patterns: z.array(z.object({
    name: z.string(),
    description: z.string(),
    trigger: z.string(),
    response: z.string(),
    frequency: z.enum(["daily", "weekly", "monthly", "situational"]),
    emotional_cost: z.number().int().min(1).max(10),
    growth_potential: z.number().int().min(1).max(10),
    related_themes: z.array(z.string()),
  })),
});

export const PatternEvolutionSchema = z.object({
  pattern_id: z.string(),
  direction: z.enum(["deepening", "weakening", "transforming", "stable"]),
  evidence: z.string(),
  new_variant: z.string().optional(),
  suggestion: z.string(),
});

// ============ 危机检测 Schema ============

export const CrisisDetectionSchema = z.object({
  risk_level: z.enum(["none", "low", "moderate", "high", "critical"]),
  signals: z.array(z.object({
    type: z.enum(["self_harm", "suicidal_ideation", "severe_depression", "substance_abuse", "isolation", "hopelessness"]),
    severity: z.number().int().min(1).max(10),
    evidence: z.string(),
  })),
  recommended_action: z.string(),
  should_continue: z.boolean(),
});

// ============ 分支叙事 Schema ============

export const BranchGenerationSchema = z.object({
  branch_title: z.string(),
  diverge_point: z.string(),
  alternative_scenes: z.array(z.object({
    scene: z.string(),
    emotional_shift: z.string(),
    theme_explored: z.string(),
  })),
  insight: z.string(),
  merge_suggestion: z.string().optional(),
});

// ============ 生命叙事 Schema ============

export const LifeNarrativeSchema = z.object({
  period: z.string(),
  narrative: z.string(),
  dominant_themes: z.array(z.string()),
  growth_milestones: z.array(z.string()),
  unresolved_tensions: z.array(z.string()),
  next_chapter_suggestion: z.string(),
  imagery_summary: z.string(),
});

// ============ 反思提示 Schema ============

export const ReflectionPromptSchema = z.object({
  prompts: z.array(z.object({
    question: z.string(),
    depth: z.enum(["surface", "moderate", "deep"]),
    related_theme: z.string(),
    suggested_time: z.string().optional(),
  })),
});

// ============ 角色心理 Schema ============

export const CharacterPsychologySchema = z.object({
  character_id: z.string(),
  inner_state: z.string(),
  unconscious_desire: z.string(),
  defense_mechanisms_active: z.array(z.string()),
  growth_edge_status: z.string(),
  relationship_dynamics: z.array(z.object({
    with_character: z.string(),
    tension: z.string(),
    evolution: z.string(),
  })),
  next_arc_beat: z.string(),
});

// ============ 风格光谱 Schema ============

export const StyleSpectrumSchema = z.object({
  current_style: z.object({
    sentence_avg_length: z.string(),
    imagery_density: z.enum(["sparse", "moderate", "rich", "baroque"]),
    emotional_register: z.enum(["restrained", "moderate", "intense", "volatile"]),
    narrative_distance: z.enum(["close", "mid", "far", "shifting"]),
    dominant_rhetoric: z.array(z.string()),
  }),
  style_evolution: z.string(),
  recommended_adjustment: z.string(),
  consistency_with_previous: z.number().min(0).max(1),
});

// ============ 类型导出 ============

export type BridgeSignal = z.infer<typeof BridgeSignalSchema>;
export type ChapterOutline = z.infer<typeof ChapterOutlineSchema>;
export type CrisisDetection = z.infer<typeof CrisisDetectionSchema>;
export type PatternDetection = z.infer<typeof PatternDetectionSchema>;
export type BranchGeneration = z.infer<typeof BranchGenerationSchema>;
export type LifeNarrative = z.infer<typeof LifeNarrativeSchema>;
export type CharacterPsychology = z.infer<typeof CharacterPsychologySchema>;
export type StyleSpectrum = z.infer<typeof StyleSpectrumSchema>;
