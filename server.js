// Garáž & Asfalt – multiplayer relay. Každý svět = místnost; server jen přeposílá "presence" hráčů.
const http = require('http');
const { WebSocketServer } = require('ws');
const PORT = process.env.PORT || 8080;
const MAX_PER_ROOM = 24, MAX_MSG = 2048, MIN_GAP = 40; // ms mezi zprávami od jednoho hráče
const rooms = new Map(); // name -> Map(id -> {ws, presence})
let nextId = 1;

const server = http.createServer((req, res) => { res.writeHead(200, { 'content-type': 'text/plain' }); res.end('Garaz & Asfalt server OK\n'); });
const wss = new WebSocketServer({ server, maxPayload: MAX_MSG });
const send = (ws, o) => { if (ws.readyState === 1) ws.send(JSON.stringify(o)); };

wss.on('connection', (ws) => {
  const id = 'p' + (nextId++).toString(36) + Math.random().toString(36).slice(2, 6);
  let room = null, last = 0; ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch (e) { return; }
    if (!m || typeof m.t !== 'string') return;
    if (m.t === 'join') {
      if (room || typeof m.room !== 'string' || !/^[\w-]{1,32}$/.test(m.room)) return;
      let r = rooms.get(m.room); if (!r) rooms.set(m.room, r = new Map());
      if (r.size >= MAX_PER_ROOM) return send(ws, { t: 'full' });
      room = m.room; r.set(id, { ws, presence: null });
      const list = []; r.forEach((c, k) => { if (k !== id && c.presence) list.push({ id: k, d: c.presence }); });
      send(ws, { t: 'welcome', id, peers: list });
    } else if (m.t === 'p' && room) {
      const now = Date.now(); if (now - last < MIN_GAP) return; last = now;
      if (!m.d || typeof m.d !== 'object') return;
      const r = rooms.get(room), me = r && r.get(id); if (!me) return;
      me.presence = m.d;
      const out = JSON.stringify({ t: 'u', id, d: m.d });
      r.forEach((c, k) => { if (k !== id && c.ws.readyState === 1) c.ws.send(out); });
    }
  });
  ws.on('close', () => {
    if (!room) return; const r = rooms.get(room); if (!r) return;
    r.delete(id); const out = JSON.stringify({ t: 'l', id });
    r.forEach((c) => { if (c.ws.readyState === 1) c.ws.send(out); });
    if (!r.size) rooms.delete(room);
  });
  ws.on('error', () => { });
});
setInterval(() => { wss.clients.forEach((ws) => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; try { ws.ping(); } catch (e) { } }); }, 20000);
server.listen(PORT, () => console.log('listening on ' + PORT));
