import { useState, useEffect } from 'react'

// ─── HELPERS ──────────────────────────────────────────────────────────────────
let _uid = 0
const mkUid = () => `c${++_uid}`

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function life(c) { return LIB[c.cardId].vida - c.damage }

// ─── CARD LIBRARY ─────────────────────────────────────────────────────────────
const LIB = {
  // Los Mutables — holometábolos (larva → pupa → adulto)
  la: { id:'la', name:'Larva Escarabajo', cost:1, atk:1, vida:2, art:'🐛', faction:'M', type:'holo', next:'pa', traits:[] },
  pa: { id:'pa', name:'Pupa Escarabajo',  cost:0, atk:0, vida:3, art:'🫘', faction:'M', type:'holo', next:'aa', traits:['pupa'] },
  aa: { id:'aa', name:'Escarabajo Cornudo', cost:0, atk:3, vida:4, art:'🪲', faction:'M', type:'holo', next:null, traits:[] },

  lb: { id:'lb', name:'Larva Voraz',    cost:1, atk:2, vida:1, art:'🐛', faction:'M', type:'holo', next:'pb', traits:[] },
  pb: { id:'pb', name:'Pupa Blindada',  cost:0, atk:0, vida:3, art:'🫘', faction:'M', type:'holo', next:'ab', traits:['pupa'] },
  ab: { id:'ab', name:'Escarabajo Blindado', cost:0, atk:4, vida:2, art:'🪲', faction:'M', type:'holo', next:null, traits:[] },

  lc: { id:'lc', name:'Oruga de Seda', cost:2, atk:1, vida:3, art:'🐛', faction:'M', type:'holo', next:'pc', traits:[] },
  pc: { id:'pc', name:'Crisálida',     cost:0, atk:0, vida:4, art:'🫘', faction:'M', type:'holo', next:'ac', traits:['pupa'] },
  ac: { id:'ac', name:'Mariposa Lunar', cost:0, atk:2, vida:3, art:'🦋', faction:'M', type:'holo', next:null, traits:['volar'] },

  ld: { id:'ld', name:'Larva Tenaz',  cost:1, atk:1, vida:3, art:'🐛', faction:'M', type:'holo', next:'pd', traits:[] },
  pd: { id:'pd', name:'Pupa Dura',    cost:0, atk:0, vida:5, art:'🫘', faction:'M', type:'holo', next:'ad', traits:['pupa'] },
  ad: { id:'ad', name:'Escarabajo Tenaz', cost:0, atk:3, vida:6, art:'🪲', faction:'M', type:'holo', next:null, traits:[] },

  // Acechadores — arácnidos (desarrollo directo)
  sc: { id:'sc', name:'Escorpión Menor', cost:1, atk:1, vida:2, art:'🦂', faction:'A', type:'directo', next:null, traits:['ag1'] },
  sa: { id:'sa', name:'Araña Saltarina', cost:1, atk:2, vida:1, art:'🕷️', faction:'A', type:'directo', next:null, traits:[] },
  st: { id:'st', name:'Araña Tejedora',  cost:2, atk:1, vida:4, art:'🕸️', faction:'A', type:'directo', next:null, traits:['tela'] },
  tr: { id:'tr', name:'Tarántula',       cost:3, atk:3, vida:3, art:'🕷️', faction:'A', type:'directo', next:null, traits:[] },
  sM: { id:'sM', name:'Escorpión Mayor', cost:4, atk:4, vida:4, art:'🦂', faction:'A', type:'directo', next:null, traits:['ag2'] },
}

const BASE_DECK_M = [
  'la','la','la','la',
  'lb','lb','lb',
  'lc','lc','lc',
  'ld','ld','ld','ld',
  'la','lb','lc','ld','la','lb',
]

const BASE_DECK_A = [
  'sc','sc','sc','sc',
  'sa','sa','sa','sa',
  'st','st','st',
  'tr','tr','tr',
  'sM','sM',
  'sc','sa','tr','sM',
]

