var editingId = null;
var selectedCategory = 'General';

var CATEGORIES = [
  { id: 'General', icon: '', color: '#5dade2', desc: 'Discusi\u00f3n general y anuncios' },
  { id: 'Normativa', icon: '', color: '#f0c040', desc: 'Reglas y directrices del gremio' },
  { id: 'Lore', icon: '', color: '#9b59b6', desc: 'Historia, facciones y personajes' },
  { id: 'Q&A', icon: '', color: '#58d68d', desc: 'Preguntas y respuestas sobre el gremio' }
];

async function createEntry(title, category, content) {
  var sb = getSupabase();
  var { error } = await sb.from('entries').insert({
    title: title,
    category: category,
    content: content,
    author: currentUser,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  });
  if (error) { console.error('createEntry error:', error); return; }
  renderForum();
}

async function updateEntry(id, title, category, content) {
  var sb = getSupabase();
  var entries = await getEntries();
  var entry = entries.find(function (e) { return e.id === id; });
  if (!entry) return;
  if (!hasPermission('manage_entries') && entry.author !== currentUser) return;
  var { error } = await sb.from('entries').update({
    title: title,
    category: category,
    content: content,
    updated_at: new Date().toISOString()
  }).eq('id', id);
  if (error) { console.error('updateEntry error:', error); return; }
  renderForum();
}

async function deleteEntry(id) {
  if (!confirm('\u00bfEliminar esta entrada?')) return;
  var entries = await getEntries();
  var entry = entries.find(function (e) { return e.id === id; });
  if (!entry) return;
  if (!hasPermission('manage_entries') && entry.author !== currentUser) return;
  var sb = getSupabase();
  var { error } = await sb.from('entries').delete().eq('id', id);
  if (error) { console.error('deleteEntry error:', error); return; }
  renderForum();
}

function entryExcerpt(html) {
  var div = document.createElement('div');
  div.innerHTML = html;
  var text = div.textContent || div.innerText || '';
  return text.substring(0, 120) + (text.length > 120 ? '...' : '');
}

