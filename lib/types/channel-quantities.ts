export interface SocialQuantity {
  posts: number
  stories: number
  postsUnit?: 'week' | 'month'  // defaults to 'month'
}

export type ChannelQuantities = {
  BLOG?: number
  // NEWSLETTER: count per month. Values < 1 mean "every N months":
  //   1 = monatlich, 0.5 = alle 2 Monate, 0.33 = alle 3 Monate, 0.25 = quartalsweise
  NEWSLETTER?: number
  SOCIAL_INSTAGRAM?: SocialQuantity
  SOCIAL_FACEBOOK?: SocialQuantity
  SOCIAL_LINKEDIN?: SocialQuantity
}

export const DEFAULT_QUANTITIES: ChannelQuantities = {
  BLOG: 1,
  NEWSLETTER: 1,
  SOCIAL_INSTAGRAM: { posts: 1, stories: 1, postsUnit: 'week' },
  SOCIAL_FACEBOOK: { posts: 1, stories: 0, postsUnit: 'week' },
  SOCIAL_LINKEDIN: { posts: 1, stories: 0, postsUnit: 'week' },
}

export const NEWSLETTER_RHYTHM_OPTIONS: { label: string; value: number }[] = [
  { label: 'Monatlich', value: 1 },
  { label: 'Alle 2 Monate', value: 0.5 },
  { label: 'Alle 3 Monate', value: 0.33 },
  { label: 'Quartalsweise (4x/Jahr)', value: 0.25 },
  { label: 'Halbjährlich (2x/Jahr)', value: 0.17 },
]

// Blog-Rhythmus: auch mehrfach pro Monat möglich
export const BLOG_RHYTHM_OPTIONS: { label: string; value: number }[] = [
  { label: 'Wöchentlich (4x/Monat)', value: 4 },
  { label: '2x pro Monat', value: 2 },
  { label: 'Monatlich', value: 1 },
  { label: 'Alle 2 Monate', value: 0.5 },
  { label: 'Alle 3 Monate', value: 0.33 },
  { label: 'Quartalsweise (4x/Jahr)', value: 0.25 },
]
