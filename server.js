// Хөзрийн Танхим — online card club server (Blackjack, 13, Texas Hold'em).
// The server deals and owns all game state; each player only receives their own hidden cards.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { WebSocketServer } = require("ws");

const PORT = process.env.PORT || 3000;
const INDEX = fs.readFileSync(path.join(__dirname, "public", "index.html"));
const TURN_MS = 30000, BB = 20, SB = 10, TL_PAY = 10;
const G = { bj: { min: 1, max: 7, minBal: 10 }, tl: { min: 2, max: 4, minBal: 10 }, pk: { min: 2, max: 8, minBal: 20 } };

const server = http.createServer((req, res) => {
  if (req.url === "/health") { res.end("ok"); return; }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
  res.end(INDEX);
});
const wss = new WebSocketServer({ server, maxPayload: 16 * 1024 });

const tables = new Map(); // id -> {id,name,game,created,last,T,seats,chat}
const clients = new Map(); // ws -> {id,nick,tid}

/* ---------------- helpers ---------------- */
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
function deck(n = 1) {
  const s = [];
  for (let k = 0; k < n; k++) for (const su of "SHDC") for (const r of RANKS) s.push(r + su);
  for (let i = s.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [s[i], s[j]] = [s[j], s[i]]; }
  return s;
}
const clean = (s, n) => String(s ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, n);
const send = (ws, m) => { if (ws.readyState === 1) ws.send(JSON.stringify(m)); };
const onlineIds = tb => [...clients.values()].filter(c => c.tid === tb.id).map(c => c.id);

/* ---------------- Blackjack ---------------- */
function bjVal(h) { let t = 0, a = 0; for (const c of h || []) { const r = c.slice(0, -1); if (r === "A") { a++; t += 11; } else t += isNaN(r) ? 10 : +r; } while (t > 21 && a) { t -= 10; a--; } return t; }
const isBJ = h => h && h.length === 2 && bjVal(h) === 21;
function draw(st) { if (!st.shoe.length) st.shoe = deck(2); return st.shoe.pop(); }
function dealBJ(st, players, tb) {
  const old = tb.T.shoe;
  Object.assign(st, { hands: {}, bets: {}, done: {}, turn: 0, dealer: [], shoe: Array.isArray(old) && old.length >= 20 + players.length * 5 ? [...old] : deck(2) });
  for (const u of players) { st.hands[u] = [draw(st), draw(st)]; st.bets[u] = tb.seats[u].bet; if (isBJ(st.hands[u])) st.done[u] = true; }
  st.dealer = [draw(st), draw(st)];
  if (isBJ(st.dealer)) players.forEach(u => (st.done[u] = true));
  return bjAdvance(st);
}
function bjAdvance(st) {
  for (let i = 0; i < st.order.length; i++) if (!st.done[st.order[i]]) { st.turn = i; st.turnAt = Date.now(); return st; }
  const live = st.order.filter(u => bjVal(st.hands[u]) <= 21 && !isBJ(st.hands[u]));
  if (live.length && !isBJ(st.dealer)) while (bjVal(st.dealer) < 17) st.dealer.push(draw(st));
  const dv = bjVal(st.dealer), dBJ = isBJ(st.dealer);
  for (const u of st.order) {
    const h = st.hands[u], pv = bjVal(h), b = st.bets[u], pBJ = isBJ(h); let r;
    if (pv > 21) r = [-b, "Шатлаа −" + b];
    else if (pBJ && !dBJ) r = [Math.floor(b * 1.5), "Блэкжек! +" + Math.floor(b * 1.5)];
    else if (dBJ && !pBJ) r = [-b, "Диллер блэкжек −" + b];
    else if (dv > 21) r = [b, "Диллер шатлаа +" + b];
    else if (pv > dv) r = [b, "Яллаа +" + b];
    else if (pv < dv) r = [-b, "Ялагдлаа −" + b];
    else r = [0, "Тэнцлээ"];
    st.results[u] = { d: r[0], t: r[1] };
  }
  st.phase = "done"; st.turn = -1; return st;
}
function actBJ(st, u, m, tb) {
  const h = st.hands[u];
  if (m.a === "hit") { h.push(draw(st)); if (bjVal(h) >= 21) st.done[u] = true; }
  else if (m.a === "stand") st.done[u] = true;
  else if (m.a === "dbl") { if (h.length !== 2 || tb.seats[u].bal < 2 * st.bets[u]) return false; st.bets[u] *= 2; h.push(draw(st)); st.done[u] = true; }
  else return false;
  bjAdvance(st); return true;
}

