// Backend falso en memoria para probar la interfaz sin Supabase. Se activa con ?mock en la URL.
(function () {
  const uid = () => crypto.randomUUID();
  const ymd = d => { const z = n => String(n).padStart(2, '0'); return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate()); };
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
  const ME = 'me-0000', A = 'u-diego', B = 'u-vale';
  const db = {
    session: null,
    profiles: [{ id: A, name: 'Diego' }, { id: B, name: 'Valeria' }],
    habits: [], logs: [], parties: [], members: [], ph: [], events: [], eid: 1
  };
  function seedFriend(u, name, icon, color, p) {
    const h = { id: uid(), user_id: u, name, icon, color, category: 'cuerpo', freq: 'Diario', archived: false, created_at: new Date().toISOString() };
    db.habits.push(h);
    for (let i = 0; i < 60; i++) if (i < 3 || Math.random() < p) db.logs.push({ habit_id: h.id, user_id: u, day: daysAgo(i) });
    return h;
  }
  const hd = seedFriend(A, 'Entrenar', '🏋️', '#FFB547', .8), hv = seedFriend(B, 'Leer 20 min', '📖', '#36C5F0', .7);
  db.logs = db.logs.filter(l => !(l.user_id === B && l.day === daysAgo(0)));
  const party = { id: uid(), name: 'Los del 6 a.m.', code: 'SEIS6', prize: 'El último invita el ceviche', lives: 3, weeks: 4, start_date: daysAgo(10), owner: A, created_at: new Date().toISOString() };
  db.parties.push(party);
  db.members.push({ party_id: party.id, user_id: A, joined_at: daysAgo(10) }, { party_id: party.id, user_id: B, joined_at: daysAgo(10) });
  db.ph.push({ party_id: party.id, habit_id: hd.id, user_id: A }, { party_id: party.id, habit_id: hv.id, user_id: B });
  db.events.push({ id: db.eid++, party_id: party.id, user_id: A, kind: 'log', payload: { habit: 'Entrenar' }, created_at: new Date(Date.now() - 3600e3).toISOString() });
  const me = () => db.session.user.id;
  const wait = v => new Promise(r => setTimeout(() => r(v), 30));
  const cbs = [];

  window.RACHA_API = {
    mock: true,
    async session() { return db.session; },
    onAuth(cb) { cbs.push(cb); },
    async signUp(email, pw, name) { db.profiles.push({ id: ME, name }); db.session = { user: { id: ME, email } }; cbs.forEach(c => c(db.session)); return db.session; },
    async signIn(email) { if (!db.profiles.find(p => p.id === ME)) db.profiles.push({ id: ME, name: email.split('@')[0] }); db.session = { user: { id: ME, email } }; cbs.forEach(c => c(db.session)); return db.session; },
    async signOut() { db.session = null; cbs.forEach(c => c(null)); },
    async profiles(ids) { return wait(db.profiles.filter(p => ids.includes(p.id))); },
    async updateName(id, name) { db.profiles.find(p => p.id === id).name = name; },
    async habitsOf(ids) { return wait(db.habits.filter(h => ids.includes(h.user_id))); },
    async addHabit(h) { const n = Object.assign({ id: uid(), user_id: me(), archived: false, created_at: new Date().toISOString() }, h); db.habits.push(n); return wait(n); },
    async updateHabit(id, p) { Object.assign(db.habits.find(h => h.id === id), p); },
    async deleteHabit(id) { db.habits = db.habits.filter(h => h.id !== id); db.logs = db.logs.filter(l => l.habit_id !== id); db.ph = db.ph.filter(l => l.habit_id !== id); },
    async logs(ids, from) { return wait(db.logs.filter(l => ids.includes(l.user_id) && l.day >= from)); },
    async setLog(hid, day, on) { db.logs = db.logs.filter(l => !(l.habit_id === hid && l.day === day)); if (on) db.logs.push({ habit_id: hid, user_id: me(), day }); },
    async myParties(u) { const ids = db.members.filter(m => m.user_id === u).map(m => m.party_id); return wait(db.parties.filter(p => ids.includes(p.id))); },
    async createParty(p, u) { const n = Object.assign({ id: uid(), owner: u, created_at: new Date().toISOString(), start_date: ymd(new Date()) }, p); db.parties.push(n); db.members.push({ party_id: n.id, user_id: u, joined_at: new Date().toISOString() }); return n; },
    async joinParty(code) { const p = db.parties.find(x => x.code.toUpperCase() === code.trim().toUpperCase()); if (!p) throw new Error('Código no encontrado'); if (!db.members.find(m => m.party_id === p.id && m.user_id === me())) db.members.push({ party_id: p.id, user_id: me(), joined_at: new Date().toISOString() }); return p.id; },
    async leaveParty(pid, u) { db.members = db.members.filter(m => !(m.party_id === pid && m.user_id === u)); db.ph = db.ph.filter(m => !(m.party_id === pid && m.user_id === u)); },
    async partyMembers(pid) { return wait(db.members.filter(m => m.party_id === pid)); },
    async partyHabits(pid) { return wait(db.ph.filter(m => m.party_id === pid)); },
    async allMyCommitments(u) { return wait(db.ph.filter(m => m.user_id === u)); },
    async setCommitments(pid, u, ids) { db.ph = db.ph.filter(m => !(m.party_id === pid && m.user_id === u)); ids.forEach(h => db.ph.push({ party_id: pid, habit_id: h, user_id: u })); },
    async events(pid) { return wait(db.events.filter(e => e.party_id === pid).sort((a, b) => b.id - a.id)); },
    async addEvent(pid, kind, payload) { db.events.push({ id: db.eid++, party_id: pid, user_id: me(), kind, payload: payload || {}, created_at: new Date().toISOString() }); }
  };
})();
