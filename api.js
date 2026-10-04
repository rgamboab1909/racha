// Capa de datos de Racha. Toda la app habla con la base solo a través de este objeto.
// En producción usa Supabase; con ?mock en la URL carga mock.js (datos en memoria, solo para pruebas).
(function () {
  if (window.RACHA_API) return; // ya lo definió mock.js
  const cfg = window.RACHA_CONFIG || {};
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('TU-PROYECTO')) {
    window.RACHA_API = { notConfigured: true };
    return;
  }
  const sb = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });
  const ok = ({ data, error }) => { if (error) throw error; return data; };

  window.RACHA_API = {
    async session() { const { data } = await sb.auth.getSession(); return data.session; },
    onAuth(cb) { sb.auth.onAuthStateChange((_e, s) => cb(s)); },
    async signUp(email, password, name) {
      const data = ok(await sb.auth.signUp({ email, password, options: { data: { name } } }));
      if (!data.session) throw new Error('Cuenta creada. Revisa tu correo para confirmarla y luego entra.');
      return data.session;
    },
    async signIn(email, password) { return ok(await sb.auth.signInWithPassword({ email, password })).session; },
    async signOut() { await sb.auth.signOut(); },

    async profiles(ids) {
      if (!ids.length) return [];
      return ok(await sb.from('profiles').select('id,name,created_at').in('id', ids));
    },
    async updateName(uid, name) { ok(await sb.from('profiles').update({ name }).eq('id', uid)); },

    async habitsOf(userIds) {
      if (!userIds.length) return [];
      return ok(await sb.from('habits').select('*').in('user_id', userIds).order('created_at'));
    },
    async addHabit(h) { return ok(await sb.from('habits').insert(h).select().single()); },
    async updateHabit(id, patch) { ok(await sb.from('habits').update(patch).eq('id', id)); },
    async deleteHabit(id) { ok(await sb.from('habits').delete().eq('id', id)); },

    async logs(userIds, fromDay) {
      if (!userIds.length) return [];
      return ok(await sb.from('logs').select('habit_id,user_id,day').in('user_id', userIds).gte('day', fromDay).limit(20000));
    },
    async setLog(habitId, day, on) {
      if (on) ok(await sb.from('logs').upsert({ habit_id: habitId, day }, { onConflict: 'habit_id,day', ignoreDuplicates: true }));
      else ok(await sb.from('logs').delete().eq('habit_id', habitId).eq('day', day));
    },

    async myParties(uid) {
      const rows = ok(await sb.from('party_members').select('party_id').eq('user_id', uid));
      if (!rows.length) return [];
      return ok(await sb.from('parties').select('*').in('id', rows.map(r => r.party_id)).order('created_at', { ascending: false }));
    },
    async createParty(p, uid) {
      const party = ok(await sb.from('parties').insert(p).select().single());
      ok(await sb.from('party_members').insert({ party_id: party.id, user_id: uid }));
      return party;
    },
    async joinParty(code) { return ok(await sb.rpc('join_party', { p_code: code })); },
    async leaveParty(pid, uid) {
      ok(await sb.from('party_habits').delete().eq('party_id', pid).eq('user_id', uid));
      ok(await sb.from('party_members').delete().eq('party_id', pid).eq('user_id', uid));
    },
    async partyMembers(pid) { return ok(await sb.from('party_members').select('user_id,joined_at').eq('party_id', pid)); },
    async partyHabits(pid) { return ok(await sb.from('party_habits').select('habit_id,user_id').eq('party_id', pid)); },
    async allMyCommitments(uid) { return ok(await sb.from('party_habits').select('party_id,habit_id').eq('user_id', uid)); },
    async setCommitments(pid, uid, habitIds) {
      ok(await sb.from('party_habits').delete().eq('party_id', pid).eq('user_id', uid));
      if (habitIds.length) ok(await sb.from('party_habits').insert(habitIds.map(h => ({ party_id: pid, habit_id: h, user_id: uid }))));
    },
    async events(pid) { return ok(await sb.from('events').select('*').eq('party_id', pid).order('created_at', { ascending: false }).limit(150)); },
    async addEvent(pid, kind, payload) { ok(await sb.from('events').insert({ party_id: pid, kind, payload: payload || {} })); }
  };
})();
