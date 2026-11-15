-- Student Profiles table and automatic Google OAuth / Email Auth trigger sync
-- Safe, idempotent migration preserving any already-saved student full_name.

create table if not exists public.student_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  auth_provider text not null default 'email',
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;

drop policy if exists "Students can read own profile" on public.student_profiles;
create policy "Students can read own profile"
  on public.student_profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "Students can update own profile" on public.student_profiles;
create policy "Students can update own profile"
  on public.student_profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_auth_user_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_display_name text;
  v_oauth_name text;
  v_resolved_name text;
  v_avatar text;
  v_provider text;
  v_verified boolean;
begin
  v_display_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'display_name', '')), '');
  v_oauth_name := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'full_name',
        new.raw_user_meta_data ->> 'name',
        ''
      )
    ),
    ''
  );
  v_resolved_name := coalesce(v_display_name, v_oauth_name, '');
  v_avatar := nullif(
    trim(
      coalesce(
        new.raw_user_meta_data ->> 'avatar_url',
        new.raw_user_meta_data ->> 'picture',
        ''
      )
    ),
    ''
  );
  v_provider := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  v_verified := (new.email_confirmed_at is not null)
    or coalesce((new.raw_user_meta_data ->> 'email_verified')::boolean, false);

  insert into public.student_profiles (
    id,
    email,
    full_name,
    avatar_url,
    auth_provider,
    email_verified,
    created_at,
    updated_at
  )
  values (
    new.id,
    lower(coalesce(new.email, '')),
    v_resolved_name,
    v_avatar,
    v_provider,
    v_verified,
    now(),
    now()
  )
  on conflict (id) do update
  set
    email = excluded.email,
    -- Never overwrite an existing non-empty student full_name on subsequent OAuth logins
    full_name = case
      when nullif(trim(public.student_profiles.full_name), '') is not null
        then public.student_profiles.full_name
      else excluded.full_name
    end,
    avatar_url = coalesce(excluded.avatar_url, public.student_profiles.avatar_url),
    auth_provider = excluded.auth_provider,
    email_verified = public.student_profiles.email_verified or excluded.email_verified,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_or_updated on auth.users;
create trigger on_auth_user_created_or_updated
  after insert or update on auth.users
  for each row
  execute function public.handle_auth_user_upsert();
