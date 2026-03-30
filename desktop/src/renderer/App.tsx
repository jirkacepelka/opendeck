import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { ProfileEditor } from './pages/ProfileEditor'
import { PackBrowser } from './pages/PackBrowser'
import { SettingsPage } from './pages/SettingsPage'
import { useStore } from './store/useStore'

export type Page = 'editor' | 'packs' | 'settings'

export function App() {
  const [page, setPage] = useState<Page>('editor')
  const { loadInitialData } = useStore()

  useEffect(() => {
    loadInitialData()
  }, [])

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', background: '#0a0a0a' }}>
      <Sidebar activePage={page} onNavigate={setPage} />
      <main style={{ flex: 1, overflow: 'hidden' }}>
        {page === 'editor' && <ProfileEditor />}
        {page === 'packs' && <PackBrowser />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
