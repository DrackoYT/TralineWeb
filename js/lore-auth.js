/* Shared auth module -- Supabase edition */
var STORAGE_KEY = 'traline_forum_entries';
var USERS_KEY = 'traline_users';
var ADMIN_PASSWORD = 'traline2024';
var GOOGLE_CLIENT_ID = '1061389217388-d9utb39d4hh7heq2crlmff8sl5nojl4p.apps.googleusercontent.com';
var DISCORD_CLIENT_ID = '1515996446464278590';
var ALL_PERMS = ['manage_users', 'manage_entries', 'manage_notifications', 'manage_admins'];
var currentUser = null;

async function getEntries() {
  try {
    var sb = getSupabase();
    var { data, error } = await sb.from('entries').select('*').order('id', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('getEntries error:', e);
    return [];
  }
}

async function getUsers() {
  try {
    var sb = getSupabase();
    var { data, error } = await sb.from('users').select('*');
    if (error) throw error;
    return data || [];
  } catch (e) {
    console.error('getUsers error:', e);
    return [];
  }
}

function hashPassword(pwd) {
  var h = 0;
  for (var i = 0; i < pwd.length; i++) { h = ((h << 5) - h) + pwd.charCodeAt(i); h |= 0; }
  return h;
}

async function registerUser(username, password, email, notifications) {
  var sb = getSupabase();
  var { data: existing } = await sb.from('users').select('username').eq('username', username).maybeSingle();
  if (existing) return 'username';
  if (email) {
    var { data: emailMatch } = await sb.from('users').select('email').eq('email', email).maybeSingle();
    if (emailMatch) return 'email';
  }
  var { error } = await sb.from('users').insert({
    username: username,
    password_hash: hashPassword(password),
    email: email || '',
    notifications: notifications === true,
    bio: '',
    google_id: '',
    discord_id: '',
    icon: username.charAt(0).toUpperCase(),
    picture: '',
    role: 'user',
    permissions: []
  });
  if (error) { console.error('registerUser error:', error); return false; }
  return true;
}

async function authenticateUser(username, password) {
  var sb = getSupabase();
  var hash = hashPassword(password);
  var { data } = await sb.from('users').select('*').eq('username', username).eq('password_hash', hash).maybeSingle();
  return data || null;
}

async function getUserProfile(username) {
  var sb = getSupabase();
  var { data } = await sb.from('users').select('*').eq('username', username).maybeSingle();
  return data || null;
}

async function updateUserProfile(username, updates) {
  var sb = getSupabase();
  var payload = {};
  if (updates.email !== undefined) payload.email = updates.email;
  if (updates.notifications !== undefined) payload.notifications = updates.notifications;
  if (updates.bio !== undefined) payload.bio = updates.bio;
  if (updates.icon !== undefined) payload.icon = updates.icon;
  if (updates.picture !== undefined) payload.picture = updates.picture;
  var { error } = await sb.from('users').update(payload).eq('username', username);
  if (error) { console.error('updateUserProfile error:', error); return false; }
  return true;
}

function isCurrentUserAdmin() {
  try {
    var stored = sessionStorage.getItem('traline_admin');
    if (stored) { var data = JSON.parse(stored); return data.isAdmin === true; }
  } catch (e) {}
  return false;
}

function hasPermission(perm) {
  try {
    var stored = sessionStorage.getItem('traline_admin');
    if (stored) {
      var data = JSON.parse(stored);
      return data.isAdmin === true && data.permissions && data.permissions.indexOf(perm) !== -1;
    }
  } catch (e) {}
  return false;
}

function getCurrentUserPerms() {
  try {
    var stored = sessionStorage.getItem('traline_admin');
    if (stored) {
      var data = JSON.parse(stored);
      return data.permissions || [];
    }
  } catch (e) {}
  return [];
}

function checkSession() {
  try {
    var stored = sessionStorage.getItem('traline_admin');
    if (stored) {
      var data = JSON.parse(stored);
      if (data.expiry > Date.now()) { currentUser = data.user; return true; }
    }
  } catch (e) {}
  return false;
}

function saveSession(user, isAdmin, permissions) {
  sessionStorage.setItem('traline_admin', JSON.stringify({ user: user, expiry: Date.now() + 3600000, isAdmin: isAdmin, permissions: permissions || [] }));
}

function clearSession() { sessionStorage.removeItem('traline_admin'); currentUser = null; }

async function login(password, username) {
  var sb = getSupabase();
  var isAdminPwd = hashPassword(password) === hashPassword(ADMIN_PASSWORD);
  var user = await authenticateUser(username, password);
  if (user) {
    currentUser = username;
    var perms = (user.role === 'admin' && user.permissions) ? user.permissions : [];
    saveSession(currentUser, user.role === 'admin', perms);
    return true;
  }
  if (!isAdminPwd) return false;
  currentUser = username || 'Admin';
  var { data: existing } = await sb.from('users').select('*').eq('username', currentUser).maybeSingle();
  if (existing) {
    await sb.from('users').update({ role: 'admin', permissions: ALL_PERMS }).eq('username', currentUser);
  } else {
    await sb.from('users').insert({
      username: currentUser,
      password_hash: '',
      email: '',
      notifications: true,
      bio: '',
      google_id: '',
      discord_id: '',
      icon: currentUser.charAt(0).toUpperCase(),
      picture: '',
      created_at: new Date().toISOString(),
      role: 'admin',
      permissions: ALL_PERMS
    });
  }
  saveSession(currentUser, true, ALL_PERMS);
  return true;
}

function logout() { clearSession(); renderAdminUI(); closeModal('login-modal'); }

async function getNotifiedUsers() {
  var users = await getUsers();
  return users.filter(function (u) { return u.email && u.notifications; });
}

async function sendNotification(subject, message) {
  var users = await getNotifiedUsers();
  if (!users.length) return alert('No hay usuarios con notificaciones activadas.');
  var recipients = users.map(function (u) { return u.email; });

  fetch('/api/send-notification', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipients: recipients, subject: subject, message: message })
  }).then(function (r) {
    if (r.ok) {
      alert('Notificaci\u00f3n enviada correctamente a ' + recipients.length + ' usuario(s).');
    } else {
      throw new Error('API no disponible');
    }
  }).catch(function () {
    var full = 'Para: ' + recipients.join(', ') + '\n\nAsunto: ' + subject + '\n\n' + message;
    navigator.clipboard.writeText(full).then(function () {
      alert('No se pudo enviar autom\u00e1ticamente. Lista de correos copiada al portapapeles.\n\nDestinatarios: ' + recipients.length);
    }, function () {
      prompt('No se pudo enviar autom\u00e1ticamente. Copia manualmente:\n' + recipients.join(', ') + '\n\nAsunto: ' + subject + '\n\n' + message, full);
    });
  });
}

