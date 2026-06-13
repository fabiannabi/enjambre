// Motor de juego puro — sin dependencias de React ni Node.js
// Importado tanto por App.jsx (IA del oponente) como por SimView.jsx (simulador)

// ─── BIBLIOTECA DE CARTAS ────────────────────────────────────────────────────
export const LIB = {
  la: { id:'la', name:'Larva Escarabajo',   cost:1, atk:1, vida:2, faction:'M', type:'holo',    stage:0, next:'pa', traits:[] },
  pa: { id:'pa', name:'Pupa Escarabajo',    cost:0, atk:0, vida:3, faction:'M', type:'holo',    stage:1, next:'aa', traits:['pupa'] },
  aa: { id:'aa', name:'Escarabajo Cornudo', cost:0, atk:3, vida:4, faction:'M', type:'holo',    stage:2, next:null,  traits:[] },

  lb: { id:'lb', name:'Larva Voraz',        cost:1, atk:2, vida:1, faction:'M', type:'holo',    stage:0, next:'pb', traits:[] },
  pb: { id:'pb', name:'Pupa Blindada',      cost:0, atk:0, vida:3, faction:'M', type:'holo',    stage:1, next:'ab', traits:['pupa'] },
  ab: { id:'ab', name:'Esc. Blindado',      cost:0, atk:4, vida:2, faction:'M', type:'holo',    stage:2, next:null,  traits:[] },

  lc: { id:'lc', name:'Oruga de Seda',      cost:2, atk:1, vida:3, faction:'M', type:'holo',    stage:0, next:'pc', traits:[] },
  pc: { id:'pc', name:'Crisalida',          cost:0, atk:0, vida:4, faction:'M', type:'holo',    stage:1, next:'ac', traits:['pupa'] },
  ac: { id:'ac', name:'Mariposa Lunar',     cost:0, atk:2, vida:3, faction:'M', type:'holo',    stage:2, next:null,  traits:['volar'] },

  ld: { id:'ld', name:'Larva Tenaz',        cost:1, atk:1, vida:3, faction:'M', type:'holo',    stage:0, next:'pd', traits:[] },
  pd: { id:'pd', name:'Pupa Dura',          cost:0, atk:0, vida:5, faction:'M', type:'holo',    stage:1, next:'ad', traits:['pupa'] },
  ad: { id:'ad', name:'Esc. Tenaz',         cost:0, atk:3, vida:6, faction:'M', type:'holo',    stage:2, next:null,  traits:[] },

  sc: { id:'sc', name:'Escorpion Menor',    cost:1, atk:1, vida:2, faction:'A', type:'directo', stage:0, next:null,  traits:['ag1'] },
  sa: { id:'sa', name:'Arana Saltarina',    cost:1, atk:2, vida:1, faction:'A', type:'directo', stage:0, next:null,  traits:[] },
  st: { id:'st', name:'Arana Tejedora',     cost:2, atk:1, vida:4, faction:'A', type:'directo', stage:0, next:null,  traits:['tela'] },
  tr: { id:'tr', name:'Tarantula',          cost:3, atk:3, vida:3, faction:'A', type:'directo', stage:0, next:null,  traits:[] },
  sM: { id:'sM', name:'Escorpion Mayor',    cost:4, atk:4, vida:4, faction:'A', type:'directo', stage:0, next:null,  traits:['ag2'] },
}

export const BASE_DECK_M = [
  'la','la','la','la','lb','lb','lb','lc','lc','lc',
  'ld','ld','ld','ld','la','lb','lc','ld','la','lb',
]

export const BASE_DECK_A = [
  'sc','sc','sc','sc','sa','sa','sa','sa','st','st',
  'st','tr','tr','tr','sM','sM','sc','sa','tr','sM',
]

// ─── UTILIDADES ──────────────────────────────────────────────────────────────
let _uid = 0
export const mkUid  = () => ++_uid
export const life   = c => LIB[c.cardId].vida - c.damage
export const opp    = p => p === 'M' ? 'A' : 'M'

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ─── ENGINE ──────────────────────────────────────────────────────────────────
export function initGame() {
  const mDeck = shuffle([...BASE_DECK_M])
  const aDeck = shuffle([...BASE_DECK_A])
  return {
    turn: 1, active: 'M', over: false, winner: null,
    M: { hp:20, biomasa:1, maxB:1, hand:mDeck.splice(0,3), board:[], deck:mDeck },
    A: { hp:20, biomasa:1, maxB:1, hand:aDeck.splice(0,3), board:[], deck:aDeck },
  }
}

export function checkWin(s) {
  if (s.over) return s
  if (s.M.hp <= 0) return { ...s, over:true, winner:'A' }
  if (s.A.hp <= 0) return { ...s, over:true, winner:'M' }
  return s
}

