-- Run in the dashboard SQL editor, never as a public client.
-- Generates one private invite per person. Re-running rotates all links.
-- Existing sessions remain authorized; set enabled=false to revoke a member.
with generated as (
  select member,encode(extensions.gen_random_bytes(32),'hex') token
  from (values ('jinxi'),('kitty'),('bing'),('yanye'),('azer'),('jing')) m(member)
), saved as (
  insert into public.trip_invites(member,token_hash)
  select member,encode(extensions.digest(token,'sha256'),'hex') from generated
  on conflict(member) do update set token_hash=excluded.token_hash,enabled=true
  returning member
)
select g.member,'https://yuandong1998.github.io/thailand-trip-2026/#invite='||g.token as private_invitation
from generated g join saved s using(member);
