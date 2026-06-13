import { useState } from 'react'
import { LIB, BASE_DECK_M, BASE_DECK_A } from './engine.js'

// ─── PALETA ───────────────────────────────────────────────────────────────────
const P = {
  bg:     '#13110d',
  panel:  '#1a1510',
  panel2: '#201a12',
  border: '#2a2010',
  gold:   '#d4c89a',
  dim:    '#7a6a4a',
  dimmer: '#4a3a20',
  mGreen: '#2a5a2a',
  mText:  '#7acc7a',
  aRed:   '#5a1a1a',
  aText:  '#cc7a7a',
  accent: '#b8942a',
}

const TRAITS = {
  pupa: { label: 'Pupa',    color: '#6a5a30', desc: 'No puede atacar' },
  volar:{ label: 'Volar',   color: '#2a4a6a', desc: 'Ataca cara aunque haya criaturas' },
  tela: { label: 'Tela',    color: '#4a2a6a', desc: 'Objetivo queda atrapado 1 turno' },
  ag1:  { label: 'Ag +1',   color: '#6a2a2a', desc: 'Hace 1 daño al rival al entrar' },
  ag2:  { label: 'Ag +2',   color: '#8a2a2a', desc: 'Hace 2 daño al rival al entrar' },
}

const STAGE_LABELS = ['Larva', 'Pupa', 'Adulto']
const STAGE_COLORS = ['#2a4a1a', '#3a3a10', '#1a3a4a']

// arte por id de carta
const ART = {
  la:'🐛', pa:'🫘', aa:'🪲',
  lb:'🐛', pb:'🫘', ab:'🪲',
  lc:'🐛', pc:'🫘', ac:'🦋',
  ld:'🐛', pd:'🫘', ad:'🪲',
  sc:'🦂', sa:'🕷️', st:'🕸️', tr:'🕷️', sM:'🦂',
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function deckCount(id) {
  const mC = BASE_DECK_M.filter(x => x === id).length
  const aC = BASE_DECK_A.filter(x => x === id).length
  return { m: mC, a: aC }
}

function getChains(faction) {
  return Object.values(LIB)
    .filter(c => c.faction === faction && c.stage === 0)
    .map(root => {
      const chain = [root]
      let cur = root
      while (cur.next) { cur = LIB[cur.next]; chain.push(cur) }
      return chain
    })
}

// ─── COMPONENTES ──────────────────────────────────────────────────────────────
function TraitBadge({ t }) {
  const info = TRAITS[t] || { label: t, color: '#333', desc: '' }
  return (
    <span title={info.desc} style={{
      fontSize: 9, padding: '1px 5px', borderRadius: 3,
      background: info.color, color: '#ddd', fontFamily: 'monospace',
    }}>
      {info.label}
    </span>
  )
}

function MiniStat({ label, val, color }) {
  return (
    <span style={{
      display:'inline-flex', flexDirection:'column', alignItems:'center',
      minWidth: 28, padding: '2px 4px',
      background: '#13110d', borderRadius: 4, border: '1px solid #2a2010',
    }}>
      <span style={{ fontSize: 15, fontWeight: 700, color: color || P.gold, lineHeight:1 }}>{val}</span>
      <span style={{ fontSize: 8, color: P.dim, lineHeight:1 }}>{label}</span>
    </span>
  )
}

function CardBox({ card, deckCnt, dimmed }) {
  const stageColor = STAGE_COLORS[card.stage ?? 0]
  const isPupa = card.traits.includes('pupa')

  return (
    <div style={{
      width: 110, flexShrink: 0,
      background: P.panel2, border: `1px solid ${dimmed ? P.dimmer : P.border}`,
      borderRadius: 8, padding: 8,
      opacity: dimmed ? 0.55 : 1,
      display: 'flex', flexDirection: 'column', gap: 5,
    }}>
      {/* stage badge */}
      <div style={{
        fontSize: 9, fontFamily: 'monospace', textAlign: 'center',
        color: '#aaa', letterSpacing: 1,
        background: stageColor, borderRadius: 3, padding: '1px 0',
      }}>
        {STAGE_LABELS[card.stage ?? 0]?.toUpperCase()}
      </div>

      {/* art + cost */}
      <div style={{ textAlign: 'center', position: 'relative' }}>
        <span style={{ fontSize: 28, lineHeight: 1 }}>{ART[card.id] || '?'}</span>
        {card.cost > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: 2,
            fontSize: 10, fontWeight: 700, color: '#4a9a4a',
            background: '#1a2a1a', borderRadius: 3, padding: '0 3px',
          }}>
            {card.cost}🌿
          </span>
        )}
      </div>

      {/* name */}
      <div style={{
        fontSize: 9, textAlign: 'center', color: P.gold,
        fontFamily: "'Georgia',serif", lineHeight: 1.2, minHeight: 22,
      }}>
        {card.name}
      </div>

      {/* stats */}
      <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
        <MiniStat label="ATK" val={card.atk} color={isPupa ? P.dim : '#d4704a'} />
        <MiniStat label="HP"  val={card.vida} color="#4a9a7a" />
      </div>

      {/* traits */}
      {card.traits.length > 0 && (
        <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
          {card.traits.map(t => <TraitBadge key={t} t={t} />)}
        </div>
      )}

      {/* deck count */}
      {(deckCnt.m > 0 || deckCnt.a > 0) && (
        <div style={{
          fontSize: 9, textAlign: 'center', color: P.dim,
          borderTop: `1px solid ${P.border}`, paddingTop: 4,
        }}>
          {deckCnt.m > 0 && <span style={{ color: P.mText }}>M×{deckCnt.m}</span>}
          {deckCnt.m > 0 && deckCnt.a > 0 && ' '}
          {deckCnt.a > 0 && <span style={{ color: P.aText }}>A×{deckCnt.a}</span>}
        </div>
      )}
    </div>
  )
}

