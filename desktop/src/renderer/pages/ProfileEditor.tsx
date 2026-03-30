import { useState } from 'react'
import { useStore } from '../store/useStore'

const SIZES = ['1x1', '2x1', '1x2', '2x2', '3x1', '4x1', '5x1']
const SIZE_DIMS: Record<string, [number, number]> = {
  '1x1': [1, 1], '2x1': [2, 1], '1x2': [1, 2], '2x2': [2, 2],
  '3x1': [3, 1], '4x1': [4, 1], '5x1': [5, 1],
}

const CELL = 72
const GAP = 6

export function ProfileEditor() {
  const { profiles, activeProfileId, setActiveProfile, createProfile,
    deleteProfile, buttonStates, addButton, updateButton, removeButton, packs } = useStore()

  const [selected, setSelected] = useState<string | null>(null)
  const [editingButton, setEditingButton] = useState<any | null>(null)
  const [newProfileName, setNewProfileName] = useState('')
  const [showNewProfile, setShowNewProfile] = useState(false)

  const profile = profiles.find(p => p.id === activeProfileId)
  if (!profile) return <div style={s.empty}>Žádný profil</div>

  const gridW = profile.gridCols * (CELL + GAP) - GAP
  const gridH = profile.gridRows * (CELL + GAP) - GAP

  const handleAddProfile = async () => {
    if (!newProfileName.trim()) return
    await createProfile({ name: newProfileName.trim(), gridCols: 5, gridRows: 4, buttons: [] })
    setNewProfileName('')
    setShowNewProfile(false)
  }

  const handleRemoveButton = async (layoutId: string) => {
    await removeButton(activeProfileId, layoutId)
    setSelected(null)
    setEditingButton(null)
  }

  const handleSaveButton = async (patch: any) => {
    if (!editingButton) return
    await updateButton(activeProfileId, editingButton.id, patch)
    setEditingButton(null)
    setSelected(null)
  }

  return (
    <div style={s.container}>
      {/* Profile tabs */}
      <div style={s.profileBar}>
        {profiles.map(p => (
          <button
            key={p.id}
            onClick={() => setActiveProfile(p.id)}
            style={{
              ...s.profileTab,
              background: p.id === activeProfileId ? '#4f9eff22' : 'transparent',
              color: p.id === activeProfileId ? '#4f9eff' : '#888',
              borderColor: p.id === activeProfileId ? '#4f9eff44' : 'transparent',
            }}
          >{p.name}</button>
        ))}
        {showNewProfile ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              autoFocus
              value={newProfileName}
              onChange={e => setNewProfileName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddProfile()}
              placeholder="Název profilu"
              style={s.input}
            />
            <button onClick={handleAddProfile} style={s.btnPrimary}>OK</button>
            <button onClick={() => setShowNewProfile(false)} style={s.btnGhost}>✕</button>
          </div>
        ) : (
          <button onClick={() => setShowNewProfile(true)} style={s.btnGhost}>+ Profil</button>
        )}
        {profiles.length > 1 && (
          <button
            onClick={() => deleteProfile(activeProfileId)}
            title="Smazat profil"
            style={{ ...s.btnGhost, marginLeft: 'auto', color: '#f87171' }}
          >🗑</button>
        )}
      </div>

      <div style={s.workspace}>
        {/* Grid canvas */}
        <div style={s.canvas}>
          <div style={{ position: 'relative', width: gridW, height: gridH }}>
            {/* Empty cells */}
            {Array.from({ length: profile.gridRows }).map((_, row) =>
              Array.from({ length: profile.gridCols }).map((_, col) => (
                <div key={`${col}-${row}`} style={{
                  position: 'absolute',
                  left: col * (CELL + GAP),
                  top: row * (CELL + GAP),
                  width: CELL, height: CELL,
                  borderRadius: 10,
                  border: '1px dashed #2a2a2a',
                  background: '#111',
                }} />
              ))
            )}

            {/* Buttons */}
            {profile.buttons.map((layout: any) => {
              const [cols, rows] = SIZE_DIMS[layout.size ?? '1x1'] ?? [1, 1]
              const w = cols * CELL + (cols - 1) * GAP
              const h = rows * CELL + (rows - 1) * GAP
              const state = buttonStates[layout.buttonId] ?? {}
              const isSelected = selected === layout.id
              const label = state.label ?? layout.label ?? layout.buttonId.split('.').pop()
              const bg = state.color ?? layout.color ?? '#1c1c1c'

              return (
                <div
                  key={layout.id}
                  onClick={() => { setSelected(layout.id); setEditingButton(layout) }}
                  style={{
                    position: 'absolute',
                    left: layout.gridX * (CELL + GAP),
                    top: layout.gridY * (CELL + GAP),
                    width: w, height: h,
                    background: bg,
                    borderRadius: 10,
                    border: isSelected ? '2px solid #4f9eff' : '1px solid #2e2e2e',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'border 100ms',
                  }}
                >
                  <div style={{ fontSize: 11, color: state.active ? '#4f9eff' : '#ccc', fontWeight: 600, textAlign: 'center', padding: '0 6px' }}>
                    {label}
                  </div>
                  {state.sublabel && (
                    <div style={{ fontSize: 9, color: '#666', marginTop: 2 }}>{state.sublabel}</div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel — button editor */}
        {editingButton ? (
          <ButtonEditor
            layout={editingButton}
            packs={packs}
            onSave={handleSaveButton}
            onRemove={() => handleRemoveButton(editingButton.id)}
            onClose={() => { setEditingButton(null); setSelected(null) }}
          />
        ) : (
          <AddButtonPanel profile={profile} packs={packs} onAdd={(btn) => addButton(activeProfileId, btn)} />
        )}
      </div>
    </div>
  )
}

// ── Add button panel ──────────────────────────────────────────────────────

function AddButtonPanel({ profile, packs, onAdd }: any) {
  const [search, setSearch] = useState('')

  const filtered = packs.filter((p: any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  )

  const findFreePos = (cols: number, rows: number) => {
    const taken = new Set(profile.buttons.map((b: any) => `${b.gridX},${b.gridY}`))
    for (let y = 0; y < profile.gridRows; y++) {
      for (let x = 0; x <= profile.gridCols - cols; x++) {
        let ok = true
        for (let dy = 0; dy < rows && ok; dy++)
          for (let dx = 0; dx < cols && ok; dx++)
            if (taken.has(`${x + dx},${y + dy}`)) ok = false
        if (ok) return { x, y }
      }
    }
    return { x: 0, y: 0 }
  }

  const handleAdd = (packId: string, btn: any) => {
    const [cols, rows] = SIZE_DIMS[btn.defaultSize ?? '1x1'] ?? [1, 1]
    const { x, y } = findFreePos(cols, rows)
    onAdd({
      id: `${packId}.${btn.id}-${Date.now()}`,
      buttonId: `${packId}.${btn.id}`,
      size: btn.defaultSize ?? '1x1',
      gridX: x,
      gridY: y,
    })
  }

  return (
    <div style={s.panel}>
      <div style={s.panelTitle}>Přidat tlačítko</div>
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Hledat pack..."
        style={{ ...s.input, marginBottom: 12 }}
      />
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {filtered.map((pack: any) => (
          <div key={pack.id} style={s.packSection}>
            <div style={s.packName}>{pack.name}</div>
            {pack.buttons.map((btn: any) => (
              <button
                key={btn.id}
                onClick={() => handleAdd(pack.id, btn)}
                style={s.packBtn}
              >
                <span style={{ flex: 1 }}>{btn.label}</span>
                <span style={{ color: '#555', fontSize: 10 }}>{btn.defaultSize ?? '1×1'}</span>
                <span style={{ color: '#4f9eff', fontSize: 14 }}>+</span>
              </button>
            ))}
          </div>
        ))}
        {filtered.length === 0 && <div style={{ color: '#555', fontSize: 12, textAlign: 'center', paddingTop: 24 }}>Žádné packs k dispozici</div>}
      </div>
    </div>
  )
}

// ── Button editor panel ────────────────────────────────────────────────────

function ButtonEditor({ layout, packs, onSave, onRemove, onClose }: any) {
  const [label, setLabel] = useState(layout.label ?? '')
  const [color, setColor] = useState(layout.color ?? '')
  const [size, setSize] = useState(layout.size ?? '1x1')
  const [gridX, setGridX] = useState(String(layout.gridX))
  const [gridY, setGridY] = useState(String(layout.gridY))

  // Find configSchema for this button
  const [packId, ...rest] = layout.buttonId.split('.')
  const btnId = rest.join('.')
  const pack = packs.find((p: any) => p.id === packId)
  const btnDef = pack?.buttons.find((b: any) => b.id === btnId)
  const schema = btnDef?.configSchema ?? {}

  const [configValues, setConfigValues] = useState<Record<string, any>>(layout.config ?? {})

  const handleSave = () => {
    onSave({
      label: label || undefined,
      color: color || undefined,
      size,
      gridX: parseInt(gridX) || 0,
      gridY: parseInt(gridY) || 0,
      config: Object.keys(configValues).length > 0 ? configValues : undefined,
    })
  }

  return (
    <div style={s.panel}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ ...s.panelTitle, flex: 1, marginBottom: 0 }}>Upravit tlačítko</div>
        <button onClick={onClose} style={s.btnGhost}>✕</button>
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>Pack.Akce</label>
        <div style={{ ...s.value, fontFamily: 'monospace', fontSize: 11 }}>{layout.buttonId}</div>
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>Label (přepis)</label>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="výchozí" style={s.input} />
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>Barva pozadí</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="color" value={color || '#1c1c1c'} onChange={e => setColor(e.target.value)}
            style={{ width: 36, height: 28, border: 'none', borderRadius: 6, cursor: 'pointer', background: 'none' }} />
          <input value={color} onChange={e => setColor(e.target.value)} placeholder="#1c1c1c" style={{ ...s.input, flex: 1 }} />
          {color && <button onClick={() => setColor('')} style={s.btnGhost}>✕</button>}
        </div>
      </div>

      <div style={s.fieldGroup}>
        <label style={s.label}>Velikost</label>
        <select value={size} onChange={e => setSize(e.target.value)} style={s.select}>
          {SIZES.map(sz => <option key={sz} value={sz}>{sz}</option>)}
        </select>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ ...s.fieldGroup, flex: 1 }}>
          <label style={s.label}>Sloupec (X)</label>
          <input type="number" value={gridX} onChange={e => setGridX(e.target.value)} min={0} style={s.input} />
        </div>
        <div style={{ ...s.fieldGroup, flex: 1 }}>
          <label style={s.label}>Řádek (Y)</label>
          <input type="number" value={gridY} onChange={e => setGridY(e.target.value)} min={0} style={s.input} />
        </div>
      </div>

      {/* Pack-specific config fields */}
      {Object.entries(schema).map(([key, field]: any) => (
        <div key={key} style={s.fieldGroup}>
          <label style={s.label}>{field.label}{field.required && <span style={{ color: '#f87171' }}> *</span>}</label>
          {field.type === 'boolean' ? (
            <input type="checkbox" checked={!!configValues[key]}
              onChange={e => setConfigValues(v => ({ ...v, [key]: e.target.checked }))} />
          ) : field.type === 'select' ? (
            <select value={configValues[key] ?? ''} onChange={e => setConfigValues(v => ({ ...v, [key]: e.target.value }))} style={s.select}>
              <option value="">— vyberte —</option>
              {field.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
            </select>
          ) : (
            <input
              type={field.secret ? 'password' : 'text'}
              value={configValues[key] ?? ''}
              onChange={e => setConfigValues(v => ({ ...v, [key]: e.target.value }))}
              placeholder={field.default ? String(field.default) : ''}
              style={s.input}
            />
          )}
        </div>
      ))}

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto', paddingTop: 16 }}>
        <button onClick={handleSave} style={s.btnPrimary}>Uložit</button>
        <button onClick={onRemove} style={{ ...s.btnGhost, color: '#f87171', borderColor: '#f8717144' }}>Odebrat</button>
      </div>
    </div>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s: Record<string, any> = {
  container: { display: 'flex', flexDirection: 'column', height: '100%', background: '#0a0a0a' },
  profileBar: { display: 'flex', alignItems: 'center', gap: 4, padding: '10px 16px', borderBottom: '1px solid #1e1e1e', flexWrap: 'wrap' },
  profileTab: { padding: '5px 14px', borderRadius: 8, border: '1px solid', cursor: 'pointer', fontSize: 13, fontWeight: 500, transition: 'all 150ms' },
  workspace: { display: 'flex', flex: 1, overflow: 'hidden' },
  canvas: { flex: 1, padding: 24, overflow: 'auto', display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-start' },
  panel: { width: 280, background: '#111', borderLeft: '1px solid #1e1e1e', padding: 20, display: 'flex', flexDirection: 'column', overflowY: 'auto' },
  panelTitle: { fontSize: 13, fontWeight: 700, color: '#e8e8e8', marginBottom: 16, textTransform: 'uppercase', letterSpacing: '0.05em' },
  packSection: { marginBottom: 16 },
  packName: { fontSize: 11, fontWeight: 700, color: '#4f9eff', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 },
  packBtn: { display: 'flex', width: '100%', alignItems: 'center', gap: 8, padding: '7px 10px', background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, cursor: 'pointer', color: '#ccc', fontSize: 13, marginBottom: 3, transition: 'background 100ms' },
  fieldGroup: { marginBottom: 12 },
  label: { display: 'block', fontSize: 11, color: '#888', marginBottom: 4, fontWeight: 600 },
  value: { color: '#aaa', fontSize: 12, padding: '6px 0' },
  input: { width: '100%', background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '7px 10px', color: '#e8e8e8', fontSize: 13, outline: 'none' },
  select: { width: '100%', background: '#161616', border: '1px solid #2a2a2a', borderRadius: 8, padding: '7px 10px', color: '#e8e8e8', fontSize: 13, outline: 'none' },
  btnPrimary: { flex: 1, background: '#4f9eff', border: 'none', borderRadius: 8, padding: '9px 0', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13 },
  btnGhost: { padding: '6px 12px', background: 'transparent', border: '1px solid #2a2a2a', borderRadius: 8, color: '#888', cursor: 'pointer', fontSize: 13 },
  empty: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#444' },
}
