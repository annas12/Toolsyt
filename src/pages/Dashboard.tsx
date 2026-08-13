import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FilterBar, type Filters } from '../components/FilterBar'
import { calculateMetrics, formatAge, formatCompact, formatDateTime, formatDuration, getVideoFormat } from '../lib/metrics'
import { cacheVideos, loadSettings, saveVideoSnapshots } from '../lib/storage'
import { getPopularMusicPool, getRegionalDiscoveryPool } from '../lib/youtube'
import type { YouTubeVideo } from '../types'

const MIN_RESULTS_TARGET = 20
const MAX_RESULTS_SHOWN = 50
const REGIONAL_CHART_PAGES = 10
const DISCOVERY_PAGES = 3
const KEYWORD_SEARCH_PAGES = 5

const MARKET_LANGUAGE: Record<string, string> = {
  ID: 'id', MY: 'ms', SG: 'en', PH: 'en', TH: 'th', VN: 'vi',
  JP: 'ja', KR: 'ko', IN: 'hi', US: 'en', GB: 'en', BR: 'pt',
  MX: 'es', AU: 'en', CA: 'en',
}

const initialFilters: Filters = {
  country: 'ID', keyword: '', genre: 'All Genres', subgenre: 'All Subgenres', format: 'all', period: '24', ranking: 'views',
  age: 'all', minViews: '0', minGrowth: '0', minVph: '0', marketMode: 'accurate',
}

function dedupeVideos(videos: YouTubeVideo[]) {
  return Array.from(new Map(videos.map((video) => [video.id, video])).values())
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
  if (!normalizedKeyword) return true
  return normalizeText(title).includes(normalizedKeyword)
}

