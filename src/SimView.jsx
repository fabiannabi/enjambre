import { useState, useCallback } from 'react'
import { LIB, STRATEGIES, runMatchup } from './engine.js'

const STRAT_NAMES = Object.keys(STRATEGIES)
const GAME_OPTIONS = [200, 500, 1000, 3000]

// ─── COLORES ─────────────────────────────────────────────────────────────────
const C = {
  bg:       '#13110d',
  surface:  '#1a1710',
  card:     '#1e1a12',
  border:   '#2e2818',
  text:     '#d4c89a',
  muted:    '#6a5e42',
  green:    '#5a9e4a',
  greenBg:  '#1a2e14',
  red:      '#9e3a2a',
  redBg:    '#2e1410',
  amber:    '#c8a84b',
  amberBg:  '#2e2410',
  fM:       '#5a8a44',   // Mutables
  fA:       '#8b3a1a',   // Acechadores
}

function winColor(wr) {
  if (wr > 0.60) return { bg: C.greenBg, border: C.green, text: C.green }
  if (wr < 0.40) return { bg: C.redBg,   border: C.red,   text: C.red   }
  return { bg: C.amberBg, border: C.amber, text: C.amber }
}

// ─── BARRAS HORIZONTALES ─────────────────────────────────────────────────────
function Bar({ value, max, color = C.amber, height = 8 }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div style={{ flex:1, height, background:'#2a2217', borderRadius:4, overflow:'hidden' }}>
      <div style={{ width:`${pct}%`, height:'100%', background:color, borderRadius:4, transition:'width .4s' }} />
    </div>
  )
}

