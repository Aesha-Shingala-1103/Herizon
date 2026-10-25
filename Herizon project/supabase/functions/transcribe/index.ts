// Supabase Edge Function: authenticated speech-to-text proxy (Whisper-compatible API).
// Secrets: WHISPER_API_URL, WHISPER_API_KEY, WHISPER_MODEL
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' };
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);
  const url = Deno.env.get('WHISPER_API_URL'); const key = Deno.env.get('WHISPER_API_KEY');
  if (!url || !key) return json({ error: 'Speech service not configured on the server.' }, 503);

  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0 || file.size > 10_000_000) return json({ error: 'Invalid audio file' }, 400);
  const out = new FormData();
  out.append('file', file, file.name || 'speech.m4a');
  out.append('model', Deno.env.get('WHISPER_MODEL') ?? 'whisper-large-v3');
  out.append('response_format', 'json');
  out.append('temperature', '0');
  const lang = form.get('language'); if (lang === 'en' || lang === 'hi') out.append('language', String(lang));
  out.append('prompt', 'Health logging: blood pressure 120 over 80, blood sugar, headache, sleep hours, medicine, appointment. English, Hindi, Hinglish.');
  const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: out });
  if (!r.ok) return json({ error: `Transcription provider error (${r.status})` }, 502);
  const d = await r.json();
  return json({ text: String(d.text ?? '').trim() });
});
