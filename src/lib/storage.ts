import { User, Region, BucketItem, SavedWall, PolaroidStyle } from '../types'

const USER_KEY = 'andyou_user'
const WALL_KEY = 'andyou_wall'
const WALL_CODE_KEY = 'andyou_wall_code'
const REGIONS_KEY = 'andyou_regions_'
const ITEMS_KEY = 'andyou_items_'
const THEME_KEY = 'andyou_theme'

export function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}
export function loadUser(): User | null {
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function saveWallId(wallId: string) {
  localStorage.setItem(WALL_KEY, wallId)
}
export function loadWallId(): string | null {
  return localStorage.getItem(WALL_KEY)
}

export function saveWallCode(code: string) {
  localStorage.setItem(WALL_CODE_KEY, code)
}
export function loadWallCode(): string {
  return localStorage.getItem(WALL_CODE_KEY) ?? '??????'
}

export function saveRegions(wallId: string, regions: Region[]) {
  localStorage.setItem(REGIONS_KEY + wallId, JSON.stringify(regions))
}
export function loadRegions(wallId: string): Region[] | null {
  const raw = localStorage.getItem(REGIONS_KEY + wallId)
  return raw ? JSON.parse(raw) : null
}

export function saveItems(wallId: string, items: BucketItem[]) {
  localStorage.setItem(ITEMS_KEY + wallId, JSON.stringify(items))
}
export function loadItems(wallId: string): BucketItem[] | null {
  const raw = localStorage.getItem(ITEMS_KEY + wallId)
  return raw ? JSON.parse(raw) : null
}

export function saveTheme(theme: 'light' | 'dark') {
  localStorage.setItem(THEME_KEY, theme)
}
export function loadTheme(): 'light' | 'dark' {
  return (localStorage.getItem(THEME_KEY) as 'light' | 'dark') || 'light'
}

const POLAROID_STYLE_KEY = 'andyou_polaroid_style'
export function savePolaroidStyle(style: PolaroidStyle) {
  localStorage.setItem(POLAROID_STYLE_KEY, style)
}
export function loadPolaroidStyle(): PolaroidStyle {
  return (localStorage.getItem(POLAROID_STYLE_KEY) as PolaroidStyle) || 'styled'
}

const GOOGLE_UID_KEY = 'andyou_google_uid'

export function saveGoogleUid(uid: string) {
  localStorage.setItem(GOOGLE_UID_KEY, uid)
}
export function loadGoogleUid(): string | null {
  return localStorage.getItem(GOOGLE_UID_KEY)
}
export function clearGoogleUid() {
  localStorage.removeItem(GOOGLE_UID_KEY)
}

export function clearUser() { localStorage.removeItem(USER_KEY) }
export function clearWallId() { localStorage.removeItem(WALL_KEY) }

const SAVED_WALLS_KEY = 'andyou_saved_walls'

export function loadSavedWalls(): SavedWall[] {
  const raw = localStorage.getItem(SAVED_WALLS_KEY)
  return raw ? JSON.parse(raw) : []
}

export function saveSavedWalls(walls: SavedWall[]) {
  localStorage.setItem(SAVED_WALLS_KEY, JSON.stringify(walls))
}

export function addToSavedWalls(wall: SavedWall) {
  const current = loadSavedWalls()
  saveSavedWalls([...current.filter(w => w.wallId !== wall.wallId), wall])
}

export function removeFromSavedWalls(wallId: string) {
  saveSavedWalls(loadSavedWalls().filter(w => w.wallId !== wallId))
}

const NOTIFICATIONS_KEY = 'andyou_notifications'
export function saveNotificationsEnabled(v: boolean) {
  localStorage.setItem(NOTIFICATIONS_KEY, v ? '1' : '0')
}
export function loadNotificationsEnabled(): boolean {
  const raw = localStorage.getItem(NOTIFICATIONS_KEY)
  return raw === null ? true : raw === '1'
}
