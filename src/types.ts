export type ItemStatus = 'proposed' | 'committed' | 'done'
export type ItemMood = 'online' | 'physical'

export interface Region {
  id: string
  wall_id: string
  name: string
  order: number
  unlock_date: string | null
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
  region_id: string
  status: ItemStatus
  position: number
  rotation_seed: number
  created_at: string
}

export interface User {
  id: string
  wall_id: string
  name: string
  avatar_color: string
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
  created_at: string
}

export interface UserProfile {
  uid: string
  wallId: string
  userId: string
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
