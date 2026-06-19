async function getComments(entryId) {
  var sb = getSupabase();
  var { data } = await sb.from('comments').select('*').eq('entry_id', entryId).order('created_at', { ascending: true });
  return data || [];
}

async function createComment(entryId, content) {
  var sb = getSupabase();
  var { error } = await sb.from('comments').insert({
    entry_id: entryId,
    author: currentUser,
    content: content
  });
  if (error) console.error('createComment error:', error);
}

async function deleteComment(commentId) {
  var sb = getSupabase();
  await sb.from('comments').delete().eq('id', commentId);
  await sb.from('reactions').delete().eq('comment_id', commentId);
}

function renderComments(container, entryId) {
  getComments(entryId).then(function (comments) {
    var html = '<div class="comments-section">';
    html += '<h3 class="comments-title">Comentarios (' + comments.length + ')</h3>';

    if (currentUser) {
      html += '<div class="comment-form">' +
        '<textarea class="comment-input" placeholder="Escribe un comentario..." rows="3"></textarea>' +
        '<button class="btn btn-primary btn-sm comment-submit">Enviar</button>' +
        '</div>';
    }

    if (comments.length === 0) {
      html += '<p class="forum-empty-text" style="margin-top:1.5rem">No hay comentarios aún.</p>';
    }

    comments.forEach(function (c) {
      var canDelete = hasPermission('manage_comments') || c.author === currentUser;
      html += '<div class="comment" data-id="' + c.id + '">' +
        '<div class="comment-header">' +
        '<span class="comment-author" data-author="' + escapeHtml(c.author) + '">' + escapeHtml(c.author) + '</span>' +
        '<span class="comment-date">' + formatDate(c.created_at) + '</span>' +
        (canDelete ? '<button class="btn btn-sm btn-delete comment-delete">Eliminar</button>' : '') +
        '</div>' +
        '<div class="comment-body">' + escapeHtml(c.content) + '</div>' +
        '<div class="comment-reactions" id="comment-reactions-' + c.id + '"></div>' +
        '</div>';
    });

    html += '</div>';
    container.innerHTML = html;

    comments.forEach(function (c) {
      var reactContainer = document.getElementById('comment-reactions-' + c.id);
      if (reactContainer) {
        getReactions(null, c.id).then(function (reactions) {
          renderReactions(reactContainer, null, c.id, reactions);
        });
      }
    });

    container.querySelectorAll('.comment-submit').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        var input = this.parentElement.querySelector('.comment-input');
        var text = input.value.trim();
        if (!text) return;
        await createComment(entryId, text);
        renderComments(container, entryId);
      });
    });

    container.querySelectorAll('.comment-delete').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        if (!confirm('\u00bfEliminar este comentario?')) return;
        var id = parseInt(this.closest('.comment').dataset.id, 10);
        await deleteComment(id);
        renderComments(container, entryId);
      });
    });

    container.querySelectorAll('.comment-author').forEach(function (el) {
      el.addEventListener('click', function () {
        openProfileView(this.dataset.author);
      });
    });
  });
}
