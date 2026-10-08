-- Run as the project owner. Fixtures, history and broadcasts are rolled back.
begin;
insert into highst_filming_private.records(id,kind,payload) values
 ('scene-legacy-test','step','{"id":"scene-legacy-test","phaseId":"pre","title":"legacy fixture","order":999,"status":"draft","fields":{"evidence":"legacy note","owner":"retained"},"description":"retained","na":[],"deleted":false}');
set local role anon;
do $$
declare p jsonb; r jsonb; h jsonb; legacy jsonb; bad jsonb;
begin
 assert not has_function_privilege('anon','highst_filming_private.legacy_scenes(text,text)','EXECUTE');
 p:='{"id":"scene-test","phaseId":"pre","title":"scene fixture","order":998,"status":"draft","deleted":false,"mediaType":"both","scenes":[{"id":"a","text":"photo angle"},{"id":"b","text":"video sequence"}],"fields":{"evidence":"photo angle\n\nvideo sequence"}}';
 for bad in select value from jsonb_array_elements(jsonb_build_array(
   jsonb_set(p,'{mediaType}','"invalid"'),
   jsonb_set(p,'{mediaType}','null'),
   jsonb_set(p,'{scenes}','{}'),
   jsonb_set(p,'{scenes}',(select jsonb_agg(jsonb_build_object('id','s'||i,'text','')) from generate_series(1,21) i)),
   jsonb_set(p,'{scenes,1,id}','"a"'),
   jsonb_set(p,'{scenes,0,text}','"<script>alert(1)</script>"'),
   jsonb_set(p,'{scenes,0}', '{"id":"a","text":"photo angle","owner":"injected"}'),
   jsonb_set(p,'{scenes,0,text}',to_jsonb(repeat('x',4001))),
   jsonb_set(p,'{fields,evidence}','"mismatched text"')
 )) loop
   begin
    perform public.highst_filming_public_save('scene-test','step',bad,0);
    raise exception 'FAIL: invalid scene payload accepted';
   exception when sqlstate 'PT400' then null; end;
 end loop;
 r:=public.highst_filming_public_save('scene-test','step',p,0);
 assert r->'payload'->'scenes'=p->'scenes' and r->'payload'->>'mediaType'='both';
 begin
  perform public.highst_filming_public_save('scene-test','step',p,0);
  raise exception 'FAIL: stale scene overwrite accepted';
 exception when sqlstate 'PT409' then null; end;
 bad:=jsonb_set(p-'scenes'-'mediaType','{fields,evidence}','"old client overwrite"');
 begin
  perform public.highst_filming_public_save('scene-test','step',bad,1);
  raise exception 'FAIL: old client clobbered scenes';
 exception when sqlstate 'PT409' then assert SQLERRM='CLIENT_UPDATE_REQUIRED'; end;
 -- An unchanged legacy client can still change a title without losing scenes.
 r:=public.highst_filming_public_save('scene-test','step',jsonb_set(p-'scenes'-'mediaType','{title}','"renamed"'),1);
 assert r->'payload'->'scenes'=p->'scenes' and r->'payload'->>'mediaType'='both';
 bad:=p||'{"scenes":[],"fields":{"evidence":""},"mediaType":"none"}';
 r:=public.highst_filming_public_save('scene-test','step',bad,2);
 assert r->'payload'->'scenes'='[]' and r->'payload'->>'mediaType'='none';
 select item into h from jsonb_array_elements(public.highst_filming_public_history()) item where item->>'record_id'='scene-test' limit 1;
 r:=public.highst_filming_public_restore((h->>'id')::bigint,3);
 assert r->'payload'->'scenes'=p->'scenes' and r->'payload'->>'mediaType'='both';
 -- Old history without scene fields remains restorable; disabled data survives.
 legacy:='{"id":"scene-legacy-test","phaseId":"pre","title":"legacy fixture","order":999,"status":"draft","fields":{"evidence":"legacy note"},"deleted":false}';
 r:=public.highst_filming_public_save('scene-legacy-test','step',legacy,1);
 assert r->'payload'->'scenes'->0->>'text'='legacy note';
 assert r->'payload'->'fields'->>'owner'='retained' and r->'payload'->>'description'='retained';
 select item into h from jsonb_array_elements(public.highst_filming_public_history()) item where item->>'record_id'='scene-legacy-test' limit 1;
 r:=public.highst_filming_public_restore((h->>'id')::bigint,2);
 assert r->'payload'->'scenes'->0->>'text'='legacy note';
 -- The duplicated evidence/scene representation accommodates 4,000 Korean chars.
 p:=p||jsonb_build_object('id','scene-korean-test','scenes',jsonb_build_array(jsonb_build_object('id','kr','text',repeat('한',4000))),'fields',jsonb_build_object('evidence',repeat('한',4000)));
 r:=public.highst_filming_public_save('scene-korean-test','step',p,0);
 assert length(r->'payload'->'scenes'->0->>'text')=4000;
end;$$;
reset role;
select 'PASS: scenes/media CRUD, restore, legacy compatibility, Korean length, conflict and input validation' as verification;
rollback;
