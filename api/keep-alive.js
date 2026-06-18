export default async function handler(req, res) {
  const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qxorzwqxtakdtxehbsly.supabase.co';
  const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4b3J6d3F4dGFrZHR4ZWhic2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MjY4MjksImV4cCI6MjA5NzEwMjgyOX0.VIxFh3innHtU2bpghtDnYtTDA9uWkSmHH7h5XPDtXqI';

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