/* ---------------- 13 ---------------- */
const TR = ["3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A", "2"], TS = "SCDH";
const tr = c => TR.indexOf(c.slice(0, -1)), tv = c => tr(c) * 4 + TS.indexOf(c.slice(-1));
function combo(cards) {
  const cs = [...cards].sort((a, b) => tv(a) - tv(b)), n = cs.length; if (!n) return null;
  const rs = cs.map(tr), top = tv(cs[n - 1]), same = rs.every(x => x === rs[0]);
  const consec = a => a.every((x, i) => i === 0 || x === a[i - 1] + 1);
  if (n === 1) return { t: "single", n, top };
  if (same && n === 2) return { t: "pair", n, top };
  if (same && n === 3) return { t: "triple", n, top };
  if (same && n === 4) return { t: "four", n, top };
  if (n >= 3 && !rs.includes(12) && consec(rs)) return { t: "straight", n, top };
  if (n >= 6 && n % 2 === 0 && !rs.includes(12)) { const pr = []; for (let i = 0; i < n; i += 2) { if (rs[i] !== rs[i + 1]) return null; pr.push(rs[i]); } if (consec(pr)) return { t: "pairs", n, top }; }
  return null;
}
function beats(a, p) {
  if (!p) return true;
  if (p.t === "single" && p.top >= 48 && (a.t === "four" || a.t === "pairs")) return true;
  if (p.t === "pair" && p.top >= 48 && (a.t === "four" || (a.t === "pairs" && a.n >= 8))) return true;
  if (p.t === "four" && a.t === "pairs" && a.n >= 8) return true;
  return a.t === p.t && a.n === p.n && a.top > p.top;
}
function dealTL(st, players) {
  const d = deck(1); st.hands = {};
  for (const u of players) st.hands[u] = d.splice(0, 13).sort((a, b) => tv(a) - tv(b));
  let best = 0, low = 99; players.forEach((u, i) => { const v = tv(st.hands[u][0]); if (v < low) { low = v; best = i; } });
  return Object.assign(st, { pile: null, passed: {}, turn: best });
}
function tlNext(st) {
  const n = st.order.length; let i = st.turn;
  for (let k = 0; k < n * 2; k++) {
    i = (i + 1) % n; const u = st.order[i];
    if (st.pile && u === st.pile.by) { st.pile = null; st.passed = {}; st.turn = i; st.turnAt = Date.now(); return st; }
    if (!st.passed[u]) { st.turn = i; st.turnAt = Date.now(); return st; }
  }
  st.pile = null; st.passed = {}; st.turnAt = Date.now(); return st;
}
function tlApply(st, u, cards) {
  const cb = combo(cards);
  st.hands[u] = st.hands[u].filter(c => !cards.includes(c));
  st.pile = { cards: [...cards].sort((a, b) => tv(a) - tv(b)), t: cb.t, n: cb.n, top: cb.top, by: u };
  if (!st.hands[u].length) {
    let pot = 0;
    for (const o of st.order) if (o !== u) { const left = st.hands[o].length, p = left * TL_PAY; pot += p; st.results[o] = { d: -p, t: `${left} хөзөр үлдсэн −${p}` }; }
    st.results[u] = { d: pot, t: "Түрүүллээ! +" + pot }; st.phase = "done"; st.turn = -1; return st;
  }
  return tlNext(st);
}
function actTL(st, u, m) {
  if (m.a === "pass") { if (!st.pile) return false; st.passed[u] = true; tlNext(st); return true; }
  if (m.a !== "play" || !Array.isArray(m.cards) || !m.cards.length || m.cards.length > 13) return false;
  const cards = [...new Set(m.cards.map(String))];
  if (cards.length !== m.cards.length || !cards.every(c => st.hands[u].includes(c))) return false;
  const cb = combo(cards); if (!cb || !beats(cb, st.pile)) return false;
  tlApply(st, u, cards); return true;
}

