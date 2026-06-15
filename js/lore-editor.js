var editingId = null;
var selectedCategory = 'General';

var CATEGORIES = [
  { id: 'General', icon: '', color: '#5dade2', desc: 'Discusión general y anuncios' },
  { id: 'Normativa', icon: '', color: '#f0c040', desc: 'Reglas y directrices del gremio' },
  { id: 'Lore', icon: '', color: '#9b59b6', desc: 'Historia, facciones y personajes' },
  { id: 'Q&A', icon: '', color: '#58d68d', desc: 'Preguntas y respuestas sobre el gremio' }
];

function createEntry(title, category, content) {
  var entries = getEntries();
  entries.unshift({
    id: Date.now(), title: title, category: category, content: content,
    author: currentUser, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  });
  saveEntries(entries);
  renderForum();
}

function updateEntry(id, title, category, content) {
  var entries = getEntries();
  var idx = entries.findIndex(function (e) { return e.id === id; });
  if (idx === -1) return;
  if (!isCurrentUserAdmin() && entries[idx].author !== currentUser) return;
  entries[idx].title = title;
  entries[idx].category = category;
  entries[idx].content = content;
  entries[idx].updatedAt = new Date().toISOString();
  saveEntries(entries);
  renderForum();
}

function deleteEntry(id) {
  if (!confirm('¿Eliminar esta entrada?')) return;
  var entries = getEntries();
  var entry = entries.find(function (e) { return e.id === id; });
  if (!entry) return;
  if (!isCurrentUserAdmin() && entry.author !== currentUser) return;
  saveEntries(entries.filter(function (e) { return e.id !== id; }));
  renderForum();
}

function entryExcerpt(html) {
  var div = document.createElement('div');
  div.innerHTML = html;
  var text = div.textContent || div.innerText || '';
  return text.substring(0, 120) + (text.length > 120 ? '...' : '');
}

function renderForum() {
  var container = document.getElementById('lore-forum');
  var tabsContainer = document.getElementById('category-tabs');
  if (!container || !tabsContainer) return;
  var entries = getEntries();

  tabsContainer.innerHTML = '';
  CATEGORIES.forEach(function (cat) {
    var tab = document.createElement('button');
    tab.className = 'category-tab' + (cat.id === selectedCategory ? ' active' : '');
    tab.dataset.cat = cat.id;
    tab.innerHTML = cat.icon + ' ' + cat.id;
    tab.addEventListener('click', function () {
      selectedCategory = this.dataset.cat;
      renderForum();
    });
    tabsContainer.appendChild(tab);
  });

  var actionsContainer = document.getElementById('forum-actions');
  if (actionsContainer) {
    actionsContainer.innerHTML = '';
    if (currentUser && (isCurrentUserAdmin() || selectedCategory === 'General')) {
      var addBtn = document.createElement('button');
      addBtn.className = 'category-add-btn';
      addBtn.textContent = '+ Nueva entrada';
      addBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        document.getElementById('editor-category').value = isCurrentUserAdmin() ? selectedCategory : 'General';
        openEditor(null);
      });
      actionsContainer.appendChild(addBtn);
    }
  }

  var catEntries = entries.filter(function (e) { return e.category === selectedCategory; });
  container.innerHTML = '';

  if (catEntries.length === 0) {
    var empty = document.createElement('div');
    empty.className = 'forum-empty';
    empty.innerHTML = '<p class="forum-empty-text">No hay entradas en ' + selectedCategory + ' aún.</p>';
    container.appendChild(empty);
    return;
  }

  catEntries.forEach(function (entry) {
    var card = document.createElement('div');
    card.className = 'forum-card';
    card.dataset.entryId = entry.id;
    card.innerHTML =
      '<div class="forum-card-body">' +
        '<h3 class="forum-card-title">' + escapeHtml(entry.title) + '</h3>' +
        '<p class="forum-card-excerpt">' + escapeHtml(entryExcerpt(entry.content)) + '</p>' +
        '<div class="forum-card-footer">' +
          '<span class="forum-card-author">por <span class="author-link" data-author="' + escapeHtml(entry.author) + '">' + escapeHtml(entry.author) + '</span></span>' +
          '<span class="forum-card-date">' + formatDate(entry.createdAt) + '</span>' +
          (entry.updatedAt !== entry.createdAt ? '<span class="forum-card-edited">editado</span>' : '') +
        '</div>' +
      '</div>';
    if (currentUser && (isCurrentUserAdmin() || entry.author === currentUser)) {
      var actions = document.createElement('div');
      actions.className = 'forum-card-actions';
      actions.innerHTML =
        '<button class="btn btn-sm btn-edit" data-id="' + entry.id + '">Editar</button>' +
        '<button class="btn btn-sm btn-delete" data-id="' + entry.id + '">Eliminar</button>';
      card.appendChild(actions);
    }
    container.appendChild(card);
  });

  document.querySelectorAll('#lore-forum .forum-card').forEach(function (card) {
    card.addEventListener('click', function (e) {
      if (e.target.closest('.btn') || e.target.closest('.author-link')) return;
      window.location.href = '/entry.html?id=' + parseInt(this.dataset.entryId);
    });
  });
  document.querySelectorAll('#lore-forum .btn-edit').forEach(function (btn) {
    btn.addEventListener('click', function (e) { e.stopPropagation(); openEditor(parseInt(this.dataset.id)); });
  });
  document.querySelectorAll('#lore-forum .btn-delete').forEach(function (btn) {
    btn.addEventListener('click', function (e) { e.stopPropagation(); deleteEntry(parseInt(this.dataset.id)); });
  });
  document.querySelectorAll('.author-link').forEach(function (link) {
    link.addEventListener('click', function (e) {
      e.stopPropagation();
      openProfileView(this.dataset.author);
    });
  });
}

