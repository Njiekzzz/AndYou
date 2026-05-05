import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import {
  collection, doc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
  query, where, orderBy, onSnapshot, writeBatch, Timestamp,
} from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { db, storage } from '../lib/firebase'
import {
  saveUser, loadUser, saveWallId, loadWallId, saveWallCode,
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

// Firestore collection helpers
const wallDoc = (wallId: string) => doc(db, 'walls', wallId)
const itemsCol = (wallId: string) => collection(db, 'walls', wallId, 'items')
const itemDoc = (wallId: string, itemId: string) => doc(db, 'walls', wallId, 'items', itemId)
const regionsCol = (wallId: string) => collection(db, 'walls', wallId, 'regions')
const regionDoc = (wallId: string, regionId: string) => doc(db, 'walls', wallId, 'regions', regionId)
const usersCol = (wallId: string) => collection(db, 'walls', wallId, 'users')
const userDoc = (wallId: string, userId: string) => doc(db, 'walls', wallId, 'users', userId)
const reactionsCol = (wallId: string) => collection(db, 'walls', wallId, 'reactions')
const reactionDoc = (wallId: string, reactionId: string) => doc(db, 'walls', wallId, 'reactions', reactionId)

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

  const setItems = useCallback((updater: BucketItem[] | ((prev: BucketItem[]) => BucketItem[])) => {
    setItemsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      const wallId = loadWallId()
      if (wallId) {
        try { saveItems(wallId, next) } catch { /* quota exceeded */ }
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

  // Set up real-time listeners for a wall
  useEffect(() => {
    const wallId = loadWallId()
    if (!wallId || !user) {
      setIsLoading(false)
      return
    }

    // Load wall doc
    getDoc(wallDoc(wallId)).then(snap => {
      if (snap.exists()) {
        setWall(snap.data() as Wall)
      } else {
        setWall({ id: wallId, code: '', created_at: '' })
      }
    })

    // Load users
    getDocs(usersCol(wallId)).then(snap => {
      const users = snap.docs.map(d => d.data() as User)
      setUsersInWall(users)
      const currentUser = loadUser()
      if (currentUser) {
        setPartner(users.find(u => u.id !== currentUser.id) ?? null)
      }
    })

    // Real-time: items
    const itemsUnsub = onSnapshot(
      query(itemsCol(wallId), orderBy('position')),
      snap => {
        const data = snap.docs.map(d => d.data() as BucketItem)
        setItems(data)

        snap.docChanges().forEach(change => {
          if (change.type === 'added' && change.doc.data().created_by !== user.id) {
            sendLocalNotification('& you', `New item proposed: ${change.doc.data().title}`)
          }
          if (change.type === 'modified') {
            const newData = change.doc.data() as BucketItem
            if (newData.status === 'committed' && newData.created_by !== user.id) {
              sendLocalNotification('& you', `${newData.title} is now committed!`)
            }
            if (newData.real_image_url && newData.created_by !== user.id) {
              sendLocalNotification('& you', `A memory was added to: ${newData.title}`)
            }
          }
        })
      }
    )

    // Real-time: regions
    const regionsUnsub = onSnapshot(
      query(regionsCol(wallId), orderBy('order')),
      snap => {
        setRegions(snap.docs.map(d => d.data() as Region))
      }
    )

    // Real-time: reactions
    const reactionsUnsub = onSnapshot(
      reactionsCol(wallId),
      snap => {
        const grouped: Record<string, Reaction[]> = {}
        snap.docs.forEach(d => {
          const r = d.data() as Reaction
          if (!grouped[r.item_id]) grouped[r.item_id] = []
          grouped[r.item_id].push(r)
        })
        setReactions(grouped)

        snap.docChanges().forEach(change => {
          if (change.type === 'added') {
            const r = change.doc.data() as Reaction
            if (r.heart && r.user_id !== user.id) {
              sendLocalNotification('& you', 'Someone hearted an item!')
            }
          }
        })
      }
    )

    setIsLoading(false)

    return () => {
      itemsUnsub()
      regionsUnsub()
      reactionsUnsub()
    }
  }, [user, setItems, setRegions])

  const createWall = useCallback(async (name: string, color: string): Promise<string> => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const wallId = uuidv4()
    const userId = uuidv4()

    const defaultRegions = DEFAULT_REGIONS.map(r => ({ ...r, id: uuidv4(), wall_id: wallId }))
    const newUser: User = { id: userId, wall_id: wallId, name, avatar_color: color }
    const newWall: Wall = { id: wallId, code, created_at: new Date().toISOString() }

    saveUser(newUser)
    saveWallId(wallId)
    saveWallCode(code)
    saveRegions(wallId, defaultRegions)
    saveItems(wallId, [])

    setUser(newUser)
    setWall(newWall)
    setRegions(defaultRegions)
    setUsersInWall([newUser])
    setIsLoading(false)

    // Write to Firestore
    const batch = writeBatch(db)
    batch.set(wallDoc(wallId), newWall)
    batch.set(userDoc(wallId, userId), newUser)
    defaultRegions.forEach(r => batch.set(regionDoc(wallId, r.id), r))
    await batch.commit()

    return code
  }, [setRegions])

  const joinWall = useCallback(async (code: string, name: string, color: string) => {
    // Find wall by code
    const wallsSnap = await getDocs(
      query(collection(db, 'walls'), where('code', '==', code.toUpperCase()))
    )
    if (wallsSnap.empty) throw new Error('Wall not found')

    const wallData = wallsSnap.docs[0].data() as Wall
    const userId = uuidv4()
    const newUser: User = { id: userId, wall_id: wallData.id, name, avatar_color: color }

    await setDoc(userDoc(wallData.id, userId), newUser)

    saveUser(newUser)
    saveWallId(wallData.id)
    saveWallCode(wallData.code)
    setUser(newUser)
    setWall(wallData)
    setIsLoading(false)
  }, [])

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
    await setDoc(itemDoc(wall.id, newItem.id), newItem)
    return newItem.id
  }, [user, wall, items])

  const updateItem = useCallback(async (id: string, updates: Partial<BucketItem>) => {
    if (!wall) return
    await updateDoc(itemDoc(wall.id, id), updates as Record<string, unknown>)
  }, [wall])

  const commitItem = useCallback(async (id: string) => {
    if (!wall) return
    await updateDoc(itemDoc(wall.id, id), { status: 'committed' })
  }, [wall])

  const completeItem = useCallback(async (id: string, realImageUrl?: string) => {
    if (!wall) return
    const updates: Partial<BucketItem> = { status: 'done' }
    if (realImageUrl) updates.real_image_url = realImageUrl
    await updateDoc(itemDoc(wall.id, id), updates as Record<string, unknown>)
  }, [wall])

  const deleteItem = useCallback(async (id: string) => {
    if (!wall) return
    await deleteDoc(itemDoc(wall.id, id))
  }, [wall])

  const toggleHeart = useCallback(async (itemId: string) => {
    if (!user || !wall) return
    const existing = reactions[itemId]?.find(r => r.user_id === user.id && r.heart)
    if (existing) {
      await updateDoc(reactionDoc(wall.id, existing.id), { heart: false })
    } else {
      const myReaction = reactions[itemId]?.find(r => r.user_id === user.id)
      if (myReaction) {
        await updateDoc(reactionDoc(wall.id, myReaction.id), { heart: true })
      } else {
        const newR: Reaction = { id: uuidv4(), item_id: itemId, user_id: user.id, heart: true, rating: null }
        await setDoc(reactionDoc(wall.id, newR.id), newR)
      }
    }
  }, [user, wall, reactions])

  const setRating = useCallback(async (itemId: string, rating: number) => {
    if (!user || !wall) return
    const myReaction = reactions[itemId]?.find(r => r.user_id === user.id)
    if (myReaction) {
      await updateDoc(reactionDoc(wall.id, myReaction.id), { rating })
    } else {
      const newR: Reaction = { id: uuidv4(), item_id: itemId, user_id: user.id, heart: false, rating }
      await setDoc(reactionDoc(wall.id, newR.id), newR)
    }
  }, [user, wall, reactions])

  const updateRegion = useCallback(async (id: string, updates: Partial<Region>) => {
    if (!wall) return
    await updateDoc(regionDoc(wall.id, id), updates as Record<string, unknown>)
  }, [wall])

  const addRegion = useCallback(async (name: string) => {
    if (!wall) return
    const maxOrder = regions.length > 0 ? Math.max(...regions.map(r => r.order)) : -1
    const newRegion: Region = { id: uuidv4(), wall_id: wall.id, name, order: maxOrder + 1, unlock_date: null }
    await setDoc(regionDoc(wall.id, newRegion.id), newRegion)
  }, [wall, regions])

  const reorderRegions = useCallback(async (newRegions: Region[]) => {
    if (!wall) return
    const batch = writeBatch(db)
    newRegions.forEach((r, i) => batch.update(regionDoc(wall.id, r.id), { order: i }))
    await batch.commit()
  }, [wall])

  const uploadImage = useCallback(async (file: File): Promise<string> => {
    if (!wall) return URL.createObjectURL(file)
    const ext = file.name.split('.').pop()
    const path = `${wall.id}/${uuidv4()}.${ext}`
    const storageRef = ref(storage, path)
    await uploadBytes(storageRef, file)
    return getDownloadURL(storageRef)
  }, [wall])

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
