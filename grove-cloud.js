/* Grove Cloud: Supabase Auth + owner-scoped workspace sync. Public publishable key only. */
(() => {
  'use strict';
  const URL = 'https://cnorozrjugxpanpfmssa.supabase.co';
  const KEY = 'sb_publishable_yVNPiB7opT0WRvBfKTZ2BA_s5bOQLRg';
  const sdk = window.supabase;
  const client = sdk?.createClient?.(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce', storageKey: 'sb-cnorozrjugxpanpfmssa-auth-token' } });
  const toolbar = document.querySelector('.topbar-right');
  if (!toolbar || !window.GroveWorkspace || !window.GroveExplorer) return;

  const button = document.createElement('button');
  button.type = 'button'; button.className = 'grove-cloud-toggle';
  button.textContent = 'ARROW cloud sign in';
  toolbar.prepend(button);
  const panel = document.createElement('section');
  panel.className = 'grove-cloud-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Grove cloud account');
  panel.innerHTML = `
    <div class="grove-cloud-heading"><strong>Grove Cloud</strong><button type="button" id="groveCloudClose" aria-label="Close cloud account">×</button></div>
    <p class="grove-cloud-hint">Use your ARROW / Relay account. Sign in through Relay on link9060.github.io first if your session is not recognized. Local data remains available offline.</p>
    <div id="groveCloudForm" class="grove-cloud-auth">
      <p>Your ARROW sign-in is shared with Grove when both are opened on link9060.github.io. No separate Grove password or account is needed.</p>
      <div class="grove-cloud-row"><a class="grove-cloud-secondary" href="https://link9060.github.io/Resonant-Relay/" target="_blank" rel="noopener noreferrer">Sign in with ARROW</a><button type="button" id="groveCloudRefresh">Check sign-in</button></div>
    </div>
    <div id="groveCloudSignedIn" hidden><span id="groveCloudUser"></span><button type="button" id="groveCloudSignout">Sign out of ARROW here</button></div>
    <div id="groveCloudConflict" hidden><strong>Two Grove copies found</strong><p>Choose which data to use. Nothing is overwritten until you choose.</p><button type="button" id="groveCloudUseRemote">Load cloud copy</button><button type="button" id="groveCloudUseLocal">Upload this device</button></div>
    <p id="groveCloudStatus" role="status" aria-live="polite"></p>`;
  document.body.append(panel);
  const el = id => document.getElementById(id);
  let user = null;
  let currentUserId = null;
  let ready = false;
  let pending = null;
  let timer = null;
  let inFlight = false;
  let dirty = false;

  const message = text => { el('groveCloudStatus').textContent = text; };
  function ui() {
    el('groveCloudForm').hidden = Boolean(user);
    el('groveCloudSignedIn').hidden = !user;
    el('groveCloudConflict').hidden = !pending;
    el('groveCloudUseRemote').hidden = !!pending && !pending.workspace;
    el('groveCloudUseRemote').disabled = !!pending && !pending.workspace;
    el('groveCloudConflict').querySelector('strong').textContent = pending && !pending.workspace ? 'Start your ARROW Grove workspace' : 'Two Grove copies found';
    el('groveCloudConflict').querySelector('p').textContent = pending && !pending.workspace ? 'No ARROW cloud copy exists yet. Upload this device only after checking your original data or using the migration tool. Nothing is uploaded automatically.' : 'Choose which data to use. Nothing is overwritten until you choose.';
    el('groveCloudUser').textContent = user?.email || '';
    button.textContent = !client ? 'Cloud unavailable' : !user ? 'Connect ARROW' : pending ? 'Choose sync copy' : ready ? 'Cloud connected' : 'Cloud connecting';
    const indicator = document.querySelector('.local-indicator');
    if (indicator?.lastChild?.nodeType === Node.TEXT_NODE) {
      indicator.lastChild.textContent = ready ? 'Synced with cloud' : 'Saved on this device';
    }
  }
  const localCopy = () => ({ workspace: window.GroveWorkspace.get(), explorer: window.GroveExplorer.get() });
  function useRemote(copy) {
    window.GroveWorkspace.replace(copy.workspace);
    window.GroveExplorer.replace(copy.explorer);
  }
  async function upload() {
    if (!client || !user || !ready) return;
    if (inFlight) { dirty = true; return; }
    inFlight = true; dirty = false;
    const snapshot = localCopy();
    const { error } = await client.from('grove_workspaces').upsert({
      owner_id: user.id, ...snapshot, updated_at: new Date().toISOString()
    }, { onConflict: 'owner_id' });
    inFlight = false;
    if (error) { message('Cloud save failed: ' + error.message + '. Your local copy is still saved.'); }
    else { message('Cloud saved. Your data is synchronized to this account.'); }
    if (dirty) scheduleSave();
  }
  function scheduleSave() {
    if (!ready || !user) return;
    dirty = true;
    clearTimeout(timer);
    timer = setTimeout(() => { void upload(); }, 700);
  }
  window.GroveCloud = { scheduleSave };
  async function activate(nextUser) {
    const nextId = nextUser?.id || null;
    if (nextId === currentUserId) return;
    currentUserId = nextId; user = nextUser; ready = false; pending = null;
    clearTimeout(timer); dirty = false;
    ui();
    if (!client || !user) { message('Local copy stays on this device after sign-out.'); return; }
    message('Checking for saved cloud data...');
    const scopedId = user.id;
    const { data, error } = await client.from('grove_workspaces')
      .select('workspace,explorer').eq('owner_id', scopedId).maybeSingle();
    if (scopedId !== currentUserId) return;
    if (error) { message('Could not load cloud workspace: ' + error.message); return; }
    if (!data) {
      // Never turn an empty local browser state into an automatic cloud overwrite.
      pending = { workspace: null, explorer: null };
      ui();
      message('No ARROW cloud copy yet. Verify the old data before selecting Upload this device.');
    } else {
      const local = localCopy();
      if (JSON.stringify(data.workspace) === JSON.stringify(local.workspace)
        && JSON.stringify(data.explorer) === JSON.stringify(local.explorer)) {
        ready = true; message('Cloud copy matches this device.');
      } else {
        pending = data; message('Your cloud and device have different data. Choose which copy to keep.');
      }
      ui();
    }
  }
  button.addEventListener('click', () => { panel.hidden = !panel.hidden; });
  el('groveCloudClose').addEventListener('click', () => { panel.hidden = true; });
  el('groveCloudRefresh').addEventListener('click', async () => {
    if (!client) return message('ARROW connection is unavailable.');
    message('Checking your ARROW account...');
    const { data, error } = await client.auth.getUser();
    if (error) return message('Unable to verify ARROW sign-in: ' + error.message);
    if (!data?.user) return message('Not signed in yet. Open ARROW/Relay on link9060.github.io, sign in, then check again.');
    await activate(data.user);
  });
  el('groveCloudSignout').addEventListener('click', async () => {
    clearTimeout(timer);
    if (dirty) await upload();
    // This logs out of the shared ARROW session on the current browser origin.
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) message(error.message);
    else void activate(null);
  });
  el('groveCloudUseRemote').addEventListener('click', () => {
    if (!pending) return;
    useRemote(pending); pending = null; ready = true; ui();
    message('Loaded cloud workspace. Future changes will sync.');
  });
  el('groveCloudUseLocal').addEventListener('click', () => {
    if (!pending) return;
    pending = null; ready = true; ui();
    message('Uploading this device as the cloud copy...');
    void upload();
  });
  if (!client) {
    message('Cloud unavailable. Grove continues saving locally.');
    ui(); return;
  }
  client.auth.onAuthStateChange((_event, session) => {
    // Defer database access until after the auth callback has completed.
    setTimeout(() => { void activate(session?.user ?? null); }, 0);
  });
  void client.auth.getUser().then(({ data }) => activate(data?.user ?? null)).catch(() => {});
  ui();
})();
