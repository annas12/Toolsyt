import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { calculateMetrics, formatAge, formatCompact, formatDateTime } from '../lib/metrics'
import { getCachedVideo, loadSettings } from '../lib/storage'
import { getVideo } from '../lib/youtube'
import type { YouTubeVideo } from '../types'

export function VideoDetail({ onNeedApiKey }: { onNeedApiKey: () => void }) {
  const { id = '' } = useParams()
  const [video, setVideo] = useState<YouTubeVideo | null>(() => getCachedVideo(id))
  const [error, setError] = useState('')
  useEffect(() => {
    if (video || !id) return
    const { apiKey } = loadSettings()
    if (!apiKey) return onNeedApiKey()
    getVideo(apiKey, id).then(setVideo).catch((e) => setError(e.message))
  }, [id, video, onNeedApiKey])
  if (error) return <main className="page-shell"><div className="status-box error">{error}</div></main>
  if (!video) return <main className="page-shell"><div className="empty-state"><p>Loading video...</p></div></main>
  const m = calculateMetrics(video, 24)
  const thumb = video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium?.url
  return <main className="page-shell">
    <Link to="/" className="back-link">← Back to Music Radar</Link>
    <div className="detail-card">
      <img className="detail-thumb" src={thumb} alt="" />
      <div className="detail-copy"><span className="eyebrow">VIDEO DETAIL</span><h1>{video.snippet.title}</h1><Link to={`/channel/${video.snippet.channelId}`} className="channel-link large">{video.snippet.channelTitle}</Link><div className="chips"><span>{m.genre.genre}</span><span>{m.genre.subgenre}</span></div><p className="published">Published {formatDateTime(video.snippet.publishedAt)} • {formatAge(m.ageHours)} ago</p>
        <div className="detail-actions"><a className="btn secondary" href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noreferrer">▶ Watch on YouTube</a><Link className="btn primary" to={`/channel/${video.snippet.channelId}`}>📊 Analisa Channel</Link></div>
      </div>
    </div>
    <div className="stat-grid">
      <Stat value={formatCompact(m.views)} label="Total Views"/><Stat value={m.growthViews == null ? '—' : `+${formatCompact(m.growthViews)}`} label="Growth 24h"/><Stat value={formatCompact(m.growthViewsPerHour ?? m.averageViewsPerHour)} label="Views / Hour"/><Stat value={`${m.engagementRate.toFixed(2)}%`} label="Engagement"/><Stat value={formatCompact(m.likes)} label="Likes"/><Stat value={formatCompact(m.comments)} label="Comments"/><Stat value={`${m.risingScore}/100`} label="Rising Score"/>
    </div>
  </main>
}
function Stat({ value, label }: { value: string; label: string }) { return <div className="stat-card"><b>{value}</b><span>{label}</span></div> }
