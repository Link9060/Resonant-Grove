/* Explicit two-project owner migration. No server secrets, automatic writes, or source deletes. */
(() => {
  'use strict';
  const SOURCE_URL = 'https://bzjudqhjrbwglxdfbkmj.supabase.co';
  const SOURCE_KEY = 'sb_publishable_wVnTPMs0hUuWdt1_LGMIYQ_D-aXveMV';
  const TARGET_URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
  const TARGET_KEY = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
  const ARROW_STORAGE_KEY = 'sb-cnorozrjugxpanpfmssa-auth-token';
  const MAX_MISSIONS = 10000;
  const el = id => document.getElementById(id);
  const state = { old: null, next: null, oldUser: null, nextUser: null, grove: null, missions: null, targetGrove: null, targetMissionCount: 0, backedUp: false, busy: false };
  const output = (id, value, kind = '') => { el(id).textContent = value; el(id).className = 'status ' + kind; };
  const sdk = window.supabase;
  if (!sdk?.createClient) { output('sourceStatus', 'Supabase client did not load. Try reloading the page.', 'error'); return; }
  state.old = sdk.createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
  state.next = sdk.createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce', storageKey: ARROW_STORAGE_KEY } });

  function controls() {
    const ready = !!(state.oldUser && state.nextUser && state.grove !== null && Array.isArray(state.missions));
    el('backup').disabled = !ready || state.busy;
    el('copy').disabled = !ready || !state.backedUp || !el('agree').checked || state.busy;
    el('scan').disabled = state.busy;
    el('verifyTarget').disabled = state.busy;
  }
  async function verifyTarget() {
    output('targetStatus', 'Verifying ARROW session...');
    try {
      const response = await state.next.auth.getUser();
      if (response.error || !response.data?.user) throw new Error('No ARROW session here. Sign into Relay on link9060.github.io in this browser, then retry.');
      state.nextUser = response.data.user;
      output('targetStatus', 'Verified destination: ' + (state.nextUser.email || 'ARROW account') + '. All copied data will belong to this account.', 'success');
      controls();
      return true;
    } catch (err) {
      state.nextUser = null;
      output('targetStatus', err.message || 'Could not verify ARROW session.', 'error');
      controls(); return false;
    }
  }
  async function readMissions(uid) {
    const rows = [];
    for (let start = 0; start < MAX_MISSIONS; start += 500) {
      const response = await state.old.from('array_saved_missions').select('mission_id,details,updated_at')
        .eq('owner_id', uid).order('updated_at', { ascending: false }).range(start, start + 499);
      if (response.error) throw response.error;
      rows.push(...response.data);
      if (response.data.length < 500) return rows;
    }
    throw new Error('Over 10,000 missions found. Migration stopped to avoid a partial copy.');
  }
  async function scan(event) {
    event.preventDefault();
    if (!await verifyTarget()) return;
    state.busy = true; state.grove = null; state.missions = null; state.backedUp = false; el('agree').checked = false; controls();
    output('sourceStatus', 'Signing into the original RAVIN project...');
    try {
      const email = el('email').value.trim(), password = el('password').value;
      const result = await state.old.auth.signInWithPassword({ email, password });
      el('password').value = ''; // Do not retain the password in the form.
      if (result.error || !result.data?.user) throw result.error || new Error('Old account authentication failed.');
      state.oldUser = result.data.user;
      const uid = state.oldUser.id;
      output('sourceStatus', 'Verified original account. Reading your own records...');
      const [g,m,remote,existing] = await Promise.all([
        state.old.from('grove_workspaces').select('workspace,explorer,updated_at').eq('owner_id',uid).maybeSingle(),
        readMissions(uid),
        state.next.from('grove_workspaces').select('updated_at').eq('owner_id',state.nextUser.id).maybeSingle(),
        state.next.from('array_saved_missions').select('mission_id',{count:'exact',head:true}).eq('owner_id',state.nextUser.id)
      ]);
      if (g.error) throw g.error;
      if (remote.error) throw remote.error;
      if (existing.error) throw existing.error;
      state.grove = g.data || false;
      state.missions = m;
      state.targetGrove = remote.data;
      state.targetMissionCount = existing.count || 0;
      el('groveCount').textContent = state.grove ? '1' : '0';
      el('missionCount').textContent = String(m.length);
      el('existingGrove').textContent = remote.data ? 'Yes' : 'No';
      el('existingMissions').textContent = String(state.targetMissionCount);
      output('sourceStatus', 'Old project read succeeded. ' + m.length + ' mission records found.', 'success');
      output('copyStatus', 'Save a private backup, verify the destination account and explicitly approve copying. Existing destination workspaces will not be overwritten.');
    } catch (err) {
      state.oldUser = null; state.grove = null; state.missions = null;
      el('password').value = '';
      output('sourceStatus', 'Could not read the source safely: ' + (err?.message || 'Unknown error') + '. Nothing was transferred.', 'error');
    } finally { state.busy = false; controls(); }
  }
  function backup() {
    if (!state.oldUser || !state.nextUser || state.grove === null || !Array.isArray(state.missions)) return;
    const data = { exportFormat: 'grove-array-one-time-copy-v1', createdAt: new Date().toISOString(), grove: state.grove, missions: state.missions };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'private-grove-array-backup.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    state.backedUp = true;
    output('copyStatus', 'Private backup file prepared. Keep it off public GitHub and shared devices.');
    controls();
  }
  async function copy() {
    if (state.busy || !state.backedUp || !el('agree').checked || state.grove === null || !Array.isArray(state.missions)) return;
    state.busy = true; controls();
    let copiedGrove = false, copiedMissions = 0;
    try {
      const newAuth = await state.next.auth.getUser();
      const oldAuth = await state.old.auth.getUser();
      if (newAuth.error || oldAuth.error || newAuth.data?.user?.id !== state.nextUser?.id || oldAuth.data?.user?.id !== state.oldUser?.id) {
        throw new Error('An account changed or its session expired. Sign in and inspect again.');
      }
      if (state.grove && !state.targetGrove) {
        const response = await state.next.from('grove_workspaces').insert({
          owner_id: state.nextUser.id, workspace: state.grove.workspace, explorer: state.grove.explorer, updated_at: state.grove.updated_at
        });
        if (response.error) throw response.error;
        copiedGrove = true;
      }
      // Ignore duplicates. No existing ARRAY history is overwritten.
      for (let i = 0; i < state.missions.length; i += 100) {
        const batch = state.missions.slice(i, i + 100).map(m => ({
          owner_id: state.nextUser.id, mission_id: m.mission_id, details: m.details, updated_at: m.updated_at
        }));
        const response = await state.next.from('array_saved_missions').upsert(batch, { onConflict: 'owner_id,mission_id', ignoreDuplicates: true });
        if (response.error) throw response.error;
        copiedMissions += batch.length;
      }
      const [g,m] = await Promise.all([
        state.next.from('grove_workspaces').select('updated_at').eq('owner_id',state.nextUser.id).maybeSingle(),
        state.next.from('array_saved_missions').select('mission_id',{count:'exact',head:true}).eq('owner_id',state.nextUser.id)
      ]);
      if (g.error || m.error) throw (g.error || m.error);
      state.targetGrove = g.data; state.targetMissionCount = m.count || 0;
      el('existingGrove').textContent = g.data ? 'Yes' : 'No';
      el('existingMissions').textContent = String(state.targetMissionCount);
      output('copyStatus', 'Copy finished. Grove copied: ' + (copiedGrove ? 'yes' : state.grove ? 'already existed, preserved' : 'no source workspace') + '. ARRAY records processed: ' + copiedMissions + '. Destination records now: ' + state.targetMissionCount + '. The original project was not changed.', 'success');
      await state.old.auth.signOut({scope:'local'}).catch(() => {});
    } catch (err) {
      output('copyStatus', 'Transfer stopped: ' + (err?.message || 'Unknown error') + '. Source data remains untouched. A partial destination copy is possible; review counts and retry safely.', 'error');
    } finally { state.busy = false; controls(); }
  }
  el('verifyTarget').addEventListener('click', () => { void verifyTarget(); });
  el('sourceForm').addEventListener('submit', e => { void scan(e); });
  el('backup').addEventListener('click', backup);
  el('copy').addEventListener('click', () => { void copy(); });
  el('agree').addEventListener('change', controls);
  void verifyTarget();
  controls();
})();
