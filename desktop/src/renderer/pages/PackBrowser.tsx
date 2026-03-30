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
  trusted: boolean
  buttons: RemoteButtonDef[]
}

type InstallState = 'idle' | 'installing' | 'done' | 'error'

// Lucide ikony jako inline SVG path data
const ICON_PATHS: Record<string, string> = {
  'mic':           'M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3zm-1 19v-3M11 21h2M8 11a4 4 0 0 0 8 0',
  'mic-off':       'M1 1l22 22M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V5a3 3 0 0 0-5.94-.6M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23M12 20v-4M8 20h8',
  'headphones':    'M3 18v-6a9 9 0 0 1 18 0v6M3 18a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3zM21 18a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3z',
  'radio':         'M2 12h20M2 12a10 10 0 0 1 20 0M12 12v9M12 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  'circle':        'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z',
  'monitor':       'M2 3h20a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zM8 21h8M12 17v4',
  'layout':        'M3 3h18v18H3zM3 9h18M9 21V9',
  'terminal':      'M4 17l6-6-6-6M12 19h8',
  'keyboard':      'M2 4h20a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10',
  'external-link': 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3',
  'volume-2':      'M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07',
  'volume-1':      'M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07',
  'volume-x':      'M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6',
  'play':          'M5 3l14 9-14 9V3z',
  'skip-forward':  'M5 4l10 8-10 8V4zM19 5v14',
  'skip-back':     'M19 20L9 12l10-8v16zM5 19V5',
  'music':         'M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM21 16a3 3 0 1 1-6 0 3 3 0 0 1 6 0z',
  'zap':           'M13 2L3 14h9l-1 8 10-12h-9l1-8z',
}

function LucideInline({ name, size = 16, color = '#aaa' }: { name: string; size?: number; color?: string }) {
  const d = ICON_PATHS[name]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}>
      {d && <path d={d} />}
    </svg>
  )
}

function ButtonChip({ btn }: { btn: RemoteButtonDef }) {
  const [imgError, setImgError] = useState(false)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: btn.color ?? '#161616',
      border: '1px solid #2a2a2a', borderRadius: 8,
      padding: '4px 9px',
    }}>
      {btn.logoUrl && !imgError ? (
        <img src={btn.logoUrl} alt="" width={14} height={14}
          style={{ objectFit: 'contain', borderRadius: 2 }}
          onError={() => setImgError(true)} />
      ) : btn.icon ? (
        <LucideInline name={btn.icon} size={13} color="#888" />
      ) : null}
      <span style={{ fontSize: 11, color: '#bbb', whiteSpace: 'nowrap' }}>{btn.label}</span>
      <span style={{ fontSize: 10, color: '#444' }}>{btn.defaultSize ?? '1×1'}</span>
    </div>
  )
}

