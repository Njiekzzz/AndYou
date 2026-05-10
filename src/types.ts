export type ItemStatus = 'proposed' | 'committed' | 'done'
export type ItemMood = 'online' | 'physical'
export type ItemTheme = 'adventure' | 'splurge' | 'spicy' | 'cozy' | 'experience' | 'other'

export interface ThemeConfig {
  label: string
  emoji: string
  borderColor: string
}

export type PolaroidStyle = 'styled' | 'border' | 'plain'

export const ITEM_THEMES: Record<ItemTheme, ThemeConfig> = {
  adventure:  { label: 'Adventure',  emoji: '🏔️', borderColor: '#6b9e7e' },
  splurge:    { label: 'Splurge',    emoji: '💸', borderColor: '#c69a4a' },
  spicy:      { label: 'Spicy',      emoji: '🌶️', borderColor: '#c94a6a' },
  cozy:       { label: 'Cozy',       emoji: '🌙', borderColor: '#b59fc0' },
  experience: { label: 'Experience', emoji: '🎉', borderColor: '#7baab5' },
  other:      { label: 'Other',      emoji: '✨', borderColor: '#9a9488' },
}

export interface Region {
  id: string
  wall_id: string
  name: string
  order: number
  unlock_date: string | null
  timer_enabled?: boolean
}

export interface BucketItem {
  id: string
  wall_id: string
  created_by: string
  title: string
  description: string | null
  image_url: string | null
  real_image_url: string | null
  location: string | null
  mood: ItemMood
  theme?: ItemTheme | null
  region_id: string
  status: ItemStatus
  position: number
  rotation_seed: number
  created_at: string
  date?: string | null
  voice_note_url?: string | null
  sealed_note?: string | null
  sealed_note_at?: string | null
}

export interface Comment {
  id: string
  item_id: string
  user_id: string
  type: 'text' | 'voice'
  text?: string
  audio_url?: string
  created_at: string
}

export interface User {
  id: string
  wall_id: string
  name: string
  avatar_color: string
  google_uid?: string
}

export interface Reaction {
  id: string
  item_id: string
  user_id: string
  heart: boolean
  rating: number | null
}

export interface Wall {
  id: string
  code: string
  name?: string
  created_at: string
}

export interface UserProfile {
  uid: string
  wallId: string
  userId: string
}

export interface SavedWall {
  wallId: string
  wallCode: string
  userId: string
  name: string
  color: string
}

export interface DrawingStroke {
  id: string
  userId: string
  d: string
  color: string
  width: number
}

export interface WallSticker {
  id: string
  userId: string
  type: 'heart' | 'star' | 'sparkle' | 'flower'
  x: number
  y: number
  size: number
  rotation: number
  color: string
}

export type DareStatus = 'pending' | 'accepted' | 'done' | 'skipped' | 'change_requested'
export type DareTarget = 'partner' | 'trade' | 'self'

export interface Dare {
  id: string
  wall_id: string
  created_by: string
  title: string
  description?: string | null
  assigned_to: DareTarget
  status: DareStatus
  due_date?: string | null
  created_at: string
  completed_at?: string | null
  completion_photo_url?: string | null
  completion_note?: string | null
  change_request_note?: string | null
  trade_title?: string | null
  trade_description?: string | null
  trade_status?: DareStatus
  trade_completed_at?: string | null
  trade_completion_photo_url?: string | null
  trade_completion_note?: string | null
  creator_reaction?: string | null
  assignee_reaction?: string | null
  positions?: Record<string, { x: number; y: number }>
  board_x?: number | null
  board_y?: number | null
  category?: string | null
}

export interface BoardLabel {
  id: string
  wall_id: string
  text: string
  x: number
  y: number
  created_by: string
  created_at: string
}

export type ClashStatus = 'selecting' | 'pending_acceptance' | 'live' | 'completed' | 'cancelled'

export interface Clash {
  id: string
  wall_id: string
  dare_a_id: string | null
  dare_b_id: string | null
  user_a_id: string
  user_b_id: string | null
  user_a_accepted: boolean
  user_b_accepted: boolean
  status: ClashStatus
  created_at: string
}

export const AVATAR_COLORS = [
  '#c97b5a', // warm terracotta
  '#7b9e7b', // sage green
  '#8b7bb5', // muted lavender
  '#c4a25a', // warm gold
  '#7baab5', // dusty teal
  '#b57b7b', // rose brown
  '#7b8eb5', // slate blue
  '#a5956b', // warm sand
]