/* ---------------- Texas Hold'em ---------------- */
const HN = ["Өндөр хөзөр", "Хос", "Хоёр хос", "Гурвал", "Дараалал", "Нэг өнгө", "Фулл хаус", "Каре", "Стрит флаш"];
const PV = c => { const r = c.slice(0, -1); return r === "A" ? 14 : r === "K" ? 13 : r === "Q" ? 12 : r === "J" ? 11 : +r; };
function ev5(cs) {
  const v = cs.map(PV).sort((a, b) => b - a), s = cs.map(c => c.slice(-1)), fl = s.every(x => x === s[0]), cnt = {};
  v.forEach(x => (cnt[x] = (cnt[x] || 0) + 1));
  const g = Object.entries(cnt).map(([k, n]) => [n, +k]).sort((a, b) => b[0] - a[0] || b[1] - a[1]); let st = 0;
  if (g.length === 5) { if (v[0] - v[4] === 4) st = v[0]; else if (v[0] === 14 && v[1] === 5) st = 5; }
  if (st && fl) return [8, st]; if (g[0][0] === 4) return [7, g[0][1], g[1][1]]; if (g[0][0] === 3 && g[1][0] === 2) return [6, g[0][1], g[1][1]];
  if (fl) return [5, ...v]; if (st) return [4, st]; if (g[0][0] === 3) return [3, ...g.map(x => x[1])];
  if (g[0][0] === 2 && g[1][0] === 2) return [2, ...g.map(x => x[1])]; if (g[0][0] === 2) return [1, ...g.map(x => x[1])]; return [0, ...v];
}
const cmp = (a, b) => { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; };
function bestOf(cs) {
  if (cs.length < 5) return null; let b = null; const combos = [];
  const pick = (s, acc) => { if (acc.length === 5) { combos.push(acc); return; } for (let i = s; i < cs.length; i++) pick(i + 1, [...acc, cs[i]]); };
  pick(0, []); for (const h of combos) { const e = ev5(h); if (!b || cmp(e, b) > 0) b = e; } return b;
}
function pkPut(st, u, amt) { const a = Math.max(0, Math.min(amt, st.stack0[u] - st.contrib[u])); st.bet[u] += a; st.contrib[u] += a; if (st.stack0[u] - st.contrib[u] <= 0) st.allin[u] = true; }
function dealPK(st, players, tb) {
  const n = players.length, btn = ((tb.T.btn ?? -1) + 1) % n, d = deck(1);
  Object.assign(st, { btn, street: 0, board: [], deck: d, hole: {}, stack0: {}, contrib: {}, bet: {}, folded: {}, allin: {}, acted: {}, cur: BB, minR: BB });
  for (const u of players) { st.hole[u] = [d.pop(), d.pop()]; st.stack0[u] = tb.seats[u].bal; st.contrib[u] = 0; st.bet[u] = 0; }
  const sb = n === 2 ? btn : (btn + 1) % n, bb = (sb + 1) % n; st.sb = players[sb]; st.bb = players[bb];
  pkPut(st, players[sb], SB); pkPut(st, players[bb], BB); st.cur = Math.max(st.bet[players[bb]], st.bet[players[sb]]);
  st.turn = bb; st.acted = {}; return pkNext(st);
}
function pkNext(st) {
  const live = st.order.filter(u => !st.folded[u]);
  if (live.length === 1) return pkWin(st, live[0]);
  const can = live.filter(u => !st.allin[u]), n = st.order.length;
  const done = can.length === 0 || (can.length === 1 && st.bet[can[0]] >= st.cur) || can.every(u => st.acted[u] && st.bet[u] === st.cur);
  if (!done) for (let k = 1; k <= n; k++) { const i = (st.turn + k) % n, u = st.order[i]; if (can.includes(u) && !(st.acted[u] && st.bet[u] === st.cur)) { st.turn = i; st.turnAt = Date.now(); return st; } }
  if (st.street >= 3 || can.length <= 1) { while (st.board.length < 5) st.board.push(st.deck.pop()); return pkShow(st); }
  st.street++; const add = st.street === 1 ? 3 : 1; for (let i = 0; i < add; i++) st.board.push(st.deck.pop());
  for (const u of st.order) st.bet[u] = 0; st.cur = 0; st.minR = BB; st.acted = {};
  for (let k = 1; k <= n; k++) { const i = (st.btn + k) % n; if (can.includes(st.order[i])) { st.turn = i; break; } }
  st.turnAt = Date.now(); return st;
}
function pkWin(st, w) {
  const pot = st.order.reduce((a, u) => a + st.contrib[u], 0);
  for (const u of st.order) { const d = (u === w ? pot : 0) - st.contrib[u]; st.results[u] = { d, t: u === w ? `Пот авлаа +${d}` : st.contrib[u] ? `Хаясан −${st.contrib[u]}` : "Хаясан" }; }
  st.phase = "done"; st.turn = -1; st.showdown = false; return st;
}
function pkShow(st) {
  const live = st.order.filter(u => !st.folded[u]), sc = {}; live.forEach(u => (sc[u] = bestOf([...st.hole[u], ...st.board])));
  const w = {}; st.order.forEach(u => (w[u] = 0));
  const levels = [...new Set(live.map(u => st.contrib[u]))].sort((a, b) => a - b); let prevL = 0, dist = 0, lastW = [live[0]];
  for (const L of levels) {
    let pot = 0; for (const u of st.order) pot += Math.max(0, Math.min(st.contrib[u], L) - prevL);
    const el = live.filter(u => st.contrib[u] >= L); let top = null, ws = [];
    for (const u of el) { const c = top ? cmp(sc[u], top) : 1; if (c > 0) { top = sc[u]; ws = [u]; } else if (c === 0) ws.push(u); }
    const share = Math.floor(pot / ws.length); ws.forEach(u => (w[u] += share)); w[ws[0]] += pot - share * ws.length; dist += pot; prevL = L; lastW = ws;
  }
  const total = st.order.reduce((a, u) => a + st.contrib[u], 0); if (total > dist) w[lastW[0]] += total - dist;
  for (const u of st.order) { const d = w[u] - st.contrib[u]; st.results[u] = { d, t: sc[u] ? (d > 0 ? `+${d} · ` : d < 0 ? `−${-d} · ` : "") + HN[sc[u][0]] : `Хаясан −${st.contrib[u]}` }; }
  st.phase = "done"; st.turn = -1; st.showdown = true; return st;
}
function actPK(st, u, m) {
  const rem = st.stack0[u] - st.contrib[u];
  if (m.a === "fold") st.folded[u] = true;
  else if (m.a === "call") pkPut(st, u, st.cur - st.bet[u]);
  else if (m.a === "raise") {
    const to = Math.min(Math.floor(+m.to || 0), st.bet[u] + rem), minTo = st.cur + st.minR;
    if (!(to > 0) || (to < minTo && to < st.bet[u] + rem)) return false;
    const inc = to - st.cur; pkPut(st, u, to - st.bet[u]);
    if (to > st.cur) { if (inc >= st.minR) st.minR = inc; st.cur = to; st.acted = {}; }
  } else return false;
  st.acted[u] = true; pkNext(st); return true;
}

