/**
 * UpdateBanner — zobrazí se automaticky když je k dispozici aktualizace
 */

import { useState, useEffect } from 'react'

interface UpdateStatus {
  status: 'checking' | 'available' | 'up-to-date' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  error?: string
}

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateStatus | null>(null)

  useEffect(() => {
    if (!window.opendeck?.updater) return
    const unsub = window.opendeck.updater.onStatus((data) => {
      // Nezobrazuj "checking" a "up-to-date" jako banner
      if (data.status === 'up-to-date') return
      setUpdate(data)
    })
    return unsub
  }, [])

  if (!update || update.status === 'checking') return null

  const handleDownload = () => window.opendeck.updater.download()
  const handleInstall = () => window.opendeck.updater.install()
  const handleDismiss = () => setUpdate(null)

  const bg =
    update.status === 'error' ? '#f8717122' :
    update.status === 'downloaded' ? '#4ade8022' :
    '#4f9eff22'

  const border =
    update.status === 'error' ? '#f8717144' :
    update.status === 'downloaded' ? '#4ade8044' :
    '#4f9eff44'

  return (
    <div style={{
      position: 'fixed', bottom: 16, right: 16, zIndex: 1000,
      background: bg,
      border: `1px solid ${border}`,
      borderRadius: 12,
      padding: '12px 16px',
      maxWidth: 340,
      backdropFilter: 'blur(8px)',
      boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
    }}>
      {update.status === 'available' && (
        <div>
          <div style={s.title}>🆕 Aktualizace dostupná</div>
          <div style={s.desc}>Verze {update.version} je připravena ke stažení.</div>
          <div style={s.actions}>
            <button onClick={handleDownload} style={s.btnPrimary}>Stáhnout</button>
            <button onClick={handleDismiss} style={s.btnGhost}>Později</button>
          </div>
        </div>
      )}

      {update.status === 'downloading' && (
        <div>
          <div style={s.title}>⬇ Stahuji aktualizaci…</div>
          <div style={{ height: 4, background: '#ffffff22', borderRadius: 2, marginTop: 8 }}>
            <div style={{ height: '100%', width: `${update.percent ?? 0}%`, background: '#4f9eff', borderRadius: 2, transition: 'width 300ms' }} />
          </div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{update.percent ?? 0}%</div>
        </div>
      )}

      {update.status === 'downloaded' && (
        <div>
          <div style={s.title}>✅ Aktualizace stažena</div>
          <div style={s.desc}>Verze {update.version} je připravena. Nainstaluje se po restartu.</div>
          <div style={s.actions}>
            <button onClick={handleInstall} style={s.btnPrimary}>Restartovat a nainstalovat</button>
            <button onClick={handleDismiss} style={s.btnGhost}>Při zavření</button>
          </div>
        </div>
      )}

      {update.status === 'error' && (
        <div>
          <div style={s.title}>⚠ Chyba aktualizace</div>
          <div style={{ ...s.desc, color: '#f87171' }}>{update.error}</div>
          <div style={s.actions}>
            <button onClick={handleDismiss} style={s.btnGhost}>Zavřít</button>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, any> = {
  title: { fontSize: 13, fontWeight: 700, color: '#e8e8e8', marginBottom: 4 },
  desc: { fontSize: 12, color: '#aaa', lineHeight: 1.5 },
  actions: { display: 'flex', gap: 8, marginTop: 10 },
  btnPrimary: { background: '#4f9eff', border: 'none', borderRadius: 7, padding: '6px 14px', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' },
  btnGhost: { background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 7, padding: '6px 12px', color: '#888', fontSize: 12, cursor: 'pointer' },
}
