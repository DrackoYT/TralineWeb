export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({ status: 'error', message: 'Supabase no configurado. Define SUPABASE_URL y SUPABASE_ANON_KEY en las variables de entorno de Vercel.' });
  }

  try {
    var response = await fetch(SUPABASE_URL + '/rest/v1/entries?select=id&limit=1', {
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: 'Bearer ' + SUPABASE_ANON_KEY
      }
    });

    if (!response.ok) {
      var text = await response.text();
      return res.status(500).json({ status: 'error', message: text });
    }

    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (e) {
    res.status(500).json({ status: 'error', message: e.message });
  }
}
