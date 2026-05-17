import { z } from 'zod'

export const BlogPostSchema = z.object({
  monat: z.string(),
  titel: z.string(),
  keyword: z.string(),
  html: z.string().min(100), // semantisches HTML, 600–900 Wörter
  wordCount: z.number(),
  outline: z.string().optional(),
})

export const NewsletterSchema = z.object({
  monat: z.string(),
  titel: z.string(),
  betreffA: z.string(),
  betreffB: z.string(),
  preheader: z.string().max(100),
  body: z.string().min(50),
  cta: z.string(),
})

export const SocialPostSchema = z.object({
  kanal: z.enum(['SOCIAL_INSTAGRAM', 'SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN']),
  text: z.string(),
}).superRefine((val, ctx) => {
  const limits: Record<string, number> = {
    SOCIAL_INSTAGRAM: 400,
    SOCIAL_FACEBOOK: 250,
    SOCIAL_LINKEDIN: 1_300,
  }
  const limit = limits[val.kanal]
  if (limit && val.text.length > limit) {
    ctx.addIssue({
      code: z.ZodIssueCode.too_big,
      maximum: limit,
      type: 'string',
      inclusive: true,
      message: `${val.kanal}: max. ${limit} Zeichen (aktuell ${val.text.length})`,
    })
  }
})

export const ImageBriefSchema = z.object({
  motiv: z.string(),
  stil: z.string(),
  farbwelt: z.string(),
  textoverlay: z.string(),
  canvaAssetEmpfehlung: z.string(),
  hwgHinweis: z.string(),
  stockSuchbegriffe: z.array(z.string()).default([]),
  dallePrompt: z.string().optional(),
  unsplashLinks: z.array(z.string()).default([]),
  // Claude returns this as string ("true"/"false") or boolean — coerce safely
  hwgParagraph11Check: z.preprocess(
    (v) => (typeof v === 'string' ? v === 'true' : Boolean(v)),
    z.boolean(),
  ).default(false),
})

export const TextResultSchema = z.object({
  monat: z.string(),
  titel: z.string(),
  kanal: z.string(),
  blog: BlogPostSchema.optional(),
  newsletter: NewsletterSchema.optional(),
  socialPosts: z.array(SocialPostSchema).optional(),
  imageBrief: ImageBriefSchema,
})

export type BlogPost = z.infer<typeof BlogPostSchema>
export type Newsletter = z.infer<typeof NewsletterSchema>
export type SocialPost = z.infer<typeof SocialPostSchema>
export type ImageBrief = z.infer<typeof ImageBriefSchema>
export type TextResult = z.infer<typeof TextResultSchema>

// Claude-Antwort für Social: { instagram?, facebook?, linkedin? }
export const SocialResponseSchema = z.object({
  instagram: z.string().nullish(),
  facebook: z.string().nullish(),
  linkedin: z.string().nullish(),
})
