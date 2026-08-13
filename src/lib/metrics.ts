import type { VideoMetrics, YouTubeVideo } from '../types'
import { classifyGenre } from './genres'
import { getSnapshotNear } from './storage'

export function toNumber(value?: string) {
  return Number(value || 0)
}

export function calculateMetrics(video: YouTubeVideo, periodHours = 24): VideoMetrics {
  const views = toNumber(video.statistics?.viewCount)
  const likes = toNumber(video.statistics?.likeCount)
  const comments = toNumber(video.statistics?.commentCount)
  const ageHours = Math.max(1, (Date.now() - new Date(video.snippet.publishedAt).getTime()) / 3600_000)
  const averageViewsPerHour = views / ageHours
  const engagementRate = views > 0 ? ((likes + comments) / views) * 100 : 0

  const old = getSnapshotNear(video.id, periodHours)
  let growthViews: number | null = null
  let growthPercent: number | null = null
  let growthViewsPerHour: number | null = null

  if (old && old.views <= views) {
    const elapsedHours = Math.max(0.08, (Date.now() - old.at) / 3600_000)
    growthViews = views - old.views
    growthPercent = old.views > 0 ? (growthViews / old.views) * 100 : null
    growthViewsPerHour = growthViews / elapsedHours
  }

  const velocity = growthViewsPerHour ?? averageViewsPerHour
  const velocityScore = Math.min(55, Math.log10(Math.max(1, velocity)) * 11)
  const freshnessScore = Math.max(0, 25 - Math.log2(Math.max(1, ageHours / 6)) * 3)
  const engagementScore = Math.min(20, engagementRate * 4)
  const risingScore = Math.round(Math.max(0, Math.min(100, velocityScore + freshnessScore + engagementScore)))

  return {
    views,
    likes,
    comments,
    engagementRate,
    ageHours,
    averageViewsPerHour,
    growthViews,
    growthPercent,
    growthViewsPerHour,
    risingScore,
    genre: classifyGenre(video),
  }
}

export function formatCompact(n: number) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

export function formatAge(hours: number) {
  if (hours < 24) return `${Math.floor(hours)} jam`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} hari`
  const months = Math.floor(days / 30)
  return `${months} bulan`
}

export function estimateRevenue(views: number, rpmLow: number, rpmHigh: number) {
  return {
    low: (views / 1000) * rpmLow,
    high: (views / 1000) * rpmHigh,
  }
}

export function formatUsd(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)
}