export function Dashboard({ onNeedApiKey }: { onNeedApiKey: () => void }) {
  const [filters, setFilters] = useState(initialFilters)
  const [videos, setVideos] = useState<YouTubeVideo[]>([])
  const [chartVideoIds, setChartVideoIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasRun, setHasRun] = useState(false)

  const handleFilterChange = (next: Filters) => {
    if (
      next.country !== filters.country ||
      next.marketMode !== filters.marketMode ||
      next.keyword !== filters.keyword
    ) {
      setVideos([])
      setChartVideoIds([])
      setHasRun(false)
      setError('')
    }
    setFilters(next)
  }

  const qualifies = (video: YouTubeVideo) => {
    const metrics = calculateMetrics(video, Number(filters.period))
    if (!titleContainsKeyword(video.snippet.title, filters.keyword)) return false
    if (filters.genre !== 'All Genres' && metrics.genre.genre !== filters.genre) return false
    if (filters.subgenre !== 'All Subgenres' && metrics.genre.subgenre !== filters.subgenre) return false
    if (filters.format !== 'all' && getVideoFormat(video) !== filters.format) return false
    if (filters.age !== 'all' && metrics.ageHours > Number(filters.age)) return false
    if (metrics.views < Number(filters.minViews)) return false
    if (Number(filters.minGrowth) > 0 && metrics.growthPercent != null && metrics.growthPercent < Number(filters.minGrowth)) return false
    if ((metrics.growthViewsPerHour ?? metrics.averageViewsPerHour) < Number(filters.minVph)) return false
    return true
  }

  const refresh = async () => {
    const { apiKey } = loadSettings()
    if (!apiKey) return onNeedApiKey()
    setLoading(true)
    setError('')

    try {
      const keyword = filters.keyword.trim()

      // Keyword Judul memakai YouTube search untuk memperluas kandidat, lalu hasilnya
      // tetap difilter ketat di browser agar keyword benar-benar ada pada JUDUL.
      if (keyword) {
        const ageHours = filters.age === 'all' ? null : Number(filters.age)
        const publishedAfter = ageHours
          ? new Date(Date.now() - ageHours * 3600_000).toISOString()
          : undefined

        const keywordItems = await getRegionalDiscoveryPool(apiKey, {
          regionCode: filters.country,
          relevanceLanguage: MARKET_LANGUAGE[filters.country] || 'en',
          query: keyword,
          maxResults: 50,
          order: filters.ranking === 'newest' ? 'date' : 'viewCount',
          publishedAfter,
          videoDuration: filters.format === 'shorts' ? 'short' : 'any',
        }, KEYWORD_SEARCH_PAGES)

        const strictTitleMatches = dedupeVideos(keywordItems).filter((video) =>
          titleContainsKeyword(video.snippet.title, keyword),
        )

        cacheVideos(strictTitleMatches)
        setChartVideoIds([])
        setVideos(strictTitleMatches)
        saveVideoSnapshots(strictTitleMatches)
        setHasRun(true)
        return
      }

      const chartItems = await getPopularMusicPool(apiKey, filters.country, REGIONAL_CHART_PAGES)
      let merged = [...chartItems]

      if (filters.marketMode === 'expanded') {
        const chartMatches = chartItems.filter(qualifies).length
        if (chartMatches < MIN_RESULTS_TARGET) {
          const query = filters.subgenre !== 'All Subgenres'
            ? filters.subgenre
            : filters.genre !== 'All Genres'
              ? filters.genre
              : 'music'

          const ageHours = filters.age === 'all' ? null : Number(filters.age)
          const publishedAfter = ageHours
            ? new Date(Date.now() - ageHours * 3600_000).toISOString()
            : undefined

          const discoveryItems = await getRegionalDiscoveryPool(apiKey, {
            regionCode: filters.country,
            relevanceLanguage: MARKET_LANGUAGE[filters.country] || 'en',
            query,
            maxResults: 50,
            order: 'viewCount',
            publishedAfter,
            videoDuration: filters.format === 'shorts' ? 'short' : 'any',
          }, DISCOVERY_PAGES)

          merged = dedupeVideos([...chartItems, ...discoveryItems])
        }
      }

      cacheVideos(merged)
      setChartVideoIds(chartItems.map((video) => video.id))
      setVideos(merged)
      saveVideoSnapshots(merged)
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

    if (filters.keyword.trim()) mapped = mapped.filter((x) => titleContainsKeyword(x.video.snippet.title, filters.keyword))
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
  const displayedRows = rows.slice(0, MAX_RESULTS_SHOWN)
  const chartIdSet = useMemo(() => new Set(chartVideoIds), [chartVideoIds])
  const chartResultCount = displayedRows.filter(({ video }) => chartIdSet.has(video.id)).length
  const discoveryResultCount = displayedRows.length - chartResultCount
  const keywordActive = Boolean(filters.keyword.trim())

  const resetStrictFilters = () => {
    setFilters((current) => ({
      ...current,
      keyword: '',
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
          <p>Cari musik berdasarkan market, genre, umur video, atau keyword yang harus muncul langsung pada judul video.</p>
        </div>
        <div className="hero-badge">API: {loadSettings().apiKey ? 'Connected' : 'Not set'}</div>
      </section>

      <FilterBar filters={filters} onChange={handleFilterChange} onRefresh={refresh} loading={loading} hasData={hasRun} />

      {error && <div className="status-box error">{error}</div>}

      {keywordActive && hasRun && !loading && !error && (
        <div className="status-box success">
          Keyword Judul: “{filters.keyword.trim()}” • {videos.length} kandidat dengan judul yang cocok ditemukan. Hasil diurutkan sesuai Ranking yang dipilih.
        </div>
      )}

      {!keywordActive && hasRun && !loading && !error && (
        <div className="status-box success">
          Viewer Market {filters.country} • Mode {filters.marketMode === 'accurate' ? 'Akurat Market' : 'Diperluas'} • {videos.length} kandidat dianalisis.
        </div>
      )}

      {!keywordActive && filters.marketMode === 'accurate' && hasRun && !loading && !error && (
        <div className="status-box">
          Mode Akurat hanya memakai YouTube regional mostPopular chart. Hasil antarnegara berasal dari chart region yang dipilih, tetapi jumlah setelah filter genre/umur bisa kurang dari 20.
        </div>
      )}

      {keywordActive && hasRun && !loading && !error && (
        <div className="status-box">
          Keyword Judul memakai pencarian YouTube untuk mencari kandidat lebih luas, lalu tool melakukan pencocokan ketat pada judul. Viewer Market tetap dipakai sebagai sinyal relevansi pencarian, bukan bukti negara penonton yang eksak.
        </div>
      )}

      {!keywordActive && filters.marketMode === 'expanded' && hasRun && !loading && !error && discoveryResultCount > 0 && (
        <div className="status-box">
          {chartResultCount} hasil berasal dari Regional Chart dan {discoveryResultCount} hasil tambahan dari Regional Discovery. Discovery membantu mencapai lebih banyak hasil, tetapi bukan data negara penonton yang eksak.
        </div>
      )}

      {filters.format === 'shorts' && (
        <div className="status-box">Filter Shorts memakai durasi ≤ 3 menit sebagai estimasi karena YouTube Data API tidak menyediakan flag Shorts publik yang eksplisit.</div>
      )}

      {hasRun && videos.length > 0 && Number(filters.minGrowth) > 0 && !hasGrowthData && (
        <div className="status-box">
          Minimum Growth belum bisa dihitung pada snapshot pertama. Hasil sementara tetap ditampilkan berdasarkan data saat ini. Riset ulang setelah beberapa waktu agar Growth % mulai tersedia.
        </div>
      )}

      {!keywordActive && filters.marketMode === 'expanded' && hasRun && !loading && !error && rows.length > 0 && rows.length < MIN_RESULTS_TARGET && (
        <div className="status-box">
          Mode Diperluas sudah mencoba menambah discovery, tetapi hanya {rows.length} video yang memenuhi seluruh filter aktif. Longgarkan filter jika ingin minimal {MIN_RESULTS_TARGET} hasil.
        </div>
      )}

      {!hasRun && !loading && (
        <div className="empty-state">
          <div className="empty-icon">♫</div>
          <h3>Siap mulai riset</h3>
          <p>Isi Keyword Judul jika ingin pencarian spesifik seperti “dangdut koplo”, atau gunakan filter market/genre seperti biasa.</p>
          <button className="btn primary" onClick={refresh}>▶ Mulai Riset</button>
        </div>
      )}

      {hasRun && !loading && !error && videos.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⌕</div>
          <h3>{keywordActive ? 'Tidak ada judul yang cocok' : 'Tidak ada kandidat'}</h3>
          <p>{keywordActive ? `Tidak ditemukan video dengan judul yang mengandung “${filters.keyword.trim()}” untuk filter aktif.` : 'Coba viewer market lain atau ulangi beberapa saat lagi.'}</p>
        </div>
      )}

      {hasRun && !loading && !error && videos.length > 0 && rows.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">⌕</div>
          <h3>Data ditemukan, tetapi tidak lolos filter</h3>
          <p>{videos.length} kandidat ditemukan, tetapi tidak ada yang memenuhi seluruh filter aktif.</p>
          <button className="btn secondary" onClick={resetStrictFilters}>Reset Filter Ketat</button>
        </div>
      )}

      {!!displayedRows.length && (
        <div className="table-card">
          <div className="table-head">
            <div>
              <h2>Music Results</h2>
              <p>Menampilkan {displayedRows.length} dari {rows.length} hasil{keywordActive ? ` • judul mengandung “${filters.keyword.trim()}”` : ` • viewer market ${filters.country}`}</p>
            </div>
            <span className="snapshot-note">Default: view tertinggi. Growth makin akurat setelah beberapa snapshot.</span>
          </div>
          <div className="video-list">
            {displayedRows.map(({ video, metrics }, index) => {
              const thumb = video.snippet.thumbnails.medium?.url || video.snippet.thumbnails.default?.url
              const videoFormat = getVideoFormat(video)
              const isChart = chartIdSet.has(video.id)
              return (
                <article className="video-row" key={video.id}>
                  <div className="rank">#{index + 1}</div>
                  <Link className="thumb-wrap" to={`/video/${video.id}`}><img src={thumb} alt="" /></Link>
                  <div className="video-main">
                    <Link to={`/video/${video.id}`} className="video-title">{video.snippet.title}</Link>
                    <Link to={`/channel/${video.snippet.channelId}`} className="channel-link">{video.snippet.channelTitle}</Link>
                    <div className="chips">
                      <span>{keywordActive ? 'Title Match' : isChart ? 'Regional Chart' : 'Discovery Estimate'}</span>
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
