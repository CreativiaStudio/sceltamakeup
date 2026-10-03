-- ==============================================================================
-- Scelta Makeup — Snapshot Forensi dei Dati Locali del Browser
-- File: supabase/migrations/20261003_device_snapshots.sql
--
-- Scopo: raccogliere le copie locali del browser dei dispositivi della boutique
-- (store admin in localStorage, storico audit, preferenze) per ricostruire da
-- remoto le modifiche al catalogo che non sono arrivate al cloud — es. quelle
-- fatte da Federica sul laptop salone YASHI.
--
-- Sicurezza: RLS abilitato SENZA alcuna policy. L'accesso è quindi consentito
-- esclusivamente alla service_role usata dalle API server-side; nessun accesso
-- anonimo o authenticated. La tabella è di sola raccolta (append-only).
-- ==============================================================================

create table if not exists public.scelta_device_snapshots (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  device text,
  operator text,
  user_agent text,
  page_url text,
  payload jsonb not null
);

alter table public.scelta_device_snapshots enable row level security;
