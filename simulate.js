#!/usr/bin/env node
// ENJAMBRE — Simulador de balance y estrategia
// Uso: node simulate.js [partidas_por_matchup]
// Ejemplo: node simulate.js 2000

'use strict'

// ─── BIBLIOTECA DE CARTAS ────────────────────────────────────────────────────
const LIB = {
  // Los Mutables — holometábolos (larva → pupa → adulto)
  la: { id:'la', name:'Larva Escarabajo',     cost:1, atk:1, vida:2, faction:'M', type:'holo', stage:0, next:'pa', traits:[] },
  pa: { id:'pa', name:'Pupa Escarabajo',       cost:0, atk:0, vida:3, faction:'M', type:'holo', stage:1, next:'aa', traits:['pupa'] },
  aa: { id:'aa', name:'Escarabajo Cornudo',    cost:0, atk:3, vida:4, faction:'M', type:'holo', stage:2, next:null,  traits:[] },

  lb: { id:'lb', name:'Larva Voraz',           cost:1, atk:2, vida:1, faction:'M', type:'holo', stage:0, next:'pb', traits:[] },
  pb: { id:'pb', name:'Pupa Blindada',         cost:0, atk:0, vida:3, faction:'M', type:'holo', stage:1, next:'ab', traits:['pupa'] },
  ab: { id:'ab', name:'Escarabajo Blindado',   cost:0, atk:4, vida:2, faction:'M', type:'holo', stage:2, next:null,  traits:[] },

  lc: { id:'lc', name:'Oruga de Seda',         cost:2, atk:1, vida:3, faction:'M', type:'holo', stage:0, next:'pc', traits:[] },
  pc: { id:'pc', name:'Crisalida',             cost:0, atk:0, vida:4, faction:'M', type:'holo', stage:1, next:'ac', traits:['pupa'] },
  ac: { id:'ac', name:'Mariposa Lunar',        cost:0, atk:2, vida:3, faction:'M', type:'holo', stage:2, next:null,  traits:['volar'] },

  ld: { id:'ld', name:'Larva Tenaz',           cost:1, atk:1, vida:3, faction:'M', type:'holo', stage:0, next:'pd', traits:[] },
  pd: { id:'pd', name:'Pupa Dura',             cost:0, atk:0, vida:5, faction:'M', type:'holo', stage:1, next:'ad', traits:['pupa'] },
  ad: { id:'ad', name:'Escarabajo Tenaz',      cost:0, atk:3, vida:6, faction:'M', type:'holo', stage:2, next:null,  traits:[] },

  // Acechadores — arácnidos (desarrollo directo)
  sc: { id:'sc', name:'Escorpion Menor',       cost:1, atk:1, vida:2, faction:'A', type:'directo', stage:0, next:null, traits:['ag1'] },
  sa: { id:'sa', name:'Arana Saltarina',       cost:1, atk:2, vida:1, faction:'A', type:'directo', stage:0, next:null, traits:[] },
  st: { id:'st', name:'Arana Tejedora',        cost:2, atk:1, vida:4, faction:'A', type:'directo', stage:0, next:null, traits:['tela'] },
  tr: { id:'tr', name:'Tarantula',             cost:3, atk:3, vida:3, faction:'A', type:'directo', stage:0, next:null, traits:[] },
  sM: { id:'sM', name:'Escorpion Mayor',       cost:4, atk:4, vida:4, faction:'A', type:'directo', stage:0, next:null, traits:['ag2'] },
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

// ─── UTILIDADES ──────────────────────────────────────────────────────────────
let _uid = 0
function mkUid() { return ++_uid }

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function life(c) { return LIB[c.cardId].vida - c.damage }
function opp(p)  { return p === 'M' ? 'A' : 'M' }

function mkCreature(cardId) {
  return { uid: mkUid(), cardId, damage: 0, hasAtk: false, canAtk: false, fed: false, trapped: false, fresh: true }
}

// ─── ENGINE (funciones puras — sin estado externo) ───────────────────────────

function initGame() {
  const mDeck = shuffle([...BASE_DECK_M])
  const aDeck = shuffle([...BASE_DECK_A])
  return {
    turn: 1,
    active: 'M',
    over: false,
    winner: null,
    M: { hp:20, biomasa:1, maxB:1, hand: mDeck.splice(0,3), board:[], deck: mDeck },
    A: { hp:20, biomasa:1, maxB:1, hand: aDeck.splice(0,3), board:[], deck: aDeck },
  }
}

function checkWin(state) {
  if (state.over) return state
  if (state.M.hp <= 0) return { ...state, over:true, winner:'A' }
  if (state.A.hp <= 0) return { ...state, over:true, winner:'M' }
  return state
}

// Juega carta del índice handIdx del jugador player
function doPlay(state, player, handIdx, stats) {
  const p = state[player]
  const cardId = p.hand[handIdx]
  if (cardId === undefined) return null
  const card = LIB[cardId]
  if (p.biomasa < card.cost || p.board.length >= 5) return null

  const o = opp(player)
  const hand = [...p.hand]
  hand.splice(handIdx, 1)
  const creature = mkCreature(cardId)

  let oppHp = state[o].hp
  let aguijonDmg = 0
  if (card.traits.includes('ag1')) { oppHp -= 1; aguijonDmg = 1 }
  if (card.traits.includes('ag2')) { oppHp -= 2; aguijonDmg = 2 }

  if (stats) {
    const cs = cardStat(stats, cardId)
    cs.played++
    cs.damageDealt += aguijonDmg
    cs.aguijonDmg  += aguijonDmg
  }

  return {
    ...state,
    [player]: { ...p, hand, board:[...p.board, creature], biomasa: p.biomasa - card.cost },
    [o]: { ...state[o], hp: oppHp },
  }
}

// Alimentar: siempre cuesta 2, bloquea criaturas fresh (Tiempo es automático en doEndTurn)
function doFeed(state, player, uid, stats) {
  const p = state[player]
  const idx = p.board.findIndex(c => c.uid === uid)
  if (idx < 0) return null
  const c = p.board[idx]
  const card = LIB[c.cardId]
  if (!card.next || c.fed || c.fresh || p.biomasa < 2) return null

  const evolved = { ...c, cardId: card.next, fed:true, fresh:false, hasAtk:false }

  if (stats) {
    const cs = cardStat(stats, card.id)
    cs.evolved++
    stats.alimentarUsed++
  }

  const newBoard = [...p.board]
  if (life(evolved) <= 0) {
    newBoard.splice(idx, 1)
    if (stats) cardStat(stats, card.id).deaths++
  } else {
    newBoard[idx] = evolved
  }
  return { ...state, [player]: { ...p, board:newBoard, biomasa: p.biomasa - 2 } }
}

// Ataca criatura rival
function doAttackCreature(state, attPlayer, attUid, defUid, stats) {
  const ap = state[attPlayer]
  const dp = state[opp(attPlayer)]
  const ai = ap.board.findIndex(c => c.uid === attUid)
  const di = dp.board.findIndex(c => c.uid === defUid)
  if (ai < 0 || di < 0) return null

  const att = ap.board[ai], def = dp.board[di]
  const aC = LIB[att.cardId], dC = LIB[def.cardId]
  if (!att.canAtk || att.hasAtk || att.trapped || aC.traits.includes('pupa')) return null

  const newAttDmg = att.damage + dC.atk
  const newDefDmg = def.damage + aC.atk
  const attDies = newAttDmg >= aC.vida
  const defDies = newDefDmg >= dC.vida

  if (stats) {
    const csA = cardStat(stats, att.cardId)
    const csD = cardStat(stats, def.cardId)
    csA.damageDealt += aC.atk
    csA.combatAttacks++
    if (defDies) { csA.kills++; csD.deaths++ }
    if (attDies) { csD.counterKills++; csA.deaths++ }
  }

  // Tela: el objetivo queda atrapado si el atacante tiene tela
  const defTrapped = def.trapped || aC.traits.includes('tela')

  let attBoard = ap.board.map((c, i) => i === ai ? { ...c, damage:newAttDmg, hasAtk:true } : c)
  let defBoard = dp.board.map((c, i) => i === di ? { ...c, damage:newDefDmg, trapped:defTrapped } : c)

  attBoard = attBoard.filter(c => life(c) > 0)
  defBoard = defBoard.filter(c => life(c) > 0)

  return {
    ...state,
    [attPlayer]: { ...ap, board:attBoard },
    [opp(attPlayer)]: { ...dp, board:defBoard },
  }
}

// Ataca al héroe rival
function doAttackFace(state, attPlayer, attUid, stats) {
  const ap = state[attPlayer]
  const o  = opp(attPlayer)
  const ai = ap.board.findIndex(c => c.uid === attUid)
  if (ai < 0) return null

  const att = ap.board[ai]
  const aC  = LIB[att.cardId]
  if (!att.canAtk || att.hasAtk || att.trapped || aC.traits.includes('pupa')) return null
  if (state[o].board.length > 0 && !aC.traits.includes('volar')) return null

  if (stats) {
    const cs = cardStat(stats, att.cardId)
    cs.damageDealt += aC.atk
    cs.faceAttacks++
  }

  const newBoard = ap.board.map((c, i) => i === ai ? { ...c, hasAtk:true } : c)
  return {
    ...state,
    [attPlayer]: { ...ap, board:newBoard },
    [o]: { ...state[o], hp: state[o].hp - aC.atk },
  }
}

// Termina el turno: cambia active, auto-Tiempo para criaturas fresh del siguiente jugador
function doEndTurn(state, stats = null) {
  const cur  = state.active
  const next = opp(cur)
  const np   = state[next]

  const newMaxB = Math.min(10, np.maxB + 1)
  let deck = [...np.deck], hand = [...np.hand]
  if (deck.length) hand.push(deck.shift())

  // Auto-Tiempo: criaturas fresh con next evolucionan al inicio del próximo turno
  const nextBoard = np.board.map(c => {
    if (c.fresh && LIB[c.cardId].next) {
      if (stats) { cardStat(stats, c.cardId).evolved++; stats.tiempoUsed++ }
      return { ...c, cardId:LIB[c.cardId].next, fresh:false, fed:false, hasAtk:false, canAtk:true }
    }
    return { ...c, hasAtk:false, canAtk:true, fed:false, fresh:false }
  }).filter(c => life(c) > 0)

  const curP = state[cur]
  const curBoard = curP.board.map(c => ({ ...c, trapped:false }))

  return {
    ...state,
    turn: next === 'M' ? state.turn + 1 : state.turn,
    active: next,
    [cur]:  { ...curP, board:curBoard },
    [next]: { ...np, biomasa:newMaxB, maxB:newMaxB, hand, deck, board:nextBoard },
  }
}

// ─── ESTRATEGIAS DE IA ───────────────────────────────────────────────────────

// Selecciona índice de la carta más barata/cara/etc. que se puede pagar
function selectCard(hand, biomasa, prefer) {
  const affordable = hand
    .map((id, i) => ({ id, i, cost:LIB[id].cost }))
    .filter(x => x.cost <= biomasa)
  if (!affordable.length) return -1
  affordable.sort((a, b) => prefer === 'cheapest' ? a.cost - b.cost : b.cost - a.cost)
  return affordable[0].i
}

// AGGRO: cartas baratas → atacar cara siempre que se pueda
function stratAggro(state, player, stats) {
  let s = state
  const p = () => s[player], o = () => s[opp(player)]

  let changed = true
  while (changed && !s.over && p().board.length < 5) {
    changed = false
    const idx = selectCard(p().hand, p().biomasa, 'cheapest')
    if (idx >= 0) { const ns = doPlay(s, player, idx, stats); if (ns) { s = ns; changed = true } }
  }

  // Tiempo es automático en doEndTurn — no se dispara manualmente aquí
  // Atacar cara si no hay criaturas, si no atacar la más débil
  for (const c of [...p().board]) {
    if (s.over) break
    if (!c.canAtk || c.hasAtk || c.trapped || LIB[c.cardId].traits.includes('pupa')) continue
    const aC = LIB[c.cardId]
    if (o().board.length === 0 || aC.traits.includes('volar')) {
      const ns = doAttackFace(s, player, c.uid, stats); if (ns) { s = ns; continue }
    }
    if (o().board.length > 0) {
      const target = [...o().board].sort((a, b) => life(a) - life(b))[0]
      const ns = doAttackCreature(s, player, c.uid, target.uid, stats); if (ns) s = ns
    }
  }

  return checkWin(s)
}

// CONTROL: carta más cara → matar criaturas primero
function stratControl(state, player, stats) {
  let s = state
  const p = () => s[player], o = () => s[opp(player)]

  let changed = true
  while (changed && !s.over && p().board.length < 5) {
    changed = false
    const idx = selectCard(p().hand, p().biomasa, 'costliest')
    if (idx >= 0) { const ns = doPlay(s, player, idx, stats); if (ns) { s = ns; changed = true } }
  }

  // Tiempo es automático en doEndTurn — Alimentar solo en criaturas que ya pasaron por Tiempo
  for (const c of [...p().board]) {
    if (s.over || p().biomasa < 2) break
    if (!c.fed && !c.fresh && LIB[c.cardId].next) {
      const ns = doFeed(s, player, c.uid, stats); if (ns) s = ns
    }
  }

  // Atacar criaturas primero (la que se pueda matar), luego cara
  for (const c of [...p().board]) {
    if (s.over) break
    if (!c.canAtk || c.hasAtk || c.trapped || LIB[c.cardId].traits.includes('pupa')) continue
    const aC = LIB[c.cardId]

    if (o().board.length > 0) {
      const killable = o().board.find(t => aC.atk >= life(t))
      const target   = killable || o().board.reduce((w, t) => life(t) < life(w) ? t : w)
      const ns = doAttackCreature(s, player, c.uid, target.uid, stats); if (ns) { s = ns; continue }
    } else {
      const ns = doAttackFace(s, player, c.uid, stats); if (ns) s = ns
    }
  }

  return checkWin(s)
}

// META: inundar el tablero de larvas, evolucionar todo lo posible, atacar solo como adulto
function stratMeta(state, player, stats) {
  let s = state
  const p = () => s[player], o = () => s[opp(player)]

  // Llenar el tablero con larvas baratas
  let changed = true
  while (changed && !s.over && p().board.length < 5) {
    changed = false
    const idx = selectCard(p().hand, p().biomasa, 'cheapest')
    if (idx >= 0) { const ns = doPlay(s, player, idx, stats); if (ns) { s = ns; changed = true } }
  }

  // Tiempo es automático en doEndTurn — solo Alimentar en criaturas que ya pasaron por Tiempo
  let ec = true
  while (ec && !s.over) {
    ec = false
    for (const c of [...p().board]) {
      if (c.fed || c.fresh || !LIB[c.cardId].next || p().biomasa < 2) continue
      const ns = doFeed(s, player, c.uid, stats)
      if (ns) { s = ns; ec = true; break }
    }
  }

  // Solo atacar con adultos (stage 2)
  for (const c of [...p().board]) {
    if (s.over) break
    const card = LIB[c.cardId]
    if (!c.canAtk || c.hasAtk || c.trapped || card.traits.includes('pupa')) continue
    if (card.stage < 2 && o().board.length > 0) continue // esperar a ser adulto

    if (o().board.length === 0 || card.traits.includes('volar')) {
      const ns = doAttackFace(s, player, c.uid, stats); if (ns) { s = ns; continue }
    }
    if (o().board.length > 0) {
      const killable = o().board.find(t => card.atk >= life(t))
      if (killable) { const ns = doAttackCreature(s, player, c.uid, killable.uid, stats); if (ns) s = ns }
    }
  }

  return checkWin(s)
}

// TEMPO: balance entre jugar y atacar, maximizar trades eficientes
function stratTempo(state, player, stats) {
  let s = state
  const p = () => s[player], o = () => s[opp(player)]

  let changed = true
  while (changed && !s.over && p().board.length < 5) {
    changed = false
    const affordable = p().hand
      .map((id, i) => ({ id, i, cost:LIB[id].cost }))
      .filter(x => x.cost <= p().biomasa)
      .sort((a, b) => b.cost - a.cost)
    if (affordable.length) {
      const ns = doPlay(s, player, affordable[0].i, stats); if (ns) { s = ns; changed = true }
    }
  }

  // Tiempo es automático en doEndTurn — Alimentar en criaturas que ya pasaron por Tiempo
  for (const c of [...p().board]) if (!s.over && !c.fed && !c.fresh && LIB[c.cardId].next && p().biomasa >= 2) { const ns = doFeed(s, player, c.uid, stats); if (ns) s = ns }

  // Atacar: priorizar kills exactos, luego cara
  for (const c of [...p().board]) {
    if (s.over) break
    const aC = LIB[c.cardId]
    if (!c.canAtk || c.hasAtk || c.trapped || aC.traits.includes('pupa')) continue

    if (o().board.length > 0) {
      const killable = o().board.find(t => aC.atk >= life(t))
      if (killable) {
        const ns = doAttackCreature(s, player, c.uid, killable.uid, stats); if (ns) { s = ns; continue }
      }
      // si tiene Volar, atacar cara aunque haya criaturas
      if (aC.traits.includes('volar')) {
        const ns = doAttackFace(s, player, c.uid, stats); if (ns) { s = ns; continue }
      }
      // si no puede matar nada, atacar la más débil
      const target = o().board.reduce((w, t) => life(t) < life(w) ? t : w)
      const ns = doAttackCreature(s, player, c.uid, target.uid, stats); if (ns) s = ns
    } else {
      const ns = doAttackFace(s, player, c.uid, stats); if (ns) s = ns
    }
  }

  return checkWin(s)
}

const STRATEGIES = { AGGRO: stratAggro, CONTROL: stratControl, META: stratMeta, TEMPO: stratTempo }

// ─── SEGUIMIENTO DE ESTADÍSTICAS ─────────────────────────────────────────────

function cardStat(stats, cardId) {
  if (!stats.cards[cardId]) {
    const card = LIB[cardId]
    stats.cards[cardId] = {
      id:cardId, name:card.name, faction:card.faction, stage:card.stage,
      type:card.type, traits:card.traits,
      played:0, evolved:0, kills:0, counterKills:0, deaths:0,
      damageDealt:0, aguijonDmg:0, faceAttacks:0, combatAttacks:0,
      survivedGames:0,
    }
  }
  return stats.cards[cardId]
}

function newStats() {
  return {
    games:0, mWins:0, aWins:0, draws:0,
    totalTurns:0, winnerHpSum:0,
    tiempoUsed:0, alimentarUsed:0,
    cards:{},
    turnDist:{},  // turno → frecuencia
    hpDist:{},    // hp_ganador → frecuencia
  }
}

// ─── PARTIDA INDIVIDUAL ───────────────────────────────────────────────────────

const MAX_TURNS = 50

function runGame(mStrat, aStrat, stats) {
  let s = initGame()

  for (let half = 0; half < MAX_TURNS * 2 && !s.over; half++) {
    const strat = s.active === 'M' ? mStrat : aStrat
    s = strat(s, s.active, stats)
    if (!s.over) s = doEndTurn(s, stats)
  }

  if (!s.over) {
    // Límite de turnos: gana quien tenga más HP
    s = { ...s, over:true, winner: s.M.hp >= s.A.hp ? 'M' : 'A' }
    if (stats) stats.draws++
  }

  // Criaturas que sobrevivieron al final
  for (const c of [...s.M.board, ...s.A.board]) {
    if (stats) cardStat(stats, c.cardId).survivedGames++
  }

  if (stats) {
    stats.games++
    if (s.winner === 'M') stats.mWins++; else stats.aWins++
    stats.totalTurns += s.turn
    const winHp = Math.max(0, s.winner === 'M' ? s.M.hp : s.A.hp)
    stats.winnerHpSum += winHp
    const tk = String(s.turn)
    stats.turnDist[tk] = (stats.turnDist[tk] || 0) + 1
    const hk = String(winHp)
    stats.hpDist[hk] = (stats.hpDist[hk] || 0) + 1
  }

  return s
}

// ─── REPORTE ─────────────────────────────────────────────────────────────────

function pct(n, total) {
  return total > 0 ? ((n / total) * 100).toFixed(1) + '%' : 'N/A'
}

function bar(value, max, width = 20) {
  const filled = Math.round((value / max) * width)
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

function printReport(mStratName, aStratName, stats) {
  const { games, mWins, aWins, draws, totalTurns, winnerHpSum,
    tiempoUsed, alimentarUsed, turnDist, hpDist } = stats

  const mwr = mWins / games
  const avgT = (totalTurns / games).toFixed(1)
  const avgH = (winnerHpSum / games).toFixed(1)

  console.log('\n' + '═'.repeat(70))
  console.log(`  Mutables [${mStratName}]  vs  Acechadores [${aStratName}]`)
  console.log('═'.repeat(70))
  console.log(`  Partidas: ${games}   Empates: ${draws}`)
  console.log(`  Mutables:     ${String(mWins).padStart(5)}  (${pct(mWins,games)})`)
  console.log(`  Acechadores:  ${String(aWins).padStart(5)}  (${pct(aWins,games)})`)
  console.log(`  Turnos prom:  ${avgT}    HP ganador prom: ${avgH}`)
  console.log(`  Tiempo usado: ${tiempoUsed}   Alimentar usado: ${alimentarUsed}`)
  console.log(`  Tiempo/partida: ${(tiempoUsed/games).toFixed(2)}   Alimentar/partida: ${(alimentarUsed/games).toFixed(2)}`)

  // Distribución de duración
  const turnNums = Object.keys(turnDist).map(Number).sort((a,b) => a-b)
  const maxTurnCount = Math.max(...Object.values(turnDist))
  console.log('\n  Duración (turnos):')
  for (const t of turnNums) {
    const cnt = turnDist[t]
    console.log(`  T${String(t).padStart(2)}  ${bar(cnt, maxTurnCount)} ${String(cnt).padStart(4)}`)
  }

  // Tabla de rendimiento de cartas
  const cardList = Object.values(stats.cards).sort((a, b) => b.played - a.played)
  const totalPlayed = cardList.reduce((s, c) => s + c.played, 0)

  console.log('\n  RENDIMIENTO DE CARTAS')
  console.log('  ' + '─'.repeat(95))
  console.log(
    '  ' +
    'Carta'.padEnd(24) +
    'Fac'.padEnd(4) +
    'Jugada'.padStart(7) +
    '/part'.padStart(6) +
    'Evol'.padStart(6) +
    'Kills'.padStart(6) +
    'CtrK'.padStart(6) +
    'Muertes'.padStart(8) +
    'KD'.padStart(6) +
    'DañoHéroe'.padStart(10) +
    'Sobrev'.padStart(7)
  )
  console.log('  ' + '─'.repeat(95))

  for (const c of cardList) {
    if (c.played === 0) continue
    const kd = c.deaths > 0
      ? (c.kills / c.deaths).toFixed(2)
      : c.kills > 0 ? ' inf' : '0.00'
    const perGame = (c.played / games).toFixed(2)
    console.log(
      '  ' +
      c.name.padEnd(24) +
      c.faction.padEnd(4) +
      String(c.played).padStart(7) +
      String(perGame).padStart(6) +
      String(c.evolved).padStart(6) +
      String(c.kills).padStart(6) +
      String(c.counterKills).padStart(6) +
      String(c.deaths).padStart(8) +
      String(kd).padStart(6) +
      String(c.aguijonDmg).padStart(10) +
      String(c.survivedGames).padStart(7)
    )
  }

  // Análisis de cadenas de metamorfosis (solo Mutables)
  const larvae   = cardList.filter(c => c.faction === 'M' && c.stage === 0)
  const pupas    = cardList.filter(c => c.faction === 'M' && c.stage === 1)
  const adults   = cardList.filter(c => c.faction === 'M' && c.stage === 2)
  const totalLarvaePlayed = larvae.reduce((s, c) => s + c.played, 0)
  const totalEvolved      = larvae.reduce((s, c) => s + c.evolved, 0)
  const totalAdults       = adults.reduce((s, c) => s + c.played, 0)

  console.log('\n  METAMORFOSIS')
  console.log(`  Larvas jugadas:      ${totalLarvaePlayed}`)
  console.log(`  Evolucionaron (L→P): ${totalEvolved}  (${pct(totalEvolved, totalLarvaePlayed)})`)
  console.log(`  Llegaron a adulto:   ${totalAdults}   (${pct(totalAdults, totalLarvaePlayed)})`)
  console.log(`  Pupas vivas al final: ${pupas.reduce((s,c)=>s+c.survivedGames,0)}`)

  // Señales de balance
  console.log('\n  SEÑALES DE BALANCE:')
  let flags = 0

  if (mwr > 0.62) { console.log(`  ⚠  MUTABLES dominan (${pct(mWins,games)}) — revisar curva de metamorfosis`); flags++ }
  if (mwr < 0.38) { console.log(`  ⚠  ACECHADORES dominan (${pct(aWins,games)}) — posible aggro excesivo`); flags++ }
  if (Math.abs(mwr - 0.5) < 0.06) { console.log(`  ✓  Matchup equilibrado (~50%)`); }

  if (parseFloat(avgT) < 5)  { console.log(`  ⚠  Juego muy corto (${avgT} turnos) — aggro rompiendo`); flags++ }
  if (parseFloat(avgT) > 18) { console.log(`  ⚠  Juego muy largo (${avgT} turnos) — posible stall`); flags++ }

  if (tiempoUsed / games < 0.5) { console.log(`  ⚠  Tiempo poco usado (${(tiempoUsed/games).toFixed(2)}/partida) — mecánica infrautilizada`); flags++ }
  if (totalEvolved / Math.max(1,totalLarvaePlayed) < 0.3)
    { console.log(`  ⚠  Pocas larvas evolucionan (<30%) — pupa muy vulnerable o metamorfosis poco viable`); flags++ }
  if (totalAdults / Math.max(1,totalLarvaePlayed) < 0.1)
    { console.log(`  ⚠  Casi ninguna larva llega a adulto (<10%) — holometábolos no son viables`); flags++ }

  for (const c of cardList) {
    if (c.played < 10) continue
    const kd = c.deaths > 0 ? c.kills / c.deaths : c.kills
    if (kd > 3 && !['pupa'].some(t => c.traits?.includes(t)))
      { console.log(`  ⚠  ${c.name}: KD ${kd.toFixed(1)} (muy alto — posiblemente rota)`); flags++ }
    if (c.played > 30 && c.kills === 0 && c.faceAttacks === 0 && c.counterKills === 0 && !['pupa'].some(t => LIB[c.id].traits.includes(t)))
      { console.log(`  ⚠  ${c.name}: nunca hace nada útil en ${c.played} apariciones`); flags++ }
    const survRate = c.survivedGames / Math.max(1, c.played)
    if (survRate > 0.6 && c.played > 20)
      { console.log(`  ✓  ${c.name}: sobrevive ${pct(c.survivedGames,c.played)} — muy duradera`); }
  }

  if (flags === 0) console.log('  ✓  Sin señales críticas de desbalance en este matchup')
}

// ─── TABLA RESUMEN ───────────────────────────────────────────────────────────

function printSummaryTable(results) {
  const strats = Object.keys(STRATEGIES)
  console.log('\n' + '═'.repeat(70))
  console.log('  TABLA DE WINRATES — Mutables win% por matchup')
  console.log('  (filas = estrategia Mutables, columnas = estrategia Acechadores)')
  console.log('═'.repeat(70))

  const header = '  ' + 'M \\ A'.padEnd(12) + strats.map(s => s.padStart(10)).join('')
  console.log(header)
  console.log('  ' + '─'.repeat(12 + strats.length * 10))

  for (const mS of strats) {
    let row = '  ' + mS.padEnd(12)
    for (const aS of strats) {
      const key = `${mS}:${aS}`
      const { mWins, games } = results[key]
      const wp = ((mWins / games) * 100).toFixed(1) + '%'
      const colored = mWins / games > 0.55 ? `[${wp}]` : mWins / games < 0.45 ? `(${wp})` : ` ${wp} `
      row += colored.padStart(10)
    }
    console.log(row)
  }
  console.log('  [X%] = Mutables dominan  |  (X%) = Acechadores dominan  |  X% ≈ equilibrado')
}

// ─── MAIN ────────────────────────────────────────────────────────────────────

const NUM_GAMES = parseInt(process.argv[2], 10) || 1000
const strats = Object.keys(STRATEGIES)
const results = {}

console.log(`\n${'═'.repeat(70)}`)
console.log(`  ENJAMBRE — Simulador de balance`)
console.log(`  ${NUM_GAMES} partidas por matchup | ${strats.length ** 2} matchups`)
console.log('═'.repeat(70))

for (const mS of strats) {
  for (const aS of strats) {
    const key = `${mS}:${aS}`
    process.stdout.write(`  Simulando ${mS} vs ${aS}...`)
    const stats = newStats()
    for (let i = 0; i < NUM_GAMES; i++) runGame(STRATEGIES[mS], STRATEGIES[aS], stats)
    results[key] = stats
    process.stdout.write(` ${stats.mWins}M / ${stats.aWins}A\n`)
  }
}

// Reportes detallados por matchup
for (const mS of strats) {
  for (const aS of strats) {
    printReport(mS, aS, results[`${mS}:${aS}`])
  }
}

// Tabla resumen
printSummaryTable(results)
console.log()
