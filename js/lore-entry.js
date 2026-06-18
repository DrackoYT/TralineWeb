document.addEventListener('DOMContentLoaded', function () {
  var params = new URLSearchParams(window.location.search);
  var id = parseInt(params.get('id'), 10);
  if (!id) {
    document.getElementById('entry-container').innerHTML = '<div class="forum-empty"><p class="forum-empty-text">Entrada no encontrada.</p></div>';
    return;
  }
  getEntries().then(function (entries) {
    var entry = entries.find(function (e) { return e.id === id; });
    if (!entry) {
      document.getElementById('entry-container').innerHTML = '<div class="forum-empty"><p class="forum-empty-text">Entrada no encontrada.</p></div>';
      return;
    }
    document.title = escapeHtml(entry.title) + ' \u2014 Traline';
    document.getElementById('entry-title').textContent = escapeHtml(entry.title);
    renderEntry(entry);
  });
  var saveBtn = document.getElementById('editor-save');
  if (saveBtn) {
    saveBtn.addEventListener('click', function () {
      if (!document.getElementById('editor-modal').classList.contains('open')) {
        location.reload();
      }
    });
  }
});

function renderEntry(entry) {
  var container = document.getElementById('entry-container');
  var html =
    '<div style="background:#0e141b;border:1px solid #1a2430;border-radius:8px;padding:2.4rem">' +
      '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:2rem;flex-wrap:wrap">' +
        '<span class="forum-card-badge" style="background:' + catColor(entry.category) + '1a;color:' + catColor(entry.category) + '">' + escapeHtml(entry.category) + '</span>' +
        '<span style="font-size:1.1rem;color:#5a6a7a">' + formatDate(entry.created_at) + '</span>' +
        (entry.updated_at !== entry.created_at ? '<span style="font-size:1rem;color:#5a6a7a">(editado ' + formatDate(entry.updated_at) + ')</span>' : '') +
        '<span style="font-size:1.1rem;color:#8a9aaf;margin-left:auto">por <span class="author-link" data-author="' + escapeHtml(entry.author) + '" style="cursor:pointer;color:#9ec5ff">' + escapeHtml(entry.author) + '</span></span>' +
      '</div>' +
      '<h2 style="font-size:2rem;color:#e8edf2;margin:0 0 2rem;font-weight:600">' + escapeHtml(entry.title) + '</h2>' +
      '<div class="entry-body">' + sanitizeHTML(entry.content) + '</div>' +
      (currentUser && (hasPermission('manage_entries') || entry.author === currentUser) ? '<div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #1a2430;display:flex;gap:1rem">' +
        '<button class="btn btn-sm btn-edit" id="entry-edit-btn">Editar</button>' +
        '<button class="btn btn-sm btn-delete" id="entry-delete-btn">Eliminar</button>' +
      '</div>' : '') +
    '</div>';
  container.innerHTML = html;
  container.querySelector('.author-link')?.addEventListener('click', function () {
    openProfileView(this.dataset.author);
  });
  document.getElementById('entry-edit-btn')?.addEventListener('click', function () {
    openEditor(entry.id);
  });
  document.getElementById('entry-delete-btn')?.addEventListener('click', function () {
    if (!confirm('\u00bfEliminar esta entrada?')) return;
    getEntries().then(function (all) {
      var e = all.find(function (x) { return x.id === entry.id; });
      if (!e) return;
      if (!hasPermission('manage_entries') && e.author !== currentUser) return;
      var sb = getSupabase();
      sb.from('entries').delete().eq('id', entry.id).then(function () {
        window.location.href = '/lore.html';
      });
    });
  });
}