/* ---------------- table flow ---------------- */
function settle(tb) {
  const T = tb.T; if (T.phase !== "done" || T.settled) return;
  for (const [u, x] of Object.entries(T.results || {})) { const s = tb.seats[u]; if (!s) continue; s.bal += x.d; if (s.bal < 10) s.bal = 1000; }
  T.settled = true;
}
function startRound(tb) {
  const T = tb.T, g = tb.game, r = (T.round || 0) + 1, on = new Set(onlineIds(tb));
  if (T.phase === "play") return "Тойрог явагдаж байна";
  const players = Object.entries(tb.seats).filter(([u, s]) => on.has(u) && s.readyFor === r && (g === "bj" ? s.bet > 0 && s.bet <= s.bal : s.bal >= G[g].minBal)).map(([u]) => u).slice(0, G[g].max);
  if (players.length < G[g].min) return `Дор хаяж ${G[g].min} хүн бэлэн байх ёстой`;
  const base = { phase: "play", round: r, order: players, turnAt: Date.now(), results: {}, btn: T.btn };
  tb.T = { bj: dealBJ, tl: dealTL, pk: dealPK }[g](base, players, tb);
  settle(tb); return null;
}
function autoMove(tb) {
  const st = tb.T, u = st.order[st.turn], g = tb.game; if (!u) return;
  if (g === "bj") { st.done[u] = true; bjAdvance(st); }
  else if (g === "tl") { if (!st.pile) { const low = [...st.hands[u]].sort((a, b) => tv(a) - tv(b))[0]; tlApply(st, u, [low]); } else { st.passed[u] = true; tlNext(st); } }
  else { if (st.bet[u] < st.cur) st.folded[u] = true; st.acted[u] = true; pkNext(st); }
  settle(tb);
}

