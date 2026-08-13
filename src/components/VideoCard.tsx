import { Link } from 'react-router-dom'
import type { YouTubeVideo } from '../types'
import { calculateMetrics, formatAge, formatCompact, formatDateTime } from '../lib/metrics'

type Props = {
  video: YouTubeVideo
  periodHours: number
  rank?: number
}

export function VideoCard({ video, periodHours, rank }: Props) {
  const m = calculateMetrics(video, periodHours)
  const thumb = video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.high?.url || video.snippet.thumbnails?.default?.url
  const velocity = m.growthViewsPerHour ?? m.averageViewsPerHour
  const velocityLabel = m.growthViewsPerHour != null ? 'Tracked views/h' : 'Avg views/h'

  return (
    <article className="video-card">
      <Link className="thumb-wrap" to={`/video/${video.id}`}>
        {rank && <span className="rank-badge">#{rank}</span>}
        <img src={thumb} alt="" loading="lazy" />
        <span className="score-badge">🔥 {m.risingScore}</span>
      </Link>
      <div className="video-card-body">
        <Link className="video-title" to={`/video/${video.id}`}>{video.snippet.title}</Link>
        <Link className="channel-name" to={`/channel/${video.snippet.channelId}`}>{video.snippet.channelTitle}</Link>

        <div className="chips">
          <span>{m.genre.genre}</span><span>{m.genre.subgenre}</span>
        </div>

        <div className="mini-data">
          <div><small>Published</small><strong>{formatDateTime(video.snippet.publishedAt)}</strong></div>
          <div><small>Views</small><strong>{formatCompact(m.views)}</strong></div>
          <div><small>{velocityLabel}</small><strong>{formatCompact(velocity)}</strong></div>
          <div><small>Age</small><strong>{formatAge(m.ageHours)}</strong></div>
        </div>

        <div className="card-actions">
          <Link className="btn secondary small" to={`/video/${video.id}`}>Detail</Link>
          <Link className="btn primary small" to={`/channel/${video.snippet.channelId}`}>Analisa Channel</Link>
        </div>
      </div>
    </article>
  )
}
