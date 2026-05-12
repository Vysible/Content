import { z } from 'zod'

export const BlogPostSchema = z.object({
  monat: z.string(),
  titel: z.string(),
  keyword: z.string(),
  html: z.string().min(100), // semantisches HTML, 600–900 Wörter
  wordCount: z.number(),
})

export const NewsletterSchema = z.object({
  monat: z.string(),
  titel: z.string(),
  betreffA: z.string(),
  betreffB: z.string(),
  preheader: z.string().max(120),
  body: z.string().min(50),
  cta: z.string(),
})

export const SocialPostSchema = z.object({
  kanal: z.enum(['SOCIAL_INSTAGRAM', 'SOCIAL_FACEBOOK', 'SOCIAL_LINKEDIN']),
  text: z.string(),
})

export const ImageBriefSchema = z.object({
  motiv: z.string(),
  stil: z.string(),
  farbwelt: z.string(),
  textoverlay: z.string(),
  canvaAssetEmpfehlung: z.string(),
  hwgHinweis: z.string(),
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
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
})
