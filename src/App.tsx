import { useState } from 'react'
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'
import { ApiKeyModal } from './components/ApiKeyModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { loadSettings } from './lib/storage'
import { ChannelAnalyzer } from './pages/ChannelAnalyzer'
import { Dashboard } from './pages/Dashboard'
import { VideoDetail } from './pages/VideoDetail'

export default function App() {
  const [apiOpen, setApiOpen] = useState(!loadSettings().apiKey)
  const [, forceRefresh] = useState(0)

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <header className="topbar">
          <Link to="/" className="brand">
            <div className="brand-mark">M</div>
            <div><b>Music Trend Radar</b><span>YouTube Intelligence</span></div>
          </Link>
          <nav>
            <Link to="/">Music Radar</Link>
            <button className="api-button" onClick={() => setApiOpen(true)}>⚙ API Key</button>
          </nav>
        </header>

        <Routes>
          <Route path="/" element={<Dashboard onNeedApiKey={() => setApiOpen(true)} />} />
          <Route path="/video/:id" element={<VideoDetail onNeedApiKey={() => setApiOpen(true)} />} />
          <Route path="/channel/:id" element={<ChannelAnalyzer onNeedApiKey={() => setApiOpen(true)} />} />
        </Routes>

        <ApiKeyModal
          open={apiOpen}
          onClose={() => setApiOpen(false)}
          onSaved={() => forceRefresh(x => x + 1)}
        />
      </BrowserRouter>
    </ErrorBoundary>
  )
}