export function PackBrowser() {
  const { packs } = useStore()
  const [tab, setTab] = useState<'installed' | 'marketplace'>('installed')

  // Marketplace state
  const [registry, setRegistry] = useState<MarketplacePack[]>([])
  const [loadingRegistry, setLoadingRegistry] = useState(false)
  const [customUrl, setCustomUrl] = useState('')
  const [customPack, setCustomPack] = useState<MarketplacePack | null>(null)
  const [fetchingUrl, setFetchingUrl] = useState(false)
  const [fetchError, setFetchError] = useState('')

  const [installStates, setInstallStates] = useState<Record<string, InstallState>>({})
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    const unsub = window.opendeck.marketplace.onProgress(({ packId, pct }) =>
      setProgress(p => ({ ...p, [packId]: pct }))
    )
    return unsub
  }, [])

  // Načti registry při otevření záložky
  useEffect(() => {
    if (tab === 'marketplace' && registry.length === 0) loadRegistry()
  }, [tab])

  const loadRegistry = async () => {
    setLoadingRegistry(true)
    try {
      const items = await window.opendeck.marketplace.getRegistry()
      setRegistry(items)
    } finally {
      setLoadingRegistry(false)
    }
  }

  const handleFetchUrl = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customUrl.trim()) return
    setFetchingUrl(true)
    setFetchError('')
    setCustomPack(null)
    const pack = await window.opendeck.marketplace.fetchUrl(customUrl.trim())
    if (pack) {
      setCustomPack(pack)
    } else {
      setFetchError('Nepodařilo se načíst pack z této URL. Zkontroluj že repozitář obsahuje pack.json.')
    }
    setFetchingUrl(false)
  }

  const handleInstall = async (pack: MarketplacePack) => {
    setInstallStates(s => ({ ...s, [pack.id]: 'installing' }))
    setProgress(p => ({ ...p, [pack.id]: 0 }))
    setErrors(e => { const n = { ...e }; delete n[pack.id]; return n })

    const result = await window.opendeck.marketplace.install(pack)

    if (result.ok) {
      setInstallStates(s => ({ ...s, [pack.id]: 'done' }))
      setRegistry(r => r.map(p => p.id === pack.id
        ? { ...p, installedVersion: pack.version, updateAvailable: false } : p
      ))
      if (customPack?.id === pack.id) {
        setCustomPack(cp => cp ? { ...cp, installedVersion: pack.version, updateAvailable: false } : cp)
      }
    } else {
      setInstallStates(s => ({ ...s, [pack.id]: 'error' }))
      setErrors(e => ({ ...e, [pack.id]: result.error ?? 'Neznámá chyba' }))
    }
  }

  const handleUninstall = async (packId: string, packName: string) => {
    await window.opendeck.marketplace.uninstall(packName)
    setRegistry(r => r.map(p => p.id === packId
      ? { ...p, installedVersion: null, updateAvailable: false } : p
    ))
    if (customPack?.id === packId) {
      setCustomPack(cp => cp ? { ...cp, installedVersion: null, updateAvailable: false } : cp)
    }
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

      {/* ── INSTALLED ── */}
      {tab === 'installed' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {packs.length === 0 ? (
            <div style={s.empty}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>⬡</div>
              <div style={{ color: '#666', fontSize: 14 }}>Žádné packs</div>
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
                      : <button onClick={() => window.opendeck.marketplace.uninstall(pack.id)} style={s.btnDanger}>🗑</button>
                    }
                  </div>
                  <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{pack.description}</div>
                  <div style={s.chipRow}>
                    {(pack.buttons ?? []).map((btn: any) => <ButtonChip key={btn.id} btn={btn} />)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MARKETPLACE ── */}
      {tab === 'marketplace' && (
        <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>

          {/* Vlastní URL */}
          <div style={s.urlSection}>
            <div style={s.urlTitle}>Přidat pack z GitHubu</div>
            <form onSubmit={handleFetchUrl} style={{ display: 'flex', gap: 8 }}>
              <input
                value={customUrl}
                onChange={e => setCustomUrl(e.target.value)}
                placeholder="https://github.com/autor/repo nebo autor/repo"
                style={{ ...s.input, flex: 1 }}
              />
              <button type="submit" disabled={fetchingUrl} style={s.btnPrimary}>
                {fetchingUrl ? '⏳' : 'Načíst'}
              </button>
            </form>
            {fetchError && <div style={{ fontSize: 11, color: '#f87171', marginTop: 6 }}>⚠ {fetchError}</div>}

            {/* Výsledek ručního vyhledání */}
            {customPack && <PackCard pack={customPack} installState={installStates[customPack.id] ?? 'idle'} progress={progress[customPack.id] ?? 0} error={errors[customPack.id]} onInstall={() => handleInstall(customPack)} onUninstall={() => handleUninstall(customPack.id, customPack.id.split('/')[1])} />}
          </div>

          {/* Ověřené packs */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={s.sectionTitle}>✓ Ověřené packs</div>
              <button onClick={loadRegistry} disabled={loadingRegistry} style={{ ...s.btnGhost, padding: '3px 10px', fontSize: 11 }}>
                {loadingRegistry ? '⏳' : '↻ Obnovit'}
              </button>
            </div>

            {loadingRegistry && (
              <div style={s.empty}>
                <div style={{ fontSize: 20 }}>⏳</div>
                <div style={{ color: '#666', fontSize: 13, marginTop: 6 }}>Načítám z GitHubu…</div>
              </div>
            )}

            {!loadingRegistry && (
              <div style={s.grid}>
                {registry.map(pack => (
                  <PackCard
                    key={pack.id}
                    pack={pack}
                    installState={installStates[pack.id] ?? 'idle'}
                    progress={progress[pack.id] ?? 0}
                    error={errors[pack.id]}
                    onInstall={() => handleInstall(pack)}
                    onUninstall={() => handleUninstall(pack.id, pack.id.split('/')[1])}
                  />
                ))}
                {registry.length === 0 && !loadingRegistry && (
                  <div style={{ ...s.empty, gridColumn: '1/-1' }}>
                    <div style={{ color: '#555', fontSize: 13 }}>Nepodařilo se načíst registry</div>
                    <div style={{ color: '#444', fontSize: 11, marginTop: 4 }}>Zkontroluj připojení k internetu</div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

// ── PackCard ──────────────────────────────────────────────────────────────

function PackCard({ pack, installState, progress, error, onInstall, onUninstall }: {
  pack: MarketplacePack
  installState: InstallState
  progress: number
  error?: string
  onInstall: () => void
  onUninstall: () => void
}) {
  const isInstalled = !!pack.installedVersion
  const needsUpdate = pack.updateAvailable

  return (
    <div style={{ ...s.card, border: needsUpdate ? '1px solid #f5c54233' : s.card.border }}>
      <div style={s.cardHeader}>
        <div style={s.packIcon}>⬡</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={s.packName}>{pack.name}</div>
            {pack.trusted && <span style={s.badge}>✓ ověřeno</span>}
          </div>
          <div style={s.packMeta}>
            {pack.author}
            {pack.stars > 0 && <> · <span style={{ color: '#f5c542' }}>★ {pack.stars}</span></>}
            {' · '}
            {isInstalled
              ? needsUpdate
                ? <span style={{ color: '#f5c542' }}>v{pack.installedVersion} → v{pack.version}</span>
                : <span style={{ color: '#4ade80' }}>v{pack.installedVersion} ✓</span>
              : <span style={{ color: '#555' }}>v{pack.version}</span>
            }
          </div>
        </div>
        <a href={pack.url} target="_blank" rel="noreferrer"
          style={{ color: '#555', fontSize: 14, textDecoration: 'none', flexShrink: 0 }}>↗</a>
      </div>

      {pack.description && (
        <div style={{ fontSize: 12, color: '#888', lineHeight: 1.5 }}>{pack.description}</div>
      )}

      {/* Tlačítka s ikonami */}
      {pack.buttons.length > 0 && (
        <div style={s.chipRow}>
          {pack.buttons.map(btn => <ButtonChip key={btn.id} btn={btn} />)}
        </div>
      )}

      {error && (
        <div style={{ fontSize: 11, color: '#f87171', padding: '5px 8px', background: '#f8717111', borderRadius: 6 }}>
          ⚠ {error}
        </div>
      )}

      {installState === 'installing' && (
        <div>
          <div style={{ height: 3, background: '#1e1e1e', borderRadius: 2 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: '#4f9eff', transition: 'width 200ms', borderRadius: 2 }} />
          </div>
          <div style={{ fontSize: 10, color: '#666', marginTop: 3 }}>Instaluji… {progress}%</div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        {isInstalled && (
          <button onClick={onUninstall} style={s.btnDanger}>🗑 Odinstalovat</button>
        )}
        {needsUpdate && (
          <button onClick={onInstall} disabled={installState === 'installing'}
            style={{ ...s.btnWarning, opacity: installState === 'installing' ? 0.5 : 1 }}>
            🔄 Aktualizovat
          </button>
        )}
        {!isInstalled && installState !== 'done' && (
          <button onClick={onInstall} disabled={installState === 'installing'}
            style={{ ...s.btnPrimary, opacity: installState === 'installing' ? 0.5 : 1 }}>
            ⬇ Instalovat
          </button>
        )}
        {installState === 'done' && !isInstalled && (
          <span style={{ fontSize: 12, color: '#4ade80', alignSelf: 'center' }}>✓ Nainstalováno</span>
        )}
      </div>
    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────
const s: Record<string, any> = {
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 },
  card: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 18, display: 'flex', flexDirection: 'column', gap: 10 },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: 12 },
  packIcon: { width: 38, height: 38, background: '#4f9eff1a', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, border: '1px solid #4f9eff33', flexShrink: 0, marginTop: 1 },
  packName: { fontSize: 14, fontWeight: 600, color: '#e8e8e8' },
  packMeta: { fontSize: 11, color: '#666', marginTop: 2 },
  badge: { background: '#4ade8022', borderRadius: 5, padding: '2px 6px', fontSize: 10, fontWeight: 700, color: '#4ade80', flexShrink: 0 },
  chipRow: { display: 'flex', flexWrap: 'wrap', gap: 5 },
  empty: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 48, textAlign: 'center' },
  urlSection: { background: '#111', border: '1px solid #1e1e1e', borderRadius: 14, padding: 18, marginBottom: 8 },
  urlTitle: { fontSize: 13, fontWeight: 600, color: '#aaa', marginBottom: 10 },
  sectionTitle: { fontSize: 13, fontWeight: 700, color: '#666', textTransform: 'uppercase' as const, letterSpacing: '0.05em' },
  input: { background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '8px 12px', color: '#e8e8e8', fontSize: 13, outline: 'none' },
  btnPrimary: { background: '#4f9eff', border: 'none', borderRadius: 8, padding: '7px 14px', color: '#fff', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  btnWarning: { background: '#f5c54222', border: '1px solid #f5c54244', borderRadius: 8, padding: '7px 14px', color: '#f5c542', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' as const },
  btnDanger: { background: 'transparent', border: '1px solid #f8717133', borderRadius: 8, padding: '6px 12px', color: '#f87171', fontSize: 12, cursor: 'pointer' },
  btnGhost: { background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 8, padding: '6px 12px', color: '#888', fontSize: 12, cursor: 'pointer' },
}
