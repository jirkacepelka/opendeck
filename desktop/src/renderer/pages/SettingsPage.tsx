import { useState, useEffect } from 'react'
import { useStore } from '../store/useStore'

type UpdateStatus = 'idle' | 'checking' | 'available' | 'up-to-date' | 'downloading' | 'downloaded' | 'error'

export function SettingsPage() {
  const { config, saveConfig, connectedClients } = useStore()
  const [port, setPort] = useState(String(config.port ?? 9001))
  const [startMinimized, setStartMinimized] = useState(config.startMinimized ?? false)
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle')
  const [updateVersion, setUpdateVersion] = useState('')
  const [debugInfo, setDebugInfo] = useState<any>(null)

  useEffect(() => {
    if (!window.opendeck?.updater) return
    const unsub = window.opendeck.updater.onStatus((data: any) => {
      setUpdateStatus(data.status)
      if (data.version) setUpdateVersion(data.version)
    })
    return unsub
  }, [])

  useEffect(() => {
    setPort(String(config.port ?? 9001))
    setStartMinimized(config.startMinimized ?? false)
  }, [config])

  const handleSave = async () => {
    await saveConfig({ port: parseInt(port) || 9001, startMinimized })
    alert('Uloženo. Restart agenta je potřeba pro změnu portu.')
  }

  return (
    <div style={{ padding: 32, maxWidth: 520 }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: '#e8e8e8', marginBottom: 24 }}>Nastavení</h1>

      {/* Status */}
      <div style={s.card}>
        <div style={s.sectionLabel}>Stav připojení</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: connectedClients > 0 ? '#4ade80' : '#555' }} />
          <span style={{ color: '#ccc', fontSize: 14 }}>
            {connectedClients > 0
              ? `${connectedClients} připojený klient${connectedClients > 1 ? 'ů' : ''}`
              : 'Žádný Android klient'}
          </span>
        </div>
      </div>

      {/* WebSocket port */}
      <div style={s.card}>
        <div style={s.sectionLabel}>WebSocket server</div>
        <div style={s.row}>
          <label style={s.label}>Port</label>
          <input
            value={port}
            onChange={e => setPort(e.target.value)}
            style={s.input}
            placeholder="9001"
          />
        </div>
        <div style={{ padding: '4px 16px 12px', fontSize: 11, color: '#555' }}>
          Android appka se připojuje na <code style={{ color: '#4f9eff' }}>ws://[IP-adresa-PC]:{port}</code>
        </div>
      </div>

      {/* Startup */}
      <div style={s.card}>
        <div style={s.sectionLabel}>Spouštění</div>
        <div style={s.row}>
          <label style={s.label}>Spustit minimalizovaně do tray</label>
          <input
            type="checkbox"
            checked={startMinimized}
            onChange={e => setStartMinimized(e.target.checked)}
            style={{ width: 16, height: 16, cursor: 'pointer' }}
          />
        </div>
      </div>

      {/* User packs dir */}
      <div style={s.card}>
        <div style={s.sectionLabel}>Vlastní packs</div>
        <div style={{ padding: '12px 16px', fontSize: 12, color: '#888', lineHeight: 1.6 }}>
          Vlastní button packs nainstaluj do:
          <br />
          <code style={{ color: '#4f9eff', fontSize: 11 }}>{config.userPacksDir ?? '~/.opendeck/packs/'}</code>
          <br /><br />
          Každý pack je složka s <code style={{ color: '#aaa' }}>pack.json</code> + <code style={{ color: '#aaa' }}>index.js</code>.
          Po přidání restartuj aplikaci.
        </div>
      </div>

      <button onClick={handleSave} style={s.btnPrimary}>Uložit nastavení</button>

      {/* Aktualizace */}
      <div style={s.sectionLabel}>Aktualizace</div>
      <div style={s.card}>
        <div style={s.row}>
          <div style={{ flex: 1 }}>
            <div style={s.label}>Verze aplikace</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
              {updateStatus === 'up-to-date' && '✅ Máš nejnovější verzi'}
              {updateStatus === 'available' && `🆕 Dostupná verze ${updateVersion}`}
              {updateStatus === 'downloading' && '⬇ Stahuji aktualizaci…'}
              {updateStatus === 'downloaded' && `✅ Verze ${updateVersion} stažena — čeká na restart`}
              {updateStatus === 'checking' && '🔍 Kontroluji…'}
              {updateStatus === 'error' && '⚠ Nepodařilo se zkontrolovat'}
              {updateStatus === 'idle' && 'OpenDeck v0.2.0'}
            </div>
          </div>
          <button
            onClick={() => window.opendeck?.updater?.check()}
            disabled={updateStatus === 'checking'}
            style={{ ...s.btnSecondary, opacity: updateStatus === 'checking' ? 0.5 : 1 }}
          >
            {updateStatus === 'checking' ? '🔍' : 'Zkontrolovat'}
          </button>
          {updateStatus === 'downloaded' && (
            <button onClick={() => window.opendeck?.updater?.install()} style={s.btnPrimary}>
              Restartovat
            </button>
          )}
        </div>
      </div>

      {/* Debug */}
      <div style={s.sectionLabel}>Debug</div>
      <div style={s.card}>
        <div style={s.row}>
          <label style={s.label}>Info o cestách a packs</label>
          <button
            onClick={async () => setDebugInfo(await (window.opendeck as any).debug.getPaths())}
            style={s.btnSecondary}
          >Zobrazit</button>
        </div>
        {debugInfo && (
          <pre style={{ fontSize: 10, color: '#888', padding: '8px 16px', overflowX: 'auto' as const, whiteSpace: 'pre-wrap' as const, wordBreak: 'break-all' as const, borderTop: '1px solid #1e1e1e' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        )}
      </div>

      {/* About */}
      <div style={{ marginTop: 16, fontSize: 11, color: '#444', lineHeight: 1.8 }}>
        <div>OpenDeck v0.2.4</div>
        <div>Licence: GPL-3.0</div>
        <div>github.com/jirkacepelka/opendeck</div>
      </div>
    </div>
  )
}

const s: Record<string, any> = {
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 12, marginBottom: 16, overflow: 'hidden' },
  sectionLabel: { fontSize: 10, fontWeight: 700, color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '12px 16px 6px' },
  row: { display: 'flex', alignItems: 'center', padding: '10px 16px', gap: 12 },
  label: { flex: 1, fontSize: 14, color: '#ccc' },
  input: { width: 120, background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '6px 10px', color: '#e8e8e8', fontSize: 13, textAlign: 'right' as const, outline: 'none' },
  btnPrimary: { background: '#4f9eff', border: 'none', borderRadius: 10, padding: '11px 28px', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' },
  btnSecondary: { background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 8, padding: '7px 14px', color: '#aaa', fontSize: 12, cursor: 'pointer' },
}
