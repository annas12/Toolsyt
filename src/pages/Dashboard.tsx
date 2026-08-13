import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterBar, type Filters } from '../components/FilterBar'
import { calculateMetrics, formatAge, formatCompact, formatDateTime, formatDuration, getVideoFormat } from '../lib/metrics'
import { cacheVideos, loadSettings } from '../lib/storage'
import { getDiscoveryPool } from '../lib/youtube'
import type { YouTubeVideo } from '../types'

const MIN_RESULTS_TARGET = 20
const MAX_RESULTS_SHOWN = 50
const KEYWORD_SEARCH_PAGES = 5

const initialFilters: Filters = {
  keyword: '',
  format: 'all',
  ranking: 'views',
  age: 'all',
  minViews: '0',
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
      setError('Isi Keyword Judul terlebih dahulu. Contoh: dangdut koplo, asam lambung, AI news.')
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
      setHasRun(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Gagal mengambil data YouTube.')
      setHasRun(true)
    } finally {
      setLoading(false)
    }
  }

  const rows = useMemo(() => {
    let mapped = videos.map((video) => ({
      video,
      metrics: calculateMetrics(video, 24),
    }))

    mapped = mapped.filter((x) => titleContainsKeyword(x.video.snippet.title, filters.keyword))

    if (filters.format !== 'all') {
      mapped = mapped.filter((x) => getVideoFormat(x.video) === filters.format)
    }

    if (filters.age !== 'all') {
      mapped = mapped.filter((x) => x.metrics.ageHours <= Number(filters.age))
    }

    mapped = mapped.filter((x) => x.metrics.views >= Number(filters.minViews))
    mapped = mapped.filter((x) => x.metrics.averageViewsPerHour >= Number(filters.minVph))

    mapped.sort((a, b) => {
      if (filters.ranking === 'views') return b.metrics.views - a.metrics.views
      if (filters.ranking === 'vph') return b.metrics.averageViewsPerHour - a.metrics.averageViewsPerHour
      if (filters.ranking === 'engagement') return b.metrics.engagementRate - a.metrics.engagementRate
      if (filters.ranking === 'newest') {
        return +new Date(b.video.snippet.publishedAt) - +new Date(a.video.snippet.publishedAt)
      }
      return b.metrics.risingScore - a.metrics.risingScore
    })

    return mapped
  }, [videos, filters])

  const displayedRows = rows.slice(0, MAX_RESULTS_SHOWN)
  const keywordActive = Boolean(filters.keyword.trim())

  const resetStrictFilters = () => {
    setFilters((current) => ({
      ...current,
      format: 'all',
      age: 'all',
      minViews: '0',
      minVph: '0',
      ranking: 'views',
    }))
  }

  return (
    <main className="page-shell">
      <section className="hero">
        <div>
          <span className="eyebrow">YOUTUBE VIDEO RESEARCH</span>
          <h1>Video Trend Radar</h1>
          <p>Cari semua jenis video YouTube berdasarkan keyword yang benar-benar muncul pada judul, lalu analisis views, kecepatan view, engagement, dan umur video.</p>
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
          Pencarian global semua kategori YouTube • Keyword Judul “{filters.keyword.trim()}” • {videos.length} kandidat judul cocok ditemukan.
        </div>
      )}

      {filters.format === 'shorts' && (
        <div className="status-box">Filter Shorts memakai durasi ≤ 3 menit sebagai estimasi.</div>
      )}

      {hasRun && !loading && !error && rows.length > 0 && rows.length < MIN_RESULTS_TARGET && (
        <div className="status-box">
          Ditemukan {rows.length} video yang benar-benar memenuhi keyword dan seluruh filter. Tool tidak memasukkan judul yang tidak cocok hanya untuk memaksa jumlah menjadi {MIN_RESULTS_TARGET}.
        </div>
      )}

      {!hasRun && !loading && !error && (
        <div className="empty-state">
          <div className="empty-icon">⌕</div>
          <h3>Cari video berdasarkan judul</h3>
          <p>Masukkan keyword seperti “dangdut koplo”, “asam lambung”, “AI news”, “resep ayam”, atau topik lainnya.</p>
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
              <h2>Video Results</h2>
              <p>Menampilkan {displayedRows.length} dari {rows.length} hasil • judul mengandung “{filters.keyword.trim()}”</p>
            </div>
            <span className="snapshot-note">Default: view tertinggi.</span>
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
                  <div className="metric"><b>{formatCompact(metrics.averageViewsPerHour)}</b><span>Avg views/hour</span></div>
                  <div className="metric"><b>{metrics.engagementRate.toFixed(1)}%</b><span>Engagement</span></div>
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