function EvolutionChain({ chain }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
      {chain.map((card, i) => (
        <div key={card.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <CardBox card={card} deckCnt={deckCount(card.id)} />
          {i < chain.length - 1 && (
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
            }}>
              <span style={{ fontSize: 16, color: P.accent }}>→</span>
              <span style={{ fontSize: 8, color: P.dim, whiteSpace: 'nowrap' }}>
                {chain[i + 1].traits.includes('pupa') ? 'Tiempo' : 'Alimentar'}
              </span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function FactionSection({ faction }) {
  const isMut = faction === 'M'
  const factionColor = isMut ? P.mGreen : P.aRed
  const factionText  = isMut ? P.mText  : P.aText
  const factionName  = isMut ? 'Mutables — Holometábolos' : 'Acechadores — Arácnidos'
  const factionIcon  = isMut ? '🐛' : '🕷️'
  const deck         = isMut ? BASE_DECK_M : BASE_DECK_A

  const deckTotal = deck.length
  const deckUnique = [...new Set(deck)]
  const deckByCard = {}
  for (const id of deck) deckByCard[id] = (deckByCard[id] || 0) + 1

  return (
    <div style={{
      background: P.panel, border: `1px solid ${factionColor}`,
      borderRadius: 10, padding: 16, marginBottom: 20,
    }}>
      {/* header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <span style={{ fontSize: 18, marginRight: 8 }}>{factionIcon}</span>
          <span style={{ fontSize: 14, fontFamily: "'Georgia',serif", color: factionText, fontWeight: 700 }}>
            {factionName}
          </span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: 11, color: P.dim }}>
            Deck: {deckTotal} cartas · {deckUnique.length} tipos únicos
          </span>
        </div>
      </div>

      {/* deck composition bar */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: P.dim, marginBottom: 4 }}>Composición del mazo</div>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {Object.entries(deckByCard)
            .sort((a, b) => (LIB[a[0]]?.stage ?? 0) - (LIB[b[0]]?.stage ?? 0) || LIB[a[0]]?.cost - LIB[b[0]]?.cost)
            .map(([id, cnt]) => (
              <span key={id} style={{
                fontSize: 10, padding: '2px 8px', borderRadius: 4,
                background: P.panel2, border: `1px solid ${P.border}`, color: P.gold,
              }}>
                {LIB[id]?.name} ×{cnt}
              </span>
            ))}
        </div>
      </div>

      {/* cards by chain / flat list */}
      {isMut ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {getChains('M').map(chain => (
            <div key={chain[0].id}>
              <div style={{ fontSize: 10, color: P.dim, marginBottom: 6, fontFamily: 'monospace' }}>
                CADENA · {chain[0].name} → {chain[chain.length - 1].name}
              </div>
              <EvolutionChain chain={chain} />
            </div>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {Object.values(LIB)
            .filter(c => c.faction === 'A')
            .sort((a, b) => a.cost - b.cost)
            .map(card => (
              <CardBox key={card.id} card={card} deckCnt={deckCount(card.id)} />
            ))}
        </div>
      )}
    </div>
  )
}

function DeckStats() {
  const mDeck = BASE_DECK_M
  const aDeck = BASE_DECK_A
  const mCards = Object.values(LIB).filter(c => c.faction === 'M')
  const aCards = Object.values(LIB).filter(c => c.faction === 'A')

  const mLarvae = mCards.filter(c => c.stage === 0)
  const avgMCost = (mDeck.reduce((s, id) => s + LIB[id].cost, 0) / mDeck.length).toFixed(2)
  const avgACost = (aDeck.reduce((s, id) => s + LIB[id].cost, 0) / aDeck.length).toFixed(2)

  const rows = [
    ['Cartas en el mazo',     `${mDeck.length}`, `${aDeck.length}`],
    ['Tipos de carta',        `${[...new Set(mDeck)].length}`, `${[...new Set(aDeck)].length}`],
    ['Coste promedio mazo',   avgMCost, avgACost],
    ['Cartas en biblioteca',  `${mCards.length}`, `${aCards.length}`],
    ['Cadenas de evolución',  `${mLarvae.length}`, '—'],
  ]

  return (
    <div style={{
      background: P.panel, border: `1px solid ${P.border}`,
      borderRadius: 10, padding: 14, marginBottom: 20,
    }}>
      <div style={{ fontSize: 12, color: P.gold, fontFamily: "'Georgia',serif", marginBottom: 10 }}>
        📊 Estadísticas del pool de cartas
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ textAlign:'left', color: P.dim, padding:'3px 8px', borderBottom:`1px solid ${P.border}` }}></th>
            <th style={{ textAlign:'center', color: P.mText, padding:'3px 8px', borderBottom:`1px solid ${P.border}` }}>Mutables</th>
            <th style={{ textAlign:'center', color: P.aText, padding:'3px 8px', borderBottom:`1px solid ${P.border}` }}>Acechadores</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([label, m, a]) => (
            <tr key={label}>
              <td style={{ color: P.dim, padding:'4px 8px' }}>{label}</td>
              <td style={{ textAlign:'center', color: P.gold, padding:'4px 8px' }}>{m}</td>
              <td style={{ textAlign:'center', color: P.gold, padding:'4px 8px' }}>{a}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─── VISTA PRINCIPAL ──────────────────────────────────────────────────────────
export default function CardView() {
  const [faction, setFaction] = useState('both')

  const tabs = [
    { id: 'both',  label: '🌐 Ambas' },
    { id: 'M',     label: '🐛 Mutables' },
    { id: 'A',     label: '🕷️ Acechadores' },
    { id: 'stats', label: '📊 Estadísticas' },
  ]

  return (
    <div style={{ background: P.bg, minHeight: '100vh', padding: 20, fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* título */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{
            margin: 0, fontSize: 20, color: P.gold,
            fontFamily: "'Georgia',serif", letterSpacing: 2,
          }}>
            BIBLIOTECA DE CARTAS
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: P.dim }}>
            Pool completo · cadenas de evolución · composición de mazos
          </p>
        </div>

        {/* tabs de facción */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setFaction(t.id)} style={{
              padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
              fontFamily: "'Georgia',serif",
              background: faction === t.id ? P.panel2 : 'transparent',
              color:      faction === t.id ? P.gold   : P.dim,
              border:     `1px solid ${faction === t.id ? P.accent : 'transparent'}`,
              fontWeight: faction === t.id ? 700 : 400,
            }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* contenido */}
        {faction === 'stats' && <DeckStats />}
        {(faction === 'both' || faction === 'M') && <FactionSection faction="M" />}
        {(faction === 'both' || faction === 'A') && <FactionSection faction="A" />}

        {/* nota de balance */}
        <div style={{
          background: P.panel, border: `1px solid ${P.border}`,
          borderRadius: 8, padding: 12, fontSize: 11, color: P.dim,
          lineHeight: 1.6,
        }}>
          <span style={{ color: P.accent }}>⚖ Balance actual (500 partidas, sim):</span>
          {' '}Mutables CONTROL/META/TEMPO ganan ~40-70% vs Acechadores AGGRO/CONTROL/TEMPO.
          {' '}AGGRO de Mutables sigue en 0% porque las larvas se convierten en pupas (ATK 0) sin llegar a adulto.
          {' '}Agregar más cadenas de evolución o cartas con traits en larva/adulto podría mejorar las opciones tácticas.
        </div>
      </div>
    </div>
  )
}
