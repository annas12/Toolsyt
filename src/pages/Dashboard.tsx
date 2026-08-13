import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterBar, type Filters } from '../components/FilterBar'
import { calculateMetrics, formatAge, formatCompact, formatDateTime, formatDuration, getVideoFormat } from '../lib/metrics'
import { cacheVideos, loadSettings, saveVideoSnapshots } from '../lib/storage'
import { getPopularMusic, searchMusic } from '../lib/youtube'
import type { YouTubeVideo } from '../types'

const initialFilters: Filters = {
  country: 'ID', genre: 'All Genres', subgenre: 'All Subgenres', format: 'all', period: '24', ranking: 'views',
  age: 'all', minViews: '0', minGrowth: '0', minVph: '0',
}

export function Dashboard({ onNeedApiKey }: { onNeedApiKey: () => void }) {
  const [filters, setFilters] = useState(initialFilters)
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasRun, setHasRun] = useState(false)

  const refresh = async () => {
    const { apiKey } = loadSettings()
    if (!apiKey) return onNeedApiKey()
    setLoading(true)
    setError('')

    try {
      let items: YouTubeVideo[] = []
      const needsSearch =
        filters.genre !== 'All Genres' ||
        filters.format === 'shorts' ||
        filters.age !== 'all' ||
        filters.ranking === 'views'

      if (!needsSearch) {
        items = await getPopularMusic(apiKey, filters.country, 50)
      } else {
        const query = filters.subgenre !== 'All Subgenres'
          ? filters.subgenre
          : filters.genre !== 'All Genres'
            ? filters.genre
            : 'music'
        const ageHours = filters.age === 'all' ? null : Number(filters.age)
        const publishedAfter = ageHours
          ? new Date(Date.now() - ageHours * 3600_000).toISOString()
          : undefined

        const order = filters.ranking === 'views'
          ? 'viewCount'
          : filters.ranking === 'engagement'
            ? 'relevance'
            : 'date'

        items = await searchMusic(apiKey, {
          regionCode: filters.country,
          query,
          maxResults: 50,
          order,
          publishedAfter,
          videoDuration: filters.format === 'shorts' ? 'short' : 'any',
        })
      }

      cacheVideos(items)
      setVideos(items)
      saveVideoSnapshots(items)
      setHasRun(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengambil data YouTube.')
      setHasRun(true)
    } finally {
      setLoading(false)
    }
  }

  const analysis = useMemo(() => {
    const periodHours = Number(filters.period)
    const allMapped = videos.map((video) => ({ video, metrics: calculateMetrics(video, periodHours) }))
    const hasGrowthData = allMapped.some((x) => x.metrics.growthPercent != null)
    let mapped = [...allMapped]

    if (filters.genre !== 'All Genres') mapped = mapped.filter((x) => x.metrics.genre.genre === filters.genre)
    if (filters.subgenre !== 'All Subgenres') mapped = mapped.filter((x) => x.metrics.genre.subgenre === filters.subgenre)
    if (filters.format !== 'all') mapped = mapped.filter((x) => getVideoFormat(x.video) === filters.format)
    if (filters.age !== 'all') mapped = mapped.filter((x) => x.metrics.ageHours <= Number(filters.age))
    mapped = mapped.filter((x) => x.metrics.views >= Number(filters.minViews))

    if (Number(filters.minGrowth) > 0 && hasGrowthData) {
      mapped = mapped.filter((x) => (x.metrics.growthPercent ?? -1) >= Number(filters.minGrowth))
    }

    mapped = mapped.filter((x) => (x.metrics.growthViewsPerHour ?? x.metrics.averageViewsPerHour) >= Number(filters.minVph))

    mapped.sort((a, b) => {
      if (filters.ranking === 'views') return b.metrics.views - a.metrics.views
      if (filters.ranking === 'growth') return (b.metrics.growthViewsPerHour ?? b.metrics.averageViewsPerHour) - (a.metrics.growthViewsPerHour ?? a.metrics.averageViewsPerHour)
      if (filters.ranking === 'engagement') return b.metrics.engagementRate - a.metrics.engagementRate
      if (filters.ranking === 'newest') return +new Date(b.video.snippet.publishedAt) - +new Date(a.video.snippet.publishedAt)
      return b.metrics.risingScore - a.metrics.risingScore
    })

    return { rows: mapped, hasGrowthData }
  }, [videos, filters])

  const { rows, hasGrowthData } = analysis

  const resetStrictFilters = () => {
    setFilters((current) => ({
      ...current,
      genre: 'All Genres',
      subgenre: 'All Subgenres',
      format: 'all',
      age: 'all',
      minViews: '0',
      minGrowth: '0',
      minVph: '0',
      ranking: 'views',
    }))
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <span className="eyebrow">YOUTUBE MUSIC RESEARCH</span>
          <h1>Music Trend Radar</h1>
          <p>Temukan musik yang sedang bergerak di berbagai market dengan API YouTube milik Anda sendiri.</p>
        </div>
        <div className="hero-badge">API: {loadSettings().apiKey ? 'Connected' : 'Not set'}</div>
      </section>

      <FilterBar filters={filters} onChange={setFilters} onRefresh={refresh} loading={loading} hasData={hasRun} />

      {error && <div className="status-box error">{error}</div>}

      {filters.format === 'shorts' && (
        <div className="status-box">Filter Shorts memakai durasi ≤ 3 menit sebagai estimasi karena YouTube Data API tidak menyediakan flag Shorts publik yang eksplisit.</div>
      )}

      {hasRun && videos.length > 0 && Number(filters.minGrowth) > 0 && !hasGrowthData && (
        <div className="status-box">
          Minimum Growth belum bisa dihitung pada snapshot pertama. Hasil sementara tetap ditampilkan berdasarkan data saat ini. Riset ulang setelah beberapa waktu agar Growth % mulai tersedia.
        </div>
      )}

      {!hasRun && !loading && (
        <div className="empty-state">
          <div className="empty-icon">♫</div>
          <h3>Siap mulai riset</h3>
          <p>Pilih filter di atas lalu klik Mulai Riset untuk mengambil data YouTube.</p>
          <button className="btn primary" onClick={refresh}>▶ Mulai Riset</button>
        </div>
      )}

      {hasRun && !loading && !error && videos.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⌕</div>
          <h3>YouTube tidak menemukan kandidat</h3>
          <p>Coba longgarkan Video Age, pilih format atau subgenre lain, atau gunakan All Genres.</p>
          <button className="btn secondary" onClick={resetStrictFilters}>Reset Filter Ketat</button>
        </div>
      )}

      {hasRun && !loading && !error && videos.length > 0 && rows.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⌕</div>
          <h3>Data ditemukan, tetapi tidak lolos filter</h3>
          <p>YouTube mengembalikan {videos.length} kandidat. Tidak ada yang memenuhi seluruh filter yang aktif saat ini.</p>
          <button className="btn secondary" onClick={resetStrictFilters}>Reset Filter Ketat</button>
        </div>
      )}

      {!!rows.length && (
        <div className="table-card">
          <div className="table-head">
            <div>
              <h2>Music Results</h2>
              <p>{rows.length} hasil dari {videos.length} kandidat YouTube • market {filters.country}</p>
            </div>
            <span className="snapshot-note">Growth akan makin akurat setelah beberapa snapshot.</span>
          </div>
          <div className="video-list">
            {rows.map(({ video, metrics }, index) => {
              const thumb = video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url
              const videoFormat = getVideoFormat(video)
              return (
                <article className="video-row" key={video.id}>
                  <div className="rank">#{index + 1}</div>
                  <Link className="thumb-wrap" to={`/video/${video.id}`}><img src={thumb} alt="" /></Link>
                  <div className="video-main">
                    <Link to={`/video/${video.id}`} className="video-title">{video.snippet.title}</Link>
                    <Link to={`/channel/${video.snippet.channelId}`} className="channel-link">{video.snippet.channelTitle}</Link>
                    <div className="chips">
                      <span>{videoFormat === 'shorts' ? 'Shorts ≤3m' : 'Video'}</span>
                      <span>{formatDuration(video.contentDetails?.duration)}</span>
                      <span>{metrics.genre.genre}</span>
                      <span>{metrics.genre.subgenre}</span>
                      <span>{formatAge(metrics.ageHours)}</span>
                    </div>
                    <div className="published">Published {formatDateTime(video.snippet.publishedAt)}</div>
                  </div>
                  <div className="metric"><b>{formatCompact(metrics.views)}</b><span>Views</span></div>
                  <div className="metric"><b>{metrics.growthViews == null ? '—' : `+${formatCompact(metrics.growthViews)}`}</b><span>Growth</span></div>
                  <div className="metric"><b>{formatCompact(metrics.growthViewsPerHour ?? metrics.averageViewsPerHour)}</b><span>Views/hour</span></div>
                  <div className="score"><b>{metrics.risingScore}</b><span>Rising</span></div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </main>
  )
}
