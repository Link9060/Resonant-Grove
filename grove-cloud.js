/* Grove Cloud: Supabase Auth + owner-scoped workspace sync. Public publishable key only. */
(() => {
  'use strict';
  const URL = 'https://bzjudqhjrbwglxdfbkmj.supabase.co';
  const KEY = 'sb_publishable_wVnTPMs0hUuWdt1_LGMIYQ_D-aXveMV';
  const sdk = window.supabase;
  const client = sdk?.createClient?.(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const toolbar = document.querySelector('.topbar-right');
  if (!toolbar || !window.GroveWorkspace || !window.GroveExplorer) return;

  const button = document.createElement('button');
  button.type = 'button'; button.className = 'grove-cloud-toggle';
  button.textContent = 'Cloud sign in';
  toolbar.prepend(button);
  const panel = document.createElement('section');
  panel.className = 'grove-cloud-panel';
  panel.hidden = true;
  panel.setAttribute('aria-label', 'Grove cloud account');
  panel.innerHTML = `
    <div class="grove-cloud-heading"><strong>Grove Cloud</strong><button type="button" id="groveCloudClose" aria-label="Close cloud account">×</button></div>
    <p class="grove-cloud-hint">One account, your Grove on every device. Local data stays available offline.</p>
    <form id="groveCloudForm">
      <label for="groveCloudEmail">Email</label><input id="groveCloudEmail" type="email" autocomplete="email" required />
      <label for="groveCloudPassword">Password</label><input id="groveCloudPassword" type="password" autocomplete="current-password" required minlength="6" />
      <div class="grove-cloud-row"><button type="submit" id="groveCloudLogin">Sign in</button><button type="button" id="groveCloudSignup">Create account</button></div>
      <button type="button" id="groveCloudGoogle" class="grove-cloud-secondary">Continue with Google</button>
    </form>
    <div id="groveCloudSignedIn" hidden><span id="groveCloudUser"></span><button type="button" id="groveCloudSignout">Sign out</button></div>
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
    el('groveCloudUser').textContent = user?.email || '';
    button.textContent = !client ? 'Cloud unavailable' : !user ? 'Cloud sign in' : pending ? 'Choose sync copy' : ready ? 'Cloud connected' : 'Cloud connecting';
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
      ready = true; ui();
      message('Creating your cloud workspace...');
      await upload();
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
  async function authenticate(register) {
    if (!client) return message('Supabase SDK failed to load. Your local data is safe.');
    const email = el('groveCloudEmail').value.trim();
    const password = el('groveCloudPassword').value;
    message(register ? 'Creating your account...' : 'Signing in...');
    const result = register
      ? await client.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } })
      : await client.auth.signInWithPassword({ email, password });
    if (result.error) return message(result.error.message);
    if (register && !result.data.session) message('Check your email to confirm your account, then sign in.');
    else if (result.data.user) void activate(result.data.user);
  }
  button.addEventListener('click', () => { panel.hidden = !panel.hidden; });
  el('groveCloudClose').addEventListener('click', () => { panel.hidden = true; });
  el('groveCloudForm').addEventListener('submit', event => {
    event.preventDefault(); void authenticate(false);
  });
  el('groveCloudSignup').addEventListener('click', () => { void authenticate(true); });
  el('groveCloudGoogle').addEventListener('click', async () => {
    if (!client) return message('Supabase SDK unavailable.');
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: location.origin + location.pathname }
    });
    if (error) message(error.message + '. Google sign-in requires provider configuration in Supabase.');
  });
  el('groveCloudSignout').addEventListener('click', async () => {
    clearTimeout(timer);
    if (dirty) await upload();
    const { error } = await client.auth.signOut();
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
