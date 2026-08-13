import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterBar, type Filters } from '../components/FilterBar'
import { calculateMetrics, formatAge, formatCompact, formatDateTime, formatDuration, getVideoFormat } from '../lib/metrics'
import { cacheVideos, loadSettings, saveVideoSnapshots } from '../lib/storage'
import { getDiscoveryPool } from '../lib/youtube'
import type { YouTubeVideo } from '../types'

const MIN_RESULTS_TARGET = 20
const MAX_RESULTS_SHOWN = 50
const KEYWORD_SEARCH_PAGES = 5

const initialFilters: Filters = {
  keyword: '',
  format: 'all',
  period: '24',
  ranking: 'views',
  age: 'all',
  minViews: '0',
  minGrowth: '0',
  minVph: '0',
}

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleContainsKeyword(title: string, keyword: string) {
  const normalizedKeyword = normalizeText(keyword)
  if (!normalizedKeyword) return false
  return normalizeText(title).includes(normalizedKeyword)
}

export function Dashboard({ onNeedApiKey }: { onNeedApiKey: () => void }) {
  const [filters, setFilters] = useState(initialFilters)
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasRun, setHasRun] = useState(false)

  const handleFilterChange = (next: Filters) => {
    const requiresNewSearch =
      next.keyword !== filters.keyword ||
      next.format !== filters.format ||
      next.age !== filters.age

    if (requiresNewSearch) {
      setVideos([])
      setHasRun(false)
      setError('')
    }

    setFilters(next)
  }

  const refresh = async () => {
    const { apiKey } = loadSettings()
    if (!apiKey) return onNeedApiKey()

    const keyword = filters.keyword.trim()
    if (!keyword) {
      setError('Isi Keyword Judul terlebih dahulu. Contoh: dangdut koplo.')
      setVideos([])
      setHasRun(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const ageHours = filters.age === 'all' ? null : Number(filters.age)
      const publishedAfter = ageHours
        ? new Date(Date.now() - ageHours * 3600_000).toISOString()
        : undefined

      const candidates = await getDiscoveryPool(apiKey, {
        query: keyword,
        maxResults: 50,
        order: filters.ranking === 'newest' ? 'date' : 'viewCount',
        publishedAfter,
        videoDuration: filters.format === 'shorts' ? 'short' : 'any',
      }, KEYWORD_SEARCH_PAGES)

      const strictTitleMatches = candidates.filter((video) =>
        titleContainsKeyword(video.snippet.title, keyword),
      )

      cacheVideos(strictTitleMatches)
      setVideos(strictTitleMatches)
      saveVideoSnapshots(strictTitleMatches)
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
    const allMapped = videos.map((video) => ({
      video,
      metrics: calculateMetrics(video, periodHours),
    }))

    const hasGrowthData = allMapped.some((x) => x.metrics.growthPercent != null)
    let mapped = [...allMapped]

    mapped = mapped.filter((x) => titleContainsKeyword(x.video.snippet.title, filters.keyword))

    if (filters.format !== 'all') {
      mapped = mapped.filter((x) => getVideoFormat(x.video) === filters.format)
    }

    if (filters.age !== 'all') {
      mapped = mapped.filter((x) => x.metrics.ageHours <= Number(filters.age))
    }

    mapped = mapped.filter((x) => x.metrics.views >= Number(filters.minViews))

    if (Number(filters.minGrowth) > 0 && hasGrowthData) {
      mapped = mapped.filter((x) => (x.metrics.growthPercent ?? -1) >= Number(filters.minGrowth))
    }

    mapped = mapped.filter((x) =>
      (x.metrics.growthViewsPerHour ?? x.metrics.averageViewsPerHour) >= Number(filters.minVph),
    )

    mapped.sort((a, b) => {
      if (filters.ranking === 'views') return b.metrics.views - a.metrics.views
      if (filters.ranking === 'growth') {
        return (b.metrics.growthViewsPerHour ?? b.metrics.averageViewsPerHour)
          - (a.metrics.growthViewsPerHour ?? a.metrics.averageViewsPerHour)
      }
      if (filters.ranking === 'engagement') return b.metrics.engagementRate - a.metrics.engagementRate
      if (filters.ranking === 'newest') {
        return +new Date(b.video.snippet.publishedAt) - +new Date(a.video.snippet.publishedAt)
      }
      return b.metrics.risingScore - a.metrics.risingScore
    })

    return { rows: mapped, hasGrowthData }
  }, [videos, filters])

  const { rows, hasGrowthData } = analysis
  const displayedRows = rows.slice(0, MAX_RESULTS_SHOWN)
  const keywordActive = Boolean(filters.keyword.trim())

  const resetStrictFilters = () => {
    setFilters((current) => ({
      ...current,
      format: 'all',
      age: 'all',
      minViews: '0',
      minGrowth: '0',
      minVph: '0',
      period: '24',
      ranking: 'views',
    }))
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <span className="eyebrow">YOUTUBE MUSIC RESEARCH</span>
          <h1>Music Trend Radar</h1>
          <p>Cari video musik berdasarkan keyword yang benar-benar muncul pada judul, lalu urutkan berdasarkan views, umur video, growth, dan metrik lainnya.</p>
        </div>
        <div className="hero-badge">API: {loadSettings().apiKey ? 'Connected' : 'Not set'}</div>
      </section>

      <FilterBar
        filters={filters}
        onChange={handleFilterChange}
        onRefresh={refresh}
        loading={loading}
        hasData={hasRun}
      />

      {error && <div className="status-box error">{error}</div>}

      {hasRun && !loading && !error && keywordActive && (
        <div className="status-box success">
          Pencarian global YouTube • Keyword Judul “{filters.keyword.trim()}” • {videos.length} kandidat judul cocok ditemukan.
        </div>
      )}

      {filters.format === 'shorts' && (
        <div className="status-box">Filter Shorts memakai durasi ≤ 3 menit sebagai estimasi.</div>
      )}

      {hasRun && videos.length > 0 && Number(filters.minGrowth) > 0 && !hasGrowthData && (
        <div className="status-box">
          Minimum Growth belum bisa dihitung pada snapshot pertama. Hasil sementara tetap ditampilkan; lakukan riset ulang setelah beberapa waktu agar Growth mulai tersedia.
        </div>
      )}

      {hasRun && !loading && !error && rows.length > 0 && rows.length < MIN_RESULTS_TARGET && (
        <div className="status-box">
          Ditemukan {rows.length} video yang benar-benar memenuhi keyword dan seluruh filter. Sistem tidak menambahkan video yang judulnya tidak cocok hanya untuk memaksa jumlah menjadi {MIN_RESULTS_TARGET}.
        </div>
      )}

      {!hasRun && !loading && !error && (
        <div className="empty-state">
          <div className="empty-icon">⌕</div>
          <h3>Cari berdasarkan judul</h3>
          <p>Isi Keyword Judul, misalnya “dangdut koplo”, kemudian pilih umur video dan ranking lalu klik Mulai Riset.</p>
          <button className="btn primary" onClick={refresh}>▶ Mulai Riset</button>
        </div>
      )}

      {hasRun && !loading && !error && videos.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⌕</div>
          <h3>Tidak ada judul yang cocok</h3>
          <p>Tidak ditemukan video dengan judul yang mengandung “{filters.keyword.trim()}” pada rentang yang dipilih.</p>
        </div>
      )}

      {hasRun && !loading && !error && videos.length > 0 && rows.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⌕</div>
          <h3>Judul ditemukan, tetapi tidak lolos filter</h3>
          <p>{videos.length} kandidat judul cocok ditemukan, tetapi tidak ada yang memenuhi seluruh filter tambahan.</p>
          <button className="btn secondary" onClick={resetStrictFilters}>Reset Filter Tambahan</button>
        </div>
      )}

      {!!displayedRows.length && (
        <div className="table-card">
          <div className="table-head">
            <div>
              <h2>Music Results</h2>
              <p>Menampilkan {displayedRows.length} dari {rows.length} hasil • judul mengandung “{filters.keyword.trim()}”</p>
            </div>
            <span className="snapshot-note">Default: view tertinggi. Growth makin akurat setelah beberapa snapshot.</span>
          </div>

          <div className="video-list">
            {displayedRows.map(({ video, metrics }, index) => {
              const thumb = video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url
              const videoFormat = getVideoFormat(video)

              return (
                <article className="video-row" key={video.id}>
                  <div className="rank">#{index + 1}</div>

                  <Link className="thumb-wrap" to={`/video/${video.id}`}>
                    <img src={thumb} alt="" />
                  </Link>

                  <div className="video-main">
                    <Link to={`/video/${video.id}`} className="video-title">
                      {video.snippet.title}
                    </Link>
                    <Link to={`/channel/${video.snippet.channelId}`} className="channel-link">
                      {video.snippet.channelTitle}
                    </Link>

                    <div className="chips">
                      <span>Title Match</span>
                      <span>{videoFormat === 'shorts' ? 'Shorts ≤3m' : 'Video'}</span>
                      <span>{formatDuration(video.contentDetails?.duration)}</span>
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