function openProfileView(username) {
  window.location.href = '/perfil.html?user=' + encodeURIComponent(username);
}

async function loginWithGoogle(googleId, email, displayName, picture) {
  if (!email) { alert('No se pudo obtener el correo de Google.'); return; }
  var sb = getSupabase();
  var { data: user } = await sb.from('users').select('*').eq('google_id', googleId).maybeSingle();
  if (!user) {
    var { data: existing } = await sb.from('users').select('*').eq('email', email).maybeSingle();
    if (existing) {
      var upd = { google_id: googleId, picture: picture || existing.picture || '' };
      if (!existing.icon || existing.icon.length === 1) upd.icon = displayName.charAt(0).toUpperCase() || existing.username.charAt(0).toUpperCase();
      await sb.from('users').update(upd).eq('id', existing.id);
      user = (await sb.from('users').select('*').eq('id', existing.id).single()).data;
    } else {
      var base = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '');
      var username = base;
      var suffix = 1;
      while (true) {
        var { data: dup } = await sb.from('users').select('username').eq('username', username).maybeSingle();
        if (!dup) break;
        username = base + suffix; suffix++;
      }
      var { data: newUser, error } = await sb.from('users').insert({
        username: username,
        password_hash: 0,
        email: email,
        notifications: true,
        bio: '',
        google_id: googleId,
        icon: username.charAt(0).toUpperCase(),
        picture: picture || '',
        role: 'user',
        permissions: []
      }).select().single();
      if (error) { console.error('Google user insert error:', error); return; }
      user = newUser;
    }
  }
  currentUser = user.username;
  var isAdmin = user.role === 'admin';
  var perms = isAdmin && user.permissions ? user.permissions : [];
  saveSession(currentUser, isAdmin, perms);
  renderAdminUI();
  if (typeof renderForum === 'function') renderForum();
  closeModal('login-modal');
  closeModal('register-modal');
}

function parseJwt(token) {
  try {
    var base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch (e) { return null; }
}

function generateRandomString(len) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  var result = '';
  var arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (var i = 0; i < len; i++) result += chars[arr[i] % chars.length];
  return result;
}

