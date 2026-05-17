import { z } from "zod";

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

export type BridgeSignal = z.infer<typeof BridgeSignalSchema>;
export type ChapterOutline = z.infer<typeof ChapterOutlineSchema>;
