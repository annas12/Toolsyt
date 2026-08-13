import { useState } from 'react'
import { GENRES } from '../lib/genres'

export type Filters = {
  country: string
  genre: string
  subgenre: string
  format: string
  period: string
  ranking: string
  age: string
  minViews: string
  minGrowth: string
  minVph: string
}

type Props = {
  filters: Filters
  onChange: (next: Filters) => void
  onRefresh: () => void
  loading: boolean
  hasData: boolean
}

const countries = [
  ['ID', '🇮🇩 Indonesia'], ['MY', '🇲🇾 Malaysia'], ['SG', '🇸🇬 Singapore'], ['PH', '🇵🇭 Philippines'],
  ['TH', '🇹🇭 Thailand'], ['VN', '🇻🇳 Vietnam'], ['JP', '🇯🇵 Japan'], ['KR', '🇰🇷 South Korea'],
  ['IN', '🇮🇳 India'], ['US', '🇺🇸 United States'], ['GB', '🇬🇧 United Kingdom'], ['BR', '🇧🇷 Brazil'],
  ['MX', '🇲🇽 Mexico'], ['AU', '🇦🇺 Australia'], ['CA', '🇨🇦 Canada'],
]

export function FilterBar({ filters, onChange, onRefresh, loading, hasData }: Props) {
  const [showMore, setShowMore] = useState(false)
  const set = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value })
  const subs = GENRES[filters.genre] || []

  return (
    <div className="filter-panel">
      <div className="filter-grid primary-filters">
        <Field label="Country">
          <select value={filters.country} onChange={(e) => set('country', e.target.value)}>
            {countries.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
          </select>
        </Field>
        <Field label="Genre">
          <select value={filters.genre} onChange={(e) => onChange({ ...filters, genre: e.target.value, subgenre: 'All Subgenres' })}>
            {Object.keys(GENRES).map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Subgenre">
          <select value={filters.subgenre} onChange={(e) => set('subgenre', e.target.value)} disabled={filters.genre === 'All Genres'}>
            <option>All Subgenres</option>
            {subs.map((g) => <option key={g}>{g}</option>)}
          </select>
        </Field>
        <Field label="Format">
          <select value={filters.format} onChange={(e) => set('format', e.target.value)}>
            <option value="all">Semua Format</option>
            <option value="video">Video (&gt; 3 menit)</option>
            <option value="shorts">Shorts (≤ 3 menit)</option>
          </select>
        </Field>
        <Field label="Period">
          <select value={filters.period} onChange={(e) => set('period', e.target.value)}>
            <option value="6">6 Hours</option><option value="12">12 Hours</option><option value="24">24 Hours</option>
            <option value="72">3 Days</option><option value="168">7 Days</option><option value="336">14 Days</option><option value="720">30 Days</option>
          </select>
        </Field>
        <Field label="Ranking">
          <select value={filters.ranking} onChange={(e) => set('ranking', e.target.value)}>
            <option value="views">Most Viewed</option>
            <option value="rising">Rising Now</option>
            <option value="growth">Fastest Growth</option>
            <option value="engagement">Highest Engagement</option>
            <option value="newest">Newest</option>
          </select>
        </Field>
      </div>

      {showMore && (
        <div className="filter-grid more-filters">
          <Field label="Video Age">
            <select value={filters.age} onChange={(e) => set('age', e.target.value)}>
              <option value="all">All</option><option value="24">&lt; 24 Hours</option><option value="72">&lt; 3 Days</option>
              <option value="168">&lt; 7 Days</option><option value="336">&lt; 14 Days</option><option value="720">&lt; 30 Days</option>
            </select>
          </Field>
          <Field label="Minimum Views">
            <select value={filters.minViews} onChange={(e) => set('minViews', e.target.value)}>
              <option value="0">All</option><option value="10000">10K+</option><option value="100000">100K+</option><option value="500000">500K+</option>
              <option value="1000000">1M+</option><option value="10000000">10M+</option>
            </select>
          </Field>
          <Field label="Minimum Growth">
            <select value={filters.minGrowth} onChange={(e) => set('minGrowth', e.target.value)}>
              <option value="0">All</option><option value="10">10%+</option><option value="25">25%+</option><option value="50">50%+</option>
              <option value="100">100%+</option><option value="200">200%+</option>
            </select>
          </Field>
          <Field label="Views / Hour">
            <select value={filters.minVph} onChange={(e) => set('minVph', e.target.value)}>
              <option value="0">All</option><option value="100">100+</option><option value="1000">1K+</option><option value="5000">5K+</option>
              <option value="10000">10K+</option><option value="50000">50K+</option>
            </select>
          </Field>
        </div>
      )}

      <div className="filter-actions">
        <button className="btn ghost" onClick={() => setShowMore(!showMore)}>{showMore ? '− Less Filters' : '+ More Filters'}</button>
        <button className="btn primary" onClick={onRefresh} disabled={loading}>{loading ? 'Menganalisis...' : hasData ? '↻ Riset Ulang' : '▶ Mulai Riset'}</button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="filter-field"><span>{label}</span>{children}</label>
}
