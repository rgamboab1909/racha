/* Racha · app principal (vanilla JS, sin build) */
(function () {
  'use strict';
  const API = window.RACHA_API;
  const $ = s => document.querySelector(s);
  const view = $('#view'), tabbar = $('#tabbar'), toastEl = $('#toast');

  // ---------- constantes ----------
  const COLORS = ['#FF6B4A', '#FFB547', '#3DD68C', '#36C5F0', '#8B7CFF', '#FF5FA2', '#2EC4B6', '#F5E663'];
  const ICONS = ['📖', '🏋️', '🧘', '📵', '💧', '👟', '🌙', '✍️', '💰', '📞', '🥗', '🎸', '🏃', '🎯', '🧠', '🚭', '☕', '🛏️', '🧹', '🎨'];
  const CATS = [
    { id: 'cuerpo', e: '🏃', n: 'Cuerpo', d: 'Moverte, dormir, comer', t: [['Entrenar', '🏋️', '4× por semana'], ['Caminar 8K pasos', '👟', 'Diario'], ['Dormir 7 horas', '🌙', 'Diario']] },
    { id: 'mente', e: '🧠', n: 'Mente', d: 'Leer, meditar, aprender', t: [['Leer 20 min', '📖', 'Diario'], ['Meditar 10 min', '🧘', 'Diario'], ['Escribir journal', '✍️', 'Diario']] },
    { id: 'foco', e: '🎯', n: 'Foco', d: 'Menos pantalla, más trabajo', t: [['Sin celular al despertar', '📵', 'Diario'], ['2h de deep work', '🎯', 'Lun a vie']] },
    { id: 'salud', e: '💧', n: 'Salud', d: 'Agua, comida, chequeos', t: [['Tomar 2L de agua', '💧', 'Diario'], ['Comer verde', '🥗', 'Diario']] },
    { id: 'plata', e: '💰', n: 'Plata', d: 'Ahorro y gasto consciente', t: [['Registrar gastos', '💰', 'Diario'], ['Cero delivery', '🥗', 'Lun a vie']] },
    { id: 'gente', e: '🤝', n: 'Gente', d: 'Vínculos que se cuidan', t: [['Llamar a alguien', '📞', '2× por semana'], ['Cena sin celular', '📵', '3× por semana']] }
  ];
  const FREQS = ['Diario', '5× por semana', '3× por semana'];
  const TIERS = [['Semilla', 0, '🌱'], ['Constante', 300, '🌿'], ['Imparable', 1500, '🔥'], ['Leyenda', 5000, '👑']];
  const PERKS = [['☕', '2×1 en café de especialidad', 'Cafetería aliada (ejemplo)', 300], ['🧘', '20% en clases de pilates', 'Estudio aliado (ejemplo)', 300], ['⭐', '50% en Racha Pro', 'Beneficio de la app', 300], ['🏋️', '1 semana gratis de gimnasio', 'Gimnasio aliado (ejemplo)', 1500], ['👟', '15% en zapatillas de running', 'Tienda aliada (ejemplo)', 1500], ['🩺', 'Chequeo preventivo sin costo', 'Clínica aliada (ejemplo)', 5000]];
  const DAYL = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
  const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic'];

  // ---------- fechas (siempre hora local del celular) ----------
  const z = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  const parse = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  const today = () => ymd(new Date());
  const addDays = (s, n) => { const d = parse(s); d.setDate(d.getDate() + n); return ymd(d); };
  const mondayOf = s => { const d = parse(s); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return ymd(d); };
  const diffDays = (a, b) => Math.round((parse(b) - parse(a)) / 864e5);
  const maxDay = (...a) => a.filter(Boolean).sort().pop();
  const prettyDate = s => { const d = parse(s); return ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][d.getDay()] + ' ' + d.getDate() + ' de ' + ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'setiembre', 'octubre', 'noviembre', 'diciembre'][d.getMonth()]; };
  const ago = iso => { const m = Math.round((Date.now() - new Date(iso)) / 6e4); if (m < 1) return 'ahora'; if (m < 60) return 'hace ' + m + ' min'; const h = Math.round(m / 60); if (h < 24) return 'hace ' + h + ' h'; const d = Math.round(h / 24); return d === 1 ? 'ayer' : 'hace ' + d + ' días'; };

  // ---------- estado ----------
  const S = {
    session: null, uid: null, name: '', habits: [], logs: new Set(), parties: [], commits: [],
    screen: 'home', p: {}, pd: null, nudges: [], loading: true
  };
  const K = (h, d) => h + '|' + d;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function toast(t, ms) { toastEl.textContent = t; toastEl.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => toastEl.classList.remove('on'), ms || 2200); }
  const fail = e => { console.error(e); toast((e && e.message) || 'Algo falló. Intenta de nuevo.', 3500); };
  const sget = k => { try { return sessionStorage.getItem(k); } catch (_) { return null; } };
  const sset = (k, v) => { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (_) {} };

  // ---------- cálculo ----------
  function streak(hid) {
    let d = today(), n = 0;
    if (!S.logs.has(K(hid, d))) d = addDays(d, -1);
    while (S.logs.has(K(hid, d))) { n++; d = addDays(d, -1); }
    return n;
  }
  function bestStreak(hid) {
    let b = 0, n = 0, d = addDays(today(), -181);
    for (let i = 0; i < 182; i++) { n = S.logs.has(K(hid, d)) ? n + 1 : 0; b = Math.max(b, n); d = addDays(d, 1); }
    return b;
  }
  function countSince(hid, days) { let c = 0, d = today(); for (let i = 0; i < days; i++) { if (S.logs.has(K(hid, d))) c++; d = addDays(d, -1); } return c; }

  // semana de un miembro en una party
  function weekCalc(hs, eff, ws, set, maxL, current) {
    const t = today();
    let lives = maxL, pts = 0, frozen = false, done = 0, all = false;
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      if (!hs.length || d < eff) { days.push('na'); continue; }
      if (current && d > t) { days.push('fut'); continue; }
      if (frozen) { days.push('frozen'); continue; }
      const dn = hs.filter(h => set.has(K(h, d))).length, al = dn === hs.length;
      pts += dn * 10 + (al ? 5 : 0);
      if (current && d === t) { done = dn; all = al; days.push(al ? 'ok' : 'today'); continue; }
      if (al) days.push('ok'); else { days.push('miss'); lives--; if (lives <= 0) { lives = 0; frozen = true; } }
    }
    if (days[6] === 'ok' && lives === maxL && hs.length) pts += 30;
    return { lives, pts, frozen, days, done, all, n: hs.length };
  }
  function partyTable(pd, weekStart, current) {
    const party = pd.party;
    return pd.members.map(m => {
      const hs = pd.ph.filter(x => x.user_id === m.user_id).map(x => x.habit_id);
      const eff = maxDay(weekStart, party.start_date, ymd(new Date(m.joined_at)));
      const w = weekCalc(hs, eff, weekStart, pd.logs, party.lives, current);
      return Object.assign({ uid: m.user_id, name: (pd.names[m.user_id] || 'Alguien'), me: m.user_id === S.uid, hs }, w);
    }).sort((a, b) => b.pts - a.pts || b.lives - a.lives);
  }
  function weekInfo(party) {
    const ws = mondayOf(today());
    const no = Math.floor(diffDays(mondayOf(party.start_date), ws) / 7) + 1;
    return { ws, no, ended: no > party.weeks };
  }
  function statusPts() {
    let p = 0; const per = {};
    S.habits.forEach(h => { let d = today(); for (let i = 0; i < 90; i++) { if (S.logs.has(K(h.id, d))) { p += 10; per[d] = (per[d] || 0) + 1; } d = addDays(d, -1); } });
    const perfect = S.habits.length ? Object.values(per).filter(c => c >= S.habits.length).length : 0;
    return { pts: p + perfect * 5, perfect };
  }
  const tierOf = p => { let t = 0; TIERS.forEach((x, i) => { if (p >= x[1]) t = i; }); return t; };
  const hearts = (l, tot) => { let s = '<span class="hearts" aria-label="' + l + ' vidas">'; for (let i = 0; i < tot; i++) s += '<span class="' + (i < l ? 'hl' : 'hd') + '">♥</span>'; return s + '</span>'; };

  // ---------- carga ----------
  async function loadCore() {
    const uid = S.uid;
    const [prof, habits, logs, parties, commits] = await Promise.all([
      API.profiles([uid]), API.habitsOf([uid]), API.logs([uid], addDays(today(), -200)), API.myParties(uid), API.allMyCommitments(uid)
    ]);
    S.name = (prof[0] && prof[0].name) || (S.session.user.email || '').split('@')[0];
    S.habits = habits.filter(h => !h.archived);
    S.logs = new Set(logs.map(l => K(l.habit_id, l.day)));
    S.parties = parties; S.commits = commits;
    loadNudges();
  }
  async function loadNudges() {
    try {
      const out = [];
      for (const p of S.parties) {
        const ev = await API.events(p.id);
        ev.filter(e => e.kind === 'nudge' && e.payload && e.payload.to === S.uid && Date.now() - new Date(e.created_at) < 864e5)
          .forEach(e => out.push({ party: p, from: e.user_id, at: e.created_at }));
      }
      if (out.length) {
        const names = await API.profiles([...new Set(out.map(o => o.from))]);
        out.forEach(o => { const n = names.find(x => x.id === o.from); o.name = n ? n.name : 'Alguien'; });
      }
      S.nudges = out;
      if (S.screen === 'home') render();
    } catch (e) { console.warn(e); }
  }
  async function loadParty(pid, quiet) {
    const party = S.parties.find(p => p.id === pid);
    if (!party) throw new Error('No encontré esa party');
    const [members, ph, events] = await Promise.all([API.partyMembers(pid), API.partyHabits(pid), API.events(pid)]);
    const ids = members.map(m => m.user_id);
    const [profs, habits, logs] = await Promise.all([API.profiles(ids), API.habitsOf(ids), API.logs(ids, addDays(mondayOf(today()), -7))]);
    const names = {}; profs.forEach(p => { names[p.id] = p.id === S.uid ? 'Tú' : p.name; });
    const hmap = {}; habits.forEach(h => { hmap[h.id] = h; });
    S.pd = { party, members, ph, events, names, hmap, logs: new Set(logs.map(l => K(l.habit_id, l.day))), at: Date.now() };
    if (!quiet || S.screen === 'party') render();
  }

  // ---------- navegación ----------
  function go(screen, p) { S.screen = screen; S.p = p || {}; render(); window.scrollTo(0, 0); }
  let poll = null;
  function setPolling() {
    clearInterval(poll);
    if (S.screen === 'party' && S.p.id) poll = setInterval(() => { if (!document.hidden) loadParty(S.p.id, true).catch(() => {}); }, 15000);
  }

  // ---------- componentes ----------
  function gridHtml(h, weeks, editable) {
    const t = today(), start = addDays(mondayOf(t), -(weeks - 1) * 7);
    let s = '<div class="grid' + (editable ? ' edit' : '') + '" style="--cols:' + weeks + '">';
    for (let i = 0; i < weeks * 7; i++) {
      const d = addDays(start, i);
      if (d > t) { s += '<i class="fut"></i>'; continue; }
      const on = S.logs.has(K(h.id, d));
      s += '<i' + (on ? ' style="background:' + h.color + '"' : '') + (d === t ? ' class="t"' : '') + (editable ? ' data-act="cell" data-h="' + h.id + '" data-d="' + d + '" role="button" aria-label="' + d + '"' : '') + '></i>';
    }
    return s + '</div>';
  }
  const committedIn = hid => S.commits.filter(c => c.habit_id === hid).map(c => S.parties.find(p => p.id === c.party_id)).filter(Boolean);
  function habitCard(h) {
    const on = S.logs.has(K(h.id, today())), st = streak(h.id), inP = committedIn(h.id).length;
    return '<div class="hcard" data-act="open" data-id="' + h.id + '"><div class="hrow"><span class="hico" style="background:' + h.color + '33">' + esc(h.icon) + '</span><span class="hname"><b>' + esc(h.name) + '</b><small>' + (st ? '🔥 ' + st + (st === 1 ? ' día' : ' días') : 'Sin racha aún') + ' · ' + esc(h.freq) + (inP ? '<span class="badge">🏆 party</span>' : '') + '</small></span><button class="check' + (on ? ' done' : '') + '" data-act="tick" data-id="' + h.id + '" style="' + (on ? 'background:' + h.color : '') + '" aria-label="Marcar ' + esc(h.name) + '">✓</button></div>' + gridHtml(h, 20) + '</div>';
  }
  const av = (name, uid, size) => { const c = COLORS[Math.abs([...(uid || name)].reduce((a, ch) => a * 31 + ch.charCodeAt(0) | 0, 7)) % COLORS.length]; return '<span class="av' + (size ? ' ' + size : '') + '" style="background:' + c + '">' + esc((name || '?').slice(0, 2).toUpperCase()) + '</span>'; };
  function tabs() {
    const cur = { home: 'home', newcat: 'new', newcfg: 'new', detail: 'home', retos: 'retos', party: 'retos', partynew: 'retos', invite: 'retos', join: 'retos', commit: 'retos', perfil: 'perfil' }[S.screen] || '';
    const T = [['home', 'Hoy', '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>'],
      ['retos', 'Retos', '<path d="M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 14v4M8 20h8"/>'],
      ['new', 'Nuevo', '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'],
      ['perfil', 'Perfil', '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>']];
    tabbar.innerHTML = T.map(t => '<button class="' + (cur === t[0] ? 'on' : '') + '" data-act="tab" data-to="' + t[0] + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + t[2] + '</svg>' + t[1] + '</button>').join('');
  }

  // ---------- pantallas ----------
  const V = {};
  V.setup = () => '<div class="center"><div class="logo big"><i></i>Racha</div><p class="muted">Falta configurar la conexión con Supabase. Edita <code>config.js</code> con tu Project URL y tu anon key.</p></div>';
  V.loading = () => '<div class="center"><div class="logo big"><i></i>Racha</div><p class="muted">Cargando…</p></div>';
  V.auth = () => {
    const up = S.p.mode === 'up';
    const j = sget('racha_join');
    return '<div class="authwrap"><div class="logo big"><i></i>Racha</div><p class="muted" style="text-align:center">Tus hábitos, en modo torneo con tus amigos.</p>' +
      (j ? '<div class="note">Te invitaron a una party (código <b>' + esc(j) + '</b>). Entra o crea tu cuenta para unirte.</div>' : '') +
      '<div class="seg"><button class="' + (!up ? 'on' : '') + '" data-act="authmode" data-m="in">Entrar</button><button class="' + (up ? 'on' : '') + '" data-act="authmode" data-m="up">Crear cuenta</button></div>' +
      '<form id="authform" class="form" novalidate>' + (up ? '<label class="lbl" for="aname">Tu nombre</label><input class="field" id="aname" autocomplete="nickname" placeholder="Cómo te verán tus amigos" required>' : '') +
      '<label class="lbl" for="aemail">Correo</label><input class="field" id="aemail" type="email" autocomplete="email" inputmode="email" placeholder="tu@correo.com" required>' +
      '<label class="lbl" for="apass">Contraseña</label><input class="field" id="apass" type="password" autocomplete="' + (up ? 'new-password' : 'current-password') + '" placeholder="Mínimo 6 caracteres" required>' +
      '<p class="err" id="aerr"></p><button class="cta" type="submit" id="asub">' + (up ? 'Crear cuenta' : 'Entrar') + '</button></form>' +
      (API.mock ? '<p class="muted" style="text-align:center">Modo prueba (datos falsos)</p>' : '') + '</div>';
  };
  V.home = () => {
    const t = today(), done = S.habits.filter(h => S.logs.has(K(h.id, t))).length;
    let h = '<header class="apphead"><div><small>' + prettyDate(t) + '</small><h1>Hoy</h1></div><button class="iconbtn add" data-act="tab" data-to="new" aria-label="Nuevo hábito">+</button></header>';
    S.nudges.forEach(n => { h += '<button class="note nudgebar" data-act="openparty" data-id="' + n.party.id + '">👉 <b>' + esc(n.name) + '</b> te está empujando en ' + esc(n.party.name) + '</button>'; });
    if (!S.habits.length) return h + '<div class="empty"><div class="big">🌱</div><h2>Empieza con un hábito</h2><p class="muted">Elige algo pequeño que quieras hacer todos los días. Un tap al día y la grilla se va llenando.</p><button class="cta" data-act="tab" data-to="new">Crear mi primer hábito</button></div>';
    h += '<p class="muted sub">' + done + ' de ' + S.habits.length + ' hechos hoy</p>';
    S.parties.slice(0, 2).forEach(p => {
      const mine = S.commits.filter(c => c.party_id === p.id), d = mine.filter(c => S.logs.has(K(c.habit_id, t))).length;
      h += '<button class="party-card slim" data-act="openparty" data-id="' + p.id + '"><span><b>🏆 ' + esc(p.name) + '</b><small class="meta">' + (mine.length ? (d === mine.length ? 'Día cumplido en esta party' : 'Te falta ' + (mine.length - d) + ' para no perder vida') : 'Elige tus hábitos para jugar') + '</small></span><span class="chev">›</span></button>';
    });
    return h + S.habits.map(habitCard).join('');
  };
  V.newcat = () => {
    let h = '<button class="back" data-act="tab" data-to="home">← Cancelar</button><h2 class="q">¿Qué quieres construir?</h2><p class="muted sub">Elige un área y luego un hábito, o crea el tuyo.</p><div class="cats">';
    CATS.forEach(c => { h += '<button class="cat' + (S.p.cat === c.id ? ' on' : '') + '" data-act="cat" data-id="' + c.id + '"><span class="e">' + c.e + '</span><b>' + c.n + '</b><small>' + c.d + '</small></button>'; });
    h += '</div>';
    if (S.p.cat) {
      const c = CATS.find(x => x.id === S.p.cat);
      h += '<p class="lbl">Populares en ' + c.n + '</p><div class="tpls" id="tpls">';
      c.t.forEach((t, i) => { h += '<button class="tpl" data-act="tpl" data-i="' + i + '"><span>' + t[1] + '</span><span>' + esc(t[0]) + '</span><span>' + t[2] + '</span></button>'; });
      h += '<button class="tpl" data-act="tpl" data-i="-1"><span>✏️</span><span>Crear uno propio</span><span></span></button></div>';
    }
    return h;
  };
  V.newcfg = () => {
    const D = S.p.draft;
    let h = '<button class="back" data-act="' + (D.id ? 'open' : 'tab') + '" data-to="new" data-id="' + (D.id || '') + '">← Atrás</button><h2 class="q">' + (D.id ? 'Editar hábito' : 'Ajusta tu hábito') + '</h2>';
    h += '<label class="lbl" for="hname">Nombre</label><input class="field" id="hname" value="' + esc(D.name) + '" placeholder="Ej. Leer 20 min" maxlength="40">';
    h += '<p class="lbl">Ícono</p><div class="icons">' + ICONS.map(i => '<button class="ic' + (D.icon === i ? ' on' : '') + '" data-act="dic" data-v="' + i + '">' + i + '</button>').join('') + '</div>';
    h += '<p class="lbl">Color</p><div class="swatches">' + COLORS.map(c => '<button class="sw' + (D.color === c ? ' on' : '') + '" data-act="dcol" data-v="' + c + '" style="background:' + c + '" aria-label="Color ' + c + '"></button>').join('') + '</div>';
    h += '<p class="lbl">Meta</p><div class="seg">' + FREQS.map(f => '<button class="' + (D.freq === f ? 'on' : '') + '" data-act="dfreq" data-v="' + f + '">' + f.replace(' por semana', '/sem') + '</button>').join('') + '</div>';
    h += '<button class="cta" data-act="savehabit">' + (D.id ? 'Guardar cambios' : 'Crear hábito') + '</button>';
    return h;
  };
  V.detail = () => {
    const x = S.habits.find(h => h.id === S.p.id);
    if (!x) return '<p class="muted">Ese hábito ya no existe.</p>';
    const t = today(), c30 = countSince(x.id, 30), tot = [...S.logs].filter(k => k.startsWith(x.id + '|')).length;
    const bars = []; const now = parse(t);
    for (let m = 5; m >= 0; m--) { const d = new Date(now.getFullYear(), now.getMonth() - m, 1, 12), key = d.getFullYear() + '-' + z(d.getMonth() + 1); bars.push([MONTHS[d.getMonth()], [...S.logs].filter(k => k.startsWith(x.id + '|' + key)).length, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()]); }
    const inP = committedIn(x.id);
    let h = '<button class="back" data-act="tab" data-to="home">← Hoy</button><div class="dhead"><span class="hico lg" style="background:' + x.color + '33">' + esc(x.icon) + '</span><div><h2 class="q" style="margin:0">' + esc(x.name) + '</h2><small class="muted">' + esc(x.freq) + (inP.length ? ' · en ' + inP.map(p => esc(p.name)).join(', ') : '') + '</small></div></div>';
    h += '<p class="lbl">Últimos 6 meses · toca un día para marcarlo o desmarcarlo</p>' + gridHtml(x, 26, true);
    h += '<div class="kpis"><div class="kpi"><b>🔥 ' + streak(x.id) + '</b><small>racha actual</small></div><div class="kpi"><b>' + bestStreak(x.id) + '</b><small>mejor racha</small></div><div class="kpi"><b>' + Math.round(c30 / 30 * 100) + '%</b><small>cumplimiento 30 días</small></div><div class="kpi"><b>' + tot + '</b><small>veces en total</small></div></div>';
    h += '<div class="bars">' + bars.map((b, i) => '<div style="height:' + Math.max(4, b[1] / b[2] * 100) + '%;background:' + x.color + (i === 5 ? '' : '99') + '"><span>' + b[0] + '</span></div>').join('') + '</div>';
    h += '<div class="row2"><button class="cta ghost" data-act="edithabit" data-id="' + x.id + '">Editar</button><button class="cta ghost danger" data-act="delhabit" data-id="' + x.id + '">' + (S.p.confirmDel ? '¿Seguro? Toca otra vez' : 'Eliminar') + '</button></div>';
    return h;
  };
  V.retos = () => {
    let h = '<header class="apphead"><div><small>Juega tus hábitos con tu gente</small><h1>Retos</h1></div><button class="iconbtn add" data-act="go" data-to="partynew" aria-label="Crear party">+</button></header>';
    if (!S.parties.length) h += '<div class="empty"><div class="big">🏆</div><h2>Arma tu primera party</h2><p class="muted">Invitas a tus amigos, cada uno pone sus hábitos, se suman puntos y tienen 3 vidas por semana. El domingo se cierra la tabla.</p></div>';
    S.parties.forEach(p => {
      const w = weekInfo(p), mine = S.commits.filter(c => c.party_id === p.id).length;
      h += '<button class="party-card" data-act="openparty" data-id="' + p.id + '"><div class="prow"><span class="ptitle">' + esc(p.name) + '</span><span class="tag">' + (w.ended ? 'Terminó' : 'Semana ' + Math.max(1, w.no) + ' de ' + p.weeks) + '</span></div><small class="meta">' + (mine ? mine + (mine === 1 ? ' hábito' : ' hábitos') + ' en juego' : 'Aún no eliges tus hábitos') + (p.prize ? ' · ' + esc(p.prize) : '') + '</small></button>';
    });
    h += '<button class="cta" data-act="go" data-to="partynew">+ Crear una party</button>';
    h += '<form id="joinform" class="joinrow"><label class="lbl" for="jcode">¿Te pasaron un código?</label><div class="inline"><input class="field" id="jcode" placeholder="Ej. K7P2QX" autocapitalize="characters" maxlength="10"><button class="cta inl" type="submit">Unirme</button></div></form>';
    return h;
  };
  V.partynew = () => {
    const P = S.p.np || (S.p.np = { name: '', lives: 3, weeks: 4, prize: 'El último invita el ceviche', hab: S.habits.map(h => h.id) });
    let h = '<button class="back" data-act="go" data-to="retos">← Cancelar</button><h2 class="q">Arma tu party</h2><p class="muted sub">Un torneo entre amigos. Cada uno juega con sus propios hábitos.</p>';
    h += '<label class="lbl" for="pname">Nombre</label><input class="field" id="pname" value="' + esc(P.name) + '" placeholder="Ej. Los del 6 a.m." maxlength="40">';
    h += '<p class="lbl">Duración</p><div class="seg">' + [2, 4, 8].map(w => '<button class="' + (P.weeks === w ? 'on' : '') + '" data-act="pw" data-v="' + w + '">' + w + ' semanas</button>').join('') + '</div>';
    h += '<p class="lbl">Vidas por semana</p><div class="stepper"><button class="iconbtn" data-act="pl" data-v="-1" aria-label="Menos vidas">−</button><b>' + P.lives + '</b><button class="iconbtn" data-act="pl" data-v="1" aria-label="Más vidas">+</button>' + hearts(P.lives, 5) + '</div>';
    h += '<label class="lbl" for="pprize">Premio o castigo</label><input class="field" id="pprize" value="' + esc(P.prize) + '" maxlength="80">';
    h += '<p class="lbl">Tus hábitos en juego</p>' + habitToggles(P.hab, 'ph');
    h += '<button class="cta" data-act="createparty">Crear party</button>';
    return h;
  };
  function habitToggles(sel, act) {
    if (!S.habits.length) return '<div class="note">Primero crea al menos un hábito. <button class="linkbtn" data-act="tab" data-to="new">Crear hábito</button></div>';
    return S.habits.map(x => { const on = sel.includes(x.id); return '<button class="trow" data-act="' + act + '" data-id="' + x.id + '"><span class="hico" style="background:' + x.color + '33">' + esc(x.icon) + '</span><span class="tx"><b>' + esc(x.name) + '</b><small>hasta 10 pts por día</small></span><span class="tg' + (on ? ' on' : '') + '">✓</span></button>'; }).join('');
  }
  V.invite = () => {
    const p = S.parties.find(x => x.id === S.p.id); if (!p) return '';
    const url = location.origin + location.pathname + '?join=' + p.code;
    const msg = 'Únete a mi party "' + p.name + '" en Racha. Código: ' + p.code + ' ' + url;
    return '<button class="back" data-act="openparty" data-id="' + p.id + '">← ' + esc(p.name) + '</button><h2 class="q">Invita a tu gente</h2><p class="muted sub">Entre 3 y 8 es lo ideal. Cada invitado elige sus propios hábitos al entrar.</p>' +
      '<p class="lbl">Código</p><div class="codebox"><span id="code">' + esc(p.code) + '</span><button data-act="copy" data-v="' + esc(url) + '">Copiar link</button></div>' +
      '<a class="cta wa" href="https://wa.me/?text=' + encodeURIComponent(msg) + '" target="_blank" rel="noopener">Invitar por WhatsApp</a>' +
      (navigator.share ? '<button class="cta ghost" data-act="share" data-v="' + esc(msg) + '" data-u="' + esc(url) + '">Compartir…</button>' : '') +
      '<button class="cta ghost" data-act="openparty" data-id="' + p.id + '">Ir a la party</button>';
  };
  V.join = () => '<button class="back" data-act="go" data-to="retos">← Retos</button><h2 class="q">Unirte a una party</h2><form id="joinform" class="form"><label class="lbl" for="jcode">Código</label><input class="field" id="jcode" value="' + esc(S.p.code || '') + '" autocapitalize="characters" maxlength="10"><button class="cta" type="submit">Unirme</button></form>';
  V.commit = () => {
    const p = S.parties.find(x => x.id === S.p.id); if (!p) return '';
    const sel = S.p.sel || (S.p.sel = S.commits.filter(c => c.party_id === p.id).map(c => c.habit_id));
    return '<button class="back" data-act="openparty" data-id="' + p.id + '">← ' + esc(p.name) + '</button><h2 class="q">Tus hábitos en juego</h2><p class="muted sub">Cada hábito cumplido vale 10 pts. Si un día no completas todos, pierdes una vida. Más hábitos = más puntos, pero más riesgo.</p>' + habitToggles(sel, 'csel') + '<button class="cta" data-act="savecommit">Guardar</button>';
  };
  V.party = () => {
    const pd = S.pd;
    if (!pd || pd.party.id !== S.p.id) return '<p class="muted center">Cargando party…</p>';
    const p = pd.party, w = weekInfo(p), rows = partyTable(pd, w.ws, true), me = rows.find(r => r.me) || { lives: p.lives, pts: 0, n: 0, done: 0 };
    const rank = rows.indexOf(me) + 1, tab = S.p.tab || 'tabla';
    const myH = S.commits.filter(c => c.party_id === p.id).map(c => S.habits.find(h => h.id === c.habit_id)).filter(Boolean);
    let h = '<button class="back" data-act="go" data-to="retos">← Retos</button>';
    h += '<div class="prow"><div><h2 class="q" style="margin:0">' + esc(p.name) + '</h2><small class="muted">' + (w.ended ? 'La party terminó' : 'Semana ' + Math.max(1, w.no) + ' de ' + p.weeks + ' · cierra el domingo a medianoche') + '</small></div><button class="iconbtn" data-act="go" data-to="invite" data-id="' + p.id + '" aria-label="Invitar">＋</button></div>';
    S.nudges.filter(n => n.party.id === p.id).slice(0, 1).forEach(n => { h += '<div class="note">👉 <b>' + esc(n.name) + '</b> te está empujando. Marca tus hábitos.</div>'; });
    h += '<div class="me-strip"><div class="prow"><span><span class="big">#' + rank + '</span> <small class="meta">de ' + rows.length + ' · ' + me.pts + ' pts</small></span><span style="text-align:right">' + hearts(me.lives, p.lives) + '<br><small class="meta">' + (me.frozen ? 'Congelado hasta el lunes' : me.lives + (me.lives === 1 ? ' vida' : ' vidas') + ' esta semana') + '</small></span></div>';
    if (!myH.length) h += '<div class="note">Aún no pones hábitos en juego. <button class="linkbtn" data-act="go" data-to="commit" data-id="' + p.id + '">Elegir hábitos</button></div>';
    else {
      const d = myH.filter(x => S.logs.has(K(x.id, today()))).length;
      h += '<div class="prog"><i style="width:' + (d / myH.length * 100) + '%"></i></div><small class="meta">' + (d === myH.length ? 'Día cumplido. +5 de bonus por día perfecto.' : 'Hoy llevas ' + d + ' de ' + myH.length + '. Si no completas antes de medianoche, pierdes una vida.') + '</small>';
      myH.forEach(x => { const on = S.logs.has(K(x.id, today())); h += '<div class="todo"><button class="check sm' + (on ? ' done' : '') + '" data-act="tick" data-id="' + x.id + '" style="' + (on ? 'background:' + x.color : '') + '" aria-label="Marcar ' + esc(x.name) + '">✓</button><span>' + esc(x.icon) + ' ' + esc(x.name) + '</span><small class="meta">' + (on ? '+10' : '0') + ' pts</small></div>'; });
      h += '<button class="linkbtn" data-act="go" data-to="commit" data-id="' + p.id + '">Cambiar mis hábitos</button>';
    }
    h += '</div>';
    const lastWs = addDays(w.ws, -7), hasLast = mondayOf(p.start_date) <= lastWs;
    const T = [['tabla', 'Tabla'], ['feed', 'Actividad'], ['reglas', 'Reglas']]; if (hasLast) T.splice(2, 0, ['cierre', 'Semana pasada']);
    h += '<div class="seg">' + T.map(t => '<button class="' + (tab === t[0] ? 'on' : '') + '" data-act="ptab" data-v="' + t[0] + '">' + t[1] + '</button>').join('') + '</div>';
    const nudged = new Set(pd.events.filter(e => e.kind === 'nudge' && e.user_id === S.uid && e.payload && Date.now() - new Date(e.created_at) < 864e5).map(e => e.payload.to));
    if (tab === 'tabla') {
      h += '<div class="lbhead"><span>#</span><span></span><span>' + DAYL.join(' ') + '</span><span>PTS</span></div>';
      rows.forEach((r, i) => {
        h += '<div class="lb-row' + (r.me ? ' me' : '') + (r.frozen ? ' out' : '') + '"><span class="rk">' + (i === 0 && r.pts > 0 ? '👑' : i + 1) + '</span>' + av(r.name, r.uid, 'sm') + '<span class="nm"><b>' + esc(r.name) + ' ' + hearts(r.lives, p.lives) + '</b>' + weekDots(r) + '</span><span class="pts">' + r.pts + '<small>' + (r.n === 0 ? 'SIN HÁBITOS' : r.frozen ? 'CONGELADO' : r.all ? 'HOY ✓' : 'PENDIENTE') + '</small></span></div>';
        if (!r.me && r.n && !r.all && !r.frozen) h += '<div class="nudgewrap"><button class="nudge' + (nudged.has(r.uid) ? ' sent' : '') + '" data-act="nudge" data-to="' + r.uid + '" data-n="' + esc(r.name) + '">' + (nudged.has(r.uid) ? 'Empujón enviado' : '👉 Empujar a ' + esc(r.name.split(' ')[0])) + '</button></div>';
      });
      if (rows.length < 2) h += '<div class="note">Estás solo por ahora. <button class="linkbtn" data-act="go" data-to="invite" data-id="' + p.id + '">Invita a tus amigos</button></div>';
    } else if (tab === 'feed') {
      const reacts = {}; pd.events.filter(e => e.kind === 'react').forEach(e => { const k = e.payload.event + '|' + e.payload.emoji; (reacts[k] = reacts[k] || []).push(e.user_id); });
      const feed = pd.events.filter(e => e.kind !== 'react');
      if (!feed.length) h += '<p class="muted">Todavía no hay actividad. Marca un hábito y aparece aquí.</p>';
      feed.slice(0, 60).forEach(e => {
        const n = pd.names[e.user_id] || 'Alguien', tx = { log: 'marcó ' + esc(e.payload.habit || 'un hábito') + ' <span class="plus">+10</span>', perfect: 'completó su día perfecto <span class="plus">+5</span>', join: 'se unió a la party', nudge: 'empujó a ' + esc(pd.names[e.payload.to] || 'alguien') + ' 👉' }[e.kind] || esc(e.kind);
        h += '<div class="feed-item">' + av(n, e.user_id, 'sm') + '<div><b>' + esc(n) + '</b> ' + tx + '<br><small class="muted">' + ago(e.created_at) + '</small>';
        if (e.kind === 'log' || e.kind === 'perfect') h += '<div class="reacts">' + ['🔥', '💪', '😂'].map(em => { const l = reacts[e.id + '|' + em] || []; const mine = l.includes(S.uid); return '<button class="' + (mine ? 'on' : '') + '" data-act="react" data-e="' + e.id + '" data-em="' + em + '"' + (mine ? ' disabled' : '') + '>' + em + ' ' + (l.length || '') + '</button>'; }).join('') + '</div>';
        h += '</div></div>';
      });
    } else if (tab === 'cierre') {
      const last = partyTable(pd, lastWs, false).filter(r => r.n && r.days.some(d => d !== 'na'));
      h += '<p class="lbl" style="text-align:center">Semana del ' + parse(lastWs).getDate() + ' al ' + parse(addDays(lastWs, 6)).getDate() + '</p>';
      if (!last.length) h += '<p class="muted">Nadie tenía hábitos en juego esa semana.</p>';
      else {
        const pod = [last[1], last[0], last[2]];
        const mx = Math.max(1, last[0].pts);
        h += '<div class="podium">' + pod.map((r, i) => r ? '<div>' + av(r.name, r.uid) + '<span>' + esc(r.name) + '</span><span class="b" style="height:' + Math.max(40, r.pts / mx * 120) + 'px;background:' + ['#C9CDD8', '#FFC24A', '#E0915A'][i] + '">' + [2, 1, 3][i] + '°<small>' + r.pts + ' pts</small></span></div>' : '<div></div>').join('') + '</div>';
        const loser = last[last.length - 1];
        if (last.length > 1 && p.prize) h += '<div class="insight"><b>CASTIGO DE LA SEMANA</b>' + esc(loser.name) + ' quedó último con ' + loser.pts + ' pts. ' + esc(p.prize) + '.</div>';
      }
    } else {
      h += [['+10', 'Por hábito cumplido', 'Cada uno pone los suyos.'], ['+5', 'Día perfecto', 'Si cumples todos tus hábitos en juego ese día.'], ['+30', 'Semana limpia', 'Si llegas al domingo sin perder vidas.'], ['♥ ' + p.lives, 'Vidas por semana', 'Cada día que no completas tus hábitos cuesta una vida. Sin vidas, tus puntos se congelan hasta el lunes.'], ['🐟', 'Premio o castigo', p.prize || 'Sin definir']].map(r => '<div class="rule"><b class="v">' + r[0] + '</b><span><b>' + r[1] + '</b><small>' + esc(r[2]) + '</small></span></div>').join('');
      h += '<p class="muted" style="margin-top:12px">Código de la party: <b>' + esc(p.code) + '</b></p><button class="cta ghost danger" data-act="leave" data-id="' + p.id + '">' + (S.p.confirmLeave ? '¿Seguro? Toca otra vez' : 'Salir de la party') + '</button>';
    }
    return h;
  };
  function weekDots(r) {
    return '<div class="wk">' + r.days.map((st, i) => '<i class="' + st + '"' + (st === 'ok' ? ' style="background:var(--accent)"' : '') + ' title="' + DAYL[i] + '">' + (st === 'miss' ? '×' : '') + '</i>').join('') + '</div>';
  }
  V.perfil = () => {
    const sp = statusPts(), lp = sp.pts, ti = tierOf(lp), nx = TIERS[ti + 1];
    const best = Math.max(0, ...S.habits.map(h => bestStreak(h.id))), totalLogs = S.logs.size;
    const owner = S.parties.some(p => p.owner === S.uid);
    const red = JSON.parse(sget('racha_redeemed') || '{}');
    let h = '<div class="prof">' + av(S.name, S.uid, 'xl') + '<h2>' + esc(S.name) + '</h2><small class="muted">' + esc(S.session.user.email || '') + '</small><span class="tierpill">' + TIERS[ti][2] + ' ' + TIERS[ti][0].toUpperCase() + '</span></div>';
    h += '<div class="statuscard"><div class="prow"><span><span class="big">' + lp.toLocaleString('es-PE') + '</span> <small class="meta">pts en 90 días</small></span>' + (nx ? '<small class="meta" style="text-align:right">' + nx[2] + ' ' + nx[0] + '<br>en ' + (nx[1] - lp).toLocaleString('es-PE') + ' pts</small>' : '') + '</div>';
    h += '<div class="track">' + TIERS.map((t, i) => { const n2 = TIERS[i + 1], f = i < ti ? 100 : i === ti ? (n2 ? Math.round((lp - t[1]) / (n2[1] - t[1]) * 100) : 100) : 0; return '<div class="' + (i === ti ? 'cur' : '') + '"><i><b style="width:' + f + '%"></b></i>' + t[2] + ' ' + t[0] + '</div>'; }).join('') + '</div><small class="meta">10 pts por cada hábito marcado y 5 extra por día perfecto. El status se calcula con los últimos 90 días: si aflojas, baja.</small></div>';
    h += '<div class="kpis"><div class="kpi"><b>' + best + '</b><small>mejor racha (días)</small></div><div class="kpi"><b>' + totalLogs + '</b><small>hábitos marcados</small></div><div class="kpi"><b>' + S.parties.length + '</b><small>parties</small></div><div class="kpi"><b>' + sp.perfect + '</b><small>días perfectos</small></div></div>';
    const TR = [['🌱', 'Primer paso', 'creaste un hábito', S.habits.length > 0], ['🔥', 'Racha de 7', '7 días seguidos', best >= 7], ['💎', 'Racha de 30', '30 días seguidos', best >= 30], ['✨', 'Día perfecto', 'todo cumplido', sp.perfect > 0], ['🏆', 'Fiestero', 'te uniste a una party', S.parties.length > 0], ['📣', 'Anfitrión', 'armaste una party', owner], ['💯', '100 marcas', 'constancia pura', totalLogs >= 100], ['🗓️', '365 días', 'un año completo', best >= 365]];
    h += '<p class="lbl">Trofeos · ' + TR.filter(t => t[3]).length + ' de ' + TR.length + '</p><div class="trophies">' + TR.map(t => '<div class="trophy' + (t[3] ? '' : ' lock') + '"><b>' + t[0] + '</b><span>' + t[1] + '</span>' + t[2] + '</div>').join('') + '</div>';
    h += '<p class="lbl">Tus beneficios</p>';
    PERKS.forEach((p, k) => { const ok = lp >= p[3], tn = TIERS[tierOf(p[3])]; h += '<div class="perk' + (ok ? '' : ' lock') + '"><span class="pi">' + p[0] + '</span><span><b>' + p[1] + '</b><small>' + p[2] + '</small></span>' + (ok ? '<button class="nudge' + (red[k] ? ' sent' : '') + '" data-act="perk" data-k="' + k + '">' + (red[k] ? 'Canjeado' : 'Canjear') + '</button>' : '<span class="lockt">🔒 ' + tn[2] + ' ' + tn[0] + '</span>') + (red[k] ? '<span class="code">' + red[k] + ' · válido 7 días</span>' : '') + '</div>'; });
    h += '<p class="lbl">Cuenta</p><form id="nameform" class="inline"><input class="field" id="pname2" value="' + esc(S.name) + '" maxlength="30" aria-label="Tu nombre"><button class="cta inl" type="submit">Guardar</button></form>';
    h += '<button class="cta ghost" data-act="logout">Cerrar sesión</button><p class="muted" style="text-align:center;font-size:11px">Racha · prototipo v0.1</p>';
    return h;
  };

  function render() {
    let s = S.screen;
    if (API.notConfigured) s = 'setup'; else if (S.loading) s = 'loading'; else if (!S.session) s = 'auth';
    view.innerHTML = (V[s] || V.home)();
    document.body.classList.toggle('noauth', s === 'auth' || s === 'setup' || s === 'loading');
    if (s !== 'auth' && s !== 'setup' && s !== 'loading') tabs(); else tabbar.innerHTML = '';
    setPolling();
  }

  // ---------- acciones ----------
  const busy = new Set();
  async function toggleLog(hid, day) {
    const k = K(hid, day); if (busy.has(k)) return; busy.add(k);
    const on = !S.logs.has(k);
    on ? S.logs.add(k) : S.logs.delete(k);
    if (S.pd) on ? S.pd.logs.add(k) : S.pd.logs.delete(k);
    render();
    try {
      await API.setLog(hid, day, on);
      const h = S.habits.find(x => x.id === hid);
      if (on && day === today()) {
        const ps = S.commits.filter(c => c.habit_id === hid);
        for (const c of ps) {
          await API.addEvent(c.party_id, 'log', { habit: h.name });
          const mine = S.commits.filter(x => x.party_id === c.party_id);
          if (mine.every(x => S.logs.has(K(x.habit_id, day)))) await API.addEvent(c.party_id, 'perfect', {});
        }
        toast(ps.length ? '+10 pts en ' + (ps.length === 1 ? 'tu party' : ps.length + ' parties') + ' · 🔥 ' + streak(hid) : '🔥 Racha de ' + streak(hid) + (streak(hid) === 1 ? ' día' : ' días'));
        if (S.screen === 'party' && S.p.id) loadParty(S.p.id, true).catch(() => {});
      }
    } catch (e) { on ? S.logs.delete(k) : S.logs.add(k); render(); fail(e); }
    finally { busy.delete(k); }
  }
  function genCode() { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 6; i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
  async function openParty(id, tab) { go('party', { id, tab }); try { await loadParty(id); } catch (e) { fail(e); } }
  async function doJoin(code) {
    code = (code || '').trim().toUpperCase(); if (!code) return toast('Escribe el código');
    try {
      const pid = await API.joinParty(code);
      sset('racha_join', null);
      if (history.replaceState) history.replaceState(null, '', location.pathname);
      S.parties = await API.myParties(S.uid);
      if (!S.commits.some(c => c.party_id === pid)) await API.addEvent(pid, 'join', {});
      toast('Entraste a la party');
      if (S.commits.some(c => c.party_id === pid)) openParty(pid); else go('commit', { id: pid });
    } catch (e) { fail(e.message && e.message.includes('no encontrado') ? new Error('No encontré ese código. Revísalo.') : e); }
  }

  const ACT = {
    tab(el) { const to = el.dataset.to; if (to === 'new') go('newcat', {}); else go(to); },
    go(el) { go(el.dataset.to, { id: el.dataset.id }); if (el.dataset.to === 'partynew' && !S.habits.length) toast('Primero crea un hábito para poder jugar'); },
    authmode(el) { go('auth', { mode: el.dataset.m }); },
    open(el) { go('detail', { id: el.dataset.id }); },
    tick(el, ev) { ev.stopPropagation(); toggleLog(el.dataset.id, today()); },
    cell(el, ev) { ev.stopPropagation(); toggleLog(el.dataset.h, el.dataset.d); },
    cat(el) { S.p.cat = el.dataset.id; render(); const t = $('#tpls'); if (t) t.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); },
    tpl(el) { const c = CATS.find(x => x.id === S.p.cat), i = +el.dataset.i, t = i >= 0 ? c.t[i] : ['', '✍️', 'Diario']; go('newcfg', { draft: { name: t[0], icon: t[1], freq: FREQS.includes(t[2]) ? t[2] : 'Diario', color: COLORS[S.habits.length % COLORS.length], category: c.id } }); },
    dic(el) { S.p.draft.icon = el.dataset.v; keepName(); render(); },
    dcol(el) { S.p.draft.color = el.dataset.v; keepName(); render(); },
    dfreq(el) { S.p.draft.freq = el.dataset.v; keepName(); render(); },
    async savehabit(el) {
      keepName(); const D = S.p.draft; if (!D.name.trim()) return toast('Ponle un nombre');
      el.disabled = true;
      try {
        const row = { name: D.name.trim(), icon: D.icon, color: D.color, freq: D.freq, category: D.category || 'otro' };
        if (D.id) { await API.updateHabit(D.id, row); Object.assign(S.habits.find(h => h.id === D.id), row); toast('Guardado'); go('detail', { id: D.id }); }
        else { const h = await API.addHabit(row); S.habits.push(h); toast('Hábito creado'); go('home'); }
      } catch (e) { el.disabled = false; fail(e); }
    },
    edithabit(el) { const h = S.habits.find(x => x.id === el.dataset.id); go('newcfg', { draft: Object.assign({}, h) }); },
    async delhabit(el) {
      if (!S.p.confirmDel) { S.p.confirmDel = true; render(); return; }
      try { await API.deleteHabit(el.dataset.id); S.habits = S.habits.filter(h => h.id !== el.dataset.id); S.commits = S.commits.filter(c => c.habit_id !== el.dataset.id); toast('Hábito eliminado'); go('home'); } catch (e) { fail(e); }
    },
    pw(el) { keepParty(); S.p.np.weeks = +el.dataset.v; render(); },
    pl(el) { keepParty(); S.p.np.lives = Math.max(1, Math.min(5, S.p.np.lives + +el.dataset.v)); render(); },
    ph(el) { keepParty(); const a = S.p.np.hab, i = a.indexOf(el.dataset.id); i >= 0 ? a.splice(i, 1) : a.push(el.dataset.id); render(); },
    async createparty(el) {
      keepParty(); const P = S.p.np;
      if (!P.name.trim()) return toast('Ponle nombre a la party');
      if (!P.hab.length) return toast('Elige al menos un hábito');
      el.disabled = true;
      try {
        const party = await API.createParty({ name: P.name.trim(), code: genCode(), prize: P.prize.trim(), lives: P.lives, weeks: P.weeks, start_date: today() }, S.uid);
        await API.setCommitments(party.id, S.uid, P.hab);
        await API.addEvent(party.id, 'join', {});
        S.parties.unshift(party); P.hab.forEach(h => S.commits.push({ party_id: party.id, habit_id: h }));
        toast('Party creada'); go('invite', { id: party.id });
      } catch (e) { el.disabled = false; fail(e); }
    },
    openparty(el) { openParty(el.dataset.id); },
    ptab(el) { S.p.tab = el.dataset.v; render(); },
    csel(el) { const a = S.p.sel, i = a.indexOf(el.dataset.id); i >= 0 ? a.splice(i, 1) : a.push(el.dataset.id); render(); },
    async savecommit(el) {
      el.disabled = true;
      try { await API.setCommitments(S.p.id, S.uid, S.p.sel); S.commits = S.commits.filter(c => c.party_id !== S.p.id).concat(S.p.sel.map(h => ({ party_id: S.p.id, habit_id: h }))); toast('Listo, a jugar'); openParty(S.p.id); }
      catch (e) { el.disabled = false; fail(e); }
    },
    async nudge(el) {
      if (el.classList.contains('sent')) return;
      el.classList.add('sent'); el.textContent = 'Empujón enviado';
      try { await API.addEvent(S.p.id, 'nudge', { to: el.dataset.to }); toast('Le avisamos a ' + el.dataset.n); loadParty(S.p.id, true); } catch (e) { fail(e); }
    },
    async react(el) { el.disabled = true; try { await API.addEvent(S.p.id, 'react', { event: +el.dataset.e, emoji: el.dataset.em }); await loadParty(S.p.id, true); } catch (e) { fail(e); } },
    async leave(el) {
      if (!S.p.confirmLeave) { S.p.confirmLeave = true; render(); return; }
      try { await API.leaveParty(el.dataset.id, S.uid); S.parties = S.parties.filter(p => p.id !== el.dataset.id); S.commits = S.commits.filter(c => c.party_id !== el.dataset.id); toast('Saliste de la party'); go('retos'); } catch (e) { fail(e); }
    },
    async copy(el) { const v = el.dataset.v; try { await navigator.clipboard.writeText(v); toast('Link copiado'); } catch (_) { toast(v, 5000); } },
    async share(el) { try { await navigator.share({ title: 'Racha', text: el.dataset.v, url: el.dataset.u }); } catch (_) {} },
    perk(el) { const red = JSON.parse(sget('racha_redeemed') || '{}'), k = el.dataset.k; if (red[k]) return; red[k] = 'RCH-' + genCode(); sset('racha_redeemed', JSON.stringify(red)); render(); toast('Código listo (demo, aún sin aliados reales)'); },
    async logout() { await API.signOut(); }
  };
  function keepName() { const i = $('#hname'); if (i && S.p.draft) S.p.draft.name = i.value; }
  function keepParty() { const a = $('#pname'), b = $('#pprize'); if (S.p.np) { if (a) S.p.np.name = a.value; if (b) S.p.np.prize = b.value; } }

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]'); if (!el || el.disabled) return;
    const f = ACT[el.dataset.act]; if (!f) return;
    if (el.tagName === 'BUTTON' && el.type === 'submit' && el.form) return;
    if (el.tagName !== 'A') ev.preventDefault();
    f(el, ev);
  });
  document.addEventListener('submit', async ev => {
    ev.preventDefault();
    const id = ev.target.id;
    if (id === 'authform') {
      const up = S.p.mode === 'up', email = $('#aemail').value.trim(), pass = $('#apass').value, err = $('#aerr'), btn = $('#asub');
      const name = up ? $('#aname').value.trim() : '';
      if (up && !name) return (err.textContent = 'Pon tu nombre.');
      if (!email || pass.length < 6) return (err.textContent = 'Revisa tu correo y usa una contraseña de 6 caracteres o más.');
      btn.disabled = true; err.textContent = '';
      try { up ? await API.signUp(email, pass, name) : await API.signIn(email, pass); }
      catch (e) { btn.disabled = false; err.textContent = /Invalid login/i.test(e.message) ? 'Correo o contraseña incorrectos.' : /already registered/i.test(e.message) ? 'Ese correo ya tiene cuenta. Usa "Entrar".' : e.message; }
    } else if (id === 'joinform') doJoin($('#jcode').value);
    else if (id === 'nameform') {
      const n = $('#pname2').value.trim(); if (!n) return;
      try { await API.updateName(S.uid, n); S.name = n; toast('Nombre actualizado'); render(); } catch (e) { fail(e); }
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden || !S.session) return;
    if (S.screen === 'party' && S.p.id) loadParty(S.p.id, true).catch(() => {});
    else if (S.screen === 'home') { loadNudges(); render(); }
  });

  // ---------- arranque ----------
  async function onSession(sess) {
    const prev = S.uid;
    S.session = sess; S.uid = sess ? sess.user.id : null;
    if (!sess) { S.loading = false; S.habits = []; S.logs = new Set(); S.parties = []; S.commits = []; S.pd = null; go('auth', {}); return; }
    if (prev === S.uid) return;
    S.loading = true; render();
    try { await loadCore(); } catch (e) { fail(e); }
    S.loading = false;
    const j = sget('racha_join');
    if (j) go('join', { code: j }); else go('home');
  }
  async function boot() {
    const q = new URLSearchParams(location.search);
    if (q.get('join')) sset('racha_join', q.get('join').toUpperCase());
    if (API.notConfigured) { S.loading = false; return render(); }
    API.onAuth(s => { onSession(s); });
    try { const s = await API.session(); if (s) await onSession(s); else { S.loading = false; go('auth', {}); } }
    catch (e) { S.loading = false; fail(e); go('auth', {}); }
  }
  boot();
  window.__racha = S;
})();
