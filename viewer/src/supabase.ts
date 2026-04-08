/**
 * Supabase client for GitLaw
 *
 * Features:
 * - Auth (Magic Link, no passwords)
 * - User profiles (Jurist/Bürger)
 * - Annotations (notes per paragraph)
 * - Chat history
 * - Shared links (Mandanten-Sharing)
 * - Alert subscriptions
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = SUPABASE_URL
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null

export const isSupabaseConfigured = () => !!SUPABASE_URL

// ── Auth ──

export async function signInWithMagicLink(email: string) {
  if (!supabase) return { error: 'Supabase nicht konfiguriert' }
  const { error } = await supabase.auth.signInWithOtp({ email })
  return { error: error?.message }
}

export async function signOut() {
  if (!supabase) return
  await supabase.auth.signOut()
}

export async function getUser() {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

// ── Annotations (Notizen pro Paragraph) ──

export interface Annotation {
  id: string
  law_id: string
  section: string
  note_text: string
  created_at: string
}

export async function saveAnnotation(lawId: string, section: string, noteText: string) {
  if (!supabase) return null
  const user = await getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('annotations')
    .upsert({
      user_id: user.id,
      law_id: lawId,
      section,
      note_text: noteText,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,law_id,section' })
    .select()

  if (error) console.error('Save annotation error:', error)
  return data
}

export async function getAnnotations(lawId: string): Promise<Annotation[]> {
  if (!supabase) return []
  const user = await getUser()
  if (!user) return []

  const { data } = await supabase
    .from('annotations')
    .select('*')
    .eq('user_id', user.id)
    .eq('law_id', lawId)
    .order('created_at')

  return (data || []) as Annotation[]
}

// ── Shared Links (Mandanten-Sharing) ──

export async function createSharedLink(lawId: string, section: string, customNote?: string) {
  // Works WITHOUT Supabase — generates a URL with parameters
  const params = new URLSearchParams({
    law: lawId,
    section,
    ...(customNote ? { note: customNote } : {}),
  })
  return `${window.location.origin}${window.location.pathname}?share=${btoa(params.toString())}`
}

export function parseSharedLink(): { lawId: string; section: string; note?: string } | null {
  const url = new URL(window.location.href)
  const share = url.searchParams.get('share')
  if (!share) return null

  try {
    const params = new URLSearchParams(atob(share))
    return {
      lawId: params.get('law') || '',
      section: params.get('section') || '',
      note: params.get('note') || undefined,
    }
  } catch {
    return null
  }
}

// ── Chat History ──

export async function saveChatSession(persona: string, messages: { role: string; text: string }[]) {
  if (!supabase) return null
  const user = await getUser()
  if (!user) return null

  const title = messages.find(m => m.role === 'user')?.text.slice(0, 100) || 'Neue Konversation'

  const { data: session } = await supabase
    .from('chat_sessions')
    .insert({ user_id: user.id, persona, title })
    .select()
    .single()

  if (!session) return null

  const chatMessages = messages.map(m => ({
    session_id: session.id,
    role: m.role,
    content: m.text,
  }))

  await supabase.from('chat_messages').insert(chatMessages)
  return session.id
}

// ── Supabase SQL Schema (run this in Supabase SQL Editor) ──

export const SCHEMA_SQL = `
-- Enable RLS
alter table if exists public.annotations enable row level security;
alter table if exists public.chat_sessions enable row level security;
alter table if exists public.chat_messages enable row level security;
alter table if exists public.shared_links enable row level security;

-- Users profile (extends Supabase auth.users)
create table if not exists public.profiles (
  id uuid references auth.users(id) primary key,
  name text,
  role text default 'buerger' check (role in ('buerger', 'jurist', 'kanzlei', 'admin')),
  spezialisierung text[],
  kanzlei_name text,
  created_at timestamptz default now()
);

-- Annotations
create table if not exists public.annotations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  law_id text not null,
  section text not null,
  note_text text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, law_id, section)
);

-- Chat sessions
create table if not exists public.chat_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) not null,
  persona text,
  title text,
  created_at timestamptz default now()
);

-- Chat messages
create table if not exists public.chat_messages (
  id uuid default gen_random_uuid() primary key,
  session_id uuid references public.chat_sessions(id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  sources jsonb,
  created_at timestamptz default now()
);

-- Shared links
create table if not exists public.shared_links (
  id uuid default gen_random_uuid() primary key,
  created_by uuid references auth.users(id),
  law_id text not null,
  section text not null,
  custom_note text,
  expires_at timestamptz,
  view_count integer default 0,
  created_at timestamptz default now()
);

-- RLS Policies
create policy "Users can read own annotations" on annotations for select using (auth.uid() = user_id);
create policy "Users can insert own annotations" on annotations for insert with check (auth.uid() = user_id);
create policy "Users can update own annotations" on annotations for update using (auth.uid() = user_id);
create policy "Users can delete own annotations" on annotations for delete using (auth.uid() = user_id);

create policy "Users can read own sessions" on chat_sessions for select using (auth.uid() = user_id);
create policy "Users can insert own sessions" on chat_sessions for insert with check (auth.uid() = user_id);

create policy "Users can read own messages" on chat_messages for select
  using (session_id in (select id from chat_sessions where user_id = auth.uid()));
create policy "Users can insert own messages" on chat_messages for insert
  with check (session_id in (select id from chat_sessions where user_id = auth.uid()));

create policy "Anyone can read shared links" on shared_links for select using (true);
create policy "Users can create shared links" on shared_links for insert with check (auth.uid() = created_by);

-- Auto-create profile on signup
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
`;
