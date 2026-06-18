function catColor(catId) {
  var colors = { General: '#5dade2', Normativa: '#f0c040', Lore: '#9b59b6', 'Q&A': '#58d68d' };
  return colors[catId] || '#8a9aaf';
}

async function renderProfile(username) {
  var container = document.getElementById('profile-content');
  if (!container) return;
  container.innerHTML = '';

  if (!username) {
    container.innerHTML = '<div class="forum-empty"><p class="forum-empty-text">Usuario no especificado.</p></div>';
    return;
  }

  var profile = await getUserProfile(username);
  var allEntries = await getEntries();
  var userEntries = allEntries.filter(function (e) { return e.author === username; });
  var isOwnProfile = currentUser && currentUser === username;
  var isAdminUser = isCurrentUserAdmin();

  if (!profile && !isAdminUser) {
    container.innerHTML = '<div class="forum-empty"><p class="forum-empty-text">Usuario no encontrado.</p></div>';
    return;
  }

  var email = profile ? (profile.email || '') : '';
  var picture = profile ? (profile.picture || '') : '';
  var icon = profile ? (profile.icon || username.charAt(0).toUpperCase()) : username.charAt(0).toUpperCase();
  var bio = profile ? (profile.bio || '') : '';
  var joined = profile ? formatDate(profile.created_at) : '';

  var avatarHtml;
  if (picture) {
    avatarHtml = '<img src="' + escapeHtml(picture) + '" alt="" style="width:6rem;height:6rem;border-radius:50%;object-fit:cover;flex-shrink:0" onerror="this.style.display=\'none\'">';
  } else {
    avatarHtml = '<span style="width:6rem;height:6rem;border-radius:50%;background:#1a2a3a;display:flex;align-items:center;justify-content:center;font-size:3rem;flex-shrink:0">' + escapeHtml(icon) + '</span>';
  }

  var headerHtml =
    '<div style="max-width:64rem;margin:0 auto">' +
      '<div class="profile-card" style="background:#0e141b;border:1px solid #1a2430;border-radius:8px;padding:2.4rem;margin-bottom:2rem">' +
        '<div style="display:flex;align-items:center;gap:1.5rem;flex-wrap:wrap">' +
          avatarHtml +
          '<div style="flex:1;min-width:0">' +
            '<h1 style="font-size:2.2rem;color:#e8edf2;margin:0 0 0.2rem;font-weight:600">' + escapeHtml(username) + '</h1>' +
            '<div style="font-size:1.3rem;color:#7a8a9a">@' + escapeHtml(username) + (isAdminUser ? ' <span style="color:#d4a840">\u00b7 Admin</span>' : '') + '</div>' +
            (joined ? '<div style="font-size:1.1rem;color:#5a6a7a;margin-top:0.3rem">Miembro desde ' + joined + '</div>' : '') +
          '</div>' +
          (isOwnProfile ? '<button id="edit-profile-btn" class="btn btn-ghost">Editar perfil</button>' : '') +
          '<a href="/lore.html" class="btn btn-ghost">Volver al foro</a>' +
        '</div>' +
        (bio ? '<div style="font-size:1.3rem;color:#8a9aaf;margin-top:1.5rem;padding:1.2rem;background:#0b0f14;border-radius:6px;line-height:1.6">' + escapeHtml(bio) + '</div>' : '') +
      '</div>' +
      '<h2 style="font-size:1.5rem;color:#e8edf2;margin:0 0 1rem;font-weight:500">Entradas (' + userEntries.length + ')</h2>' +
      '<div class="lore-list" id="profile-entry-list"></div>' +
    '</div>';

  container.innerHTML = headerHtml;

  var listContainer = document.getElementById('profile-entry-list');
  if (userEntries.length === 0) {
    listContainer.innerHTML = '<div class="forum-empty"><p class="forum-empty-text">Este usuario no ha creado entradas a\u00fan.</p></div>';
  } else {
    userEntries.forEach(function (entry) {
      var card = document.createElement('div');
      card.className = 'forum-card';
      card.dataset.entryId = entry.id;
      card.innerHTML =
        '<div class="forum-card-body">' +
          '<div style="display:flex;align-items:center;gap:0.6rem;margin-bottom:0.3rem">' +
            '<span class="forum-card-badge" style="background:' + catColor(entry.category) + '1a;color:' + catColor(entry.category) + ';font-size:0.9rem">' + entry.category + '</span>' +
            '<span style="font-size:1rem;color:#5a6a7a">' + formatDate(entry.created_at) + '</span>' +
          '</div>' +
          '<h3 class="forum-card-title" style="font-size:1.35rem">' + escapeHtml(entry.title) + '</h3>' +
          '<p class="forum-card-excerpt">' + escapeHtml((function(html){var d=document.createElement('div');d.innerHTML=html;return (d.textContent||d.innerText||'').substring(0,100);})(entry.content)) + '</p>' +
        '</div>';
      listContainer.appendChild(card);
    });
    listContainer.querySelectorAll('.forum-card').forEach(function (card) {
      card.addEventListener('click', function () {
        window.location.href = '/lore.html?entry=' + this.dataset.entryId;
      });
    });
  }

  document.getElementById('edit-profile-btn')?.addEventListener('click', function () {
    document.getElementById('profile-email').value = email;
    document.getElementById('profile-icon').value = icon;
    document.getElementById('profile-bio').value = bio;
    document.getElementById('profile-notifications').checked = profile ? profile.notifications === true : false;
    document.getElementById('profile-edit-modal').classList.add('open');
  });
}

document.addEventListener('DOMContentLoaded', function () {
  var params = new URLSearchParams(window.location.search);
  var username = params.get('user');
  renderProfile(username);

  document.getElementById('profile-save')?.addEventListener('click', async function () {
    var em = document.getElementById('profile-email').value.trim();
    var ic = document.getElementById('profile-icon').value.trim();
    var bi = document.getElementById('profile-bio').value.trim();
    var nt = document.getElementById('profile-notifications').checked;
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) { alert('Correo electr\u00f3nico no v\u00e1lido.'); return; }
    if (!currentUser) return;
    await updateUserProfile(currentUser, {
      email: em,
      icon: ic || currentUser.charAt(0).toUpperCase(),
      bio: bi,
      notifications: nt
    });
    document.getElementById('profile-edit-modal').classList.remove('open');
    renderProfile(currentUser);
  });

  document.getElementById('profile-cancel')?.addEventListener('click', function () {
    document.getElementById('profile-edit-modal').classList.remove('open');
  });

  document.querySelectorAll('.modal-overlay').forEach(function (overlay) {
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.classList.remove('open'); });
  });
});
