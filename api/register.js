const { createClient } = require('@supabase/supabase-js');

function hashPassword(pwd) {
  var h = 0;
  for (var i = 0; i < pwd.length; i++) { h = ((h << 5) - h) + pwd.charCodeAt(i); h |= 0; }
  return h;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Supabase no configurado.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { username, password, email, notifications } = req.body;

  if (!username || username.length < 2) {
    return res.status(400).json({ error: 'username', message: 'El usuario debe tener al menos 2 caracteres.' });
  }
  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'password', message: 'La contraseña debe tener al menos 4 caracteres.' });
  }

  const { data: existing } = await supabase
    .from('users')
    .select('username')
    .eq('username', username)
    .maybeSingle();

  if (existing) {
    return res.status(409).json({ error: 'username', message: 'El nombre de usuario ya está en uso.' });
  }

  if (email) {
    const { data: emailMatch } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .maybeSingle();

    if (emailMatch) {
      return res.status(409).json({ error: 'email', message: 'El correo electrónico ya está registrado.' });
    }
  }

  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
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
    })
    .select()
    .single();

  if (insertError) {
    return res.status(500).json({ error: 'server', message: 'Error al crear la cuenta.' });
  }

  res.status(201).json({
    success: true,
    user: {
      username: newUser.username,
      role: newUser.role || 'user',
      permissions: newUser.permissions || [],
    }
  });
};