// ─── INIT ─────────────────────────────────────────────────────────────────────
function initGame() {
  const pDeck = shuffle([...BASE_DECK_M])
  const oDeck = shuffle([...BASE_DECK_A])
  return {
    phase: 'player',  // 'player' | 'opp' | 'over'
    winner: null,
    turn: 1,
    P: { hp:20, biomasa:1, maxB:1, hand:pDeck.splice(0,3), board:[], deck:pDeck },
    O: { hp:20, biomasa:1, maxB:1, hand:oDeck.splice(0,3), board:[], deck:oDeck },
    sel: null,       // uid of selected attacker
    log: ['⟳ Turno 1 — Los Mutables atacan primero.'],
  }
}

// ─── APP ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [G, setG] = useState(initGame)

  function addLog(msg, g) {
    return { ...g, log: [msg, ...g.log].slice(0, 50) }
  }

  // ── Win check ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (G.phase === 'over') return
    if (G.O.hp <= 0) {
      setG(p => addLog('🏆 ¡Los Mutables ganan!', { ...p, phase:'over', winner:'player' }))
    } else if (G.P.hp <= 0) {
      setG(p => addLog('💀 Los Acechadores dominan.', { ...p, phase:'over', winner:'opp' }))
    }
  }, [G.O.hp, G.P.hp, G.phase])

  // ── AI turn ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (G.phase !== 'opp') return
    const t = setTimeout(() => {
      setG(prev => {
        if (prev.phase !== 'opp') return prev

        let oppB  = prev.O.biomasa
        let oHand = [...prev.O.hand]
        let oBoard = [...prev.O.board]
        let pBoard = [...prev.P.board]
        let pHp   = prev.P.hp
        const msgs = []

        // Play cards (greedy, most expensive first)
        const sorted = oHand
          .map((id, i) => ({ id, i }))
          .sort((a, b) => LIB[b.id].cost - LIB[a.id].cost)

        const used = new Set()
        for (const { id, i } of sorted) {
          const card = LIB[id]
          if (card.cost <= oppB && oBoard.length < 5 && !used.has(i)) {
            oBoard.push({ uid:mkUid(), cardId:id, damage:0, hasAtk:false, canAtk:false, fed:false, trapped:false, fresh:true })
            oppB -= card.cost
            used.add(i)
            msgs.push(`Rival juega ${card.name}.`)
            if (card.traits.includes('ag1')) { pHp -= 1; msgs.push('⸸ Aguijón: 1 daño al héroe.') }
            if (card.traits.includes('ag2')) { pHp -= 2; msgs.push('⸸ Aguijón: 2 daño al héroe.') }
          }
        }
        oHand = oHand.filter((_, i) => !used.has(i))

        // Attack
        const deadP = new Set(), deadO = new Set()
        for (let i = 0; i < oBoard.length; i++) {
          const att = oBoard[i]
          if (!att.canAtk || att.hasAtk || deadO.has(att.uid)) continue
          const aC = LIB[att.cardId]
          if (aC.traits.includes('pupa')) continue

          const targets = pBoard.filter(c => !deadP.has(c.uid))
          if (targets.length > 0) {
            const kill = targets.find(c => aC.atk >= life(c))
            const def  = kill || targets.reduce((w, c) => life(c) < life(w) ? c : w)
            const dC   = LIB[def.cardId]
            msgs.push(`Rival: ${aC.name} ⚔ ${dC.name}`)
            oBoard[i] = { ...att, damage: att.damage + dC.atk, hasAtk: true }
            const di = pBoard.findIndex(c => c.uid === def.uid)
            pBoard[di] = { ...def, damage: def.damage + aC.atk }
            if (oBoard[i].damage >= LIB[att.cardId].vida) deadO.add(att.uid)
            if (pBoard[di].damage >= dC.vida) deadP.add(def.uid)
          } else {
            pHp -= aC.atk
            oBoard[i] = { ...att, hasAtk: true }
            msgs.push(`Rival: ${aC.name} ataca directo. (${aC.atk} daño)`)
          }
        }
        oBoard = oBoard.filter(c => !deadO.has(c.uid))
        pBoard = pBoard.filter(c => !deadP.has(c.uid))

        const newTurn  = prev.turn + 1
        const newPMaxB = Math.min(10, prev.P.maxB + 1)
        let pDeck = [...prev.P.deck], pHand = [...prev.P.hand]
        if (pDeck.length) pHand.push(pDeck.shift())

        const newPBoard = pBoard.map(c => ({ ...c, hasAtk:false, canAtk:true, fed:false, fresh:false, trapped:false }))

        let phase = 'player', winner = null
        if (pHp <= 0) { phase = 'over'; winner = 'opp' }

        const newLog = [`⟳ Turno ${newTurn}.`, ...msgs, ...prev.log].slice(0, 50)
        return {
          ...prev, phase, winner, turn: newTurn,
          P: { ...prev.P, hp:pHp, hand:pHand, deck:pDeck, board:newPBoard, biomasa:newPMaxB, maxB:newPMaxB },
          O: { ...prev.O, biomasa:oppB, hand:oHand, board:oBoard },
          sel: null, log: newLog,
        }
      })
    }, 900)
    return () => clearTimeout(t)
  }, [G.phase])

  // ── Player actions ────────────────────────────────────────────────────────
  function playCard(idx) {
    if (G.phase !== 'player') return
    const cardId = G.P.hand[idx]
    const card = LIB[cardId]
    if (G.P.biomasa < card.cost || G.P.board.length >= 5) return

    setG(prev => {
      const hand = [...prev.P.hand]
      hand.splice(idx, 1)
      const creature = { uid:mkUid(), cardId, damage:0, hasAtk:false, canAtk:false, fed:false, trapped:false, fresh:true }

      let oppHp = prev.O.hp
      let msg = `Juegas ${card.name}.`
      if (card.traits.includes('ag1')) { oppHp -= 1; msg += ' ⸸ Aguijón: 1 daño.' }
      if (card.traits.includes('ag2')) { oppHp -= 2; msg += ' ⸸ Aguijón: 2 daño.' }

      const g = {
        ...prev,
        P: { ...prev.P, hand, board:[...prev.P.board, creature], biomasa: prev.P.biomasa - card.cost },
        O: { ...prev.O, hp: oppHp },
        sel: null,
      }
      return addLog(msg, g)
    })
  }

  function feed(uid) {
    if (G.phase !== 'player') return
    setG(prev => {
      const idx = prev.P.board.findIndex(c => c.uid === uid)
      if (idx < 0) return prev
      const c = prev.P.board[idx]
      const card = LIB[c.cardId]
      if (!card.next || c.fed) return prev

      const isFree = c.fresh
      if (!isFree && prev.P.biomasa < 2) return prev

      const nextCard = LIB[card.next]
      const newBoard = [...prev.P.board]
      const evolved = { ...c, cardId:card.next, fed:true, fresh:false, hasAtk:false }
      // remove if damage killed it at new stage (edge case: next stage has lower vida)
      if (life(evolved) <= 0) {
        newBoard.splice(idx, 1)
        const g = { ...prev, P: { ...prev.P, board:newBoard, biomasa: prev.P.biomasa - (isFree?0:2) } }
        return addLog(`${nextCard.name} sucumbe al mudar.`, g)
      }
      newBoard[idx] = evolved

      const msg = isFree
        ? `⏱ Tiempo: ${card.name} → ${nextCard.name} (gratis).`
        : `Alimentas ${card.name} → ${nextCard.name}. (−2 biomasa)`
      const g = { ...prev, P: { ...prev.P, board:newBoard, biomasa: prev.P.biomasa - (isFree?0:2) } }
      return addLog(msg, g)
    })
  }

  function selectAttacker(uid) {
    if (G.phase !== 'player') return
    const c = G.P.board.find(c => c.uid === uid)
    if (!c || !c.canAtk || c.hasAtk || c.trapped || LIB[c.cardId].traits.includes('pupa')) return
    setG(p => ({ ...p, sel: p.sel === uid ? null : uid }))
  }

  function attackCreature(uid) {
    if (G.phase !== 'player' || !G.sel) return
    const attUid = G.sel

    setG(prev => {
      const ai = prev.P.board.findIndex(c => c.uid === attUid)
      const di = prev.O.board.findIndex(c => c.uid === uid)
      if (ai < 0 || di < 0) return prev

      const att = prev.P.board[ai]; const def = prev.O.board[di]
      const aC = LIB[att.cardId];   const dC  = LIB[def.cardId]

      let pBoard = [...prev.P.board]
      let oBoard = [...prev.O.board]
      pBoard[ai] = { ...att, damage: att.damage + dC.atk, hasAtk: true }
      oBoard[di] = { ...def, damage: def.damage + aC.atk,
        trapped: def.trapped || aC.traits.includes('tela') }

      let msg = `${aC.name} ⚔ ${dC.name}.`
      if (aC.traits.includes('tela')) msg += ' 🕸 Tela: atrapado.'

      pBoard = pBoard.filter(c => life(c) > 0)
      oBoard = oBoard.filter(c => life(c) > 0)

      const g = { ...prev, P:{...prev.P, board:pBoard}, O:{...prev.O, board:oBoard}, sel:null }
      return addLog(msg, g)
    })
  }

  function attackFace() {
    if (G.phase !== 'player' || !G.sel) return
    const att = G.P.board.find(c => c.uid === G.sel)
    if (!att) return
    const aC = LIB[att.cardId]
    if (G.O.board.length > 0 && !aC.traits.includes('volar')) return

    setG(prev => {
      const pBoard = prev.P.board.map(c => c.uid === att.uid ? {...c, hasAtk:true} : c)
      const msg = `${aC.name} ataca directo al rival. (${aC.atk} daño)`
      const g = { ...prev, P:{...prev.P, board:pBoard}, O:{...prev.O, hp:prev.O.hp - aC.atk}, sel:null }
      return addLog(msg, g)
    })
  }

  function endTurn() {
    if (G.phase !== 'player') return
    setG(prev => {
      const newOMaxB = Math.min(10, prev.O.maxB + 1)
      let oDeck = [...prev.O.deck], oHand = [...prev.O.hand]
      if (oDeck.length) oHand.push(oDeck.shift())

      const oBoard = prev.O.board.map(c => ({
        ...c, hasAtk:false, canAtk:true, fed:false, fresh:false, trapped:false,
      }))
      const g = {
        ...prev, phase:'opp',
        O: { ...prev.O, biomasa:newOMaxB, maxB:newOMaxB, hand:oHand, deck:oDeck, board:oBoard },
        sel: null,
      }
      return addLog('— Fin de tu turno.', g)
    })
  }

  // ─── RENDER ───────────────────────────────────────────────────────────────
  const isOppTurn = G.phase === 'opp'
  const attCard   = G.sel ? LIB[G.P.board.find(c => c.uid === G.sel)?.cardId] : null
  const canHitFace = G.sel && (G.O.board.length === 0 || attCard?.traits.includes('volar'))

  return (
    <div style={S.root}>
      <style>{CSS}</style>

      {/* ── OPPONENT ──────────────────────────────────────────────── */}
      <section style={S.playerSection}>
        <div style={S.hpRow}>
          <span style={S.factionLabel}>⚔ Acechadores</span>
          <HpBar hp={G.O.hp} />
          <span style={S.biom}>🌿 {G.O.biomasa}/{G.O.maxB}</span>
          <span style={S.deckCount}>Mazo: {G.O.deck.length} | Mano: {G.O.hand.length}</span>
        </div>
        <div style={S.hand}>
          {G.O.hand.map((_, i) => (
            <div key={i} style={{ ...S.cardBack }} />
          ))}
        </div>
        <div style={S.board}>
          {G.O.board.map(c => (
            <Creature
              key={c.uid}
              c={c}
              isTarget={!!G.sel}
              onClick={() => attackCreature(c.uid)}
              side="opp"
            />
          ))}
          {G.O.board.length === 0 && <div style={S.emptyBoard}>— tablero vacío —</div>}
        </div>
      </section>

      {/* ── CONTROLS ──────────────────────────────────────────────── */}
      <section style={S.controls}>
        <div style={S.btnRow}>
          {G.phase === 'player' && (
            <>
              <button style={S.btnEnd} onClick={endTurn}>Fin de turno</button>
              {G.sel && (
                <button style={S.btnCancel} onClick={() => setG(p => ({...p, sel:null}))}>
                  Cancelar
                </button>
              )}
              {canHitFace && (
                <button style={S.btnAtk} onClick={attackFace}>
                  ⚔ Atacar héroe rival
                </button>
              )}
            </>
          )}
          {G.phase === 'opp' && <span style={S.aiLabel}>Turno del rival…</span>}
          {G.phase === 'over' && (
            <button style={S.btnEnd} onClick={() => setG(initGame())}>
              Nueva partida
            </button>
          )}
        </div>
        <div style={S.log}>
          {G.log.slice(0, 8).map((m, i) => (
            <div key={i} style={{ opacity: 1 - i * 0.12, fontSize: i === 0 ? 13 : 12 }}>{m}</div>
          ))}
        </div>
      </section>

      {/* ── PLAYER ────────────────────────────────────────────────── */}
      <section style={S.playerSection}>
        <div style={S.board}>
          {G.P.board.map(c => (
            <Creature
              key={c.uid}
              c={c}
              isSelected={G.sel === c.uid}
              onClick={() => selectAttacker(c.uid)}
              onFeed={() => feed(c.uid)}
              side="player"
              phase={G.phase}
            />
          ))}
          {G.P.board.length === 0 && <div style={S.emptyBoard}>— tablero vacío —</div>}
        </div>
        <div style={S.hand}>
          {G.P.hand.map((cardId, i) => (
            <HandCard
              key={i}
              cardId={cardId}
              canPlay={G.phase === 'player' && G.P.biomasa >= LIB[cardId].cost && G.P.board.length < 5}
              onClick={() => playCard(i)}
            />
          ))}
        </div>
        <div style={S.hpRow}>
          <span style={S.factionLabel}>🌿 Los Mutables</span>
          <HpBar hp={G.P.hp} />
          <span style={S.biom}>🌿 {G.P.biomasa}/{G.P.maxB}</span>
          <span style={S.deckCount}>Mazo: {G.P.deck.length}</span>
        </div>
      </section>

      {/* ── GAME OVER OVERLAY ─────────────────────────────────────── */}
      {G.phase === 'over' && (
        <div style={S.overlay}>
          <div style={S.overlayBox}>
            <div style={{ fontSize: 40 }}>{G.winner === 'player' ? '🏆' : '💀'}</div>
            <div style={{ fontSize: 22, color: G.winner === 'player' ? '#6abf5e' : '#cc4444', marginBottom: 16 }}>
              {G.winner === 'player' ? '¡Los Mutables triunfan!' : 'Los Acechadores dominan.'}
            </div>
            <button style={S.btnEnd} onClick={() => setG(initGame())}>Nueva partida</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────
function HpBar({ hp }) {
  const pct = Math.max(0, Math.min(100, (hp / 20) * 100))
  const color = pct > 50 ? '#5a9e4a' : pct > 25 ? '#c8a84b' : '#cc4444'
  return (
    <div style={{ display:'flex', alignItems:'center', gap:6, flex:1 }}>
      <div style={{ flex:1, height:10, background:'#2a2217', borderRadius:5, overflow:'hidden' }}>
        <div style={{ width:`${pct}%`, height:'100%', background:color, transition:'width .3s' }} />
      </div>
      <span style={{ color:'#d4c89a', fontSize:13, minWidth:36 }}>{hp} HP</span>
    </div>
  )
}

function HandCard({ cardId, canPlay, onClick }) {
  const card = LIB[cardId]
  const fColor = card.faction === 'M' ? '#5a8a44' : '#8b3a1a'
  return (
    <div
      className="handcard"
      onClick={canPlay ? onClick : undefined}
      style={{
        ...S.handCard,
        borderColor: canPlay ? '#c8a84b' : '#3a3025',
        opacity: canPlay ? 1 : 0.55,
        cursor: canPlay ? 'pointer' : 'not-allowed',
      }}
    >
      <div style={{ fontSize: 22 }}>{card.art}</div>
      <div style={{ fontSize: 11, color: fColor, fontWeight: 700 }}>
        {card.faction === 'M' ? 'MUTABLES' : 'ACECHADORES'}
      </div>
      <div style={{ fontSize: 12, color:'#d4c89a', lineHeight:1.2 }}>{card.name}</div>
      <div style={{ fontSize: 11, color:'#c8a84b' }}>⬡ {card.cost}</div>
      <div style={{ fontSize: 12, color:'#d4c89a' }}>
        {card.atk}/{card.vida}
      </div>
      <TraitBadges traits={card.traits} />
    </div>
  )
}

function Creature({ c, isSelected, isTarget, onClick, onFeed, side, phase }) {
  const card  = LIB[c.cardId]
  const hp    = life(c)
  const isPupa = card.traits.includes('pupa')
  const canFeed = side === 'player' && card.next && !c.fed
  const feedFree = c.fresh && card.next
  const fColor = card.faction === 'M' ? '#5a8a44' : '#8b3a1a'

  let borderColor = '#3a3025'
  if (isSelected) borderColor = '#c8a84b'
  if (isTarget) borderColor = '#cc4444'
  if (c.trapped) borderColor = '#5a3a8a'

  const canAtk = side === 'player' && c.canAtk && !c.hasAtk && !c.trapped && !isPupa

  return (
    <div
      className="creature"
      onClick={onClick}
      style={{
        ...S.creature,
        borderColor,
        opacity: (side === 'player' && !canAtk && !c.fresh && phase === 'player') ? 0.65 : 1,
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <div style={{ fontSize: 26 }}>{card.art}</div>
      <div style={{ fontSize: 10, color: fColor, fontWeight: 700, letterSpacing: 0.5 }}>
        {isPupa ? 'PUPA' : card.type === 'holo' ? 'HOLO' : 'DIRECTO'}
      </div>
      <div style={{ fontSize: 11, color:'#d4c89a', lineHeight:1.2, textAlign:'center' }}>{card.name}</div>
      <div style={{ display:'flex', gap:8, marginTop:2 }}>
        <span style={{ color:'#e06060', fontSize:12 }}>⚔{isPupa ? 0 : card.atk}</span>
        <span style={{ color:'#60a060', fontSize:12 }}>♥{hp}</span>
      </div>
      <TraitBadges traits={card.traits} />
      {c.trapped && <div style={S.badge('#5a3a8a')}>🕸 Atrapado</div>}
      {canFeed && phase === 'player' && (
        <button
          style={{ ...S.feedBtn, background: feedFree ? '#3a6a2a' : '#2a3a5a' }}
          onClick={e => { e.stopPropagation(); onFeed() }}
        >
          {feedFree ? '⏱ Tiempo' : '⬆ Alimentar (2)'}
        </button>
      )}
      {side === 'player' && c.hasAtk && !isPupa && (
        <div style={S.badge('#5a4a10')}>ya atacó</div>
      )}
      {side === 'player' && !c.canAtk && !c.fresh && !c.hasAtk && !isPupa && (
        <div style={S.badge('#3a3025')}>invocado</div>
      )}
    </div>
  )
}

function TraitBadges({ traits }) {
  const labels = {
    pupa: null,
    ag1: { label:'Aguijón 1', color:'#7a2a10' },
    ag2: { label:'Aguijón 2', color:'#9a2a10' },
    tela: { label:'Tela', color:'#4a2a7a' },
    volar: { label:'Volar', color:'#2a5a8a' },
  }
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:2, justifyContent:'center' }}>
      {traits.map(t => labels[t] ? (
        <span key={t} style={{ ...S.traitBadge, background: labels[t].color }}>
          {labels[t].label}
        </span>
      ) : null)}
    </div>
  )
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = {
  root: {
    display:'flex', flexDirection:'column', minHeight:'100dvh',
    background:'#13110d', color:'#d4c89a', fontFamily:"'Georgia', serif",
    userSelect:'none',
  },
  playerSection: {
    display:'flex', flexDirection:'column', gap:6, padding:'8px 10px',
  },
  hpRow: {
    display:'flex', alignItems:'center', gap:8, flexWrap:'wrap',
  },
  factionLabel: {
    fontSize:12, fontWeight:700, color:'#8a7a5a', letterSpacing:1, minWidth:120,
  },
  biom: {
    fontSize:12, color:'#5a9e4a', minWidth:60,
  },
  deckCount: {
    fontSize:11, color:'#5a5040',
  },
  board: {
    display:'flex', flexWrap:'wrap', gap:6, minHeight:130,
    background:'#1a1710', borderRadius:8, padding:8,
    border:'1px solid #2a2217',
  },
  emptyBoard: {
    color:'#3a3025', fontSize:12, alignSelf:'center', margin:'auto',
  },
  hand: {
    display:'flex', gap:6, overflowX:'auto', padding:'4px 0',
  },
  handCard: {
    display:'flex', flexDirection:'column', alignItems:'center', gap:3,
    background:'#1e1a12', border:'2px solid',
    borderRadius:8, padding:'8px 6px', minWidth:72, maxWidth:80,
    boxShadow:'0 2px 8px #0008',
    transition:'transform .15s, border-color .15s',
  },
  cardBack: {
    width:60, height:80, background:'#1a1710',
    border:'2px solid #2a2217', borderRadius:8,
    backgroundImage:'repeating-linear-gradient(45deg,#2a2217 0,#2a2217 2px,transparent 0,transparent 50%)',
    backgroundSize:'8px 8px',
  },
  creature: {
    display:'flex', flexDirection:'column', alignItems:'center', gap:2,
    background:'#1e1a12', border:'2px solid',
    borderRadius:8, padding:'8px 6px', minWidth:80, maxWidth:95,
    boxShadow:'0 2px 8px #0008',
    transition:'border-color .15s, opacity .15s',
    position:'relative',
  },
  controls: {
    display:'flex', flexDirection:'column', gap:6,
    padding:'6px 10px', background:'#100e0b',
    borderTop:'1px solid #2a2217', borderBottom:'1px solid #2a2217',
  },
  btnRow: {
    display:'flex', gap:8, flexWrap:'wrap', alignItems:'center',
  },
  btnEnd: {
    background:'#3a5a2a', color:'#d4c89a', border:'1px solid #5a8a44',
    borderRadius:6, padding:'7px 14px', cursor:'pointer', fontSize:13, fontFamily:'inherit',
  },
  btnAtk: {
    background:'#5a2a2a', color:'#d4c89a', border:'1px solid #8a4444',
    borderRadius:6, padding:'7px 14px', cursor:'pointer', fontSize:13, fontFamily:'inherit',
  },
  btnCancel: {
    background:'#2a2217', color:'#8a7a5a', border:'1px solid #3a3025',
    borderRadius:6, padding:'7px 14px', cursor:'pointer', fontSize:13, fontFamily:'inherit',
  },
  aiLabel: {
    color:'#8b3a1a', fontSize:13, fontStyle:'italic',
  },
  log: {
    fontSize:12, color:'#8a7a5a', maxHeight:100, overflowY:'auto',
    background:'#0e0c09', borderRadius:6, padding:'6px 8px',
    lineHeight:1.6,
  },
  feedBtn: {
    fontSize:10, color:'#d4c89a', border:'none', borderRadius:4,
    padding:'2px 5px', cursor:'pointer', marginTop:2, fontFamily:'inherit',
  },
  traitBadge: {
    fontSize:9, color:'#d4c89a', borderRadius:3, padding:'1px 4px',
  },
  badge: bg => ({
    fontSize:9, color:'#d4c89a', background:bg, borderRadius:3,
    padding:'1px 4px', marginTop:2,
  }),
  overlay: {
    position:'fixed', inset:0, background:'#000a',
    display:'flex', alignItems:'center', justifyContent:'center', zIndex:10,
  },
  overlayBox: {
    background:'#1e1a12', border:'2px solid #4a3c25', borderRadius:12,
    padding:'32px 40px', textAlign:'center', display:'flex',
    flexDirection:'column', alignItems:'center', gap:8,
  },
}

const CSS = `
  .handcard:hover { transform: translateY(-4px); }
  .creature:hover { transform: scale(1.03); }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #13110d; }
  ::-webkit-scrollbar-thumb { background: #3a3025; border-radius: 2px; }
`
