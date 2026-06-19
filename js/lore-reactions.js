var REACTION_EMOJIS = ['👍', '❤️', '😄', '😮', '😢', '😡'];

async function getReactions(entryId, commentId) {
  var sb = getSupabase();
  var query = sb.from('reactions').select('*');
  if (entryId) query = query.eq('entry_id', entryId);
  if (commentId) query = query.eq('comment_id', commentId);
  var { data } = await query;
  return data || [];
}

async function toggleReaction(entryId, commentId, emoji) {
  if (!currentUser) { alert('Debes iniciar sesión para reaccionar.'); return false; }
  var sb = getSupabase();
  var query = sb.from('reactions').select('id');
  if (entryId) query = query.eq('entry_id', entryId);
  if (commentId) query = query.eq('comment_id', commentId);
  query = query.eq('username', currentUser).eq('emoji', emoji);
  var { data: existing } = await query.maybeSingle();
  if (existing) {
    await sb.from('reactions').delete().eq('id', existing.id);
  } else {
    await sb.from('reactions').insert({
      entry_id: entryId || null,
      comment_id: commentId || null,
      username: currentUser,
      emoji: emoji
    });
  }
  return true;
}

function renderReactions(container, entryId, commentId, reactions) {
  var counts = {};
  var users = {};
  REACTION_EMOJIS.forEach(function (e) {
    counts[e] = 0;
    users[e] = [];
  });
  reactions.forEach(function (r) {
    if (counts[r.emoji] !== undefined) {
      counts[r.emoji]++;
      users[r.emoji].push(r.username);
    }
  });

  var html = '<div class="reactions-bar">';
  REACTION_EMOJIS.forEach(function (e) {
    var active = currentUser && users[e].indexOf(currentUser) !== -1;
    html += '<button class="reaction-btn' + (active ? ' active' : '') + '" data-emoji="' + e + '" title="' + escapeHtml(users[e].join(', ')) + '">' +
      e + ' <span class="reaction-count">' + (counts[e] || '') + '</span></button>';
  });
  html += '</div>';
  container.innerHTML = html;

  container.querySelectorAll('.reaction-btn').forEach(function (btn) {
    btn.addEventListener('click', async function () {
      var emoji = this.dataset.emoji;
      var changed = await toggleReaction(entryId, commentId, emoji);
      if (changed) {
        var updated = await getReactions(entryId, commentId);
        renderReactions(container, entryId, commentId, updated);
      }
    });
  });
}
