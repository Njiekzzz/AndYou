import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { supabase, IS_SUPABASE_CONFIGURED } from '../lib/supabase'
import {
  saveUser, loadUser, saveWallId, loadWallId, saveWallCode, loadWallCode,
  saveRegions, loadRegions, saveItems, loadItems, saveTheme, loadTheme,
} from '../lib/storage'
import { BucketItem, User, Region, Reaction, Wall } from '../types'
import { sendLocalNotification } from '../lib/notifications'
import { v4 as uuidv4 } from 'uuid'

const DEFAULT_REGIONS: Omit<Region, 'id' | 'wall_id'>[] = [
  { name: 'now', order: 0, unlock_date: null },
  { name: '2–4 weeks', order: 1, unlock_date: null },
  { name: 'first time we meet', order: 2, unlock_date: null },
  { name: 'Vancouver', order: 3, unlock_date: null },
  { name: 'long term', order: 4, unlock_date: null },
]

interface AppContextType {
  user: User | null
  wall: Wall | null
  partner: User | null
  items: BucketItem[]
  regions: Region[]
  reactions: Record<string, Reaction[]>
  theme: 'light' | 'dark'
  isLoading: boolean
  activeView: 'timeline' | 'list'
  setActiveView: (v: 'timeline' | 'list') => void
  toggleTheme: () => void
  createWall: (name: string, color: string) => Promise<string>
  joinWall: (code: string, name: string, color: string) => Promise<void>
  addItem: (item: Omit<BucketItem, 'id' | 'wall_id' | 'created_by' | 'created_at' | 'rotation_seed' | 'position'>) => Promise<string>
  updateItem: (id: string, updates: Partial<BucketItem>) => Promise<void>
  commitItem: (id: string) => Promise<void>
  completeItem: (id: string, realImageUrl?: string) => Promise<void>
  deleteItem: (id: string) => Promise<void>
  toggleHeart: (itemId: string) => Promise<void>
  setRating: (itemId: string, rating: number) => Promise<void>
  updateRegion: (id: string, updates: Partial<Region>) => Promise<void>
  addRegion: (name: string) => Promise<void>
  reorderRegions: (regions: Region[]) => Promise<void>
  uploadImage: (file: File) => Promise<string>
  getItemReactions: (itemId: string) => Reaction[]
  getUserById: (id: string) => User | null
  usersInWall: User[]
}

