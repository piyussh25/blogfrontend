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
  userAvatar: document.getElementById('user-avatar'),
  showLogin: document.getElementById('show-login'),
  showRegister: document.getElementById('show-register'),
  showProfile: document.getElementById('show-profile'),
  logout: document.getElementById('logout'),
  dialog: document.getElementById('auth-dialog'),
  authForm: document.getElementById('auth-form'),
  authModeLabel: document.getElementById('auth-mode-label'),
  authUsername: document.getElementById('auth-username'),
  authEmailWrap: document.getElementById('auth-email-wrap'),
  authEmail: document.getElementById('auth-email'),
  authDisplayNameWrap: document.getElementById('auth-display-name-wrap'),
  authDisplayName: document.getElementById('auth-display-name'),
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
  profileForm: document.getElementById('profile-form'),
  profileAvatar: document.getElementById('profile-avatar'),
  profileDisplayName: document.getElementById('profile-display-name'),
  profileBio: document.getElementById('profile-bio'),
  profileAvatarUrl: document.getElementById('profile-avatar-url'),
  avatarInput: document.getElementById('avatar-input'),
  useUrlBtn: document.getElementById('use-url-btn'),
};

function setAuthUI() {
  if (state.token && state.user) {
    els.authCta.classList.add('hidden');
    els.userMenu.classList.remove('hidden');
    els.userLabel.textContent = state.user.displayName || state.user.username;
    els.userAvatar.src = state.user.avatar;
  } else {
    els.authCta.classList.remove('hidden');
    els.userMenu.classList.add('hidden');
    els.userLabel.textContent = '';
    els.userAvatar.src = '';
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
  if (!post || !post._id) {
    console.warn('Skipping rendering of malformed post:', post);
    return document.createElement('div'); // Return an empty div or null
  }
  console.log('els.postItemTpl:', els.postItemTpl);
  const node = els.postItemTpl.content.cloneNode(true);
  console.log('Cloned node:', node);
  
  // Set post data
  node.querySelector('.post-title').textContent = post.title;
  const postMeta = node.querySelector('.post-meta');
  const authorName = post.author ? (post.author.displayName || post.author.username) : 'Unknown User';
  postMeta.innerHTML = `by ${authorName} ${post.author && post.author.role === 'admin' ? '<img src="OIP.jpeg" class="verified-icon" alt="Verified Admin">': ''} • ${new Date(post.createdAt).toLocaleString()}`;
  node.querySelector('.post-content').textContent = post.content;
  
  // Set author avatar
  const authorAvatar = node.querySelector('.author-avatar');
  authorAvatar.src = post.author ? post.author.avatar : ''; // Provide a default empty string or a placeholder image URL
  authorAvatar.alt = `${post.author ? (post.author.displayName || post.author.username) : 'Unknown User'}'s avatar`;
  
  // Set like button
  const likeButton = node.querySelector('.like-button');
  likeButton.dataset.postId = post._id;
  const likeIcon = likeButton.querySelector('.like-icon');
  const likeCount = likeButton.querySelector('.like-count');
  
  likeCount.textContent = post.likeCount || 0;
  if (post.isLiked) {
    likeButton.classList.add('liked');
    likeIcon.textContent = '❤️';
  } else {
    likeButton.classList.remove('liked');
    likeIcon.textContent = '🤍';
  }
  
  // Set comment button
  const commentButton = node.querySelector('.comment-button');
  console.log('Comment button:', commentButton);
  const commentCount = commentButton.querySelector('.comment-count');
  commentCount.textContent = post.commentCount || 0;
  
  // Add like functionality
  likeButton.onclick = () => toggleLike(post._id, likeButton);
  
  // Add comment functionality
  commentButton.onclick = () => toggleComments(node.querySelector('.comments-section'));
  
  // Render comments
  const commentsList = node.querySelector('.comments-list');
  console.log('Comments section found:', commentsList);
  commentsList.innerHTML = '';
  
  if (post.comments && post.comments.length > 0) {
    post.comments.forEach(comment => {
      const commentEl = document.createElement('div');
      commentEl.className = 'comment';
      commentEl.innerHTML = `
        <img class="comment-avatar" src="${comment.author.avatar}" alt="${comment.author.displayName || comment.author.username}'s avatar">
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-author">${comment.author.displayName || comment.author.username}</span>
            <span class="comment-time">${new Date(comment.createdAt).toLocaleString()}</span>
          </div>
          <div class="comment-text">${comment.content}</div>
        </div>
      `;
      commentsList.appendChild(commentEl);
    });
  }
  
  // Add comment form functionality
  const commentForm = node.querySelector('.comment-form');
  commentForm.onsubmit = (e) => {
    e.preventDefault();
    const input = commentForm.querySelector('.comment-input');
    addComment(post._id, input.value, commentsList);
    input.value = '';
  };
  
  // Add owner actions if it's the user's post
  const ownerActions = node.querySelector('.post-owner-actions');
  // Add owner actions if it's the user's post OR the user is an admin
  if (mine || (state.user && state.user.role === 'admin')) {
    const edit = document.createElement('button');
    edit.className = 'button ghost small';
    edit.textContent = 'Edit';
    edit.onclick = () => beginEdit(post);
    
    const del = document.createElement('button');
    del.className = 'button ghost small';
    del.textContent = 'Delete';
    del.onclick = () => deletePost(post._id);
    
    ownerActions.append(edit, del);
  }
  
  return node;
}

async function toggleLike(postId, button) {
  if (!state.token) {
    alert('Please login to like posts');
    return;
  }
  
  try {
    const response = await api(`/api/posts/${postId}/like`, { method: 'POST' });
    const likeIcon = button.querySelector('.like-icon');
    const likeCount = button.querySelector('.like-count');
    
    likeCount.textContent = response.likeCount;
    if (response.isLiked) {
      button.classList.add('liked');
      likeIcon.textContent = '❤️';
    } else {
      button.classList.remove('liked');
      likeIcon.textContent = '🤍';
    }
  } catch (error) {
    console.error('Like error:', error);
    alert('Failed to like post');
  }
}

function toggleComments(button) { // Accept the button element directly
  const postElement = button.closest('.post'); // Find the parent post element
  const commentsSection = postElement.querySelector('.comments-section'); // Find comments section within that post

  if (!state.token) {
    alert('Please login to comment');
    return;
  }
  
  // Add this check
  if (!commentsSection) {
    console.error('Comments section element not found.');
    return;
  }

  const isVisible = commentsSection.style.display !== 'none';
  commentsSection.style.display = isVisible ? 'none' : 'block';
}

async function addComment(postId, content, commentsList) {
  if (!state.token) {
    alert('Please login to comment');
    return;
  }
  
  try {
    const comment = await api(`/api/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content })
    });
    
    // Add the new comment to the list
    const commentEl = document.createElement('div');
    commentEl.className = 'comment';
    commentEl.innerHTML = `
      <img class="comment-avatar" src="${state.user.avatar}" alt="${state.user.displayName || state.user.username}'s avatar">
      <div class="comment-content">
        <div class="comment-header">
          <span class="comment-author">${state.user.displayName || state.user.username}</span>
          <span class="comment-time">Just now</span>
        </div>
        <div class="comment-text">${content}</div>
      </div>
    `;
    commentsList.appendChild(commentEl);
    
    // Update comment count
    const commentButton = commentsList.closest('.post').querySelector('.comment-button');
    const commentCount = commentButton.querySelector('.comment-count');
    commentCount.textContent = parseInt(commentCount.textContent) + 1;
  } catch (error) {
    console.error('Comment error:', error);
    alert('Failed to add comment');
  }
}

async function loadFeed() {
  const posts = await api('/api/posts');
  console.log('Posts received from API:', posts); // Add this line
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
  els.postId.value = post._id;
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
  els.authDisplayNameWrap.hidden = mode !== 'register';
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
          displayName: els.authDisplayName.value.trim() || undefined,
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

async function loadProfile() {
  if (!state.user) return;
  
  els.profileAvatar.src = state.user.avatar;
  els.profileDisplayName.value = state.user.displayName || '';
  els.profileBio.value = state.user.bio || '';
  els.profileAvatarUrl.value = state.user.avatar || '';
}

async function uploadAvatar(file) {
  if (!state.token) {
    alert('Please login to upload avatar');
    return;
  }

  console.log('Uploading avatar with token:', state.token.substring(0, 20) + '...');
  console.log('User state:', state.user);

  try {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(`${state.apiBase}/api/upload/avatar`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`
      },
      body: formData
    });

    console.log('Upload response status:', response.status);
    console.log('Upload response headers:', response.headers);

    if (!response.ok) {
      const error = await response.json();
      console.error('Upload error response:', error);
      throw new Error(error.error || 'Upload failed');
    }

    const result = await response.json();
    console.log('Upload success result:', result);
    
    // Update the profile avatar preview
    els.profileAvatar.src = result.avatarUrl;
    
    // Update the avatar URL input
    els.profileAvatarUrl.value = result.avatarUrl;
    
    alert('Avatar uploaded successfully!');
    return result.avatarUrl;
  } catch (error) {
    console.error('Upload error:', error);
    alert(`Upload failed: ${error.message}`);
    return null;
  }
}

