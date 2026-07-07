import { useSyncExternalStore, useCallback } from 'react'

const STORAGE_KEY = 'favorite-tools'

let listeners: Array<() => void> = []

function emitChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribe(listener: () => void) {
  listeners = [...listeners, listener]
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) emitChange()
  }
  window.addEventListener('storage', handleStorage)
  return () => {
    listeners = listeners.filter((l) => l !== listener)
    window.removeEventListener('storage', handleStorage)
  }
}

let cachedRaw: string | null = null
let cachedSnapshot: string[] = []

function getSnapshot(): string[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      cachedSnapshot = raw ? JSON.parse(raw) : []
    } catch {
      cachedSnapshot = []
    }
  }
  return cachedSnapshot
}

const SERVER_SNAPSHOT: string[] = []
function getServerSnapshot(): string[] {
  return SERVER_SNAPSHOT
}

function setFavorites(next: string[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  emitChange()
}

export function useFavorites() {
  const favorites = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)

  const isFavorite = useCallback(
    (toolId: string) => favorites.includes(toolId),
    [favorites],
  )

  const toggleFavorite = useCallback((toolId: string) => {
    const current = getSnapshot()
    const next = current.includes(toolId)
      ? current.filter((id) => id !== toolId)
      : [toolId, ...current]
    setFavorites(next)
  }, [])

  return { favorites, isFavorite, toggleFavorite }
}
