begin;
-- Intentionally public, non-patient filming plan. No anonymous table access.
alter table highst_filming_private.history add column after_record jsonb;
alter table highst_filming_private.history add column operation text not null default 'edit';
create index filming_history_time on highst_filming_private.history(saved_at);
create index filming_history_record on highst_filming_private.history(record_id,id desc);
create table highst_filming_private.settings(id boolean primary key default true check(id), public_editing boolean not null default true);
insert into highst_filming_private.settings values(true,true);
alter table highst_filming_private.settings enable row level security;
revoke all on highst_filming_private.settings from public,anon,authenticated;
-- Preserve a recovery point before opening the board. Never writable by visitors.
insert into highst_filming_private.history(record_id,before_record,after_record,operation)
select id,to_jsonb(r),to_jsonb(r),'baseline' from highst_filming_private.records r;

create function highst_filming_private.plain_text(value text, max_chars integer) returns boolean
language sql immutable set search_path='' as $$
 select value is not null and length(value)<=max_chars
 and value !~ '<[[:space:]]*[/!]?[[:space:]]*[[:alpha:]]'
 and value !~* 'javascript[[:space:]]*:'
 and value !~ '[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]';
$$;
revoke all on function highst_filming_private.plain_text(text,integer) from public,anon,authenticated;

create function highst_filming_private.public_read() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(r) order by r.id),'[]'::jsonb) from highst_filming_private.records r;
$$;
revoke all on function highst_filming_private.public_read() from public;
grant execute on function highst_filming_private.public_read() to anon,authenticated;

create function highst_filming_private.public_save(p_id text,p_kind text,p_payload jsonb,p_expected integer) returns jsonb
language plpgsql security definer set search_path='' set lock_timeout='2s' as $$
declare previous highst_filming_private.records; saved highst_filming_private.records;
 clean jsonb; deleting boolean; stamp timestamptz:=clock_timestamp(); n_min integer; n_hour integer; n_day integer;
begin
 if not (select public_editing from highst_filming_private.settings where id) then raise sqlstate 'PT503' using message='EDITING_PAUSED'; end if;
 if p_kind is null or p_kind not in ('phase','step') or p_id is null or p_id !~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$' or p_expected is null or p_expected<0 then raise sqlstate 'PT400' using message='INVALID_RECORD'; end if;
 if jsonb_typeof(p_payload) is distinct from 'object' or jsonb_typeof(p_payload->'id') is distinct from 'string' or p_payload->>'id' is distinct from p_id or octet_length(p_payload::text)>20000 then raise sqlstate 'PT400' using message='INVALID_PAYLOAD'; end if;
 if jsonb_typeof(p_payload->'order') is distinct from 'number' or abs((p_payload->>'order')::numeric)>1000000 or jsonb_typeof(p_payload->'deleted') is distinct from 'boolean' then raise sqlstate 'PT400' using message='INVALID_ORDER'; end if;
 deleting:=(p_payload->>'deleted')::boolean;
 if p_kind='phase' then
   if exists(select 1 from jsonb_object_keys(p_payload) k where k<>all(array['id','name','order','deleted']))
    or jsonb_typeof(p_payload->'name') is distinct from 'string' or not highst_filming_private.plain_text(p_payload->>'name',100) or length(trim(p_payload->>'name'))=0 then raise sqlstate 'PT400' using message='INVALID_PHASE'; end if;
 else
   if exists(select 1 from jsonb_object_keys(p_payload) k where k<>all(array['id','phaseId','title','order','status','fields','deleted']))
    or jsonb_typeof(p_payload->'title') is distinct from 'string' or not highst_filming_private.plain_text(p_payload->>'title',160) or length(trim(p_payload->>'title'))=0
    or jsonb_typeof(p_payload->'phaseId') is distinct from 'string' or length(p_payload->>'phaseId')>80
    or coalesce(p_payload->>'status','') not in ('draft','working','reviewed') then raise sqlstate 'PT400' using message='INVALID_STEP'; end if;
   if jsonb_typeof(p_payload->'fields') is distinct from 'object' then raise sqlstate 'PT400' using message='INVALID_FIELDS'; end if;
   if exists(select 1 from jsonb_object_keys(p_payload->'fields') k where k<>'evidence') or jsonb_typeof(p_payload->'fields'->'evidence') is distinct from 'string'
    or not highst_filming_private.plain_text(p_payload->'fields'->>'evidence',4000) then raise sqlstate 'PT400' using message='INVALID_TEXT'; end if;
 end if;
 -- Serialize the version check and quotas; fail quickly instead of queuing a flood.
 if not pg_try_advisory_xact_lock(18764219) then raise sqlstate 'PT429' using message='RATE_LIMIT'; end if;
 select * into previous from highst_filming_private.records where id=p_id;
 if (p_expected=0 and previous.id is not null) or (p_expected>0 and (previous.version is distinct from p_expected or previous.kind is distinct from p_kind)) then raise sqlstate 'PT409' using message='EDIT_CONFLICT'; end if;
 if previous.id is null and deleting then raise sqlstate 'PT400' using message='INVALID_NEW_RECORD'; end if;
 if p_kind='phase' then
   if deleting and exists(select 1 from highst_filming_private.records where kind='step' and payload->>'phaseId'=p_id) then raise sqlstate 'PT400' using message='PHASE_NOT_EMPTY'; end if;
   if deleting and (select count(*) from highst_filming_private.records where kind='phase' and not coalesce((payload->>'deleted')::boolean,false))<=1 then raise sqlstate 'PT400' using message='LAST_PHASE'; end if;
   clean:=p_payload;
 else
   if not exists(select 1 from highst_filming_private.records where kind='phase' and id=p_payload->>'phaseId' and not coalesce((payload->>'deleted')::boolean,false)) then raise sqlstate 'PT400' using message='PHASE_NOT_FOUND'; end if;
   -- Disabled administrative fields cannot be edited via a handcrafted request.
   clean:=p_payload || jsonb_build_object('description',coalesce(previous.payload->>'description',''),'na',coalesce(previous.payload->'na','[]'::jsonb),'fields',coalesce(previous.payload->'fields','{}'::jsonb)||(p_payload->'fields'));
 end if;
 if previous.payload=clean then return to_jsonb(previous); end if;
 if previous.id is null and (select count(*) from highst_filming_private.records where kind=p_kind)>=(case when p_kind='phase' then 20 else 200 end) then raise sqlstate 'PT429' using message='BOARD_LIMIT'; end if;
 select count(*) filter(where saved_at>stamp-interval '1 minute'), count(*) filter(where saved_at>stamp-interval '1 hour'), count(*)
 into n_min,n_hour,n_day from highst_filming_private.history where saved_at>stamp-interval '1 day' and operation<>'baseline';
 if n_min>=60 or n_hour>=600 or n_day>=2000 or (select count(*) from highst_filming_private.history where record_id=p_id and saved_at>stamp-interval '1 minute' and operation<>'baseline')>=8 then raise sqlstate 'PT429' using message='RATE_LIMIT'; end if;
 if deleting and not coalesce((previous.payload->>'deleted')::boolean,false) and (select count(*) from highst_filming_private.history where operation='delete' and saved_at>stamp-interval '1 minute')>=5 then raise sqlstate 'PT429' using message='DELETE_RATE_LIMIT'; end if;
 if previous.id is null then
   insert into highst_filming_private.records(id,kind,payload) values(p_id,p_kind,clean) returning * into saved;
 else
   update highst_filming_private.records set payload=clean,version=version+1,updated_at=stamp where id=p_id returning * into saved;
 end if;
 insert into highst_filming_private.history(record_id,before_record,after_record,operation) values(p_id,case when previous.id is null then null else to_jsonb(previous) end,to_jsonb(saved),case when deleting then 'delete' else 'edit' end);
 perform realtime.send('{"refresh":true}'::jsonb,'changed','highst-filming-refresh',false);
 return to_jsonb(saved);