/* ---------------- views (hide what each player must not see) ---------------- */
function viewFor(tb, me) {
  const T = JSON.parse(JSON.stringify(tb.T)), play = T.phase === "play";
  delete T.shoe; delete T.deck;
  if (tb.game === "bj" && play && T.dealer) T.dealer = [T.dealer[0], "BK"];
  if (tb.game === "tl" && play && T.hands) for (const u in T.hands) if (u !== me) T.hands[u] = T.hands[u].map(() => "BK");
  if (tb.game === "pk" && T.hole) for (const u in T.hole) if (u !== me && !(T.phase === "done" && T.showdown && !T.folded[u])) T.hole[u] = ["BK", "BK"];
  Object.assign(T, { name: tb.name, game: tb.game });
  const seats = {}; for (const [u, s] of Object.entries(tb.seats)) seats[u] = { nick: s.nick, bal: s.bal, bet: s.bet, readyFor: s.readyFor, at: s.at };
  return { type: "state", tid: tb.id, T, seats, online: onlineIds(tb), now: Date.now() };
}
function broadcast(tb) { for (const [ws, c] of clients) if (c.tid === tb.id) send(ws, viewFor(tb, c.id)); }
function tableList() {
  return [...tables.values()].sort((a, b) => b.created - a.created).slice(0, 60)
    .map(t => ({ id: t.id, name: t.name, game: t.game, phase: t.T.phase, round: t.T.round || 0, online: onlineIds(t).length }));
}
let listTimer = null;
function pushList() { clearTimeout(listTimer); listTimer = setTimeout(() => { const l = tableList(); for (const [ws, c] of clients) if (!c.tid) send(ws, { type: "tables", list: l }); }, 150); }

