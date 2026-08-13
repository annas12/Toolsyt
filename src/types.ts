export type YouTubeVideo = {
  id: string
  snippet: {
    publishedAt: string
    channelId: string
    title: string
    description: string
    thumbnails: Record<string, { url: string; width?: number; height?: number }>
    channelTitle: string
    tags?: string[]
    categoryId?: string
    defaultLanguage?: string
    defaultAudioLanguage?: string
  }
  statistics?: {
    viewCount?: string
    likeCount?: string
    commentCount?: string
  }
  contentDetails?: {
    duration?: string
  }
}

export type YouTubeChannel = {
  id: string
  snippet: {
    title: string
    description: string
    customUrl?: string
    publishedAt: string
    thumbnails: Record<string, { url: string }>
    country?: string
  }
  statistics?: {
    viewCount?: string
    subscriberCount?: string
    hiddenSubscriberCount?: boolean
    videoCount?: string
  }
  contentDetails?: {
    relatedPlaylists?: {
      uploads?: string
    }
  }
}

export type GenreResult = {
  genre: string
  subgenre: string
  confidence: number
}

export type VideoMetrics = {
  views: number
  likes: number
  comments: number
  engagementRate: number
  ageHours: number
  averageViewsPerHour: number
  growthViews: number | null
  growthPercent: number | null
  growthViewsPerHour: number | null
  risingScore: number
  genre: GenreResult
}

export type Snapshot = {
  videoId: string
  at: number
  views: number
  likes: number
  comments: number
}

export type AppSettings = {
  apiKey: string
  rpmLow: number
  rpmHigh: number
}