// ─── HISTOGRAMA DE DURACIÓN ───────────────────────────────────────────────────
function TurnHistogram({ turnDist }) {
  const entries = Object.entries(turnDist).map(([t,n]) => [Number(t), n]).sort((a,b) => a[0]-b[0])
  if (!entries.length) return null
  const maxN = Math.max(...entries.map(([,n]) => n))
  return (
    <div>
      <div style={{ fontSize:11, color:C.muted, marginBottom:6, letterSpacing:1 }}>DURACIÓN (turnos)</div>
      <div style={{ display:'flex', alignItems:'flex-end', gap:2, height:60 }}>
        {entries.map(([t, n]) => {
          const h = Math.round((n / maxN) * 52)
          return (
            <div key={t} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2 }}>
              <div style={{ width:22, height:h, background:C.amber, borderRadius:'3px 3px 0 0',
                opacity:0.7+0.3*(n/maxN) }} title={`T${t}: ${n} partidas`} />
              <div style={{ fontSize:9, color:C.muted }}>{t}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── EMBUDO DE METAMORFOSIS ───────────────────────────────────────────────────
function MetaFunnel({ cards, games }) {
  const larvae = ['la','lb','lc','ld']
  const pupas  = ['pa','pb','pc','pd']
  const adults = ['aa','ab','ac','ad']

  const sum = ids => ids.reduce((s,id) => s + (cards[id]?.played || 0), 0)
  const sumEvol = ids => ids.reduce((s,id) => s + (cards[id]?.evolved || 0), 0)

  const lCount = sum(larvae)
  const pCount = sumEvol(larvae)   // pupas creadas = larvas evolucionadas
  const aCount = sumEvol(pupas)    // adultos creados = pupas evolucionadas
  const max = Math.max(lCount, 1)

  const level = (label, count, color, icon) => (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
      <div style={{ fontSize:18 }}>{icon}</div>
      <div style={{ width: `${Math.max(8, (count/max)*120)}px`, height:22,
        background:color, borderRadius:4, transition:'width .4s',
        display:'flex', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:10, color:'#fff', fontWeight:700 }}>{count}</span>
      </div>
      <div style={{ fontSize:10, color:C.muted }}>{label}</div>
      <div style={{ fontSize:10, color:C.text }}>{games > 0 ? `${(count/games).toFixed(1)}/partida` : ''}</div>
    </div>
  )

  return (
    <div>
      <div style={{ fontSize:11, color:C.muted, marginBottom:10, letterSpacing:1 }}>METAMORFOSIS</div>
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        {level('Larvas', lCount, '#4a6a2a', '🐛')}
        <div style={{ color:C.muted, fontSize:16 }}>→</div>
        {level('Pupas', pCount, '#3a5a6a', '🫘')}
        <div style={{ color:C.muted, fontSize:16 }}>→</div>
        {level('Adultos', aCount, '#5a3a8a', '🪲')}
      </div>
      <div style={{ marginTop:8, fontSize:11, color:C.muted }}>
        {lCount > 0
          ? `${((pCount/lCount)*100).toFixed(0)}% llegan a pupa · ${((aCount/lCount)*100).toFixed(0)}% llegan a adulto`
          : '—'}
      </div>
    </div>
  )
}

// ─── TABLA DE CARTAS ──────────────────────────────────────────────────────────
function CardTable({ cards, games }) {
  const list = Object.values(cards)
    .filter(c => c.played > 0)
    .sort((a,b) => b.played - a.played)

  const maxKills  = Math.max(1, ...list.map(c => c.kills))
  const maxDeaths = Math.max(1, ...list.map(c => c.deaths))
  const maxDmg    = Math.max(1, ...list.map(c => c.damageDealt))

  return (
    <div>
      <div style={{ fontSize:11, color:C.muted, marginBottom:8, letterSpacing:1 }}>RENDIMIENTO DE CARTAS</div>
      <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
        {list.map(c => {
          const fColor = c.faction === 'M' ? C.fM : C.fA
          const kd = c.deaths > 0 ? (c.kills / c.deaths).toFixed(1) : c.kills > 0 ? '∞' : '0'
          const isPupa = LIB[c.id]?.traits.includes('pupa')
          return (
            <div key={c.id} style={{ background:C.card, border:`1px solid ${C.border}`,
              borderRadius:6, padding:'8px 10px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                <span style={{ fontSize:10, color:fColor, fontWeight:700, minWidth:14 }}>
                  {c.faction}
                </span>
                <span style={{ fontSize:12, color:C.text, flex:1 }}>{c.name}</span>
                {isPupa && <span style={{ fontSize:9, color:C.muted, background:'#2a2217', padding:'1px 4px', borderRadius:3 }}>pupa</span>}
                <span style={{ fontSize:10, color:C.muted }}>×{(c.played/games).toFixed(1)}/p</span>
                <span style={{ fontSize:11, color: Number(kd) > 2 ? '#c8a84b' : C.muted }}>
                  KD {kd}
                </span>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:C.green, width:40 }}>kills</span>
                  <Bar value={c.kills} max={maxKills} color={C.green} />
                  <span style={{ fontSize:10, color:C.muted, width:36, textAlign:'right' }}>{c.kills}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:C.red, width:40 }}>muertes</span>
                  <Bar value={c.deaths} max={maxDeaths} color={C.red} />
                  <span style={{ fontSize:10, color:C.muted, width:36, textAlign:'right' }}>{c.deaths}</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <span style={{ fontSize:10, color:C.amber, width:40 }}>daño</span>
                  <Bar value={c.damageDealt} max={maxDmg} color={C.amber} />
                  <span style={{ fontSize:10, color:C.muted, width:36, textAlign:'right' }}>{c.damageDealt}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── FLAGS DE BALANCE ────────────────────────────────────────────────────────
function BalanceFlags({ stats }) {
  const { games, mWins, aWins, totalTurns, tiempoUsed, alimentarUsed, cards } = stats
  const mwr = mWins / games
  const avgT = totalTurns / games
  const flags = []

  if (mwr > 0.62) flags.push({ type:'warn', msg:`Mutables dominan (${(mwr*100).toFixed(0)}%) — revisar curva de metamorfosis` })
  if (mwr < 0.38) flags.push({ type:'warn', msg:`Acechadores dominan (${((1-mwr)*100).toFixed(0)}%) — aggro excesivo o bajo costo` })
  if (Math.abs(mwr - 0.5) < 0.06) flags.push({ type:'ok', msg:`Matchup equilibrado (~50%)` })
  if (avgT < 5)  flags.push({ type:'warn', msg:`Juego muy corto (${avgT.toFixed(1)} turnos) — posible aggro rompiendo` })
  if (avgT > 18) flags.push({ type:'warn', msg:`Juego muy largo (${avgT.toFixed(1)} turnos) — posible stall` })

  const larvae = ['la','lb','lc','ld']
  const lPlayed = larvae.reduce((s,id) => s+(cards[id]?.played||0), 0)
  const lEvol   = larvae.reduce((s,id) => s+(cards[id]?.evolved||0), 0)
  const pupas   = ['pa','pb','pc','pd']
  const aCount  = pupas.reduce((s,id) => s+(cards[id]?.evolved||0), 0)

  if (lPlayed > 0) {
    const evolPct = lEvol / lPlayed
    const adultPct = aCount / lPlayed
    if (evolPct < 0.3) flags.push({ type:'warn', msg:`Solo ${(evolPct*100).toFixed(0)}% de larvas evolucionan — metamorfosis no viable` })
    if (adultPct < 0.1) flags.push({ type:'warn', msg:`Solo ${(adultPct*100).toFixed(0)}% llegan a adulto — la pupa muere antes de madurar` })
    if (adultPct > 0.3) flags.push({ type:'ok', msg:`${(adultPct*100).toFixed(0)}% de larvas llegan a adulto — metamorfosis viable` })
  }

  if (tiempoUsed / games < 0.5) flags.push({ type:'warn', msg:`Tiempo poco usado (${(tiempoUsed/games).toFixed(1)}/partida) — mecánica infrautilizada` })
  if (alimentarUsed / games < 0.5 && lPlayed > 0) flags.push({ type:'warn', msg:`Alimentar casi sin uso — criaturas mueren antes de poder evolucionar dos veces` })

  const cardList = Object.values(cards).filter(c => c.played > 20)
  for (const c of cardList) {
    if (c.deaths === 0 && c.kills > 0) flags.push({ type:'warn', msg:`${c.name}: nunca muere en combate — posiblemente sobredurabilidad` })
    const kd = c.deaths > 0 ? c.kills/c.deaths : c.kills
    if (kd > 4) flags.push({ type:'warn', msg:`${c.name}: KD ratio ${kd.toFixed(1)} — puede estar sobretuneada` })
  }

  if (!flags.length) flags.push({ type:'ok', msg:'Sin señales críticas en este matchup' })

  return (
    <div>
      <div style={{ fontSize:11, color:C.muted, marginBottom:8, letterSpacing:1 }}>SEÑALES DE BALANCE</div>
      <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
        {flags.map((f, i) => (
          <div key={i} style={{
            background: f.type === 'ok' ? '#152510' : '#251510',
            border: `1px solid ${f.type === 'ok' ? '#2a4a20' : '#4a2010'}`,
            borderRadius:6, padding:'7px 10px', fontSize:12,
            color: f.type === 'ok' ? C.green : '#c87a4a',
          }}>
            {f.type === 'ok' ? '✓' : '⚠'} {f.msg}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── DETALLE DE MATCHUP ───────────────────────────────────────────────────────
function MatchupDetail({ stats, matchup }) {
  const [mS, aS] = matchup.split(':')
  const { games, mWins, aWins, totalTurns, winnerHpSum, tiempoUsed, alimentarUsed } = stats
  const mwr = mWins / games
  const col = winColor(mwr)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div style={{ background:C.surface, border:`1px solid ${col.border}`, borderRadius:8, padding:'12px 14px' }}>
        <div style={{ fontSize:13, color:C.muted, marginBottom:8 }}>
          Mutables <span style={{ color:C.fM, fontWeight:700 }}>[{mS}]</span>
          {' vs '}
          Acechadores <span style={{ color:C.fA, fontWeight:700 }}>[{aS}]</span>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:16 }}>
          <Stat label="Mutables" value={`${(mwr*100).toFixed(1)}%`} color={col.text} big />
          <Stat label="Acechadores" value={`${((1-mwr)*100).toFixed(1)}%`} color={C.fA} big />
          <Stat label="Turnos prom" value={(totalTurns/games).toFixed(1)} />
          <Stat label="HP ganador prom" value={(winnerHpSum/games).toFixed(1)} />
          <Stat label="Tiempo/partida" value={(tiempoUsed/games).toFixed(1)} />
          <Stat label="Alimentar/partida" value={(alimentarUsed/games).toFixed(1)} />
        </div>

        <div style={{ marginTop:12, display:'flex', alignItems:'center', gap:8 }}>
          <Bar value={mWins} max={games} color={C.fM} height={12} />
          <span style={{ fontSize:10, color:C.muted, whiteSpace:'nowrap' }}>{games} partidas</span>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div style={{ background:C.surface, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
          <TurnHistogram turnDist={stats.turnDist} />
        </div>
        <div style={{ background:C.surface, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
          <MetaFunnel cards={stats.cards} games={games} />
        </div>
      </div>

      <div style={{ background:C.surface, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
        <BalanceFlags stats={stats} />
      </div>

      <div style={{ background:C.surface, borderRadius:8, padding:12, border:`1px solid ${C.border}` }}>
        <CardTable cards={stats.cards} games={games} />
      </div>
    </div>
  )
}

function Stat({ label, value, color = C.text, big }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
      <div style={{ fontSize:10, color:C.muted }}>{label}</div>
      <div style={{ fontSize: big ? 20 : 14, color, fontWeight: big ? 700 : 400 }}>{value}</div>
    </div>
  )
}

// ─── MATRIZ DE WINRATES ───────────────────────────────────────────────────────
function WinrateMatrix({ results, selected, onSelect }) {
  return (
    <div>
      <div style={{ fontSize:11, color:C.muted, marginBottom:8, letterSpacing:1 }}>
        WINRATE MUTABLES — clic para ver detalle
      </div>
      <div style={{ overflowX:'auto' }}>
        <table style={{ borderCollapse:'separate', borderSpacing:3 }}>
          <thead>
            <tr>
              <th style={{ fontSize:10, color:C.muted, padding:'4px 8px', textAlign:'left' }}>M \ A →</th>
              {STRAT_NAMES.map(aS => (
                <th key={aS} style={{ fontSize:10, color:C.fA, padding:'4px 8px', textAlign:'center' }}>{aS}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {STRAT_NAMES.map(mS => (
              <tr key={mS}>
                <td style={{ fontSize:10, color:C.fM, padding:'4px 8px', fontWeight:700 }}>{mS}</td>
                {STRAT_NAMES.map(aS => {
                  const key = `${mS}:${aS}`
                  const st = results[key]
                  if (!st) return <td key={aS} />
                  const wr = st.mWins / st.games
                  const col = winColor(wr)
                  const isSelected = selected === key
                  return (
                    <td key={aS}
                      onClick={() => onSelect(key)}
                      style={{
                        background: isSelected ? col.border : col.bg,
                        border: `2px solid ${isSelected ? C.text : col.border}`,
                        borderRadius:6, padding:'8px 12px', textAlign:'center',
                        cursor:'pointer', fontSize:13, fontWeight:700,
                        color: isSelected ? '#fff' : col.text,
                        transition:'all .15s',
                      }}>
                      {(wr*100).toFixed(0)}%
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ fontSize:10, color:C.muted, marginTop:6 }}>
        <span style={{ color:C.green }}>■ verde</span> = Mutables dominan ·{' '}
        <span style={{ color:C.red }}>■ rojo</span> = Acechadores dominan ·{' '}
        <span style={{ color:C.amber }}>■ ámbar</span> = equilibrado
      </div>
    </div>
  )
}

// ─── VISTA PRINCIPAL ─────────────────────────────────────────────────────────
export default function SimView() {
  const [numGames, setNumGames] = useState(500)
  const [running,  setRunning]  = useState(false)
  const [results,  setResults]  = useState(null)
  const [selected, setSelected] = useState(null)
  const [elapsed,  setElapsed]  = useState(null)

  const runSim = useCallback(() => {
    setRunning(true); setResults(null); setElapsed(null)
    setTimeout(() => {
      const t0 = performance.now()
      const r = {}
      for (const mS of STRAT_NAMES)
        for (const aS of STRAT_NAMES)
          r[`${mS}:${aS}`] = runMatchup(mS, aS, numGames)
      setResults(r)
      setSelected('CONTROL:AGGRO')
      setElapsed(((performance.now() - t0) / 1000).toFixed(2))
      setRunning(false)
    }, 30)
  }, [numGames])

  return (
    <div style={{ background:C.bg, minHeight:'100dvh', color:C.text, fontFamily:"'Georgia',serif", padding:'12px 10px' }}>

      {/* Header */}
      <div style={{ marginBottom:16 }}>
        <div style={{ fontSize:18, fontWeight:700, color:C.amber, marginBottom:4 }}>
          Simulador de Balance
        </div>
        <div style={{ fontSize:12, color:C.muted }}>
          Mutables vs Acechadores · {STRAT_NAMES.length ** 2} matchups
        </div>
      </div>

      {/* Controles */}
      <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:8, marginBottom:20 }}>
        <span style={{ fontSize:12, color:C.muted }}>Partidas:</span>
        {GAME_OPTIONS.map(n => (
          <button key={n} onClick={() => setNumGames(n)} style={{
            background: numGames === n ? C.amber : C.surface,
            color: numGames === n ? '#13110d' : C.text,
            border:`1px solid ${numGames === n ? C.amber : C.border}`,
            borderRadius:6, padding:'5px 12px', cursor:'pointer',
            fontSize:12, fontFamily:'inherit', fontWeight: numGames === n ? 700 : 400,
          }}>{n}</button>
        ))}
        <button onClick={runSim} disabled={running} style={{
          background: running ? '#2a2217' : '#3a5a2a',
          color: running ? C.muted : C.text,
          border:`1px solid ${running ? C.border : '#5a8a44'}`,
          borderRadius:6, padding:'7px 20px', cursor: running ? 'wait' : 'pointer',
          fontSize:13, fontFamily:'inherit', fontWeight:700,
        }}>
          {running ? '⏳ Simulando...' : '⚡ Simular'}
        </button>
        {elapsed && !running && (
          <span style={{ fontSize:11, color:C.muted }}>{elapsed}s · {(numGames * STRAT_NAMES.length ** 2).toLocaleString()} partidas</span>
        )}
      </div>

      {/* Spinner */}
      {running && (
        <div style={{ textAlign:'center', padding:'40px 0', color:C.muted, fontSize:13 }}>
          Corriendo {(numGames * STRAT_NAMES.length**2).toLocaleString()} partidas…
        </div>
      )}

      {/* Resultados */}
      {results && (
        <div style={{ display:'grid', gridTemplateColumns:'auto 1fr', gap:20, alignItems:'start' }}>
          {/* Columna izquierda: matriz */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:'12px 14px' }}>
            <WinrateMatrix results={results} selected={selected} onSelect={setSelected} />
          </div>

          {/* Columna derecha: detalle */}
          {selected && (
            <div style={{ minWidth:0 }}>
              <MatchupDetail stats={results[selected]} matchup={selected} />
            </div>
          )}
        </div>
      )}

      {/* Estado vacío */}
      {!results && !running && (
        <div style={{ textAlign:'center', padding:'60px 0', color:C.muted }}>
          <div style={{ fontSize:32, marginBottom:12 }}>🔬</div>
          <div style={{ fontSize:13 }}>Elegí cuántas partidas y presioná Simular</div>
        </div>
      )}
    </div>
  )
}
