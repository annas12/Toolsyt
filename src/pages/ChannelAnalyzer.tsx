import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { calculateMetrics, estimateRevenue, formatCompact, formatDateTime, formatUsd } from '../lib/metrics'
import { loadSettings } from '../lib/storage'
import { getChannel, getChannelVideos } from '../lib/youtube'
import type { YouTubeChannel, YouTubeVideo } from '../types'

export function ChannelAnalyzer({ onNeedApiKey }: { onNeedApiKey: () => void }) {
  const { id = '' } = useParams()
  const [channel, setChannel] = useState<YouTubeChannel | null>(null)
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [error, setError] = useState('')
  useEffect(() => {
    const { apiKey } = loadSettings()
    if (!apiKey) return onNeedApiKey()
    ;(async () => {
      try {
        const ch = await getChannel(apiKey, id)
        setChannel(ch)
        const uploads = ch?.contentDetails?.relatedPlaylists?.uploads
        if (uploads) setVideos(await getChannelVideos(apiKey, uploads, 50))
      } catch (e) { setError(e instanceof Error ? e.message : 'Gagal memuat channel.') }
    })()
  }, [id, onNeedApiKey])
  const s = loadSettings()
  const derived = useMemo(() => videos.map(v => ({ v, m: calculateMetrics(v, 24) })), [videos])
  if (error) return <main className="page-shell"><div className="status-box error">{error}</div></main>
  if (!channel) return <main className="page-shell"><div className="empty-state"><p>Loading channel...</p></div></main>
  const avatar = channel.snippet.thumbnails.high?.url || channel.snippet.thumbnails.default?.url
  const sub = channel.statistics?.hiddenSubscriberCount ? 'Hidden' : formatCompact(Number(channel.statistics?.subscriberCount || 0))
  return <main className="page-shell">
    <Link to="/" className="back-link">← Music Radar</Link>
    <section className="channel-hero"><img src={avatar} alt=""/><div><span className="eyebrow">CHANNEL ANALYZER</span><h1>{channel.snippet.title}</h1><p>{channel.snippet.customUrl || ''}</p><div className="channel-stats"><b>{sub} subscribers</b><span>{formatCompact(Number(channel.statistics?.videoCount || 0))} videos</span><span>{formatCompact(Number(channel.statistics?.viewCount || 0))} total views</span>{channel.snippet.country && <span>{channel.snippet.country}</span>}</div></div><a className="btn secondary" href={`https://www.youtube.com/channel/${channel.id}`} target="_blank" rel="noreferrer">Open YouTube</a></section>
    <div className="section-title"><div><span className="eyebrow">LATEST UPLOADS</span><h2>Video Channel</h2></div><span className="snapshot-note">Estimasi revenue memakai RPM ${s.rpmLow}–${s.rpmHigh}, bukan data revenue YouTube.</span></div>
    <div className="channel-video-grid">
      {derived.map(({ v, m }) => {
        const thumb = v.snippet.thumbnails.medium?.url || v.snippet.thumbnails.default?.url
        const rev = estimateRevenue(m.views, s.rpmLow, s.rpmHigh)
        return <article className="channel-video-card" key={v.id}><Link to={`/video/${v.id}`}><img src={thumb} alt=""/></Link><div className="channel-video-body"><Link to={`/video/${v.id}`} className="video-title">{v.snippet.title}</Link><div className="video-meta-line">{formatDateTime(v.snippet.publishedAt)}</div><div className="video-card-stats"><span><b>{formatCompact(m.views)}</b> views</span><span><b>{formatCompact(m.growthViewsPerHour ?? m.averageViewsPerHour)}</b> views/h</span></div><div className="revenue-box"><span>Estimated Revenue</span><b>{formatUsd(rev.low)} – {formatUsd(rev.high)}</b></div><div className="chips"><span>{m.genre.genre}</span><span>{m.genre.subgenre}</span></div></div></article>
      })}
    </div>
  </main>
}