end;$$;
revoke all on function highst_filming_private.public_save(text,text,jsonb,integer) from public;
grant execute on function highst_filming_private.public_save(text,text,jsonb,integer) to anon,authenticated;

create function highst_filming_private.public_history(p_before bigint default null) returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(to_jsonb(h) order by h.id desc),'[]'::jsonb) from (
 select h.id,h.record_id,h.before_record,h.saved_at,r.version as current_version
 from highst_filming_private.history h join highst_filming_private.records r on r.id=h.record_id
 where h.before_record->>'id' is not null and (p_before is null or h.id<p_before) order by h.id desc limit 20
 ) h;
$$;
revoke all on function highst_filming_private.public_history(bigint) from public;
grant execute on function highst_filming_private.public_history(bigint) to anon,authenticated;

create function highst_filming_private.public_restore(p_history_id bigint,p_expected integer) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old jsonb; body jsonb; result jsonb;
begin
 select before_record into old from highst_filming_private.history where id=p_history_id;
 if old->>'id' is null then raise sqlstate 'PT404' using message='HISTORY_NOT_FOUND'; end if;
 if old->>'kind'='phase' then
   body:=(old->'payload')-'revision'-'updatedAt'-'history';
 else
   body:=jsonb_build_object('id',old->'payload'->'id','phaseId',old->'payload'->'phaseId','title',old->'payload'->'title','order',old->'payload'->'order','status',old->'payload'->'status','fields',jsonb_build_object('evidence',coalesce(old->'payload'->'fields'->>'evidence','')));
 end if;
 body:=body||jsonb_build_object('deleted',coalesce((old->'payload'->>'deleted')::boolean,false));
 result:=highst_filming_private.public_save(old->>'id',old->>'kind',body,p_expected);
 return result;
end;$$;
revoke all on function highst_filming_private.public_restore(bigint,integer) from public;
grant execute on function highst_filming_private.public_restore(bigint,integer) to anon,authenticated;

create function public.highst_filming_public_read() returns jsonb language sql security invoker set search_path='' as $$select highst_filming_private.public_read();$$;
create function public.highst_filming_public_save(p_id text,p_kind text,p_payload jsonb,p_expected integer) returns jsonb language sql security invoker set search_path='' as $$select highst_filming_private.public_save(p_id,p_kind,p_payload,p_expected);$$;
create function public.highst_filming_public_history(p_before bigint default null) returns jsonb language sql security invoker set search_path='' as $$select highst_filming_private.public_history(p_before);$$;
create function public.highst_filming_public_restore(p_history_id bigint,p_expected integer) returns jsonb language sql security invoker set search_path='' as $$select highst_filming_private.public_restore(p_history_id,p_expected);$$;
revoke all on function public.highst_filming_public_read(),public.highst_filming_public_save(text,text,jsonb,integer),public.highst_filming_public_history(bigint),public.highst_filming_public_restore(bigint,integer) from public;
grant execute on function public.highst_filming_public_read(),public.highst_filming_public_save(text,text,jsonb,integer),public.highst_filming_public_history(bigint),public.highst_filming_public_restore(bigint,integer) to anon,authenticated;
-- Close obsolete unthrottled routes, even for visitors who kept the old team link.
revoke all on function public.highst_filming_read(text),public.highst_filming_save(text,text,text,jsonb,integer),highst_filming_private.read_board(text),highst_filming_private.save_record(text,text,text,jsonb,integer) from public,anon,authenticated;
notify pgrst,'reload schema';
commit;