function showEntry(id) {
  var entries = getEntries();
  var entry = entries.find(function (e) { return e.id === id; });
  if (!entry) return;
  var overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
  document.addEventListener('keydown', function handler(e) {
    if (e.key === 'Escape') { overlay.remove(); document.removeEventListener('keydown', handler); }
  });
  overlay.innerHTML =
    '<div class="modal-box modal-wide" style="max-width:80rem">' +
      '<div style="display:flex;align-items:center;gap:1rem;margin-bottom:2rem;flex-wrap:wrap">' +
        '<span class="forum-card-badge" style="background:' + catColor(entry.category) + '1a;color:' + catColor(entry.category) + '">' + entry.category + '</span>' +
        '<span style="font-size:1.1rem;color:#5a6a7a">' + formatDate(entry.createdAt) + '</span>' +
        '<span style="font-size:1.1rem;color:#8a9aaf;margin-left:auto">por <span class="author-link" data-author="' + escapeHtml(entry.author) + '" style="cursor:pointer;color:#9ec5ff">' + escapeHtml(entry.author) + '</span></span>' +
      '</div>' +
      '<h2 style="font-size:2rem;color:#e8edf2;margin:0 0 2rem;font-weight:600">' + escapeHtml(entry.title) + '</h2>' +
      '<div class="entry-body">' + sanitizeHTML(entry.content) + '</div>' +
      '<div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #1a2430;display:flex;gap:1rem">' +
        (currentUser && (isCurrentUserAdmin() || entry.author === currentUser) ? '<button class="btn btn-sm btn-edit" data-id="' + entry.id + '">Editar</button>' : '') +
        '<button class="btn btn-sm btn-ghost close-btn">Cerrar</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  requestAnimationFrame(function () { overlay.classList.add('open'); });
  overlay.querySelector('.close-btn')?.addEventListener('click', function () { overlay.remove(); });
  overlay.querySelector('.author-link')?.addEventListener('click', function () { openProfileView(this.dataset.author); });
  if (currentUser && (isCurrentUserAdmin() || entry.author === currentUser)) {
    overlay.querySelector('.btn-edit')?.addEventListener('click', function () {
      overlay.remove(); openEditor(parseInt(this.dataset.id));
    });
  }
}