/* ---------------- sockets ---------------- */
wss.on("connection", ws => {
  const c = { id: null, nick: "", tid: null }; clients.set(ws, c);
  ws.on("message", raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m !== "object") return;
    if (m.type === "hello") {
      const token = clean(m.token, 64); if (token.length < 16) return;
      c.id = "p" + crypto.createHash("sha256").update(token).digest("hex").slice(0, 14);
      c.nick = clean(m.nick, 18) || "Тоглогч";
      send(ws, { type: "welcome", id: c.id }); send(ws, { type: "tables", list: tableList() }); return;
    }
    if (!c.id) return;
    const tb = c.tid ? tables.get(c.tid) : null;
    switch (m.type) {
      case "nick": c.nick = clean(m.nick, 18) || c.nick; if (tb && tb.seats[c.id]) { tb.seats[c.id].nick = c.nick; broadcast(tb); } break;
      case "list": send(ws, { type: "tables", list: tableList() }); break;
      case "create": {
        if (tables.size >= 200) { send(ws, { type: "err", m: "Ширээ хэт олон байна, дараа оролд." }); break; }
        const game = G[m.game] ? m.game : "bj", id = crypto.randomBytes(4).toString("hex").slice(0, 6);
        tables.set(id, { id, game, name: clean(m.name, 24) || "Ширээ", created: Date.now(), last: Date.now(), T: { phase: "idle", round: 0 }, seats: {}, chat: [] });
        send(ws, { type: "created", id }); pushList(); break;
      }
      case "join": {
        const t = tables.get(clean(m.tid, 12)); if (!t) { send(ws, { type: "err", m: "Ийм ширээ алга.", gone: true }); break; }
        const old = c.tid && tables.get(c.tid); c.tid = t.id; t.last = Date.now();
        if (!t.seats[c.id]) t.seats[c.id] = { nick: c.nick, bal: 1000, bet: 0, readyFor: 0, at: Date.now() };
        else Object.assign(t.seats[c.id], { nick: c.nick, at: Date.now() });
        send(ws, { type: "chatlog", list: t.chat });
        if (old && old !== t) broadcast(old); broadcast(t); pushList(); break;
      }
      case "leave": { c.tid = null; if (tb) broadcast(tb); send(ws, { type: "tables", list: tableList() }); pushList(); break; }
      case "chat": {
        if (!tb) break; const t = clean(m.t, 200); if (!t) break;
        const msg = { from: c.id, n: c.nick, t, at: Date.now() }; tb.chat.push(msg); if (tb.chat.length > 40) tb.chat.shift();
        for (const [w, o] of clients) if (o.tid === tb.id) send(w, { type: "chat", ...msg }); break;
      }
      case "ready": {
        if (!tb) break; const s = tb.seats[c.id], r = (tb.T.round || 0) + 1; if (!s || tb.T.phase === "play") break;
        if (tb.game === "bj") { const bet = Math.floor(+m.bet || 0); if (bet < 1 || bet > s.bal) break; s.bet = bet; } else { if (s.bal < G[tb.game].minBal) break; s.bet = 0; }
        s.readyFor = r; tb.last = Date.now(); broadcast(tb); break;
      }
      case "unready": { if (tb && tb.seats[c.id]) { tb.seats[c.id].readyFor = 0; broadcast(tb); } break; }
      case "start": { if (!tb) break; const e = startRound(tb); if (e) send(ws, { type: "err", m: e }); else { tb.last = Date.now(); broadcast(tb); pushList(); } break; }
      case "act": {
        if (!tb || tb.T.phase !== "play" || tb.T.order[tb.T.turn] !== c.id) break;
        const ok = { bj: actBJ, tl: actTL, pk: actPK }[tb.game](tb.T, c.id, m, tb);
        if (!ok) { send(ws, { type: "err", m: "Ийм нүүдэл хийж болохгүй." }); break; }
        settle(tb); tb.last = Date.now(); broadcast(tb); if (tb.T.phase === "done") pushList(); break;
      }
      case "skip": { if (tb && tb.T.phase === "play" && Date.now() - tb.T.turnAt > TURN_MS && tb.T.order[tb.T.turn] !== c.id) { autoMove(tb); broadcast(tb); } break; }
    }
  });
  ws.on("close", () => { const tb = c.tid && tables.get(c.tid); clients.delete(ws); if (tb) broadcast(tb); pushList(); });
});

// Turn timer: a player who goes quiet is moved for automatically after 30 s (stand / pass / check-or-fold).
setInterval(() => {
  for (const tb of tables.values()) if (tb.T.phase === "play" && Date.now() - tb.T.turnAt > TURN_MS + 5000) { autoMove(tb); broadcast(tb); }
}, 2000);
// Drop tables nobody has used for 6 hours.
setInterval(() => {
  for (const [id, tb] of tables) if (!onlineIds(tb).length && Date.now() - tb.last > 6 * 3600e3) tables.delete(id);
  pushList();
}, 60000);
// Keep connections alive behind proxies.
setInterval(() => { for (const ws of clients.keys()) if (ws.readyState === 1) ws.ping(); }, 25000);

server.listen(PORT, () => console.log("Хөзрийн Танхим: http://localhost:" + PORT));
