var ADMIN_TABS = [
  { id: 'dashboard', icon: '', label: 'Dashboard' },
  { id: 'users', icon: '', label: 'Usuarios' },
  { id: 'entries', icon: '', label: 'Entradas' },
  { id: 'notifications', icon: '', label: 'Notificaciones' }
];
var adminActiveTab = 'dashboard';

var PERM_LABELS = {
  manage_users: 'Usuarios',
  manage_entries: 'Entradas',
  manage_notifications: 'Notificaciones',
  manage_admins: 'Admins'
};

document.addEventListener('DOMContentLoaded', function () {
  if (!isCurrentUserAdmin()) {
    document.getElementById('admin-content').innerHTML = '<div class="forum-empty"><p class="forum-empty-text">Acceso denegado. Debes ser administrador.</p></div>';
    return;
  }
  renderAdminTabs();
  renderAdminSection('dashboard');
  document.getElementById('notif-send')?.addEventListener('click', function () {
    var subject = document.getElementById('notif-subject').value.trim();
    var message = document.getElementById('notif-message').value.trim();
    if (!subject) { document.getElementById('notif-result').textContent = 'El asunto es obligatorio.'; document.getElementById('notif-result').style.display = 'block'; return; }
    if (!message) { document.getElementById('notif-result').textContent = 'El mensaje no puede estar vac\u00edo.'; document.getElementById('notif-result').style.display = 'block'; return; }
    sendNotification(subject, message);
    closeModal('notif-modal');
  });
  document.getElementById('notif-cancel')?.addEventListener('click', function () { closeModal('notif-modal'); });
});

function renderAdminTabs() {
  var container = document.getElementById('admin-tabs');
  if (!container) return;
  container.innerHTML = '';
  ADMIN_TABS.forEach(function (tab) {
    if (tab.id === 'users' && !hasPermission('manage_users') && !hasPermission('manage_admins')) return;
    if (tab.id === 'entries' && !hasPermission('manage_entries')) return;
    if (tab.id === 'notifications' && !hasPermission('manage_notifications')) return;
    var btn = document.createElement('button');
    btn.className = 'admin-tab' + (tab.id === adminActiveTab ? ' active' : '');
    btn.dataset.tab = tab.id;
    btn.textContent = tab.icon + ' ' + tab.label;
    btn.addEventListener('click', function () {
      adminActiveTab = this.dataset.tab;
      renderAdminTabs();
      renderAdminSection(adminActiveTab);
    });
    container.appendChild(btn);
  });
}

function renderAdminSection(tabId) {
  var container = document.getElementById('admin-content');
  if (!container) return;
  switch (tabId) {
    case 'dashboard': renderDashboard(container); break;
    case 'users': renderUsers(container); break;
    case 'entries': renderEntries(container); break;
    case 'notifications': renderNotifications(container); break;
  }
}

async function renderDashboard(container) {
  var users = await getUsers();
  var entries = await getEntries();
  var catCounts = {};
  var CATS = { General: '#5dade2', Normativa: '#f0c040', Lore: '#9b59b6', 'Q&A': '#58d68d' };
  entries.forEach(function (e) { catCounts[e.category] = (catCounts[e.category] || 0) + 1; });
  var recentUsers = users.slice(-5).reverse();

  var html =
    '<div class="admin-stats-grid">' +
      '<div class="admin-stat-card"><div class="admin-stat-value">' + users.length + '</div><div class="admin-stat-label">Usuarios</div></div>' +
      '<div class="admin-stat-card"><div class="admin-stat-value">' + entries.length + '</div><div class="admin-stat-label">Entradas</div></div>' +
      Object.keys(CATS).map(function (c) {
        var count = catCounts[c] || 0;
        return '<div class="admin-stat-card"><div class="admin-stat-value" style="color:' + CATS[c] + '">' + count + '</div><div class="admin-stat-label">' + c + '</div></div>';
      }).join('') +
    '</div>' +
    '<h3 style="color:#e8edf2;margin:2rem 0 1rem;font-size:1.5rem;font-weight:500">\u00daltimos usuarios registrados</h3>' +
    (recentUsers.length ? '<table class="admin-table"><thead><tr><th>Usuario</th><th>Email</th><th>Fecha</th></tr></thead><tbody>' +
      recentUsers.map(function (u) {
        return '<tr><td><span class="admin-user-icon">' + escapeHtml(u.icon || u.username.charAt(0).toUpperCase()) + '</span> ' + escapeHtml(u.username) + '</td><td>' + escapeHtml(u.email || '-') + '</td><td>' + formatDate(u.created_at) + '</td></tr>';
      }).join('') + '</tbody></table>' : '<p style="color:#5a6a7a">No hay usuarios registrados.</p>');
  container.innerHTML = html;
}

