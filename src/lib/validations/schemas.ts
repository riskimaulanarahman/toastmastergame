import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

export const answerItemSchema = z.object({
  item_number: z.number().int().min(1).max(10),
  answer_text: z.string().trim().min(1).max(100),
  accepted_aliases: z.array(z.string().trim().min(1).max(100)).max(30)
});

export const gameSetSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(3).max(500),
  image_path: z.string().trim().min(3),
  answers: z
    .array(answerItemSchema)
    .length(10)
    .superRefine((items, ctx) => {
      const seen = new Set<number>();
      for (const item of items) {
        if (seen.has(item.item_number)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate item number ${item.item_number}`
          });
        }
        seen.add(item.item_number);
      }
    })
});

export const createSessionSchema = z.object({
  game_set_id: z.string().uuid(),
  title: z.string().trim().min(3).max(120),
  duration_seconds: z.number().int().positive().max(7200)
});

export const updateSessionDurationSchema = z.object({
  duration_seconds: z.number().int().positive().max(7200)
});

export const joinSessionSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2, "Display name must be at least 2 characters")
    .max(40)
    .regex(/^[a-zA-Z0-9 _.-]+$/, "Use letters, numbers, spaces, underscore, dot, or dash")
});

export const submissionSchema = z.object({
  answers: z
    .array(
      z.object({
        item_number: z.number().int().min(1).max(10),
        answer_text: z.string().trim().max(100)
      })
    )
    .length(10)
    .superRefine((answers, ctx) => {
      const unique = new Set<number>();
      for (const answer of answers) {
        if (unique.has(answer.item_number)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Duplicate item number ${answer.item_number}`
          });
        }
        unique.add(answer.item_number);
      }
    })
});

export type AdminLoginInput = z.infer<typeof adminLoginSchema>;
export type GameSetInput = z.infer<typeof gameSetSchema>;
export type CreateSessionInput = z.infer<typeof createSessionSchema>;
export type UpdateSessionDurationInput = z.infer<typeof updateSessionDurationSchema>;
export type JoinSessionInput = z.infer<typeof joinSessionSchema>;
export type SubmissionInput = z.infer<typeof submissionSchema>;
