-- Execute as the project database owner. Every fixture is rolled back.
begin;
set local role anon;
do $$
declare p jsonb; r jsonb; h jsonb; i integer; v integer;
begin
 assert not has_table_privilege('anon','highst_filming_private.records','SELECT');
 assert not has_table_privilege('anon','highst_filming_private.records','DELETE');
 assert not has_table_privilege('anon','highst_filming_private.history','UPDATE');
 assert not has_table_privilege('anon','highst_filming_private.settings','UPDATE');
 assert not has_function_privilege('anon','public.highst_filming_save(text,text,text,jsonb,integer)','EXECUTE');
 assert not has_function_privilege('anon','highst_filming_private.save_record(text,text,text,jsonb,integer)','EXECUTE');
 assert jsonb_array_length(public.highst_filming_public_read())>=23;
 p:=jsonb_build_object('id','security-test-step','title','temporary test','phaseId','pre','order',900,'status','draft','fields',jsonb_build_object('evidence','plain text'),'deleted',false);
 begin
   perform public.highst_filming_public_save('security-test-step','step',jsonb_set(p,'{fields,evidence}','"<img src=x onerror=alert(1)>"'),0);
   raise exception 'FAIL: XSS accepted';
 exception when sqlstate 'PT400' then null; end;
 begin
   perform public.highst_filming_public_save('security-test-step','step',jsonb_set(p,'{fields,evidence}',to_jsonb(repeat('x',4001))),0);
   raise exception 'FAIL: excessive text accepted';
 exception when sqlstate 'PT400' then null; end;
 begin
   perform public.highst_filming_public_save('security-test-step','step',p||'{"description":"overwrite disabled field"}',0);
   raise exception 'FAIL: disabled field editable';
 exception when sqlstate 'PT400' then null; end;
 begin
   perform public.highst_filming_public_save('security-test-step','step',jsonb_set(p,'{fields}', '{"evidence":"hello","owner":"admin"}'),0);
   raise exception 'FAIL: arbitrary nested field accepted';
 exception when sqlstate 'PT400' then null; end;
 begin
   perform public.highst_filming_public_save('security-test-step','step',jsonb_set(p,'{phaseId}','"missing-phase"'),0);
   raise exception 'FAIL: nonexistent phase accepted';
 exception when sqlstate 'PT400' then null; end;
 p:=jsonb_set(p,'{fields,evidence}',to_jsonb('SQL punctuation is plain text: ''); drop table records; --'::text));
 r:=public.highst_filming_public_save('security-test-step','step',p,0);
 assert (r->>'version')::integer=1;
 assert r->'payload'->'fields'->>'evidence'=p->'fields'->>'evidence';
 begin
   perform public.highst_filming_public_save('security-test-step','step',p,0);
   raise exception 'FAIL: stale overwrite accepted';
 exception when sqlstate 'PT409' then null; end;
 p:=jsonb_set(p,'{title}','"changed title"');
 r:=public.highst_filming_public_save('security-test-step','step',p,1);
 select item into h from jsonb_array_elements(public.highst_filming_public_history()) item where item->>'record_id'='security-test-step' limit 1;
 r:=public.highst_filming_public_restore((h->>'id')::bigint,2);
 assert r->'payload'->>'title'='temporary test';
 assert (r->>'version')::integer=3;
 p:=jsonb_set(p,'{deleted}','true');
 r:=public.highst_filming_public_save('security-test-step','step',p,3);
 assert (r->'payload'->>'deleted')::boolean;
 p:=jsonb_set(p,'{deleted}','false');
 r:=public.highst_filming_public_save('security-test-step','step',p,4);
 assert not (r->'payload'->>'deleted')::boolean;
 for i in 5..7 loop
   p:=jsonb_set(p,'{title}',to_jsonb('rate test '||i));
   r:=public.highst_filming_public_save('security-test-step','step',p,i);
 end loop;
 begin
   perform public.highst_filming_public_save('security-test-step','step',jsonb_set(p,'{title}','"ninth change"'),8);
   raise exception 'FAIL: per-record flood accepted';
 exception when sqlstate 'PT429' then null; end;
end;$$;
reset role;
-- Fill the global window independently of client identity or spoofable headers.
insert into highst_filming_private.history(record_id,operation) select 'quota-test','edit' from generate_series(1,60);
set local role anon;
do $$ begin
 begin
   perform public.highst_filming_public_save('quota-test-phase','phase','{"id":"quota-test-phase","name":"test","order":50,"deleted":false}',0);
   raise exception 'FAIL: global flood accepted';
 exception when sqlstate 'PT429' then null; end;
end;$$;
reset role;
select 'PASS: anonymous CRUD, immutable history recovery, conflicts, XSS/size/field validation, private grants, old-route revocation, per-record and global quotas' as verification;
rollback;
