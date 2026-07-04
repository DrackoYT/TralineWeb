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
    return res.status(500).json({ error: 'Supabase no configurado. Define SUPABASE_URL y SUPABASE_SERVICE_KEY en las variables de entorno de Vercel.' });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  const hash = hashPassword(password);

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password_hash', hash)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: 'Error en la consulta' });
  }

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas' });
  }

  res.status(200).json({
    success: true,
    user: {
      username: user.username,
      role: user.role || 'user',
      permissions: user.permissions || [],
    }
  });
};
