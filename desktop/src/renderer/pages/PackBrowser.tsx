import { useState, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'

interface MarketplacePack {
  id: string
  name: string
  description: string
  author: string
  stars: number
  url: string
  zipUrl: string
  installed: boolean
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
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set())

  // Načti nainstalované packs
  useEffect(() => {
    window.opendeck.marketplace.getInstalled().then((ids: string[]) => {
      setInstalledIds(new Set(ids))
    })

    // Subscribe na progress
    const unsub = window.opendeck.marketplace.onProgress(({ packId, pct }) => {
      setProgress(p => ({ ...p, [packId]: pct }))
    })

    // Subscribe na packs updated
    const unsubPacks = window.opendeck.marketplace.onPacksUpdated(() => {
      window.opendeck.marketplace.getInstalled().then((ids: string[]) => {
        setInstalledIds(new Set(ids))
      })
    })

    return () => { unsub(); unsubPacks() }
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

  // Automaticky vyhledej při otevření záložky
  useEffect(() => {
    if (tab === 'marketplace' && results.length === 0) {
      doSearch('')
    }
  }, [tab])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    doSearch(query)
  }

  const handleInstall = async (pack: MarketplacePack) => {
    setInstallStates(s => ({ ...s, [pack.id]: 'installing' }))
    setProgress(p => ({ ...p, [pack.id]: 0 }))
    setErrors(e => { const n = { ...e }; delete n[pack.id]; return n })

    const result = await window.opendeck.marketplace.install(pack)

    if (result.ok) {
      setInstallStates(s => ({ ...s, [pack.id]: 'done' }))
      setInstalledIds(ids => new Set([...ids, pack.name]))
    } else {
      setInstallStates(s => ({ ...s, [pack.id]: 'error' }))
      setErrors(e => ({ ...e, [pack.id]: result.error ?? 'Neznámá chyba' }))
    }
  }

  const handleUninstall = async (packName: string) => {
    const result = await window.opendeck.marketplace.uninstall(packName)
    if (result.ok) {
      setInstalledIds(ids => { const n = new Set(ids); n.delete(packName); return n })
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0a' }}>
      {/* Header */}
      <div style={{ padding: '20px 24px 0', borderBottom: '1px solid #1e1e1e' }}>
        <h1 style={{ fontSize: 16, fontWeight: 700, color: '#e8e8e8', marginBottom: 16 }}>Button Packs</h1>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0 }}>
          {(['installed', 'marketplace'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 18px',
                background: 'none',
                border: 'none',
                borderBottom: tab === t ? '2px solid #4f9eff' : '2px solid transparent',
                color: tab === t ? '#4f9eff' : '#666',
                fontWeight: tab === t ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                marginBottom: -1,
              }}
            >
              {t === 'installed' ? `Nainstalované (${packs.length})` : '🔍 Marketplace'}
            </button>
          ))}
        </div>
      </div>

      {/* Installed tab */}
      {tab === 'installed' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {packs.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
              <div style={{ fontSize: 14, color: '#666' }}>Žádné packs</div>
              <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>Hledej a instaluj packs v záložce Marketplace</div>
              <button onClick={() => setTab('marketplace')} style={{ ...s.btnPrimary, marginTop: 16 }}>
                Otevřít Marketplace
              </button>
            </div>
          ) : (
            <div style={s.grid}>
              {packs.map((pack: any) => (
                <div key={pack.id} style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={s.packIcon}>⬡</div>
                    <div style={{ flex: 1 }}>
                      <div style={s.packName}>{pack.name}</div>
                      <div style={s.packMeta}>v{pack.version} · {pack.author}</div>
                    </div>
                    {pack.builtin
                      ? <span style={s.badge}>built-in</span>
                      : (
                        <button
                          onClick={() => handleUninstall(pack.id)}
                          style={s.btnDanger}
                          title="Odinstalovat"
                        >🗑</button>
                      )
                    }
                  </div>
                  <p style={s.packDesc}>{pack.description}</p>
                  <div style={s.btnList}>
                    {pack.buttons?.map((btn: any) => (
                      <span key={btn.id} style={s.btnChip}>{btn.label} <span style={{ color: '#555' }}>{btn.defaultSize ?? '1×1'}</span></span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Marketplace tab */}
      {tab === 'marketplace' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {/* Search */}
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Hledej packs na GitHubu… (nebo nechej prázdné pro všechny)"
              style={{ ...s.input, flex: 1, fontSize: 13 }}
            />
            <button type="submit" style={s.btnPrimary} disabled={loading}>
              {loading ? '⏳' : '🔍 Hledat'}
            </button>
          </form>

          <div style={{ fontSize: 11, color: '#444', marginBottom: 16 }}>
            Vyhledává GitHub repozitáře s tagem <code style={{ color: '#4f9eff' }}>opendeck-pack</code>.
            Chceš publikovat vlastní pack? Přidej tento topic do svého repozitáře.
          </div>

          {loading && (
            <div style={s.empty}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>⏳</div>
              <div style={{ color: '#666', fontSize: 13 }}>Prohledávám GitHub…</div>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div style={s.empty}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div style={{ fontSize: 14, color: '#666' }}>Žádné výsledky</div>
              <div style={{ fontSize: 12, color: '#444', marginTop: 4 }}>Zkus jiné hledání nebo nechej pole prázdné</div>
            </div>
          )}

          <div style={s.grid}>
            {results.map(pack => {
              const state = installStates[pack.id] ?? 'idle'
              const pct = progress[pack.id] ?? 0
              const isInstalled = installedIds.has(pack.name) || state === 'done'

              return (
                <div key={pack.id} style={s.card}>
                  <div style={s.cardHeader}>
                    <div style={s.packIcon}>⬡</div>
                    <div style={{ flex: 1 }}>
                      <div style={s.packName}>{pack.name}</div>
                      <div style={s.packMeta}>
                        {pack.author}
                        {' · '}
                        <span style={{ color: '#f5c542' }}>★ {pack.stars}</span>
                      </div>
                    </div>
                    <a
                      href={pack.url}
                      target="_blank"
                      style={{ color: '#666', fontSize: 12, textDecoration: 'none' }}
                      title="Otevřít na GitHubu"
                    >↗</a>
                  </div>

                  <p style={s.packDesc}>{pack.description || 'Bez popisu'}</p>

                  {errors[pack.id] && (
                    <div style={{ fontSize: 11, color: '#f87171', marginBottom: 8, padding: '6px 10px', background: '#f8717111', borderRadius: 6 }}>
                      ⚠ {errors[pack.id]}
                    </div>
                  )}

                  {state === 'installing' && (
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ height: 4, background: '#1e1e1e', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#4f9eff', transition: 'width 200ms', borderRadius: 2 }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#666', marginTop: 4 }}>Instaluji… {pct}%</div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    {isInstalled ? (
                      <button onClick={() => handleUninstall(pack.name)} style={s.btnDanger}>
                        🗑 Odinstalovat
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstall(pack)}
                        disabled={state === 'installing'}
                        style={state === 'installing' ? { ...s.btnPrimary, opacity: 0.5 } : s.btnPrimary}
                      >
                        {state === 'installing' ? 'Instaluji…' : '⬇ Instalovat'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s: Record<string, any> = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 14 },
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 },
  cardHeader: { display: 'flex', alignItems: 'center', gap: 12 },
  packIcon: { width: 40, height: 40, background: '#4f9eff1a', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, border: '1px solid #4f9eff33', flexShrink: 0 },
  packName: { fontSize: 14, fontWeight: 600, color: '#e8e8e8' },
  packMeta: { fontSize: 11, color: '#666', marginTop: 2 },
  packDesc: { fontSize: 12, color: '#888', lineHeight: 1.5, margin: 0 },
  btnList: { display: 'flex', flexWrap: 'wrap', gap: 4 },
  btnChip: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 6, padding: '2px 8px', fontSize: 11, color: '#aaa' },
  badge: { background: '#4f9eff22', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#4f9eff' },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 60, color: '#444' },
  input: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#e8e8e8', outline: 'none' },
  btnPrimary: { background: '#4f9eff', border: 'none', borderRadius: 8, padding: '8px 16px', color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' },
  btnDanger: { background: 'transparent', border: '1px solid #f8717133', borderRadius: 8, padding: '6px 12px', color: '#f87171', fontSize: 12, cursor: 'pointer' },
}
