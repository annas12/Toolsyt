import type { AppSettings, Snapshot, YouTubeVideo } from '../types'

const SETTINGS_KEY = 'mtr_settings_v1'
const SNAPSHOTS_KEY = 'mtr_snapshots_v1'
const VIDEO_CACHE_KEY = 'mtr_video_cache_v1'

const defaultSettings: AppSettings = {
  apiKey: '',
  rpmLow: 0.25,
  rpmHigh: 2,
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaultSettings
    return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    return defaultSettings
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function clearApiKey() {
  const settings = loadSettings()
  saveSettings({ ...settings, apiKey: '' })
}

export function loadSnapshots(): Snapshot[] {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOTS_KEY) || '[]')
  } catch {
    return []
  }
}

export function saveVideoSnapshots(videos: YouTubeVideo[]) {
  const now = Date.now()
  const current = loadSnapshots()
  const incoming: Snapshot[] = videos.map((v) => ({
    videoId: v.id,
    at: now,
    views: Number(v.statistics?.viewCount || 0),
    likes: Number(v.statistics?.likeCount || 0),
    comments: Number(v.statistics?.commentCount || 0),
  }))

  const combined = [...current, ...incoming]
    .sort((a, b) => b.at - a.at)
    .slice(0, 2500)

  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(combined))
}

export function getSnapshotNear(videoId: string, hoursAgo: number): Snapshot | null {
  const target = Date.now() - hoursAgo * 3600_000
  const candidates = loadSnapshots().filter((s) => s.videoId === videoId && s.at <= Date.now() - 5 * 60_000)
  if (!candidates.length) return null
  const best = candidates.reduce((best, item) =>
    Math.abs(item.at - target) < Math.abs(best.at - target) ? item : best
  )
  const snapshotAgeHours = (Date.now() - best.at) / 3600_000
  const minAge = Math.max(0.08, hoursAgo * 0.5)
  const maxAge = hoursAgo * 1.5
  return snapshotAgeHours >= minAge && snapshotAgeHours <= maxAge ? best : null
}

export function cacheVideos(videos: YouTubeVideo[]) {
  try {
    const current = JSON.parse(sessionStorage.getItem(VIDEO_CACHE_KEY) || '{}') as Record<string, YouTubeVideo>
    for (const video of videos) current[video.id] = video
    sessionStorage.setItem(VIDEO_CACHE_KEY, JSON.stringify(current))
  } catch {
    // Ignore storage quota failures; detail page can refetch.
  }
}

export function getCachedVideo(id: string): YouTubeVideo | null {
  try {
    const current = JSON.parse(sessionStorage.getItem(VIDEO_CACHE_KEY) || '{}') as Record<string, YouTubeVideo>
    return current[id] || null
  } catch {
    return null
  }
}
