var SUPABASE_URL = 'https://qxorzwqxtakdtxehbsly.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4b3J6d3F4dGFrZHR4ZWhic2x5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MjY4MjksImV4cCI6MjA5NzEwMjgyOX0.VIxFh3innHtU2bpghtDnYtTDA9uWkSmHH7h5XPDtXqI';

var _supabase = null;
function getSupabase() {
  if (_supabase) return _supabase;
  _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false }
  });
  return _supabase;
}
