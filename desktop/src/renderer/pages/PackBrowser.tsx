import { useStore } from '../store/useStore'

export function PackBrowser() {
  const { packs } = useStore()

  return (
    <div style={{ padding: 32, height: '100%', overflow: 'auto' }}>
      <h1 style={{ fontSize: 18, fontWeight: 700, color: '#e8e8e8', marginBottom: 8 }}>Button Packs</h1>
      <p style={{ fontSize: 13, color: '#666', marginBottom: 28 }}>
        Packs rozšiřují OpenDeck o nové integrace. Vlastní pack stačí nakopírovat do{' '}
        <code style={{ color: '#4f9eff', background: '#4f9eff11', padding: '2px 5px', borderRadius: 4 }}>~/.opendeck/packs/</code>{' '}
        a restartovat aplikaci.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
        {packs.map((pack: any) => (
          <div key={pack.id} style={{
            background: '#111',
            border: '1px solid #1e1e1e',
            borderRadius: 14,
            padding: 20,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{
                width: 42, height: 42,
                background: '#4f9eff1a',
                borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
                border: '1px solid #4f9eff33',
              }}>⬡</div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#e8e8e8' }}>{pack.name}</div>
                <div style={{ fontSize: 11, color: '#666', marginTop: 2 }}>v{pack.version} · {pack.author}</div>
              </div>
              {pack.builtin && (
                <div style={{ marginLeft: 'auto', background: '#4f9eff22', borderRadius: 6, padding: '3px 8px', fontSize: 10, fontWeight: 700, color: '#4f9eff' }}>
                  built-in
                </div>
              )}
            </div>

            <p style={{ fontSize: 12, color: '#888', marginBottom: 16, lineHeight: 1.5 }}>{pack.description}</p>

            <div style={{ borderTop: '1px solid #1e1e1e', paddingTop: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Tlačítka ({pack.buttons.length})
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {pack.buttons.map((btn: any) => (
                  <div key={btn.id} style={{
                    background: '#161616',
                    border: '1px solid #2a2a2a',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    color: '#aaa',
                  }}>
                    {btn.label}
                    <span style={{ color: '#555', marginLeft: 4 }}>{btn.defaultSize ?? '1×1'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {packs.length === 0 && (
          <div style={{ gridColumn: '1/-1', textAlign: 'center', paddingTop: 60, color: '#444' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⬡</div>
            <div style={{ fontSize: 15 }}>Žádné packs</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>Připoj se k agentovi nebo nainstaluj packs ručně</div>
          </div>
        )}
      </div>
    </div>
  )
}
