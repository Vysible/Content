export interface SocialQuantity { posts: number; stories: number }
export type ChannelQuantities = {
  BLOG?: number
  NEWSLETTER?: number
  SOCIAL_INSTAGRAM?: SocialQuantity
  SOCIAL_FACEBOOK?: SocialQuantity
  SOCIAL_LINKEDIN?: SocialQuantity
}
export const DEFAULT_QUANTITIES: ChannelQuantities = {
  BLOG: 1,
  NEWSLETTER: 1,
  SOCIAL_INSTAGRAM: { posts: 8, stories: 8 },
  SOCIAL_FACEBOOK: { posts: 4, stories: 0 },
  SOCIAL_LINKEDIN: { posts: 4, stories: 0 },
}