function base64url(buffer) {
  var bytes = new Uint8Array(buffer);
  var binary = '';
  for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function startDiscordLogin() {
  if (!DISCORD_CLIENT_ID) { alert('Discord login no configurado.'); return; }
  var verifier = generateRandomString(64);
  crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(function (hash) {
    var challenge = base64url(hash);
    var state = generateRandomString(16);
    sessionStorage.setItem('discord_code_verifier', verifier);
    sessionStorage.setItem('discord_oauth_state', state);
    sessionStorage.setItem('discord_original_page', window.location.href);
    sessionStorage.setItem('discord_client_id', DISCORD_CLIENT_ID);
    var redirectUri = window.location.origin + '/discord-callback.html';
    var url = 'https://discord.com/api/oauth2/authorize' +
      '?response_type=code' +
      '&client_id=' + encodeURIComponent(DISCORD_CLIENT_ID) +
      '&redirect_uri=' + encodeURIComponent(redirectUri) +
      '&scope=' + encodeURIComponent('identify email') +
      '&state=' + encodeURIComponent(state) +
      '&code_challenge=' + encodeURIComponent(challenge) +
      '&code_challenge_method=S256' +
      '&prompt=consent';
    window.location.href = url;
  });
}

async function loginWithDiscord(user) {
  if (!user || !user.id) return;
  var sb = getSupabase();
  var { data: existing } = await sb.from('users').select('*').eq('discord_id', user.id).maybeSingle();
  if (!existing) {
    if (user.email) {
      var { data: emailMatch } = await sb.from('users').select('*').eq('email', user.email).maybeSingle();
      if (emailMatch) {
        var upd = { discord_id: user.id };
        if (user.avatar) upd.picture = 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png';
        await sb.from('users').update(upd).eq('id', emailMatch.id);
        existing = (await sb.from('users').select('*').eq('id', emailMatch.id).single()).data;
      }
    }
    if (!existing) {
      var base = (user.name || user.id).replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
      var username = base;
      var suffix = 1;
      while (true) {
        var { data: dup } = await sb.from('users').select('username').eq('username', username).maybeSingle();
        if (!dup) break;
        username = base + suffix; suffix++;
      }
      var avatarUrl = user.avatar ? 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.png' : '';
      var { data: newUser, error } = await sb.from('users').insert({
        username: username,
        password_hash: 0,
        email: user.email || '',
        notifications: true,
        bio: '',
        discord_id: user.id,
        icon: username.charAt(0).toUpperCase(),
        picture: avatarUrl,
        role: 'user',
        permissions: []
      }).select().single();
      if (error) { console.error('Discord user insert error:', error); return; }
      existing = newUser;
    }
  }
  currentUser = existing.username;
  var isAdmin = existing.role === 'admin';
  var perms = isAdmin && existing.permissions ? existing.permissions : [];
  saveSession(currentUser, isAdmin, perms);
  renderAdminUI();
  if (typeof renderForum === 'function') renderForum();
  closeModal('login-modal');
  closeModal('register-modal');
}

function initGoogleSignIn() {
  if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') return;
  if (typeof google === 'undefined' || !google.accounts) return;
  var client = google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_CLIENT_ID,
    scope: 'openid email profile',
    callback: function (tokenResponse) {
      if (!tokenResponse.access_token) { alert('Error al autenticar con Google.'); return; }
      fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: 'Bearer ' + tokenResponse.access_token }
      }).then(function (r) { return r.json(); }).then(function (data) {
        loginWithGoogle(data.sub, data.email, data.name, data.picture);
      }).catch(function () { alert('Error al obtener datos de Google.'); });
    }
  });
  document.querySelectorAll('.google-signin-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      client.requestAccessToken({ prompt: 'select_account' });
    });
  });
}

function formatDate(iso) {
  if (!iso) return '';
  var d = new Date(iso);
  var now = new Date();
  var diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'hace unos segundos';
  if (diff < 3600) return 'hace ' + Math.floor(diff / 60) + ' min';
  if (diff < 86400) return 'hace ' + Math.floor(diff / 3600) + 'h';
  if (diff < 172800) return 'ayer';
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  var d = document.createElement('div');
  d.textContent = text;
  return d.innerHTML;
}