function catColor(catId) {
  var c = CATEGORIES.find(function (c) { return c.id === catId; });
  return c ? c.color : '#8a9aaf';
}

function openEditor(id) {
  editingId = id || null;
  var modal = document.getElementById('editor-modal');
  var titleInput = document.getElementById('editor-title');
  var categorySelect = document.getElementById('editor-category');
  var contentInput = document.getElementById('editor-content');
  var modalTitle = document.getElementById('editor-modal-title');
  var isAdmin = isCurrentUserAdmin();

  if (id) {
    var entries = getEntries();
    var entry = entries.find(function (e) { return e.id === id; });
    if (!entry) return;
    modalTitle.textContent = 'Editar entrada';
    titleInput.value = entry.title;
    categorySelect.value = entry.category;
    contentInput.innerHTML = entry.content;
    categorySelect.style.display = isAdmin ? '' : 'none';
  } else {
    modalTitle.textContent = 'Nueva entrada';
    titleInput.value = '';
    contentInput.innerHTML = '';
    if (!isAdmin) {
      categorySelect.value = 'General';
      categorySelect.style.display = 'none';
    } else {
      categorySelect.style.display = '';
    }
  }
  modal.classList.add('open');
  titleInput.focus();
}

function initEditorToolbar() {
  var toolbar = document.getElementById('editor-toolbar');
  if (!toolbar) return;
  var btns = [
    { cmd: 'bold', icon: 'B', title: 'Negrita' },
    { cmd: 'italic', icon: 'I', title: 'Cursiva' },
    { cmd: 'underline', icon: 'U', title: 'Subrayado' },
    { type: 'sep' },
    { cmd: 'formatBlock', value: 'h3', icon: 'H', title: 'Encabezado' },
    { cmd: 'formatBlock', value: 'p', icon: 'P', title: 'Párrafo' },
    { type: 'sep' },
    { cmd: 'insertUnorderedList', icon: '\u2022', title: 'Lista' },
    { cmd: 'insertOrderedList', icon: '1.', title: 'Lista numerada' },
    { type: 'sep' },
    { cmd: 'insertHorizontalRule', icon: '\u2014', title: 'L\u00ednea' },
    { cmd: 'formatBlock', value: 'blockquote', icon: '"', title: 'Cita' }
  ];
  btns.forEach(function (b) {
    if (b.type === 'sep') {
      var s = document.createElement('span');
      s.className = 'toolbar-sep';
      toolbar.appendChild(s);
      return;
    }
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = b.icon;
    btn.title = b.title;
    btn.className = 'toolbar-btn';
    btn.addEventListener('click', function () {
      document.execCommand(b.cmd, false, b.value || null);
      document.getElementById('editor-content').focus();
    });
    toolbar.appendChild(btn);
  });
}

document.addEventListener('DOMContentLoaded', function () {
  renderForum();
  initEditorToolbar();
  var editParam = new URLSearchParams(window.location.search).get('edit');
  if (editParam) {
    var editId = parseInt(editParam, 10);
    if (editId) openEditor(editId);
  }

  document.getElementById('editor-cancel')?.addEventListener('click', function () { closeModal('editor-modal'); });
  document.getElementById('editor-save')?.addEventListener('click', function () {
    var title = document.getElementById('editor-title').value.trim();
    var category = document.getElementById('editor-category').value;
    var content = document.getElementById('editor-content').innerHTML.trim();
    if (!title) { alert('El título es obligatorio.'); return; }
    if (!content || content === '<br>') { alert('El contenido no puede estar vacío.'); return; }
    if (editingId) { updateEntry(editingId, title, category, content); }
    else { createEntry(title, category, content); }
    closeModal('editor-modal');
  });
});
