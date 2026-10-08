begin;
create schema if not exists highst_filming_private;
revoke all on schema highst_filming_private from public;
grant usage on schema highst_filming_private to anon,authenticated;
create table highst_filming_private.access_key (id boolean primary key default true check(id), key_hash text not null);
create table highst_filming_private.records (
 id text primary key, kind text not null check(kind in ('phase','step')), payload jsonb not null,
 version integer not null default 1, updated_at timestamptz not null default now()
);
create table highst_filming_private.history (
 id bigint generated always as identity primary key, record_id text not null,
 before_record jsonb, saved_at timestamptz not null default now()
);
revoke all on all tables in schema highst_filming_private from public,anon,authenticated;
alter table highst_filming_private.access_key enable row level security;
alter table highst_filming_private.records enable row level security;
alter table highst_filming_private.history enable row level security;

-- Capability-based access: the random team key is never committed or broadcast.
-- These functions intentionally accept unauthenticated team links; Auth is not used.
create function highst_filming_private.require_key(p_key text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_key is null or length(p_key)<40 or not exists(
 select 1 from highst_filming_private.access_key where key_hash=encode(sha256(convert_to(p_key,'UTF8')),'hex')
 ) then raise exception 'TEAM_LINK_REQUIRED' using errcode='42501'; end if;
end;$$;
revoke all on function highst_filming_private.require_key(text) from public,anon,authenticated;

create function highst_filming_private.read_board(p_key text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 perform highst_filming_private.require_key(p_key);
 return coalesce((select jsonb_agg(to_jsonb(r) order by r.id) from highst_filming_private.records r),'[]'::jsonb);
end;$$;
revoke all on function highst_filming_private.read_board(text) from public;
grant execute on function highst_filming_private.read_board(text) to anon,authenticated;

create function highst_filming_private.save_record(p_key text,p_id text,p_kind text,p_payload jsonb,p_expected integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare saved highst_filming_private.records; previous highst_filming_private.records;
begin
 perform highst_filming_private.require_key(p_key);
 if p_kind not in ('phase','step') or p_kind is null or length(p_id) not between 1 and 120 or p_id is null then raise exception 'INVALID_RECORD'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or p_payload->>'id' is distinct from p_id or octet_length(p_payload::text)>300000 then raise exception 'INVALID_PAYLOAD'; end if;
 if jsonb_typeof(p_payload->'order') is distinct from 'number' then raise exception 'INVALID_ORDER'; end if;
 perform pg_advisory_xact_lock(18764219);
 if p_kind='phase' then
   if coalesce(length(trim(p_payload->>'name')),0) not between 1 and 100 then raise exception 'INVALID_PHASE'; end if;
   if coalesce((p_payload->>'deleted')::boolean,false) and exists(select 1 from highst_filming_private.records r where r.kind='step' and r.payload->>'phaseId'=p_id) then raise exception 'PHASE_NOT_EMPTY'; end if;
 else
   if coalesce(length(trim(p_payload->>'title')),0) not between 1 and 160 then raise exception 'INVALID_TITLE'; end if;
   if p_payload->>'status' is null or p_payload->>'status' not in ('draft','working','reviewed') then raise exception 'INVALID_STATUS'; end if;
   if jsonb_typeof(p_payload->'fields') is distinct from 'object' or jsonb_typeof(p_payload->'na') is distinct from 'array' then raise exception 'INVALID_FIELDS'; end if;
   if exists(select 1 from jsonb_each(p_payload->'fields') where jsonb_typeof(value)<>'string') then raise exception 'INVALID_FIELD_VALUE'; end if;
   if not exists(select 1 from highst_filming_private.records p where p.kind='phase' and p.id=p_payload->>'phaseId' and not coalesce((p.payload->>'deleted')::boolean,false)) then raise exception 'PHASE_NOT_FOUND'; end if;
 end if;
 select * into previous from highst_filming_private.records where id=p_id;
 if p_expected=0 then
   if found then raise exception 'EDIT_CONFLICT'; end if;
   insert into highst_filming_private.records(id,kind,payload) values(p_id,p_kind,p_payload) returning * into saved;
 else
   if previous.version is distinct from p_expected or previous.kind is distinct from p_kind then raise exception 'EDIT_CONFLICT'; end if;
   update highst_filming_private.records set payload=p_payload,version=version+1,updated_at=clock_timestamp() where id=p_id returning * into saved;
 end if;
 insert into highst_filming_private.history(record_id,before_record) values(p_id,to_jsonb(previous));
 -- Only a refresh signal is public. Filming notes are fetched through the key check.
 perform realtime.send('{"refresh":true}'::jsonb,'changed','highst-filming-refresh',false);
 return to_jsonb(saved);
end;$$;
revoke all on function highst_filming_private.save_record(text,text,text,jsonb,integer) from public;
grant execute on function highst_filming_private.save_record(text,text,text,jsonb,integer) to anon,authenticated;

create function public.highst_filming_read(p_key text) returns jsonb
language sql security invoker set search_path='' as $$ select highst_filming_private.read_board(p_key); $$;
create function public.highst_filming_save(p_key text,p_id text,p_kind text,p_payload jsonb,p_expected integer) returns jsonb
language sql security invoker set search_path='' as $$ select highst_filming_private.save_record(p_key,p_id,p_kind,p_payload,p_expected); $$;
revoke all on function public.highst_filming_read(text) from public;
revoke all on function public.highst_filming_save(text,text,text,jsonb,integer) from public;
grant execute on function public.highst_filming_read(text) to anon,authenticated;
grant execute on function public.highst_filming_save(text,text,text,jsonb,integer) to anon,authenticated;
commit;
