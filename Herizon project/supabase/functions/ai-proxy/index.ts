// Supabase Edge Function: authenticated chat/summary proxy. Deploy: supabase functions deploy ai-proxy
// Secrets: AI_API_URL, AI_API_KEY, AI_MODEL  (supabase secrets set ...)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SAFETY = `You are HerHealth's assistant for general health education and summarising the user's own records.
Never diagnose, never prescribe or change medicines/doses, never claim a report proves a diagnosis, never invent clinical findings,
never reassure about possible emergencies. For chest pain, trouble breathing, stroke signs, heavy bleeding, fainting, or severe sudden symptoms,
tell the user to call emergency services (112 in India) now. Encourage discussing results with a clinician. Be concise and warm.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const supa = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return json({ error: 'Unauthorized' }, 401);

  const apiUrl = Deno.env.get('AI_API_URL'); const key = Deno.env.get('AI_API_KEY');
  if (!apiUrl || !key) return json({ error: 'AI provider not configured on the server.' }, 503);

  let body: any;
  try { body = await req.json(); } catch { return json({ error: 'Invalid JSON' }, 400); }
  const messages = Array.isArray(body.messages) ? body.messages.slice(-20) : [];
  if (!messages.length || messages.some((m: any) => !['user', 'assistant'].includes(m.role) || typeof m.content !== 'string' || m.content.length > 4000))
    return json({ error: 'Invalid messages' }, 400);

  const r = await fetch(`${apiUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: Deno.env.get('AI_MODEL') ?? 'llama-3.3-70b-versatile',
      temperature: 0.2,
      messages: [{ role: 'system', content: SAFETY + (body.system ? `\n${String(body.system).slice(0, 2000)}` : '') }, ...messages],
      ...(body.json ? { response_format: { type: 'json_object' } } : {}),
    }),
  });
  if (!r.ok) return json({ error: `AI provider error (${r.status})` }, 502);
  const data = await r.json();
  return json({ content: data.choices?.[0]?.message?.content ?? '' });
});