const AppContext = createContext<AppContextType | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(loadUser())
  const [wall, setWall] = useState<Wall | null>(null)
  const [partner, setPartner] = useState<User | null>(null)
  const [usersInWall, setUsersInWall] = useState<User[]>([])
  const [items, setItemsState] = useState<BucketItem[]>([])
  const [regions, setRegionsState] = useState<Region[]>([])
  const [reactions, setReactions] = useState<Record<string, Reaction[]>>({})
  const [theme, setTheme] = useState<'light' | 'dark'>(loadTheme())
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<'timeline' | 'list'>('timeline')

  // Wrappers that keep localStorage in sync
  const setItems = useCallback((updater: BucketItem[] | ((prev: BucketItem[]) => BucketItem[])) => {
    setItemsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const wallId = loadWallId()
      if (wallId) {
        try { saveItems(wallId, next) } catch { /* quota exceeded — state still updates */ }
      }
      return next
    })
  }, [])

  const setRegions = useCallback((updater: Region[] | ((prev: Region[]) => Region[])) => {
    setRegionsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const wallId = loadWallId()
      if (wallId) saveRegions(wallId, next)
      return next
    })
  }, [])

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  const toggleTheme = useCallback(() => {
    setTheme(t => {
      const next = t === 'light' ? 'dark' : 'light'
      saveTheme(next)
      return next
    })
  }, [])

  // Load wall state — from Supabase if configured, otherwise from localStorage
  const loadWall = useCallback(async (wallId: string) => {
    if (!IS_SUPABASE_CONFIGURED) {
      // Pure local mode
      const code = loadWallCode()
      setWall({ id: wallId, code, created_at: '' })
      const localRegions = loadRegions(wallId)
      if (localRegions) setRegions(localRegions)
      const localItems = loadItems(wallId)
      if (localItems) setItems(localItems)
      const currentUser = loadUser()
      if (currentUser) setUsersInWall([currentUser])
      return
    }

    const [wallRes, itemsRes, regionsRes, usersRes] = await Promise.all([
      supabase.from('walls').select('*').eq('id', wallId).single(),
      supabase.from('items').select('*').eq('wall_id', wallId).order('position'),
      supabase.from('regions').select('*').eq('wall_id', wallId).order('order'),
      supabase.from('users').select('*').eq('wall_id', wallId),
    ])

    if (wallRes.data) {
      setWall(wallRes.data)
    } else {
      // Supabase failed — fall back to localStorage
      setWall({ id: wallId, code: loadWallCode(), created_at: '' })
    }
    if (itemsRes.data) setItems(itemsRes.data)
    else { const li = loadItems(wallId); if (li) setItems(li) }
    if (regionsRes.data) setRegions(regionsRes.data)
    else { const lr = loadRegions(wallId); if (lr) setRegions(lr) }

    if (usersRes.data) {
      setUsersInWall(usersRes.data)
      const currentUser = loadUser()
      if (currentUser) {
        setPartner(usersRes.data.find((u: User) => u.id !== currentUser.id) ?? null)
      }
    }

    // Load reactions
    const itemIds = (itemsRes.data ?? []).map((i: BucketItem) => i.id)
    if (itemIds.length > 0) {
      const { data: reactionsData } = await supabase.from('reactions').select('*').in('item_id', itemIds)
      if (reactionsData) {
        const grouped: Record<string, Reaction[]> = {}
        reactionsData.forEach((r: Reaction) => {
          if (!grouped[r.item_id]) grouped[r.item_id] = []
          grouped[r.item_id].push(r)
        })
        setReactions(grouped)
      }
    }
  }, [setItems, setRegions])

  useEffect(() => {
    const wallId = loadWallId()
    if (!wallId || !user) {
      setIsLoading(false)
      return
    }
    loadWall(wallId).finally(() => setIsLoading(false))

    if (!IS_SUPABASE_CONFIGURED) return

    const itemsSub = supabase
      .channel('items-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items', filter: `wall_id=eq.${wallId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => {
            if (prev.some(i => i.id === payload.new.id)) return prev
            return [...prev, payload.new as BucketItem].sort((a, b) => a.position - b.position)
          })
          if (payload.new.created_by !== user.id) {
            sendLocalNotification('& you', `New item proposed: ${payload.new.title}`)
          }
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new as BucketItem : i))
          if (payload.new.status === 'committed' && payload.old.status === 'proposed' && payload.new.created_by !== user.id) {
            sendLocalNotification('& you', `${payload.new.title} is now committed!`)
          }
          if (payload.new.real_image_url && !payload.old.real_image_url && payload.new.created_by !== user.id) {
            sendLocalNotification('& you', `A memory was added to: ${payload.new.title}`)
          }
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== payload.old.id))
        }
      })
      .subscribe()

    const reactionsSub = supabase
      .channel('reactions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, payload => {
        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const r = payload.new as Reaction
          setReactions(prev => {
            const existing = prev[r.item_id] ?? []
            const filtered = existing.filter(x => x.id !== r.id)
            return { ...prev, [r.item_id]: [...filtered, r] }
          })
          if (payload.eventType === 'INSERT' && r.heart && r.user_id !== user.id) {
            sendLocalNotification('& you', 'Someone hearted an item!')
          }
        } else if (payload.eventType === 'DELETE') {
          const r = payload.old as Reaction
          setReactions(prev => ({
            ...prev,
            [r.item_id]: (prev[r.item_id] ?? []).filter(x => x.id !== r.id),
          }))
        }
      })
      .subscribe()

    const regionsSub = supabase
      .channel('regions-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'regions', filter: `wall_id=eq.${wallId}` }, payload => {
        if (payload.eventType === 'INSERT') {
          setRegions(prev => {
            if (prev.some(r => r.id === payload.new.id)) return prev
            return [...prev, payload.new as Region].sort((a, b) => a.order - b.order)
          })
        } else if (payload.eventType === 'UPDATE') {
          setRegions(prev => prev.map(r => r.id === payload.new.id ? payload.new as Region : r))
        } else if (payload.eventType === 'DELETE') {
          setRegions(prev => prev.filter(r => r.id !== payload.old.id))
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(itemsSub)
      supabase.removeChannel(reactionsSub)
      supabase.removeChannel(regionsSub)
    }
  }, [user, loadWall, setItems, setRegions])

  const createWall = useCallback(async (name: string, color: string): Promise<string> => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const wallId = uuidv4()
    const userId = uuidv4()

    const defaultRegions = DEFAULT_REGIONS.map(r => ({ ...r, id: uuidv4(), wall_id: wallId }))
    const newUser: User = { id: userId, wall_id: wallId, name, avatar_color: color }

    // Always save to localStorage first
    saveUser(newUser)
    saveWallId(wallId)
    saveWallCode(code)
    saveRegions(wallId, defaultRegions)
    saveItems(wallId, [])

    setUser(newUser)
    setWall({ id: wallId, code, created_at: new Date().toISOString() })
    setRegions(defaultRegions)
    setUsersInWall([newUser])
    setIsLoading(false)

    // Sync to Supabase in background if configured
    if (IS_SUPABASE_CONFIGURED) {
      supabase.from('walls').insert({ id: wallId, code }).then()
      supabase.from('regions').insert(defaultRegions).then()
      supabase.from('users').insert(newUser).then()
    }

    return code
  }, [setRegions])

  const joinWall = useCallback(async (code: string, name: string, color: string) => {
    if (!IS_SUPABASE_CONFIGURED) {
      throw new Error('Joining requires Supabase. Set up your .env first.')
    }
    const { data: wallData } = await supabase.from('walls').select('*').eq('code', code.toUpperCase()).single()
    if (!wallData) throw new Error('Wall not found')

    const userId = uuidv4()
    const newUser: User = { id: userId, wall_id: wallData.id, name, avatar_color: color }
    await supabase.from('users').insert(newUser)

    saveUser(newUser)
    saveWallId(wallData.id)
    saveWallCode(wallData.code)
    setUser(newUser)

    await loadWall(wallData.id)
    setIsLoading(false)
  }, [loadWall])

  const addItem = useCallback(async (itemData: Omit<BucketItem, 'id' | 'wall_id' | 'created_by' | 'created_at' | 'rotation_seed' | 'position'>): Promise<string> => {
    if (!user || !wall) return ''
    const maxPos = items.length > 0 ? Math.max(...items.map(i => i.position)) : 0
    const newItem: BucketItem = {
      ...itemData,
      id: uuidv4(),
      wall_id: wall.id,
      created_by: user.id,
      created_at: new Date().toISOString(),
      rotation_seed: Math.floor(Math.random() * 10000),
      position: maxPos + 1,
    }
    setItems(prev => [...prev, newItem].sort((a, b) => a.position - b.position))

    if (IS_SUPABASE_CONFIGURED) {
      supabase.from('items').insert(newItem).then()
    }
    return newItem.id
  }, [user, wall, items, setItems])

  const updateItem = useCallback(async (id: string, updates: Partial<BucketItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    if (IS_SUPABASE_CONFIGURED) {
      supabase.from('items').update(updates).eq('id', id).then()
    }
  }, [setItems])

  const commitItem = useCallback(async (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'committed' } : i))
    if (IS_SUPABASE_CONFIGURED) {
      supabase.from('items').update({ status: 'committed' }).eq('id', id).then()
    }
  }, [setItems])

  const completeItem = useCallback(async (id: string, realImageUrl?: string) => {
    const updates: Partial<BucketItem> = { status: 'done' }
    if (realImageUrl) updates.real_image_url = realImageUrl
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i))
    if (IS_SUPABASE_CONFIGURED) {
      supabase.from('items').update(updates).eq('id', id).then()
    }
  }, [setItems])

  const deleteItem = useCallback(async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    if (IS_SUPABASE_CONFIGURED) {
      supabase.from('items').delete().eq('id', id).then()
    }
  }, [setItems])

  const toggleHeart = useCallback(async (itemId: string) => {
    if (!user) return
    const existing = reactions[itemId]?.find(r => r.user_id === user.id && r.heart)
    if (existing) {
      setReactions(prev => ({
        ...prev,
        [itemId]: (prev[itemId] ?? []).map(r => r.id === existing.id ? { ...r, heart: false } : r),
      }))
      if (IS_SUPABASE_CONFIGURED) supabase.from('reactions').update({ heart: false }).eq('id', existing.id).then()
    } else {
      const myReaction = reactions[itemId]?.find(r => r.user_id === user.id)
      if (myReaction) {
        setReactions(prev => ({
          ...prev,
          [itemId]: (prev[itemId] ?? []).map(r => r.id === myReaction.id ? { ...r, heart: true } : r),
        }))
        if (IS_SUPABASE_CONFIGURED) supabase.from('reactions').update({ heart: true }).eq('id', myReaction.id).then()
      } else {
        const newR = { id: uuidv4(), item_id: itemId, user_id: user.id, heart: true, rating: null }
        setReactions(prev => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), newR] }))
        if (IS_SUPABASE_CONFIGURED) supabase.from('reactions').insert(newR).then()
      }
    }
  }, [user, reactions])

  const setRating = useCallback(async (itemId: string, rating: number) => {
    if (!user) return
    const myReaction = reactions[itemId]?.find(r => r.user_id === user.id)
    if (myReaction) {
      setReactions(prev => ({
        ...prev,
        [itemId]: (prev[itemId] ?? []).map(r => r.id === myReaction.id ? { ...r, rating } : r),
      }))
      if (IS_SUPABASE_CONFIGURED) supabase.from('reactions').update({ rating }).eq('id', myReaction.id).then()
    } else {
      const newR = { id: uuidv4(), item_id: itemId, user_id: user.id, heart: false, rating }
      setReactions(prev => ({ ...prev, [itemId]: [...(prev[itemId] ?? []), newR] }))
      if (IS_SUPABASE_CONFIGURED) supabase.from('reactions').insert(newR).then()
    }
  }, [user, reactions])

  const updateRegion = useCallback(async (id: string, updates: Partial<Region>) => {
    setRegions(prev => prev.map(r => r.id === id ? { ...r, ...updates } : r))
    if (IS_SUPABASE_CONFIGURED) supabase.from('regions').update(updates).eq('id', id).then()
  }, [setRegions])

  const addRegion = useCallback(async (name: string) => {
    if (!wall) return
    const maxOrder = regions.length > 0 ? Math.max(...regions.map(r => r.order)) : -1
    const newRegion: Region = { id: uuidv4(), wall_id: wall.id, name, order: maxOrder + 1, unlock_date: null }
    setRegions(prev => [...prev, newRegion].sort((a, b) => a.order - b.order))
    if (IS_SUPABASE_CONFIGURED) supabase.from('regions').insert(newRegion).then()
  }, [wall, regions, setRegions])

  const reorderRegions = useCallback(async (newRegions: Region[]) => {
    setRegions(newRegions)
    if (IS_SUPABASE_CONFIGURED) {
      newRegions.forEach((r, i) => supabase.from('regions').update({ order: i }).eq('id', r.id).then())
    }
  }, [setRegions])

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    if (!IS_SUPABASE_CONFIGURED) {
      return URL.createObjectURL(file)
    }
    const ext = file.name.split('.').pop()
    const path = `${uuidv4()}.${ext}`
    const { error } = await supabase.storage.from('item-images').upload(path, file)
    if (error) {
      console.error('[Supabase Storage] upload failed:', error.message, error)
      throw error
    }
    const { data } = supabase.storage.from('item-images').getPublicUrl(path)
    console.log('[Supabase Storage] upload OK, public URL:', data.publicUrl)
    return data.publicUrl
  }, [])

  const getItemReactions = useCallback((itemId: string) => {
    return reactions[itemId] ?? []
  }, [reactions])

  const getUserById = useCallback((id: string): User | null => {
    return usersInWall.find(u => u.id === id) ?? null
  }, [usersInWall])

  return (
    <AppContext.Provider value={{
      user, wall, partner, items, regions, reactions, theme, isLoading, activeView,
      setActiveView, toggleTheme, createWall, joinWall, addItem, updateItem,
      commitItem, completeItem, deleteItem, toggleHeart, setRating,
      updateRegion, addRegion, reorderRegions, uploadImage,
      getItemReactions, getUserById, usersInWall,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
