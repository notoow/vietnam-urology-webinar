window.Press=(()=>{
 const $=id=>document.getElementById(id),dialog=$('press-password-dialog'),form=$('press-password-form'),input=$('press-password'),submit=$('press-password-submit'),error=$('press-password-error'),container=$('press-article');
 let unlocked=false,onUnlock=null,article=null,requestId=0,photoUrl=null;
 const decode=value=>Uint8Array.from(atob(value),character=>character.charCodeAt(0));
 const element=(tag,text,className)=>{const node=document.createElement(tag);if(text)node.textContent=text;if(className)node.className=className;return node};
 function render(data){
  if(typeof data.title!=='string'||!Array.isArray(data.paragraphs)||!data.paragraphs.every(p=>typeof p==='string')||!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(data.photo))throw Error('Invalid article');
  const title=element('h1',data.title),subtitle=element('p',data.subtitle,'press-subtitle'),meta=element('div',null,'press-meta');
  meta.append(element('span',data.eventDate),element('span','기사 초안','press-draft'));
  const figure=element('figure'),photo=element('img');photo.src=data.photo;photo.alt=data.photoAlt;photo.width=2400;photo.height=1108;figure.append(photo,element('figcaption',data.caption));
  const inlineFigures=data.inlineFigures||[];
  if(!Array.isArray(inlineFigures)||!inlineFigures.every(item=>Number.isInteger(item.afterParagraph)&&item.afterParagraph>0&&item.afterParagraph<=data.paragraphs.length&&/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(item.image)))throw Error('Invalid inline figure');
  const body=element('div',null,'press-body');data.paragraphs.forEach((paragraph,index)=>{
   body.append(element('p',paragraph));
   inlineFigures.filter(item=>item.afterParagraph===index+1).forEach(item=>{
    const figure=element('figure',null,'press-inline-figure'),image=element('img');
    image.src=item.image;image.alt=item.alt;image.width=item.width;image.height=item.height;
    figure.append(image,element('figcaption',item.caption));body.append(figure);
   });
  });
  container.replaceChildren(title,subtitle,meta,figure,body);
  if(photoUrl)URL.revokeObjectURL(photoUrl);
  photoUrl=URL.createObjectURL(new Blob([decode(data.photo.split(',')[1])],{type:'image/jpeg'}));
  $('press-photo-download').href=photoUrl;$('press-photo-download').download=data.photoFilename;
 }
 function lock(){unlocked=false;article=null;requestId++;container.replaceChildren();if(photoUrl)URL.revokeObjectURL(photoUrl);photoUrl=null;$('press-photo-download').removeAttribute('href');$('press-action-status').textContent='';input.value='';}
 function requestAccess(callback){onUnlock=callback;error.textContent='';input.value='';input.removeAttribute('aria-invalid');if(!dialog.open)dialog.showModal();input.focus();}
 function closeDialog(){onUnlock=null;dialog.close();}
 $('press-dialog-close').onclick=closeDialog;$('press-dialog-cancel').onclick=closeDialog;
 dialog.addEventListener('close',()=>{requestId++;input.value='';submit.disabled=false;submit.textContent='확인';if(!unlocked&&location.hash==='#press')history.replaceState(null,'','#'+activeView);});
 form.addEventListener('submit',async event=>{
  event.preventDefault();if(submit.disabled)return;const attempt=++requestId;
  submit.disabled=true;submit.textContent='확인 중…';error.textContent='';input.removeAttribute('aria-invalid');
  let response,payload;
  try{response=await fetch('__PRESS_PAYLOAD_URL__');if(!response.ok)throw Error('Loading failed');payload=await response.json();}
  catch{if(attempt===requestId&&dialog.open){error.textContent='자료를 불러오지 못했습니다. 다시 시도해 주세요.';submit.disabled=false;submit.textContent='확인';}return;}
  try{
   if(!crypto.subtle)throw Error('Secure context required');
   if(payload.version!==1||payload.iterations!==310000)throw Error('Invalid payload');
   const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(input.value),'PBKDF2',false,['deriveKey']);
   const key=await crypto.subtle.deriveKey({name:'PBKDF2',salt:decode(payload.salt),iterations:payload.iterations,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,['decrypt']);
   const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv:decode(payload.iv)},key,decode(payload.data));
   if(attempt!==requestId||!dialog.open)return;
   const data=JSON.parse(new TextDecoder().decode(plaintext));render(data);article=data;unlocked=true;
   const done=onUnlock;onUnlock=null;dialog.close();done?.();
  }catch{if(attempt===requestId&&dialog.open){error.textContent='비밀번호가 올바르지 않습니다.';input.setAttribute('aria-invalid','true');input.select();}}
  finally{if(attempt===requestId){submit.disabled=false;submit.textContent='확인';}}
 });
 $('press-lock').onclick=()=>{lock();switchView('design');$('press-tab').focus();};
 $('press-copy').onclick=async()=>{if(!article)return;const body=article.paragraphs.flatMap((paragraph,index)=>[paragraph,...(article.inlineFigures||[]).filter(item=>item.afterParagraph===index+1).map(item=>item.caption)]);const text=[article.title,article.subtitle,...body,article.caption].join('\n\n');try{await navigator.clipboard.writeText(text);$('press-action-status').textContent='기사를 복사했습니다.';}catch{$('press-action-status').textContent='본문을 선택해 복사해 주세요.';}};
 return {isUnlocked:()=>unlocked,requestAccess,lock};
})();
