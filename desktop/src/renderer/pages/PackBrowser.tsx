import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'

interface RemoteButtonDef {
  id: string
  label: string
  icon?: string
  logoUrl?: string
  color?: string
  defaultSize?: string
}

interface MarketplacePack {
  id: string
  name: string
  description: string
  author: string
  stars: number
  url: string
  version: string
  installedVersion: string | null
  updateAvailable: boolean
  buttons: RemoteButtonDef[]
}

type InstallState = 'idle' | 'installing' | 'done' | 'error'

export function PackBrowser() {
  const { packs } = useStore()
  const [tab, setTab] = useState<'installed' | 'marketplace'>('installed')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<MarketplacePack[]>([])
  const [loading, setLoading] = useState(false)
  const [installStates, setInstallStates] = useState<Record<string, InstallState>>({})
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const unsub = window.opendeck.marketplace.onProgress(({ packId, pct }) => {
      setProgress(p => ({ ...p, [packId]: pct }))
    })
    return unsub
  }, [])

  const doSearch = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await window.opendeck.marketplace.search(q)
      setResults(res)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (tab === 'marketplace' && results.length === 0) doSearch('')
  }, [tab])

  const handleInstall = async (pack: MarketplacePack) => {
    setInstallStates(s => ({ ...s, [pack.id]: 'installing' }))
    setProgress(p => ({ ...p, [pack.id]: 0 }))
    setErrors(e => { const n = { ...e }; delete n[pack.id]; return n })
    const result = await window.opendeck.marketplace.install(pack)
    if (result.ok) {
      setInstallStates(s => ({ ...s, [pack.id]: 'done' }))
      // Aktualizuj výsledky — verze je nyní nainstalovaná
      setResults(r => r.map(p => p.id === pack.id
        ? { ...p, installedVersion: pack.version, updateAvailable: false }
        : p
      ))
    } else {
      setInstallStates(s => ({ ...s, [pack.id]: 'error' }))
      setErrors(e => ({ ...e, [pack.id]: result.error ?? 'Neznámá chyba' }))
    }
  }

  const handleUninstall = async (packId: string, packName: string) => {
    await window.opendeck.marketplace.uninstall(packName)
    setResults(r => r.map(p => p.id === packId
      ? { ...p, installedVersion: null, updateAvailable: false }
      : p
    ))
    setInstallStates(s => { const n = { ...s }; delete n[packId]; return n })
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0a' }}>
      {/* Header + tabs */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #1e1e1e' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#e8e8e8', marginBottom: 16 }}>Button Packs</h1>
        <div style={{ display: 'flex' }}>
          {(['installed', 'marketplace'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 18px', background: 'none', border: 'none',
              borderBottom: tab === t ? '2px solid #4f9eff' : '2px solid transparent',
              color: tab === t ? '#4f9eff' : '#666',
              fontWeight: tab === t ? 600 : 400, fontSize: 13, cursor: 'pointer', marginBottom: -1,
            }}>
              {t === 'installed' ? `Nainstalované (${packs.length})` : '🔍 Marketplace'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Installed ── */}
      {tab === 'installed' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {packs.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
              <div style={{ color: '#666', fontSize: 14 }}>Žádné packs</div>
              <button onClick={() => setTab('marketplace')} style={{ ...s.btnPrimary, marginTop: 16 }}>Otevřít Marketplace</button>
            </div>
          ) : (
            <div style={s.grid}>
              {packs.map((pack: any) => (
                <div key={pack.id} style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={s.packIconBox}>⬡</div>
                    <div style={{ flex: 1 }}>
                      <div style={s.packName}>{pack.name}</div>
                      <div style={s.packMeta}>v{pack.version} · {pack.author}</div>
                    </div>
                    {pack.builtin
                      ? <span style={s.badge}>built-in</span>
                      : <button onClick={() => window.opendeck.marketplace.uninstall(pack.id)} style={s.btnDanger} title="Odinstalovat">🗑</button>
                    }
                  </div>
                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{pack.description}</div>
                  <ButtonGrid buttons={pack.buttons ?? []} rawBase={null} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Marketplace ── */}
      {tab === 'marketplace' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          <form onSubmit={e => { e.preventDefault(); doSearch(query) }} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <input
              value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Hledej packs… (prázdné = vše)"
              style={{ ...s.input, flex: 1 }}
            />
            <button type="submit" style={s.btnPrimary} disabled={loading}>
              {loading ? '⏳' : '🔍 Hledat'}
            </button>
          </form>

          <div style={{ fontSize: 11, color: '#444', marginBottom: 16 }}>
            Repozitáře s tagem <code style={{ color: '#4f9eff' }}>opendeck-pack</code> na GitHubu.
          </div>

          {loading && <div style={s.empty}><div style={{ fontSize: 24 }}>⏳</div><div style={{ color: '#666', marginTop: 8 }}>Načítám z GitHubu…</div></div>}

          <div style={s.grid}>
            {results.map(pack => {
              const state = installStates[pack.id] ?? 'idle'
              const pct = progress[pack.id] ?? 0
              const isInstalled = !!pack.installedVersion
              const needsUpdate = pack.updateAvailable

              return (
                <div key={pack.id} style={{ ...s.card, border: needsUpdate ? '1px solid #f5c54244' : s.card.border }}>
                  <div style={s.cardHeader}>
                    <div style={s.packIconBox}>⬡</div>
                    <div style={{ flex: 1 }}>
                      <div style={s.packName}>{pack.name}</div>
                      <div style={s.packMeta}>
                        {pack.author} · <span style={{ color: '#f5c542' }}>★ {pack.stars}</span>
                        {' · '}
                        {isInstalled
                          ? <span style={{ color: needsUpdate ? '#f5c542' : '#4ade80' }}>
                              {needsUpdate ? `v${pack.installedVersion} → v${pack.version}` : `v${pack.installedVersion} ✓`}
                            </span>
                          : <span style={{ color: '#666' }}>v{pack.version}</span>
                        }
                      </div>
                    </div>
                    <a href={pack.url} target="_blank" style={{ color: '#555', fontSize: 14, textDecoration: 'none' }}>↗</a>
                  </div>

                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{pack.description || 'Bez popisu'}</div>

                  {/* Tlačítka s logy */}
                  {pack.buttons.length > 0 && <ButtonGrid buttons={pack.buttons} rawBase={null} />}

                  {errors[pack.id] && (
                    <div style={{ fontSize: 11, color: '#f87171', padding: '6px 10px', background: '#f8717111', borderRadius: 6 }}>
                      ⚠ {errors[pack.id]}
                    </div>
                  )}

                  {state === 'installing' && (
                    <div>
                      <div style={{ height: 3, background: '#1e1e1e', borderRadius: 2 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#4f9eff', transition: 'width 200ms', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 3 }}>Instaluji… {pct}%</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
                    {isInstalled && (
                      <button onClick={() => handleUninstall(pack.id, pack.name)} style={s.btnDanger}>
                        🗑 Odinstalovat
                      </button>
                    )}
                    {needsUpdate && (
                      <button
                        onClick={() => handleInstall(pack)}
                        disabled={state === 'installing'}
                        style={{ ...s.btnWarning, opacity: state === 'installing' ? 0.5 : 1 }}
                      >
                        🔄 Aktualizovat na v{pack.version}
                      </button>
                    )}
                    {!isInstalled && state !== 'done' && (
                      <button
                        onClick={() => handleInstall(pack)}
                        disabled={state === 'installing'}
                        style={{ ...s.btnPrimary, opacity: state === 'installing' ? 0.5 : 1 }}
                      >
                        ⬇ Instalovat
                      </button>
                    )}
                    {state === 'done' && !isInstalled && (
                      <span style={{ fontSize: 12, color: '#4ade80' }}>✓ Nainstalováno</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {!loading && results.length === 0 && (
            <div style={s.empty}>
              <div style={{ fontSize: 32 }}>🔍</div>
              <div style={{ color: '#666', fontSize: 14, marginTop: 8 }}>Žádné výsledky</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── ButtonGrid — zobrazení tlačítek s logem ───────────────────────────────

function ButtonGrid({ buttons, rawBase }: { buttons: any[]; rawBase: string | null }) {
  if (!buttons?.length) return null
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
      {buttons.map((btn: any) => (
        <div key={btn.id} style={{
          display: 'flex', alignItems: 'center', gap: 5,
          background: btn.color ?? '#161616',
          border: '1px solid #2a2a2a',
          borderRadius: 8, padding: '4px 8px',
        }}>
          {btn.logoUrl ? (
            <img
              src={btn.logoUrl}
              alt={btn.label}
              style={{ width: 14, height: 14, objectFit: 'contain', borderRadius: 2 }}
              onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
            />
          ) : btn.icon ? (
            <span style={{ fontSize: 11 }}>⬡</span>
          ) : null}
          <span style={{ fontSize: 11, color: '#aaa' }}>{btn.label}</span>
          <span style={{ fontSize: 10, color: '#444' }}>{btn.defaultSize ?? '1×1'}</span>
        </div>
      ))}
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────
const s: Record<string, any> = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 },
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 12 },
  packIconBox: { width: 40, height: 40, background: '#4f9eff1a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid #4f9eff33', flexShrink: 0 },
  packName: { fontSize: 14, fontWeight: 600, color: '#e8e8e8' },
  packMeta: { fontSize: 11, color: '#666', marginTop: 2 },
  badge: { background: '#4f9eff22', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#4f9eff' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  input: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#e8e8e8', fontSize: 13, outline: 'none' },
  btnPrimary: { background: '#4f9eff', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer' },
  btnWarning: { background: '#f5c54222', border: '1px solid #f5c54244', borderRadius: 8, padding: '7px 14px', color: '#f5c542', fontWeight: 600, fontSize: 12, cursor: 'pointer' },
  btnDanger: { background: 'transparent', border: '1px solid #f8717133', borderRadius: 8, padding: '6px 12px', color: '#f87171', fontSize: 12, cursor: 'pointer' },
}