function sanitizeHTML(html) {
  var d = document.createElement('div');
  d.innerHTML = html;
  d.querySelectorAll('script').forEach(function (s) { s.remove(); });
  d.querySelectorAll('*').forEach(function (el) {
    Array.from(el.attributes).forEach(function (attr) {
      if (attr.name.toLowerCase().startsWith('on') || attr.name.toLowerCase() === 'href' && attr.value.toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return d.innerHTML;
}

function closeModal(id) { var el = document.getElementById(id); if (el) el.classList.remove('open'); }

function renderAdminUI() {
  var btn = document.getElementById('admin-btn');
  var status = document.getElementById('admin-status');
  if (!btn || !status) return;
  var existing = document.getElementById('admin-dropdown');
  if (existing) existing.remove();
  status.style.display = 'none';
  if (currentUser) {
    btn.style.display = 'none';
    var wrap = document.createElement('div');
    wrap.id = 'admin-dropdown';
    wrap.className = 'admin-dropdown';
    var trigger = document.createElement('span');
    trigger.className = 'admin-badge';
    trigger.textContent = currentUser;
    var menu = document.createElement('div');
    menu.className = 'admin-dropdown-menu';
    var profileBtn = document.createElement('button');
    profileBtn.className = 'dropdown-item';
    profileBtn.textContent = 'Mi perfil';
    profileBtn.addEventListener('click', function (e) { e.stopPropagation(); openProfileView(currentUser); });
    menu.appendChild(profileBtn);
    if (isCurrentUserAdmin()) {
      var adminBtn = document.createElement('button');
      adminBtn.className = 'dropdown-item';
      adminBtn.textContent = 'Panel admin';
      adminBtn.addEventListener('click', function (e) { e.stopPropagation(); window.location.href = '/admin.html'; });
      menu.appendChild(adminBtn);
      if (hasPermission('manage_notifications')) {
        var notifBtn = document.createElement('button');
        notifBtn.className = 'dropdown-item';
        notifBtn.textContent = 'Enviar notificaci\u00f3n';
        notifBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          getNotifiedUsers().then(function (notified) {
            var count = notified.length;
            if (!count) { alert('No hay usuarios registrados con correo y notificaciones activadas.'); return; }
            document.getElementById('notif-count').textContent = count;
            document.getElementById('notif-subject').value = '';
            document.getElementById('notif-message').value = '';
            document.getElementById('notif-result').style.display = 'none';
            document.getElementById('notif-modal').classList.add('open');
          });
        });
        menu.appendChild(notifBtn);
      }
    }
    var lo = document.createElement('button');
    lo.className = 'dropdown-logout-btn';
    lo.textContent = 'Cerrar sesi\u00f3n';
    lo.addEventListener('click', function (e) { e.stopPropagation(); logout(); if (typeof renderForum === 'function') renderForum(); });
    menu.appendChild(lo);
    wrap.appendChild(trigger);
    wrap.appendChild(menu);
    status.parentNode.insertBefore(wrap, status.nextSibling);
  } else {
    btn.style.display = '';
    btn.textContent = 'Iniciar sesi\u00f3n';
    btn.className = 'btn btn-ghost';
  }
}

document.addEventListener('DOMContentLoaded', function initAuth() {
  var sb = getSupabase();

  // Reset users if ?reset param
  var resetParam = new URLSearchParams(window.location.search).get('reset');
  if (resetParam === '1') {
    (async function () {
      await sb.from('users').delete().neq('id', 0);
      await sb.from('entries').delete().neq('id', 0);
      await sb.from('users').insert({
        username: 'Kael Tharion',
        password_hash: hashPassword(ADMIN_PASSWORD),
        email: '',
        notifications: true,
        bio: '',
        google_id: '',
        discord_id: '',
        icon: 'K',
        picture: '',
        role: 'admin',
        permissions: ALL_PERMS
      });
      console.log('Database reset complete');
    })();
  }

  // Ensure Kael Tharion exists with admin perms
  (async function () {
    var { data: kael } = await sb.from('users').select('*').eq('username', 'Kael Tharion').maybeSingle();
    if (kael) {
      if (kael.role !== 'admin') {
        await sb.from('users').update({ role: 'admin', permissions: ALL_PERMS }).eq('username', 'Kael Tharion');
      }
    } else {
      await sb.from('users').insert({
        username: 'Kael Tharion',
        password_hash: hashPassword(ADMIN_PASSWORD),
        email: '',
        notifications: true,
        bio: '',
        google_id: '',
        discord_id: '',
        icon: 'K',
        picture: '',
        role: 'admin',
        permissions: ALL_PERMS
      });
    }
  })();

  // Check for Discord OAuth result
  try {
    var discordResult = sessionStorage.getItem('discord_auth_result');
    if (discordResult) {
      sessionStorage.removeItem('discord_auth_result');
      var user = JSON.parse(discordResult);
      loginWithDiscord(user);
    }
  } catch (e) {}

  if (checkSession()) {
    renderAdminUI();
    (async function () {
      var user = await getUserProfile(currentUser);
      if (user) {
        saveSession(currentUser, user.role === 'admin', user.role === 'admin' && user.permissions ? user.permissions : []);
        renderAdminUI();
      }
    })();
  }

  // Build modals if not present
  if (!document.getElementById('login-modal')) {
    var loginHTML =
      '<div id="login-modal" class="modal-overlay">' +
        '<div class="modal-box">' +
          '<h3>Iniciar sesi\u00f3n</h3>' +
          '<div class="modal-body">' +
            '<input type="text" id="login-username" placeholder="Usuario">' +
            '<input type="password" id="login-password" placeholder="Contrase\u00f1a">' +
            '<div class="google-divider"><span>o</span></div>' +
            '<button type="button" class="google-signin-btn">Iniciar sesi\u00f3n con Google</button>' +
            '<button type="button" class="discord-signin-btn">Iniciar sesi\u00f3n con Discord</button>' +
            '<p id="login-error" class="text-error">Contrase\u00f1a incorrecta</p>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button id="login-cancel" class="btn btn-ghost">Cancelar</button>' +
            '<button id="login-register" class="btn btn-ghost" style="margin-right:auto">Crear cuenta</button>' +
            '<button id="login-submit" class="btn btn-primary">Entrar</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    var div = document.createElement('div');
    div.innerHTML = loginHTML;
    document.body.appendChild(div.firstElementChild);
  }

  if (!document.getElementById('register-modal')) {
    var regHTML =
      '<div id="register-modal" class="modal-overlay">' +
        '<div class="modal-box">' +
          '<h3>Crear cuenta</h3>' +
          '<div class="modal-body">' +
            '<input type="text" id="register-username" placeholder="Nombre de usuario">' +
            '<input type="email" id="register-email" placeholder="Correo electr\u00f3nico">' +
            '<input type="password" id="register-password" placeholder="Contrase\u00f1a">' +
            '<input type="password" id="register-confirm" placeholder="Confirmar contrase\u00f1a">' +
            '<label class="checkbox-label"><input type="checkbox" id="register-notifications" checked> Acepto recibir notificaciones por correo</label>' +
            '<div class="google-divider"><span>o</span></div>' +
            '<button type="button" class="google-signin-btn">Crear cuenta con Google</button>' +
            '<button type="button" class="discord-signin-btn">Crear cuenta con Discord</button>' +
            '<p id="register-error" class="text-error"></p>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button id="register-cancel" class="btn btn-ghost">Cancelar</button>' +
            '<button id="register-login" class="btn btn-ghost" style="margin-right:auto">Iniciar sesi\u00f3n</button>' +
            '<button id="register-submit" class="btn btn-primary">Crear cuenta</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    var div2 = document.createElement('div');
    div2.innerHTML = regHTML;
    document.body.appendChild(div2.firstElementChild);
  }

  // Build notification compose modal
  if (!document.getElementById('notif-modal')) {
    var notifHTML =
      '<div id="notif-modal" class="modal-overlay">' +
        '<div class="modal-box">' +
          '<h3>Enviar notificaci\u00f3n</h3>' +
          '<div class="modal-body">' +
            '<p style="color:#8a9aaf;font-size:1.2rem">Se enviar\u00e1 a <strong id="notif-count">0</strong> usuario(s)</p>' +
            '<input type="text" id="notif-subject" placeholder="Asunto">' +
            '<textarea id="notif-message" placeholder="Mensaje" rows="6" class="notif-textarea"></textarea>' +
            '<p id="notif-result" class="text-error"></p>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button id="notif-cancel" class="btn btn-ghost">Cancelar</button>' +
            '<button id="notif-send" class="btn btn-primary">Copiar y enviar</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    var div3 = document.createElement('div');
    div3.innerHTML = notifHTML;
    document.body.appendChild(div3.firstElementChild);
  }

  // Event handlers
  document.getElementById('admin-btn')?.addEventListener('click', function () {
    if (currentUser) { logout(); if (typeof renderForum === 'function') renderForum(); return; }
    document.getElementById('login-modal').classList.add('open');
    document.getElementById('login-password').value = '';
    document.getElementById('login-username').value = '';
    document.getElementById('login-error').style.display = 'none';
  });

  document.getElementById('login-submit')?.addEventListener('click', async function () {
    var pwd = document.getElementById('login-password').value;
    var user = document.getElementById('login-username').value || 'Admin';
    var ok = await login(pwd, user);
    if (ok) {
      renderAdminUI(); if (typeof renderForum === 'function') renderForum(); closeModal('login-modal');
    } else {
      document.getElementById('login-error').style.display = 'block';
    }
  });

  document.getElementById('login-password')?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('login-submit').click();
  });

  document.getElementById('login-cancel')?.addEventListener('click', function () { closeModal('login-modal'); });

  document.getElementById('login-register')?.addEventListener('click', function () {
    closeModal('login-modal');
    document.getElementById('register-username').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-password').value = '';
    document.getElementById('register-confirm').value = '';
    document.getElementById('register-notifications').checked = true;
    document.getElementById('register-error').style.display = 'none';
    document.getElementById('register-modal').classList.add('open');
  });

  document.getElementById('register-submit')?.addEventListener('click', async function () {
    var username = document.getElementById('register-username').value.trim();
    var email = document.getElementById('register-email').value.trim();
    var password = document.getElementById('register-password').value;
    var confirm = document.getElementById('register-confirm').value;
    var notifications = document.getElementById('register-notifications').checked;
    var errorEl = document.getElementById('register-error');
    if (!username || username.length < 2) { errorEl.textContent = 'El usuario debe tener al menos 2 caracteres.'; errorEl.style.display = 'block'; return; }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { errorEl.textContent = 'Correo electr\u00f3nico no v\u00e1lido.'; errorEl.style.display = 'block'; return; }
    if (password.length < 4) { errorEl.textContent = 'La contrase\u00f1a debe tener al menos 4 caracteres.'; errorEl.style.display = 'block'; return; }
    if (password !== confirm) { errorEl.textContent = 'Las contrase\u00f1as no coinciden.'; errorEl.style.display = 'block'; return; }
    var regResult = await registerUser(username, password, email, notifications);
    if (regResult === 'username') { errorEl.textContent = 'El nombre de usuario ya est\u00e1 en uso.'; errorEl.style.display = 'block'; return; }
    if (regResult === 'email') { errorEl.textContent = 'El correo electr\u00f3nico ya est\u00e1 registrado.'; errorEl.style.display = 'block'; return; }
    if (regResult !== true) { errorEl.textContent = 'Error al crear la cuenta.'; errorEl.style.display = 'block'; return; }
    var ok = await login(password, username);
    if (ok) {
      renderAdminUI(); if (typeof renderForum === 'function') renderForum(); closeModal('register-modal');
    }
  });

  document.getElementById('register-cancel')?.addEventListener('click', function () { closeModal('register-modal'); });
  document.getElementById('register-login')?.addEventListener('click', function () {
    closeModal('register-modal');
    document.getElementById('login-password').value = '';
    document.getElementById('login-username').value = '';
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-modal').classList.add('open');
  });
  document.getElementById('register-password')?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('register-submit').click();
  });

  document.getElementById('notif-send')?.addEventListener('click', function () {
    var subject = document.getElementById('notif-subject').value.trim();
    var message = document.getElementById('notif-message').value.trim();
    if (!subject) { document.getElementById('notif-result').textContent = 'El asunto es obligatorio.'; document.getElementById('notif-result').style.display = 'block'; return; }
    if (!message) { document.getElementById('notif-result').textContent = 'El mensaje no puede estar vac\u00edo.'; document.getElementById('notif-result').style.display = 'block'; return; }
    sendNotification(subject, message);
    closeModal('notif-modal');
  });
  document.getElementById('notif-cancel')?.addEventListener('click', function () { closeModal('notif-modal'); });
  document.getElementById('notif-subject')?.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') document.getElementById('notif-message').focus();
  });

  document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('open'); });
  });

  // Init Google Sign-In
  if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
    if (document.querySelector('.google-signin-btn')) {
      var gScript = document.createElement('script');
      gScript.src = 'https://accounts.google.com/gsi/client';
      gScript.async = true;
      gScript.defer = true;
      gScript.onload = function () { initGoogleSignIn(); };
      document.head.appendChild(gScript);
    }
  }

  document.querySelectorAll('.discord-signin-btn').forEach(function (btn) {
    btn.addEventListener('click', startDiscordLogin);
  });
});
