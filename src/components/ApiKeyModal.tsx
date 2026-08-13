import { useEffect, useState } from 'react'
import { loadSettings, saveSettings } from '../lib/storage'
import { testApiKey } from '../lib/youtube'

type Props = {
  open: boolean
  onClose: () => void
  onSaved: () => void
}

export function ApiKeyModal({ open, onClose, onSaved }: Props) {
  const [apiKey, setApiKey] = useState('')
  const [rpmLow, setRpmLow] = useState(0.25)
  const [rpmHigh, setRpmHigh] = useState(2)
  const [status, setStatus] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (!open) return
    const s = loadSettings()
    setApiKey(s.apiKey)
    setRpmLow(s.rpmLow)
    setRpmHigh(s.rpmHigh)
    setStatus('')
  }, [open])

  if (!open) return null

  const handleTest = async () => {
    if (!apiKey.trim()) return setStatus('Masukkan API key terlebih dahulu.')
    setTesting(true)
    setStatus('Menguji API key...')
    try {
      await testApiKey(apiKey.trim())
      setStatus('✓ API key valid dan YouTube Data API dapat diakses.')
    } catch (error) {
      setStatus(`✕ ${error instanceof Error ? error.message : 'API key tidak valid.'}`)
    } finally {
      setTesting(false)
    }
  }

  const handleSave = () => {
    saveSettings({
      apiKey: apiKey.trim(),
      rpmLow: Math.max(0, Number(rpmLow) || 0),
      rpmHigh: Math.max(Number(rpmLow) || 0, Number(rpmHigh) || 0),
    })
    onSaved()
    onClose()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="modal-head">
          <div>
            <div className="eyebrow">SETTINGS</div>
            <h2>YouTube API Key</h2>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup">×</button>
        </div>

        <label className="field-label">API key</label>
        <input
          className="text-input"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="AIza..."
          autoComplete="off"
        />
        <p className="help-text">
          Disimpan hanya di localStorage browser ini. Aplikasi tidak menaruh API key ke repository.
        </p>

        <div className="rpm-grid">
          <div>
            <label className="field-label">RPM minimum (USD)</label>
            <input className="text-input" type="number" min="0" step="0.05" value={rpmLow} onChange={(e) => setRpmLow(Number(e.target.value))} />
          </div>
          <div>
            <label className="field-label">RPM maksimum (USD)</label>
            <input className="text-input" type="number" min="0" step="0.05" value={rpmHigh} onChange={(e) => setRpmHigh(Number(e.target.value))} />
          </div>
        </div>
        <p className="help-text">RPM dipakai hanya untuk estimasi pendapatan channel/video dan bisa Anda ubah sendiri.</p>

        {status && <div className={`status-box ${status.startsWith('✓') ? 'success' : status.startsWith('✕') ? 'error' : ''}`}>{status}</div>}

        <div className="modal-actions">
          <button className="btn secondary" onClick={handleTest} disabled={testing}>{testing ? 'Testing...' : 'Test API Key'}</button>
          <button className="btn primary" onClick={handleSave}>Simpan di Browser</button>
        </div>
      </div>
    </div>
  )
}
