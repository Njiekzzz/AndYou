import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '../context/AppContext'
import { BucketItem } from '../types'
import { getRotationFromSeed } from '../lib/rotation'
import { Avatar } from './Avatar'

type SortBy = 'priority' | 'region' | 'date'
type FilterBy = 'all' | 'mine' | 'proposed' | 'committed' | 'done'

interface ListViewProps {
  onItemClick: (item: BucketItem) => void
}

export function ListView({ onItemClick }: ListViewProps) {
  const { items, regions, user, getUserById, getItemReactions } = useApp()
  const [sortBy, setSortBy] = useState<SortBy>('date')
  const [filterBy, setFilterBy] = useState<FilterBy>('all')

  const filtered = items.filter(item => {
    if (filterBy === 'mine') return item.created_by === user?.id
    if (filterBy === 'proposed') return item.status === 'proposed'
    if (filterBy === 'committed') return item.status === 'committed'
    if (filterBy === 'done') return item.status === 'done'
    return true
  })

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') {
      const rA = getItemReactions(a.id).find(r => r.user_id === user?.id)?.rating ?? 0
      const rB = getItemReactions(b.id).find(r => r.user_id === user?.id)?.rating ?? 0
      return rB - rA
    }
    if (sortBy === 'region') {
      const regionOrder = (id: string) => regions.find(r => r.id === id)?.order ?? 99
      return regionOrder(a.region_id) - regionOrder(b.region_id)
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  return (
    <div
      style={{
        position: 'fixed',
        top: 52,
        left: 0,
        right: 0,
        bottom: 64,
        overflowY: 'auto',
        background: 'var(--bg)',
      }}
    >
      {/* Sort/Filter bar */}
      <div
        style={{
          padding: '12px 16px 8px',
          background: 'var(--bg)',
          borderBottom: '1px solid var(--border)',
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        <div className="flex items-center gap-2 mb-2" style={{ overflowX: 'auto' }}>
          {(['all', 'mine', 'proposed', 'committed', 'done'] as FilterBy[]).map(f => (
            <button
              key={f}
              onClick={() => setFilterBy(f)}
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                fontSize: 11,
                whiteSpace: 'nowrap',
                border: `1px solid ${filterBy === f ? '#e0a04a' : 'var(--border)'}`,
                background: filterBy === f ? '#e0a04a' : 'transparent',
                color: filterBy === f ? '#2a2620' : 'var(--text-secondary)',
                transition: 'all 0.15s',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>sort:</span>
          {(['date', 'priority', 'region'] as SortBy[]).map(s => (
            <button
              key={s}
              onClick={() => setSortBy(s)}
              style={{
                fontSize: 11,
                color: sortBy === s ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: sortBy === s ? 600 : 400,
                letterSpacing: '0.04em',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '8px 0' }}>
        {sorted.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 16px', color: 'var(--text-muted)', fontSize: 13 }}>
            nothing here yet
          </div>
        ) : (
          sorted.map((item, i) => {
            const region = regions.find(r => r.id === item.region_id)
            const creator = getUserById(item.created_by)
            const myRating = getItemReactions(item.id).find(r => r.user_id === user?.id)?.rating ?? 0
            const rotation = getRotationFromSeed(item.rotation_seed)

            return (
              <motion.button
                key={item.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => onItemClick(item)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 16px',
                  background: 'transparent',
                  textAlign: 'left',
                  borderBottom: '1px solid var(--border)',
                  opacity: item.status === 'proposed' ? 0.55 : 1,
                }}
              >
                {/* Mini polaroid */}
                <div
                  style={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    background: 'var(--bg-card)',
                    borderRadius: 2,
                    overflow: 'hidden',
                    transform: `rotate(${rotation}deg)`,
                    border: '3px solid var(--bg-card)',
                    outline: '1px solid var(--border)',
                  }}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: 'var(--border)' }} />
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.title}
                  </div>
                  <div className="flex items-center gap-2">
                    {region && (
                      <span style={{
                        fontSize: 9,
                        background: 'var(--tape-bg)',
                        color: 'var(--tape-text)',
                        padding: '1px 5px',
                        borderRadius: 2,
                        textTransform: 'uppercase',
                        letterSpacing: '0.08em',
                      }}>
                        {region.name}
                      </span>
                    )}
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 9,
                      padding: '2px 7px',
                      borderRadius: 999,
                      textTransform: 'capitalize',
                      letterSpacing: '0.04em',
                      fontWeight: 500,
                      background: item.status === 'proposed' ? '#d8e6e4' : item.status === 'committed' ? '#f5d99a' : 'rgba(224,160,74,0.2)',
                      color: item.status === 'proposed' ? '#2d5f5d' : '#b87a2a',
                    }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block', flexShrink: 0 }} />
                      {item.status}
                    </span>
                  </div>
                </div>

                {/* Right side */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {myRating > 0 && (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }, (_, i) => (
                        <div
                          key={i}
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: '50%',
                            background: i < Math.round(myRating / 2) ? 'var(--text-secondary)' : 'var(--border)',
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {creator && (
                    <Avatar name={creator.name} color={creator.avatar_color} size={20} />
                  )}
                </div>
              </motion.button>
            )
          })
        )}
      </div>
    </div>
  )
}