async function updateProfile(e) {
  e.preventDefault();
  
  try {
    const response = await api('/api/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        displayName: els.profileDisplayName.value.trim(),
        bio: els.profileBio.value.trim(),
        avatar: els.profileAvatarUrl.value.trim(),
      }),
    });
    
    // Update state and UI
    state.user = response.user;
    localStorage.setItem('user', JSON.stringify(response.user));
    setAuthUI();
    
    alert('Profile updated successfully!');
  } catch (error) {
    console.error('Profile update error:', error);
    alert('Failed to update profile');
  }
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
  els.showProfile.onclick = () => switchTab('profile');
  els.logout.onclick = logout;
  els.authForm.addEventListener('submit', submitAuth);
  els.postForm.addEventListener('submit', savePost);
  els.profileForm.addEventListener('submit', updateProfile);
  els.cancelEdit.addEventListener('click', () => resetEditor());

  // Avatar upload functionality
  els.avatarInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        alert('File too large. Maximum size is 5MB.');
        return;
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        alert('Only image files are allowed (JPEG, PNG, GIF, WebP).');
        return;
      }
      
      await uploadAvatar(file);
    }
  });

  // Use URL button
  els.useUrlBtn.onclick = () => {
    const url = els.profileAvatarUrl.value.trim();
    if (url) {
      els.profileAvatar.src = url;
    }
  };

  setAuthUI();
  loadFeed();
  if (state.token) {
    loadMyPosts();
    loadProfile();
  }
  
  // Set initial active tab
  switchTab('feed');
}

document.addEventListener('DOMContentLoaded', init);


