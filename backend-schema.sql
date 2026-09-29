-- Run once in a dedicated Supabase project. Invite tokens are stored hashed.
create extension if not exists pgcrypto with schema extensions;
create table public.trip_records (
  scope text primary key check (scope in ('group','jinxi','kitty','bing','yanye','azer','jing')),
  payload jsonb not null default '{}'::jsonb check (jsonb_typeof(payload)='object' and octet_length(payload::text)<1000000),
  revision bigint not null default 0,
  updated_at timestamptz not null default now()
);
create table public.trip_invites (
  member text primary key check (member in ('jinxi','kitty','bing','yanye','azer','jing')),
  token_hash text not null unique,
  enabled boolean not null default true
);
create table public.trip_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  member text not null references public.trip_invites(member),
  joined_at timestamptz not null default now()
);
create index trip_memberships_member_idx on public.trip_memberships(member);
alter table public.trip_records enable row level security;
alter table public.trip_invites enable row level security;
alter table public.trip_memberships enable row level security;
revoke all on public.trip_records,public.trip_invites,public.trip_memberships from anon,authenticated;
grant select on public.trip_records,public.trip_memberships to authenticated;
create policy own_membership on public.trip_memberships for select to authenticated using (user_id=(select auth.uid()));
create function public.trip_member() returns text language sql stable security definer set search_path='' as $$
  select m.member from public.trip_memberships m join public.trip_invites i on i.member=m.member and i.enabled where m.user_id=(select auth.uid());
$$;
revoke all on function public.trip_member() from public,anon;
grant execute on function public.trip_member() to authenticated;
create policy members_read_records on public.trip_records for select to authenticated using ((select public.trip_member()) is not null);
create function public.join_trip(invite_token text) returns text language plpgsql security definer set search_path='' as $$
declare chosen text;
begin
  if auth.uid() is null then raise exception 'Sign in first'; end if;
  if length(invite_token)<>64 then raise exception 'Invalid invitation'; end if;
  select member into chosen from public.trip_invites where enabled and token_hash=encode(extensions.digest(invite_token,'sha256'),'hex');
  if chosen is null then raise exception 'Invalid invitation'; end if;
  insert into public.trip_memberships(user_id,member) values(auth.uid(),chosen) on conflict(user_id) do update set member=excluded.member;
  return chosen;
end;
$$;
revoke all on function public.join_trip(text) from public,anon;
grant execute on function public.join_trip(text) to authenticated;
-- Compare-and-swap prevents two devices silently overwriting each other.
create function public.save_trip_record(record_scope text,expected_revision bigint,record_payload jsonb)
returns setof public.trip_records language plpgsql security definer set search_path='' as $$
declare who text;
begin
  who:=public.trip_member();
  if who is null or (record_scope<>'group' and record_scope<>who) then raise exception 'No edit permission'; end if;
  if jsonb_typeof(record_payload)<>'object' or octet_length(record_payload::text)>=1000000 then raise exception 'Invalid record'; end if;
  return query update public.trip_records set payload=record_payload,revision=revision+1,updated_at=now()
    where scope=record_scope and revision=expected_revision returning *;
end;
$$;
revoke all on function public.save_trip_record(text,bigint,jsonb) from public,anon;
grant execute on function public.save_trip_record(text,bigint,jsonb) to authenticated;
insert into public.trip_records(scope) values('group'),('jinxi'),('kitty'),('bing'),('yanye'),('azer'),('jing');
