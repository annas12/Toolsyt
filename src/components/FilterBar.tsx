import { useState } from 'react'

export type Filters = {
  keyword: string
  format: string
  ranking: string
  age: string
  minViews: string
  minVph: string
}

type Props = {
  filters: Filters
  onChange: (next: Filters) => void
  onRefresh: () => void
  loading: boolean
  hasData: boolean
}

export function FilterBar({ filters, onChange, onRefresh, loading, hasData }: Props) {
  const [showMore, setShowMore] = useState(false)
  const set = (key: keyof Filters, value: string) => onChange({ ...filters, [key]: value })

  return (
    <div className="filter-panel">
      <div style={{ marginBottom: 16 }}>
        <Field label="Keyword Judul">
          <input
            className="text-input"
            type="text"
            value={filters.keyword}
            onChange={(e) => set('keyword', e.target.value)}
            placeholder="Contoh: dangdut koplo, asam lambung, AI news"
            onKeyDown={(e) => { if (e.key === 'Enter') onRefresh() }}
          />
        </Field>
        <div className="help-text">
          Tool mencari semua jenis video YouTube. Hanya video yang judulnya benar-benar mengandung keyword ini yang ditampilkan.
        </div>
      </div>

      <div className="filter-grid primary-filters">
        <Field label="Format">
          <select value={filters.format} onChange={(e) => set('format', e.target.value)}>
            <option value="all">Semua Format</option>
            <option value="video">Video (&gt; 3 menit)</option>
            <option value="shorts">Shorts (≤ 3 menit)</option>
          </select>
        </Field>

        <Field label="Video Age">
          <select value={filters.age} onChange={(e) => set('age', e.target.value)}>
            <option value="all">Semua Umur</option>
            <option value="24">&lt; 24 Jam</option>
            <option value="72">&lt; 3 Hari</option>
            <option value="168">&lt; 7 Hari</option>
            <option value="336">&lt; 14 Hari</option>
            <option value="720">&lt; 30 Hari</option>
            <option value="2160">&lt; 90 Hari</option>
            <option value="8760">&lt; 1 Tahun</option>
          </select>
        </Field>

        <Field label="Ranking">
          <select value={filters.ranking} onChange={(e) => set('ranking', e.target.value)}>
            <option value="views">Most Viewed</option>
            <option value="newest">Newest</option>
            <option value="vph">Highest Views / Hour</option>
            <option value="engagement">Highest Engagement</option>
            <option value="rising">Rising Score</option>
          </select>
        </Field>
      </div>

      {showMore && (
        <div className="filter-grid more-filters">
          <Field label="Minimum Views">
            <select value={filters.minViews} onChange={(e) => set('minViews', e.target.value)}>
              <option value="0">Semua</option>
              <option value="1000">1K+</option>
              <option value="10000">10K+</option>
              <option value="100000">100K+</option>
              <option value="500000">500K+</option>
              <option value="1000000">1M+</option>
              <option value="10000000">10M+</option>
            </select>
          </Field>

          <Field label="Average Views / Hour">
            <select value={filters.minVph} onChange={(e) => set('minVph', e.target.value)}>
              <option value="0">Semua</option>
              <option value="100">100+</option>
              <option value="1000">1K+</option>
              <option value="5000">5K+</option>
              <option value="10000">10K+</option>
              <option value="50000">50K+</option>
            </select>
          </Field>
        </div>
      )}

      <div className="filter-actions">
        <button className="btn ghost" onClick={() => setShowMore(!showMore)}>
          {showMore ? '− Less Filters' : '+ More Filters'}
        </button>
        <button className="btn primary" onClick={onRefresh} disabled={loading}>
          {loading ? 'Menganalisis...' : hasData ? '↻ Riset Ulang' : '▶ Mulai Riset'}
        </button>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="filter-field"><span>{label}</span>{children}</label>
}