async function renderForum() {
  var container = document.getElementById('lore-forum');
  var tabsContainer = document.getElementById('category-tabs');
  if (!container || !tabsContainer) return;
  var entries = await getEntries();

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
    if (currentUser && (hasPermission('manage_entries') || selectedCategory === 'General')) {
      var addBtn = document.createElement('button');
      addBtn.className = 'category-add-btn';
      addBtn.textContent = '+ Nueva entrada';
      addBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        document.getElementById('editor-category').value = hasPermission('manage_entries') ? selectedCategory : 'General';
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
    empty.innerHTML = '<p class="forum-empty-text">No hay entradas en ' + selectedCategory + ' a\u00fan.</p>';
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
          '<span class="forum-card-date">' + formatDate(entry.created_at) + '</span>' +
          (entry.updated_at !== entry.created_at ? '<span class="forum-card-edited">editado</span>' : '') +
        '</div>' +
      '</div>';
    if (currentUser && (hasPermission('manage_entries') || entry.author === currentUser)) {
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

async function showEntry(id) {
  var entries = await getEntries();
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
        '<span style="font-size:1.1rem;color:#5a6a7a">' + formatDate(entry.created_at) + '</span>' +
        '<span style="font-size:1.1rem;color:#8a9aaf;margin-left:auto">por <span class="author-link" data-author="' + escapeHtml(entry.author) + '" style="cursor:pointer;color:#9ec5ff">' + escapeHtml(entry.author) + '</span></span>' +
      '</div>' +
      '<h2 style="font-size:2rem;color:#e8edf2;margin:0 0 2rem;font-weight:600">' + escapeHtml(entry.title) + '</h2>' +
      '<div class="entry-body">' + sanitizeHTML(entry.content) + '</div>' +
      '<div style="margin-top:2rem;padding-top:1.5rem;border-top:1px solid #1a2430;display:flex;gap:1rem">' +
        (currentUser && (hasPermission('manage_entries') || entry.author === currentUser) ? '<button class="btn btn-sm btn-edit" data-id="' + entry.id + '">Editar</button>' : '') +
        '<button class="btn btn-sm btn-ghost close-btn">Cerrar</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  requestAnimationFrame(function () { overlay.classList.add('open'); });
  overlay.querySelector('.close-btn')?.addEventListener('click', function () { overlay.remove(); });
  overlay.querySelector('.author-link')?.addEventListener('click', function () { openProfileView(this.dataset.author); });
  if (currentUser && (hasPermission('manage_entries') || entry.author === currentUser)) {
    overlay.querySelector('.btn-edit')?.addEventListener('click', function () {
      overlay.remove(); openEditor(parseInt(this.dataset.id));
    });
  }
}

function catColor(catId) {
  var c = CATEGORIES.find(function (c) { return c.id === catId; });
  return c ? c.color : '#8a9aaf';
}

async function openEditor(id) {
  editingId = id || null;
  var modal = document.getElementById('editor-modal');
  var titleInput = document.getElementById('editor-title');
  var categorySelect = document.getElementById('editor-category');
  var contentInput = document.getElementById('editor-content');
  var modalTitle = document.getElementById('editor-modal-title');
  var isAdmin = hasPermission('manage_entries');

  if (id) {
    var entries = await getEntries();
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

  function sep() {
    var s = document.createElement('span');
    s.className = 'toolbar-sep';
    toolbar.appendChild(s);
  }

  function btn(cmd, html, title, value) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'toolbar-btn';
    b.title = title;
    b.innerHTML = html;
    b.addEventListener('click', function () {
      if (cmd === 'createLink') {
        var url = prompt('URL del enlace:');
        if (url) document.execCommand(cmd, false, url);
      } else if (cmd === 'insertImage') {
        var imgUrl = prompt('URL de la imagen:');
        if (imgUrl) document.execCommand(cmd, false, imgUrl);
      } else {
        document.execCommand(cmd, false, value || null);
      }
      document.getElementById('editor-content').focus();
    });
    toolbar.appendChild(b);
  }

  function colorPicker(html, title, cmd, defaultColor) {
    var label = document.createElement('label');
    label.className = 'toolbar-btn color-btn';
    label.title = title;
    label.innerHTML = html + '<span class="color-indicator" style="background:' + defaultColor + '"></span>';
    var input = document.createElement('input');
    input.type = 'color';
    input.value = defaultColor;
    input.className = 'color-picker';
    input.addEventListener('input', function () {
      document.execCommand(cmd, false, this.value);
      label.querySelector('.color-indicator').style.background = this.value;
      document.getElementById('editor-content').focus();
    });
    label.appendChild(input);
    toolbar.appendChild(label);
  }

  function fontSizeDropdown() {
    var select = document.createElement('select');
    select.className = 'toolbar-select';
    select.title = 'Tama\u00f1o de fuente';
    var sizes = [
      { label: 'Tama\u00f1o...', val: '' },
      { label: 'Muy peque\u00f1o', val: '1' },
      { label: 'Peque\u00f1o', val: '2' },
      { label: 'Normal', val: '3' },
      { label: 'Grande', val: '5' },
      { label: 'Muy grande', val: '7' }
    ];
    sizes.forEach(function (s) {
      var opt = document.createElement('option');
      opt.value = s.val;
      opt.textContent = s.label;
      select.appendChild(opt);
    });
    select.addEventListener('change', function () {
      if (!this.value) return;
      document.execCommand('fontSize', false, this.value);
      this.selectedIndex = 0;
      document.getElementById('editor-content').focus();
    });
    toolbar.appendChild(select);
  }

  // --- Build toolbar ---
  btn('bold', '<b>B</b>', 'Negrita');
  btn('italic', '<i>I</i>', 'Cursiva');
  btn('underline', '<u>U</u>', 'Subrayado');
  btn('strikeThrough', '<s>S</s>', 'Tachado');
  sep();

  btn('formatBlock', 'H1', 'Encabezado 1', 'h1');
  btn('formatBlock', 'H2', 'Encabezado 2', 'h2');
  btn('formatBlock', 'H3', 'Encabezado 3', 'h3');
  btn('formatBlock', 'P', 'P\u00e1rrafo', 'p');
  fontSizeDropdown();
  sep();

  colorPicker('A', 'Color de texto', 'foreColor', '#d8dde2');
  colorPicker('<span style="background:#ff0;color:#000;padding:1px 3px;border-radius:2px">A</span>', 'Resaltado', 'backColor', '#ffff00');
  sep();

  btn('justifyLeft', '\u25C2', 'Alinear izquierda');
  btn('justifyCenter', '\u25C6', 'Centrar');
  btn('justifyRight', '\u25B8', 'Alinear derecha');
  btn('justifyFull', '\u2B0C', 'Justificar');
  sep();

  btn('insertUnorderedList', '\u2022', 'Lista');
  btn('insertOrderedList', '1.', 'Lista numerada');
  sep();

  btn('createLink', '\u2B98', 'Insertar enlace');
  btn('insertImage', '\u229E', 'Insertar imagen');
  btn('insertHorizontalRule', '\u2014', 'L\u00ednea horizontal');
  sep();

  btn('formatBlock', '\u275E', 'Cita', 'blockquote');
  btn('formatBlock', '{ }', 'C\u00f3digo', 'pre');
  sep();

  btn('undo', '\u21A9', 'Deshacer');
  btn('redo', '\u21AA', 'Rehacer');
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
  document.getElementById('editor-save')?.addEventListener('click', async function () {
    var title = document.getElementById('editor-title').value.trim();
    var category = document.getElementById('editor-category').value;
    var content = document.getElementById('editor-content').innerHTML.trim();
    if (!title) { alert('El t\u00edtulo es obligatorio.'); return; }
    if (!content || content === '<br>') { alert('El contenido no puede estar vac\u00edo.'); return; }
    if (editingId) { await updateEntry(editingId, title, category, content); }
    else { await createEntry(title, category, content); }
    closeModal('editor-modal');
  });
});