export function doPlay(s, player, handIdx, stats) {
  const p = s[player]
  const cardId = p.hand[handIdx]
  if (cardId === undefined) return null
  const card = LIB[cardId]
  if (p.biomasa < card.cost || p.board.length >= 5) return null
  const o = opp(player)

  const hand = [...p.hand]; hand.splice(handIdx, 1)
  const creature = { uid:mkUid(), cardId, damage:0, hasAtk:false, canAtk:false, fed:false, trapped:false, fresh:true }

  let oppHp = s[o].hp
  let ag = 0
  if (card.traits.includes('ag1')) { oppHp -= 1; ag = 1 }
  if (card.traits.includes('ag2')) { oppHp -= 2; ag = 2 }

  if (stats) {
    const cs = cstat(stats, cardId)
    cs.played++; cs.damageDealt += ag; cs.aguijonDmg += ag
  }
  return {
    ...s,
    [player]: { ...p, hand, board:[...p.board, creature], biomasa:p.biomasa - card.cost },
    [o]: { ...s[o], hp:oppHp },
  }
}

export function doFeed(s, player, uid, stats) {
  const p = s[player]
  const idx = p.board.findIndex(c => c.uid === uid)
  if (idx < 0) return null
  const c = p.board[idx]
  const card = LIB[c.cardId]
  // Tiempo es automático en doEndTurn — Alimentar siempre cuesta 2
  if (!card.next || c.fed || c.fresh || p.biomasa < 2) return null

  const evolved = { ...c, cardId:card.next, fed:true, hasAtk:false }
  if (stats) { const cs = cstat(stats, card.id); cs.evolved++; stats.alimentarUsed++ }
  const newBoard = [...p.board]
  if (life(evolved) <= 0) {
    newBoard.splice(idx, 1)
    if (stats) cstat(stats, card.id).deaths++
  } else {
    newBoard[idx] = evolved
  }
  return { ...s, [player]: { ...p, board:newBoard, biomasa:p.biomasa - 2 } }
}

export function doAttackCreature(s, attP, attUid, defUid, stats) {
  const ap = s[attP], dp = s[opp(attP)]
  const ai = ap.board.findIndex(c => c.uid === attUid)
  const di = dp.board.findIndex(c => c.uid === defUid)
  if (ai < 0 || di < 0) return null
  const att = ap.board[ai], def = dp.board[di]
  const aC = LIB[att.cardId], dC = LIB[def.cardId]
  if (!att.canAtk || att.hasAtk || att.trapped || aC.traits.includes('pupa')) return null

  const newAD = att.damage + dC.atk
  const newDD = def.damage + aC.atk
  const attDies = newAD >= aC.vida, defDies = newDD >= dC.vida

  if (stats) {
    const csA = cstat(stats, att.cardId), csD = cstat(stats, def.cardId)
    csA.damageDealt += aC.atk; csA.combatAttacks++
    if (defDies) { csA.kills++; csD.deaths++ }
    if (attDies) { csD.counterKills++; csA.deaths++ }
  }

  let attBoard = ap.board.map((c,i) => i === ai ? { ...c, damage:newAD, hasAtk:true } : c)
  let defBoard = dp.board.map((c,i) => i === di ? { ...c, damage:newDD, trapped:def.trapped || aC.traits.includes('tela') } : c)
  attBoard = attBoard.filter(c => life(c) > 0)
  defBoard = defBoard.filter(c => life(c) > 0)
  return { ...s, [attP]: { ...ap, board:attBoard }, [opp(attP)]: { ...dp, board:defBoard } }
}

export function doAttackFace(s, attP, attUid, stats) {
  const ap = s[attP], o = opp(attP)
  const ai = ap.board.findIndex(c => c.uid === attUid)
  if (ai < 0) return null
  const att = ap.board[ai], aC = LIB[att.cardId]
  if (!att.canAtk || att.hasAtk || att.trapped || aC.traits.includes('pupa')) return null
  if (s[o].board.length > 0 && !aC.traits.includes('volar')) return null
  if (stats) { const cs = cstat(stats, att.cardId); cs.damageDealt += aC.atk; cs.faceAttacks++ }
  const newBoard = ap.board.map((c,i) => i === ai ? { ...c, hasAtk:true } : c)
  return { ...s, [attP]: { ...ap, board:newBoard }, [o]: { ...s[o], hp:s[o].hp - aC.atk } }
}

