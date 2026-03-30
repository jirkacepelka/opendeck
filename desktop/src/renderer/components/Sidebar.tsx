import { Page } from '../App'
import { useStore } from '../store/useStore'

const NAV = [
  { id: 'editor', label: 'Editor', icon: '⊞' },
  { id: 'packs', label: 'Packs', icon: '⬡' },
  { id: 'settings', label: 'Nastavení', icon: '⚙' },
] as const

export function Sidebar({ activePage, onNavigate }: {
  activePage: Page
  onNavigate: (p: Page) => void
}) {
  const { connectedClients } = useStore()

  return (
    <aside style={{
      width: 64,
      background: '#111',
      borderRight: '1px solid #1e1e1e',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: 16,
      paddingBottom: 16,
      gap: 4,
      userSelect: 'none',
    }}>
      {/* Logo */}
      <div style={{
        width: 36, height: 36,
        background: '#4f9eff22',
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18, marginBottom: 16,
        border: '1px solid #4f9eff44',
      }}>⬡</div>

      {/* Nav items */}
      {NAV.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          title={item.label}
          style={{
            width: 44, height: 44,
            background: activePage === item.id ? '#4f9eff22' : 'transparent',
            border: activePage === item.id ? '1px solid #4f9eff44' : '1px solid transparent',
            borderRadius: 10,
            color: activePage === item.id ? '#4f9eff' : '#666',
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms',
          }}
        >{item.icon}</button>
      ))}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Connection indicator */}
      <div title={`${connectedClients} připojených klientů`} style={{
        width: 8, height: 8,
        borderRadius: '50%',
        background: connectedClients > 0 ? '#4ade80' : '#444',
        marginBottom: 4,
      }} />
    </aside>
  )
}
