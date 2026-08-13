import type { YouTubeChannel, YouTubeVideo } from '../types'

const BASE = 'https://www.googleapis.com/youtube/v3'

async function youtubeFetch<T>(path: string, params: Record<string, string | number>, apiKey: string): Promise<T> {
  const url = new URL(`${BASE}/${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)))
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString())
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const reason = data?.error?.errors?.[0]?.reason
    const message = data?.error?.message || `YouTube API error ${response.status}`
    const hint = reason === 'forbidden' || reason === 'accessNotConfigured'
      ? ' Pastikan YouTube Data API v3 aktif dan domain ini diizinkan pada pembatasan HTTP referrer API key.'
      : reason === 'quotaExceeded'
        ? ' Kuota harian YouTube API key sudah habis.'
        : ''
    throw new Error(`${message}${hint}`)
  }
  return data as T
}

export async function testApiKey(apiKey: string) {
  await youtubeFetch<{ items: unknown[] }>('videos', {
    part: 'id',
    id: 'dQw4w9WgXcQ',
  }, apiKey)
  return true
}

export async function getPopularMusic(apiKey: string, regionCode = 'ID', maxResults = 50, periodHours = 24) {
  const data = await youtubeFetch<{ items: YouTubeVideo[] }>('videos', {
    part: 'snippet,statistics,contentDetails',
    chart: 'mostPopular',
    regionCode,
    videoCategoryId: '10',
    maxResults,
  }, apiKey)
  if (data.items?.length) return data.items

  // Some regions do not publish a Music `mostPopular` chart. Fall back to a
  // recent-video search so a valid API key still produces research results.
  const publishedAfter = new Date(Date.now() - periodHours * 3600_000).toISOString()
  const search = await youtubeFetch<{
    items: Array<{ id?: { videoId?: string } }>
  }>('search', {
    part: 'id',
    type: 'video',
    videoCategoryId: '10',
    regionCode,
    order: 'viewCount',
    publishedAfter,
    maxResults,
  }, apiKey)
  const ids = (search.items || []).map((item) => item.id?.videoId).filter(Boolean) as string[]
  return getVideosByIds(apiKey, ids)
}

export async function getVideosByIds(apiKey: string, ids: string[]) {
  if (!ids.length) return []
  const data = await youtubeFetch<{ items: YouTubeVideo[] }>('videos', {
    part: 'snippet,statistics,contentDetails',
    id: ids.slice(0, 50).join(','),
    maxResults: 50,
  }, apiKey)
  return data.items || []
}

export async function getVideo(apiKey: string, id: string) {
  const items = await getVideosByIds(apiKey, [id])
  return items[0] || null
}

export async function getChannel(apiKey: string, channelId: string) {
  const data = await youtubeFetch<{ items: YouTubeChannel[] }>('channels', {
    part: 'snippet,statistics,contentDetails',
    id: channelId,
  }, apiKey)
  return data.items?.[0] || null
}

export async function getChannelVideosPage(apiKey: string, uploadsPlaylistId: string, pageToken = '', maxResults = 50) {
  const params: Record<string, string | number> = {
    part: 'contentDetails',
    playlistId: uploadsPlaylistId,
    maxResults,
  }
  if (pageToken) params.pageToken = pageToken

  const playlist = await youtubeFetch<{
    items: Array<{ contentDetails?: { videoId?: string } }>
    nextPageToken?: string
  }>('playlistItems', params, apiKey)

  const ids = (playlist.items || []).map((x) => x.contentDetails?.videoId).filter(Boolean) as string[]
  const videos = await getVideosByIds(apiKey, ids)
  return { videos, nextPageToken: playlist.nextPageToken || '' }
}