export function doEndTurn(s, stats = null) {
  const cur = s.active, next = opp(cur), np = s[next]
  const newMaxB = Math.min(10, np.maxB + 1)
  let deck = [...np.deck], hand = [...np.hand]
  if (deck.length) hand.push(deck.shift())

  // Auto-Tiempo: criaturas fresh con next evolucionan al inicio del próximo turno
  const nextBoard = np.board.map(c => {
    if (c.fresh && LIB[c.cardId].next) {
      if (stats) { cstat(stats, c.cardId).evolved++; stats.tiempoUsed++ }
      return { ...c, cardId:LIB[c.cardId].next, fresh:false, fed:false, hasAtk:false, canAtk:true }
    }
    return { ...c, hasAtk:false, canAtk:true, fed:false, fresh:false }
  }).filter(c => life(c) > 0)

  const curBoard = s[cur].board.map(c => ({ ...c, trapped:false }))
  return {
    ...s,
    turn: next === 'M' ? s.turn + 1 : s.turn,
    active: next,
    [cur]:  { ...s[cur], board:curBoard },
    [next]: { ...np, biomasa:newMaxB, maxB:newMaxB, hand, deck, board:nextBoard },
  }
}

// ─── ESTRATEGIAS IA ──────────────────────────────────────────────────────────
function pickCard(hand, biomasa, order) {
  const aff = hand.map((id,i) => ({ id,i,cost:LIB[id].cost })).filter(x => x.cost <= biomasa)
  if (!aff.length) return -1
  return aff.sort((a,b) => order === 'cheap' ? a.cost-b.cost : b.cost-a.cost)[0].i
}

export function stratAggro(s, player, stats) {
  let g = s
  const p = () => g[player], o = () => g[opp(player)]
  let ch = true
  while (ch && !g.over && p().board.length < 5) {
    ch = false
    const i = pickCard(p().hand, p().biomasa, 'cheap')
    if (i >= 0) { const ns = doPlay(g, player, i, stats); if (ns) { g = ns; ch = true } }
  }
  // Tiempo es automático en doEndTurn — no se dispara manualmente aquí
  for (const c of [...p().board]) {
    if (g.over) break
    if (!c.canAtk || c.hasAtk || c.trapped || LIB[c.cardId].traits.includes('pupa')) continue
    const aC = LIB[c.cardId]
    if (o().board.length === 0 || aC.traits.includes('volar')) { const ns = doAttackFace(g, player, c.uid, stats); if (ns) { g = ns; continue } }
    if (o().board.length > 0) {
      const t = [...o().board].sort((a,b) => life(a)-life(b))[0]
      const ns = doAttackCreature(g, player, c.uid, t.uid, stats); if (ns) g = ns
    }
  }
  return checkWin(g)
}

export function stratControl(s, player, stats) {
  let g = s
  const p = () => g[player], o = () => g[opp(player)]
  let ch = true
  while (ch && !g.over && p().board.length < 5) {
    ch = false
    const i = pickCard(p().hand, p().biomasa, 'costly')
    if (i >= 0) { const ns = doPlay(g, player, i, stats); if (ns) { g = ns; ch = true } }
  }
  // Tiempo es automático en doEndTurn — Alimentar solo en criaturas que ya pasaron por Tiempo
  for (const c of [...p().board]) if (!g.over && !c.fed && !c.fresh && LIB[c.cardId].next && p().biomasa >= 2) { const ns = doFeed(g, player, c.uid, stats); if (ns) g = ns }
  for (const c of [...p().board]) {
    if (g.over) break
    if (!c.canAtk || c.hasAtk || c.trapped || LIB[c.cardId].traits.includes('pupa')) continue
    const aC = LIB[c.cardId]
    if (o().board.length > 0) {
      const kill = o().board.find(t => aC.atk >= life(t))
      const t = kill || o().board.reduce((w,t) => life(t)<life(w)?t:w)
      const ns = doAttackCreature(g, player, c.uid, t.uid, stats); if (ns) { g = ns; continue }
    } else { const ns = doAttackFace(g, player, c.uid, stats); if (ns) g = ns }
  }
  return checkWin(g)
}

export function stratMeta(s, player, stats) {
  let g = s
  const p = () => g[player], o = () => g[opp(player)]
  let ch = true
  while (ch && !g.over && p().board.length < 5) {
    ch = false
    const i = pickCard(p().hand, p().biomasa, 'cheap')
    if (i >= 0) { const ns = doPlay(g, player, i, stats); if (ns) { g = ns; ch = true } }
  }
  // Tiempo es automático en doEndTurn — solo Alimentar en criaturas que ya pasaron por Tiempo
  let ec = true
  while (ec && !g.over) {
    ec = false
    for (const c of [...p().board]) {
      if (c.fed || c.fresh || !LIB[c.cardId].next || p().biomasa < 2) continue
      const ns = doFeed(g, player, c.uid, stats); if (ns) { g = ns; ec = true; break }
    }
  }
  for (const c of [...p().board]) {
    if (g.over) break
    const card = LIB[c.cardId]
    if (!c.canAtk || c.hasAtk || c.trapped || card.traits.includes('pupa')) continue
    if (card.stage < 2 && card.type === 'holo' && o().board.length > 0) continue
    if (o().board.length === 0 || card.traits.includes('volar')) { const ns = doAttackFace(g, player, c.uid, stats); if (ns) { g = ns; continue } }
    if (o().board.length > 0) {
      const kill = o().board.find(t => card.atk >= life(t))
      if (kill) { const ns = doAttackCreature(g, player, c.uid, kill.uid, stats); if (ns) g = ns }
    }
  }
  return checkWin(g)
}

