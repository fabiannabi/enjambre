import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import SimView from './SimView.jsx'
import CardView from './CardView.jsx'

const NAV = {
  bar: {
    display:'flex', gap:4, padding:'6px 10px',
    background:'#0e0c09', borderBottom:'1px solid #1e1a12',
    position:'sticky', top:0, zIndex:20,
  },
  btn: active => ({
    background: active ? '#2a2217' : 'transparent',
    color: active ? '#d4c89a' : '#5a4a30',
    border: `1px solid ${active ? '#3a3025' : 'transparent'}`,
    borderRadius:6, padding:'5px 14px', cursor:'pointer',
    fontSize:12, fontFamily:"'Georgia',serif",
    fontWeight: active ? 700 : 400,
  }),
}

function Root() {
  const [view, setView] = useState('game')
  return (
    <>
      <nav style={NAV.bar}>
        <button style={NAV.btn(view === 'game')} onClick={() => setView('game')}>
          🎮 Juego
        </button>
        <button style={NAV.btn(view === 'sim')} onClick={() => setView('sim')}>
          📊 Simulador
        </button>
        <button style={NAV.btn(view === 'cards')} onClick={() => setView('cards')}>
          📖 Cartas
        </button>
      </nav>
      {view === 'game' && <App />}
      {view === 'sim'  && <SimView />}
      {view === 'cards' && <CardView />}
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>
)
