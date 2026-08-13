import type { YouTubeChannel, YouTubeVideo } from '../types'

const BASE = 'https://www.googleapis.com/youtube/v3'

async function youtubeFetch<T>(path: string, params: Record<string, string | number>, apiKey: string): Promise<T> {
  const url = new URL(`${BASE}/${path}`)
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, String(value)))
  url.searchParams.set('key', apiKey)

  const response = await fetch(url.toString())
  const data = await response.json()
  if (!response.ok) {
    const message = data?.error?.message || `YouTube API error ${response.status}`
    throw new Error(message)
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

type SearchVideoOptions = {
  query: string
  maxResults?: number
  order?: 'date' | 'rating' | 'relevance' | 'title' | 'viewCount'
  publishedAfter?: string
  videoDuration?: 'any' | 'short' | 'medium' | 'long'
  pageToken?: string
}

/**
 * Pencarian global semua kategori video YouTube.
 * Tidak memakai videoCategoryId sehingga hasil tidak lagi dibatasi ke kategori Music.
 */
export async function searchVideos(apiKey: string, options: SearchVideoOptions) {
  const params: Record<string, string | number> = {
    part: 'snippet',
    q: options.query,
    type: 'video',
    maxResults: Math.min(50, options.maxResults || 50),
    order: options.order || 'relevance',
  }

  if (options.publishedAfter) params.publishedAfter = options.publishedAfter
  if (options.videoDuration && options.videoDuration !== 'any') params.videoDuration = options.videoDuration
  if (options.pageToken) params.pageToken = options.pageToken

  const data = await youtubeFetch<{
    items: Array<{ id?: { videoId?: string } }>
    nextPageToken?: string
  }>('search', params, apiKey)

  const ids = (data.items || [])
    .map((item) => item.id?.videoId)
    .filter(Boolean) as string[]

  return {
    videos: await getVideosByIds(apiKey, ids),
    nextPageToken: data.nextPageToken || '',
  }
}

export async function getDiscoveryPool(
  apiKey: string,
  options: Omit<SearchVideoOptions, 'pageToken'>,
  maxPages = 3,
) {
  const collected: YouTubeVideo[] = []
  let pageToken = ''

  for (let page = 0; page < Math.max(1, maxPages); page += 1) {
    const result = await searchVideos(apiKey, { ...options, pageToken })
    collected.push(...result.videos)
    pageToken = result.nextPageToken
    if (!pageToken || result.videos.length === 0) break
  }

  return Array.from(new Map(collected.map((video) => [video.id, video])).values())
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

export async function getChannelVideos(apiKey: string, uploadsPlaylistId: string, maxResults = 50) {
  const { videos } = await getChannelVideosPage(apiKey, uploadsPlaylistId, '', maxResults)
  return videos
}
