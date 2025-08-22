// Minimal SPA logic for auth and posts
const state = {
  apiBase: localStorage.getItem('api-base') || 'https://blogbackend-6l7p.onrender.com',
  token: localStorage.getItem('token') || null,
  user: JSON.parse(localStorage.getItem('user') || 'null'),
};

const els = {
  tabs: document.querySelectorAll('.tab-link'),
  panels: document.querySelectorAll('.tab'),
  feedList: document.getElementById('feed-list'),
  myPostsList: document.getElementById('my-posts-list'),
  authCta: document.getElementById('auth-cta'),
  userMenu: document.getElementById('user-menu'),
  userLabel: document.getElementById('user-label'),
  showLogin: document.getElementById('show-login'),
  showRegister: document.getElementById('show-register'),
  logout: document.getElementById('logout'),
  dialog: document.getElementById('auth-dialog'),
  authForm: document.getElementById('auth-form'),
  authModeLabel: document.getElementById('auth-mode-label'),
  authUsername: document.getElementById('auth-username'),
  authEmailWrap: document.getElementById('auth-email-wrap'),
  authEmail: document.getElementById('auth-email'),
  authPassword: document.getElementById('auth-password'),
  authError: document.getElementById('auth-error'),
  apiBaseInput: document.getElementById('api-base-input'),
  saveApiBase: document.getElementById('save-api-base'),
  postForm: document.getElementById('post-form'),
  postId: document.getElementById('post-id'),
  postTitle: document.getElementById('post-title'),
  postContent: document.getElementById('post-content'),
  editorTitle: document.getElementById('editor-title'),
  cancelEdit: document.getElementById('cancel-edit'),
  postItemTpl: document.getElementById('post-item-template'),
  mobileNavToggle: document.getElementById('mobile-nav-toggle'),
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebar-overlay'),
};

function setAuthUI() {
  if (state.token && state.user) {
    els.authCta.classList.add('hidden');
    els.userMenu.classList.remove('hidden');
    els.userLabel.textContent = state.user.username;
  } else {
    els.authCta.classList.remove('hidden');
    els.userMenu.classList.add('hidden');
    els.userLabel.textContent = '';
  }
}

function switchTab(name) {
  // Remove active class from all tabs and panels
  els.tabs.forEach(tab => tab.classList.remove('active'));
  els.panels.forEach(p => p.classList.remove('is-active'));
  
  // Add active class to selected tab and panel
  const activeTab = document.querySelector(`[data-tab="${name}"]`);
  const activePanel = document.getElementById(`tab-${name}`);
  
  if (activeTab) activeTab.classList.add('active');
  if (activePanel) activePanel.classList.add('is-active');
  
  // Close mobile sidebar after tab switch
  closeMobileSidebar();
}

function openMobileSidebar() {
  els.sidebar.classList.add('open');
  els.sidebarOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
  els.sidebar.classList.remove('open');
  els.sidebarOverlay.classList.remove('open');
  document.body.style.overflow = '';
}

function api(path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  return fetch(`${state.apiBase}${path}`, { ...opts, headers }).then(async r => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Request failed');
    return data;
  });
}

function renderPost(post, { mine = false } = {}) {
  const node = els.postItemTpl.content.cloneNode(true);
  node.querySelector('.post-title').textContent = post.title;
  node.querySelector('.post-meta').textContent = `by ${post.authorUsername} • ${new Date(post.createdAt).toLocaleString()}`;
  node.querySelector('.post-content').textContent = post.content;
  const actions = node.querySelector('.post-actions');
  if (mine) {
    const edit = document.createElement('button');
    edit.className = 'button ghost';
    edit.textContent = 'Edit';
    edit.onclick = () => beginEdit(post);
    const del = document.createElement('button');
    del.className = 'button ghost';
    del.textContent = 'Delete';
    del.onclick = () => deletePost(post.id);
    actions.append(edit, del);
  }
  return node;
}

async function loadFeed() {
  const posts = await api('/api/posts');
  els.feedList.innerHTML = '';
  posts.forEach(p => els.feedList.appendChild(renderPost(p)));
}

async function loadMyPosts() {
  const posts = await api('/api/posts/me/list');
  els.myPostsList.innerHTML = '';
  posts.forEach(p => els.myPostsList.appendChild(renderPost(p, { mine: true })));
}

function beginEdit(post) {
  switchTab('editor');
  els.postId.value = post.id;
  els.postTitle.value = post.title;
  els.postContent.value = post.content;
  els.editorTitle.textContent = 'Edit Post';
  els.cancelEdit.hidden = false;
}

function resetEditor() {
  els.postId.value = '';
  els.postTitle.value = '';
  els.postContent.value = '';
  els.editorTitle.textContent = 'Write a Post';
  els.cancelEdit.hidden = true;
}

async function savePost(e) {
  e.preventDefault();
  const id = els.postId.value.trim();
  const payload = { title: els.postTitle.value.trim(), content: els.postContent.value.trim() };
  if (!payload.title || !payload.content) return;
  if (id) {
    await api(`/api/posts/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  } else {
    await api('/api/posts', { method: 'POST', body: JSON.stringify(payload) });
  }
  resetEditor();
  await Promise.all([loadFeed(), loadMyPosts()]);
  switchTab('my-posts');
}

async function deletePost(id) {
  if (!confirm('Delete this post?')) return;
  await api(`/api/posts/${id}`, { method: 'DELETE' });
  await Promise.all([loadFeed(), loadMyPosts()]);
}

function openAuth(mode) {
  els.authModeLabel.textContent = mode === 'register' ? 'Register' : 'Login';
  els.authEmailWrap.hidden = mode !== 'register';
  els.dialog.showModal();
  els.dialog.dataset.mode = mode;
}

async function submitAuth(e) {
  e.preventDefault();
  const mode = els.dialog.dataset.mode || 'login';
  els.authError.hidden = true;
  try {
    if (mode === 'register') {
      await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          username: els.authUsername.value.trim(),
          email: els.authEmail.value.trim(),
          password: els.authPassword.value,
        }),
      });
      // fallthrough to login
    }
    const { token, user } = await api('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username: els.authUsername.value.trim(), password: els.authPassword.value }),
    });
    state.token = token;
    state.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setAuthUI();
    els.dialog.close();
    await Promise.all([loadFeed(), loadMyPosts()]);
  } catch (err) {
    els.authError.textContent = err.message;
    els.authError.hidden = false;
  }
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  setAuthUI();
}

function init() {
  els.apiBaseInput.value = state.apiBase;
  els.saveApiBase.onclick = () => {
    const v = els.apiBaseInput.value.trim();
    if (!v) return;
    state.apiBase = v;
    localStorage.setItem('api-base', v);
    loadFeed();
    if (state.token) loadMyPosts();
  };

  els.tabs.forEach(btn => {
    btn.onclick = () => switchTab(btn.dataset.tab);
  });

  // Mobile navigation
  els.mobileNavToggle.onclick = openMobileSidebar;
  els.sidebarOverlay.onclick = closeMobileSidebar;

  els.showLogin.onclick = () => openAuth('login');
  els.showRegister.onclick = () => openAuth('register');
  els.logout.onclick = logout;
  els.authForm.addEventListener('submit', submitAuth);
  els.postForm.addEventListener('submit', savePost);
  els.cancelEdit.addEventListener('click', () => resetEditor());

  setAuthUI();
  loadFeed();
  if (state.token) loadMyPosts();
  
  // Set initial active tab
  switchTab('feed');
}

document.addEventListener('DOMContentLoaded', init);