async function renderUsers(container) {
  var users = await getUsers();
  var canManage = hasPermission('manage_admins');
  var admins = users.filter(function (u) { return u.role === 'admin'; });
  var adminSection = '';
  if (canManage) {
    adminSection = '<div class="admin-admins-section" id="admin-admins-section">' +
      '<h3 style="color:#e8edf2;margin:0 0 1rem;font-size:1.5rem;font-weight:500">Administradores</h3>' +
      buildAdminList(admins) +
      '</div>';
  } else if (admins.length) {
    adminSection = '<div class="admin-admins-section">' +
      '<h3 style="color:#e8edf2;margin:0 0 1rem;font-size:1.5rem;font-weight:500">Administradores</h3>' +
      '<table class="admin-table"><thead><tr><th>Usuario</th><th>Permisos</th></tr></thead><tbody>' +
      admins.map(function (u) {
        var perms = (u.permissions && u.permissions.length) ? u.permissions.map(function (p) { return '<span class="admin-perm-badge">' + (PERM_LABELS[p] || p) + '</span>'; }).join('') : '<span style="color:#5a6a7a">sin permisos</span>';
        return '<tr><td><span class="admin-user-icon" style="color:#d4a840">' + escapeHtml(u.icon || u.username.charAt(0).toUpperCase()) + '</span> ' + escapeHtml(u.username) + '</td><td>' + perms + '</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  var html =
    adminSection +
    '<div class="admin-search-bar"><input type="text" id="admin-user-search" placeholder="Buscar usuario..." class="admin-search-input"></div>' +
    '<div id="admin-user-table-wrap">' + buildUserTable(users, '', canManage) + '</div>';
  container.innerHTML = html;
  document.getElementById('admin-user-search')?.addEventListener('input', async function () {
    var allUsers = await getUsers();
    document.getElementById('admin-user-table-wrap').innerHTML = buildUserTable(allUsers, this.value, canManage);
  });
}

function buildAdminList(admins) {
  if (!admins.length) return '<p style="color:#5a6a7a;margin-bottom:1.5rem">No hay administradores.</p>';
  return '<table class="admin-table" id="admin-admin-table"><thead><tr><th>Usuario</th><th>Permisos</th><th>Acciones</th></tr></thead><tbody>' +
    admins.map(function (u) {
      var perms = ALL_PERMS.map(function (p) {
        var checked = u.permissions && u.permissions.indexOf(p) !== -1;
        return '<label class="admin-perm-toggle' + (checked ? ' active' : '') + '" data-perm="' + p + '" data-user="' + escapeHtml(u.username) + '">' +
          '<input type="checkbox" ' + (checked ? 'checked' : '') + '>' + (PERM_LABELS[p] || p) + '</label>';
      }).join('');
      var isSelf = u.username === currentUser;
      return '<tr>' +
        '<td><span class="admin-user-icon" style="color:#d4a840">' + escapeHtml(u.icon || u.username.charAt(0).toUpperCase()) + '</span> ' + escapeHtml(u.username) + '</td>' +
        '<td>' + perms + '</td>' +
        '<td class="admin-actions-cell">' +
          (isSelf ? '' : '<button class="btn btn-sm btn-delete admin-action-btn" data-action="demote" data-user="' + escapeHtml(u.username) + '">Quitar admin</button>') +
        '</td></tr>';
    }).join('') + '</tbody></table>';
}

function buildUserTable(users, query, canManage) {
  var filtered = users;
  if (query) {
    var q = query.toLowerCase();
    filtered = users.filter(function (u) { return u.username.toLowerCase().indexOf(q) !== -1 || (u.email && u.email.toLowerCase().indexOf(q) !== -1); });
  }
  if (!filtered.length) return '<div class="forum-empty"><p class="forum-empty-text">' + (query ? 'No se encontraron usuarios.' : 'No hay usuarios registrados.') + '</p></div>';
  var rows = filtered.map(function (u) {
    var isSelf = u.username === currentUser;
    var isAdminUser = u.role === 'admin';
    var badge = isAdminUser ? '<span class="admin-badge-small" title="Administrador">A</span>' : '';
    var actions = '<button class="btn btn-sm btn-ghost admin-action-btn" data-action="view" data-user="' + escapeHtml(u.username) + '">Ver</button>';
    if (!isSelf) {
      if (isAdminUser && canManage) {
        actions += '<button class="btn btn-sm btn-delete admin-action-btn" data-action="demote" data-user="' + escapeHtml(u.username) + '">Quitar admin</button>';
      } else if (!isAdminUser && canManage) {
        actions += '<button class="btn btn-sm btn-ghost admin-action-btn" data-action="promote" data-user="' + escapeHtml(u.username) + '" style="color:#9ec5ff;border-color:#2a4a7a">Hacer admin</button>';
      }
      actions += '<button class="btn btn-sm btn-delete admin-action-btn" data-action="delete" data-user="' + escapeHtml(u.username) + '">Eliminar</button>';
    }
    return '<tr>' +
      '<td><span class="admin-user-icon' + (isAdminUser ? ' admin-icon-gold' : '') + '">' + escapeHtml(u.icon || u.username.charAt(0).toUpperCase()) + '</span> ' + escapeHtml(u.username) + badge + '</td>' +
      '<td>' + escapeHtml(u.email || '-') + '</td>' +
      '<td>' + formatDate(u.created_at) + '</td>' +
      '<td class="admin-actions-cell">' + actions + '</td></tr>';
  }).join('');
  return '<table class="admin-table"><thead><tr><th>Usuario</th><th>Email</th><th>Registro</th><th>Acciones</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

async function renderEntries(container) {
  var entries = await getEntries();
  var CATS = { General: '#5dade2', Normativa: '#f0c040', Lore: '#9b59b6', 'Q&A': '#58d68d' };
  var html =
    '<div class="admin-search-bar"><input type="text" id="admin-entry-search" placeholder="Buscar entrada..." class="admin-search-input"></div>' +
    '<div id="admin-entry-table-wrap">' + buildEntryTable(entries, '', CATS) + '</div>';
  container.innerHTML = html;
  document.getElementById('admin-entry-search')?.addEventListener('input', async function () {
    var allEntries = await getEntries();
    document.getElementById('admin-entry-table-wrap').innerHTML = buildEntryTable(allEntries, this.value, CATS);
  });
}

function buildEntryTable(entries, query, CATS) {
  var filtered = entries;
  if (query) {
    var q = query.toLowerCase();
    filtered = entries.filter(function (e) { return e.title.toLowerCase().indexOf(q) !== -1 || e.author.toLowerCase().indexOf(q) !== -1 || e.category.toLowerCase().indexOf(q) !== -1; });
  }
  if (!filtered.length) return '<div class="forum-empty"><p class="forum-empty-text">' + (query ? 'No se encontraron entradas.' : 'No hay entradas.') + '</p></div>';
  var rows = filtered.map(function (e) {
    return '<tr>' +
      '<td class="admin-entry-title">' + escapeHtml(e.title) + '</td>' +
      '<td>' + escapeHtml(e.author) + '</td>' +
      '<td><span class="forum-card-badge" style="background:' + (CATS[e.category] || '#8a9aaf') + '1a;color:' + (CATS[e.category] || '#8a9aaf') + ';font-size:0.9rem">' + escapeHtml(e.category) + '</span></td>' +
      '<td>' + formatDate(e.created_at) + '</td>' +
      '<td class="admin-actions-cell">' +
        '<button class="btn btn-sm btn-ghost admin-action-btn" data-action="view" data-id="' + e.id + '">Ver</button>' +
        '<button class="btn btn-sm btn-ghost admin-action-btn" data-action="edit" data-id="' + e.id + '">Editar</button>' +
        '<button class="btn btn-sm btn-delete admin-action-btn" data-action="delete" data-id="' + e.id + '">Eliminar</button>' +
      '</td></tr>';
  }).join('');
  return '<table class="admin-table"><thead><tr><th>T\u00edtulo</th><th>Autor</th><th>Categor\u00eda</th><th>Fecha</th><th>Acciones</th></tr></thead><tbody>' + rows + '</tbody></table>';
}

function renderNotifications(container) {
  getNotifiedUsers().then(function (notified) {
    var count = notified.length;
    var html =
      '<div class="admin-notif-section">' +
        '<p style="color:#8a9aaf;font-size:1.3rem;margin-bottom:1.5rem">Enviar un correo a todos los usuarios que tengan notificaciones activadas.</p>' +
        '<p style="color:#5a6a7a;font-size:1.2rem;margin-bottom:2rem">Usuarios receptores: <strong style="color:#e8edf2">' + count + '</strong></p>' +
        '<button class="btn btn-primary" id="admin-open-notif">Redactar notificaci\u00f3n</button>' +
      '</div>';
    container.innerHTML = html;
    document.getElementById('admin-open-notif')?.addEventListener('click', function () {
      if (!count) { alert('No hay usuarios registrados con correo y notificaciones activadas.'); return; }
      document.getElementById('notif-count').textContent = count;
      document.getElementById('notif-subject').value = '';
      document.getElementById('notif-message').value = '';
      document.getElementById('notif-result').style.display = 'none';
      document.getElementById('notif-modal').classList.add('open');
    });
  });
}

document.addEventListener('click', function (e) {
  var btn = e.target.closest('.admin-action-btn');
  if (btn) {
    e.preventDefault();
    var action = btn.dataset.action;
    if (btn.dataset.user) {
      var username = btn.dataset.user;
      if (action === 'view') {
        openProfileView(username);
      } else if (action === 'delete') {
        (async function () {
          if (!confirm('\u00bfEliminar al usuario "' + username + '"?')) return;
          var sb = getSupabase();
          await sb.from('users').delete().eq('username', username);
          renderAdminSection(adminActiveTab);
        })();
      } else if (action === 'promote') {
        (async function () {
          var sb = getSupabase();
          await sb.from('users').update({ role: 'admin', permissions: ['manage_entries'] }).eq('username', username);
          renderAdminSection(adminActiveTab);
        })();
      } else if (action === 'demote') {
        if (!confirm('\u00bfQuitar permisos de administrador a "' + username + '"?')) return;
        (async function () {
          var sb = getSupabase();
          await sb.from('users').update({ role: 'user', permissions: [] }).eq('username', username);
          renderAdminSection(adminActiveTab);
        })();
      }
    } else if (btn.dataset.id) {
      var id = parseInt(btn.dataset.id, 10);
      if (action === 'view') {
        window.location.href = '/entry.html?id=' + id;
      } else if (action === 'edit') {
        window.location.href = '/lore.html?edit=' + id;
      } else if (action === 'delete') {
        (async function () {
          if (!confirm('\u00bfEliminar esta entrada?')) return;
          var sb = getSupabase();
          await sb.from('entries').delete().eq('id', id);
          renderAdminSection(adminActiveTab);
        })();
      }
    }
    return;
  }

  var toggle = e.target.closest('.admin-perm-toggle');
  if (toggle) {
    e.preventDefault();
    (async function () {
      var perm = toggle.dataset.perm;
      var username = toggle.dataset.user;
      var sb = getSupabase();
      var { data: u } = await sb.from('users').select('*').eq('username', username).single();
      if (!u || !u.permissions) return;
      var idx = u.permissions.indexOf(perm);
      var newPerms = u.permissions.slice();
      if (idx === -1) { newPerms.push(perm); }
      else { newPerms.splice(idx, 1); }
      await sb.from('users').update({ permissions: newPerms }).eq('username', username);
      toggle.classList.toggle('active');
      var cb = toggle.querySelector('input[type=checkbox]');
      if (cb) cb.checked = idx === -1;
    })();
  }
});