export function stratTempo(s, player, stats) {
  let g = s
  const p = () => g[player], o = () => g[opp(player)]
  const hasFresh = p().board.some(c => c.fresh && LIB[c.cardId].next)
  const budget = hasFresh ? Math.max(0, p().biomasa - 2) : p().biomasa
  let ch = true
  while (ch && !g.over && p().board.length < 5) {
    ch = false
    const aff = p().hand.map((id,i) => ({ id,i,cost:LIB[id].cost }))
      .filter(x => x.cost <= (budget > 0 ? budget : p().biomasa))
      .sort((a,b) => b.cost-a.cost)
    if (aff.length) { const ns = doPlay(g, player, aff[0].i, stats); if (ns) { g = ns; ch = true } }
  }
  // Tiempo es automático en doEndTurn — no se dispara manualmente aquí
  for (const c of [...p().board]) {
    if (g.over) break
    const aC = LIB[c.cardId]
    if (!c.canAtk || c.hasAtk || c.trapped || aC.traits.includes('pupa')) continue
    if (o().board.length > 0) {
      const kill = o().board.find(t => aC.atk >= life(t))
      if (kill) { const ns = doAttackCreature(g, player, c.uid, kill.uid, stats); if (ns) { g = ns; continue } }
      if (aC.traits.includes('volar')) { const ns = doAttackFace(g, player, c.uid, stats); if (ns) { g = ns; continue } }
      const t = o().board.reduce((w,t) => life(t)<life(w)?t:w)
      const ns = doAttackCreature(g, player, c.uid, t.uid, stats); if (ns) g = ns
    } else { const ns = doAttackFace(g, player, c.uid, stats); if (ns) g = ns }
  }
  return checkWin(g)
}

export const STRATEGIES = { AGGRO:stratAggro, CONTROL:stratControl, META:stratMeta, TEMPO:stratTempo }

// ─── SIMULADOR ───────────────────────────────────────────────────────────────
export const MAX_TURNS = 50

function cstat(stats, cardId) {
  if (!stats.cards[cardId]) {
    const card = LIB[cardId]
    stats.cards[cardId] = {
      id:cardId, name:card.name, faction:card.faction, stage:card.stage,
      played:0, evolved:0, kills:0, counterKills:0, deaths:0,
      damageDealt:0, aguijonDmg:0, faceAttacks:0, combatAttacks:0, survivedGames:0,
    }
  }
  return stats.cards[cardId]
}

export function newStats() {
  return {
    games:0, mWins:0, aWins:0, draws:0,
    totalTurns:0, winnerHpSum:0,
    tiempoUsed:0, alimentarUsed:0,
    cards:{}, turnDist:{},
  }
}

export function runGame(mStrat, aStrat, stats) {
  let s = initGame()
  for (let half = 0; half < MAX_TURNS * 2 && !s.over; half++) {
    s = (s.active === 'M' ? mStrat : aStrat)(s, s.active, stats)
    if (!s.over) s = doEndTurn(s, stats)
  }
  if (!s.over) { s = { ...s, over:true, winner: s.M.hp >= s.A.hp ? 'M' : 'A' }; if (stats) stats.draws++ }
  if (stats) {
    for (const c of [...s.M.board, ...s.A.board]) cstat(stats, c.cardId).survivedGames++
    stats.games++
    if (s.winner === 'M') stats.mWins++; else stats.aWins++
    stats.totalTurns += s.turn
    stats.winnerHpSum += Math.max(0, s.winner === 'M' ? s.M.hp : s.A.hp)
    const tk = String(s.turn); stats.turnDist[tk] = (stats.turnDist[tk] || 0) + 1
  }
  return s
}

export function runMatchup(mStratName, aStratName, numGames) {
  const stats = newStats()
  const mS = STRATEGIES[mStratName], aS = STRATEGIES[aStratName]
  for (let i = 0; i < numGames; i++) runGame(mS, aS, stats)
  return stats
}
