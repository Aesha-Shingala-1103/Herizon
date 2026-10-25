/**
 * Calls Supabase Edge Functions with the signed-in user's JWT.
 * AI / speech provider keys live ONLY in the Edge Function secrets, never in the app bundle.
 */
import { supabase, isSupabaseConfigured } from './supabase';

export type EdgeErrorKind = 'not_configured' | 'not_signed_in' | 'network' | 'server';

export class EdgeError extends Error {
  kind: EdgeErrorKind;
  constructor(kind: EdgeErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

export async function callEdgeFunction<T = any>(name: string, body: any, isForm = false): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new EdgeError('not_configured', 'Cloud services are not configured (set the Supabase variables in .env).');
  }
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new EdgeError('not_signed_in', 'Please sign in to use AI and voice transcription.');

  const base = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').replace(/\/$/, '');
  let res: Response;
  try {
    res = await fetch(`${base}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '',
        ...(isForm ? {} : { 'Content-Type': 'application/json' }),
      },
      body: isForm ? body : JSON.stringify(body),
    });
  } catch {
    throw new EdgeError('network', 'Could not reach the server. Check your connection and try again.');
  }
  if (!res.ok) {
    let detail = '';
    try { detail = (await res.json())?.error || ''; } catch {}
    throw new EdgeError('server', detail || `Service error (${res.status}).`);
  }
  return (await res.json()) as T;
}
