const study = require('../src/design-study.json');
const ink = '#20282C', muted = '#697276', gold = '#98774B', rule = '#DDE1E2';
const text = (value,x,y,w,h,size=24,weight=400,color=ink) => ({kind:'text',text:value,x,y,w,h,size,weight,color});
const image = (asset,x,y,w,h,fit='contain',alt='HIGHST Urology') => ({kind:'image',asset,x,y,w,h,fit,alt});
const rect = (x,y,w,h,color) => ({kind:'rect',x,y,w,h,color});
const logo = () => image('highst-logo.png',1042,59,166,47);
const footer = n => [text('Jinmo Koo · HIGHST Urology',72,670,700,20,12,400,muted),text(String(n).padStart(2,'0'),1180,670,28,20,12,400,muted)];
const header = title => [text(title,72,63,910,64,43,600),logo(),rect(72,139,1136,1,rule)];
const clone = value => JSON.parse(JSON.stringify(value));
const templateItems = (id,n) => clone(study.slides.find(s=>s.id===id).items).map(o => o.kind==='text'&&o.x===1180&&o.y===670 ? {...o,text:String(n).padStart(2,'0')} : o);
const caseHeader = s => [
  text(s.caseLabel || 'Case '+Number(s.caseNumber),72,38,910,23,14,600,gold),
  text(s.title,72,71,950,58,42,600),logo()
];
const photo = (asset,label,x,y,w,h) => asset
  ? [image(asset,x,y,w,h,'contain',label)]
  : [{...rect(x,y,w,h,'#F4F4F1'),role:'photo-placeholder',label},
     text(label,x+24,y+h/2-15,w-48,32,22,400,muted)];
const table = (values,x,y,w,h,widths,header=false,size=21) => ({
  kind:'table',values,x,y,w,h,widths,header,size,color:ink,muted,gold,rule
});

module.exports = function layoutDeck(deck) {
  return {width:1280,height:720,slides:deck.map((s,i)=>{
    const n=i+1; let items;
    if(s.type==='cover') items=templateItems('cover',n);
    else if(s.type==='evaluation') items=templateItems('evaluation',n);
    else if(s.type==='profile') items=[
      image(s.asset,72,54,105,135,'cover','Jinmo Koo, HIGHST Urology'),
      text(s.title,216,58,766,64,43,600),
      text(s.subtitle,216,120,766,37,25,400,muted),
      text(s.biography.education,216,169,766,30,21,400,muted),
      logo(),rect(72,220,1136,1,rule),
      text('Clinical & academic appointments',72,252,550,34,22,600,gold),
      ...s.biography.appointments.map((value,j)=>text(value,72,297+j*36,550,32,j===3?21:22,400,j===3?muted:ink)),
      text('Professional memberships',72,468,550,34,22,600,gold),
      ...s.biography.memberships.map((value,j)=>text(value,72,513+j*36,550,32,22)),
      text('Training, appointments & recognition',672,252,536,34,22,600,gold),
      ...s.biography.training.map((entry)=>text(entry.text,672,entry.y,536,32,entry.size||21,entry.weight||400,entry.muted?muted:ink)),
      ...footer(n)
    ];
    else if(s.type==='products') items=[
      ...header(s.title),
      text(s.rows[0].head,72,196,520,44,31,600),
      text('Acellular dermal matrix',72,252,520,38,25,400,muted),
      text('Hydrated / Freeze-dried',72,296,520,38,25,400,muted),
      text('6 × 12 cm graft shown',72,340,520,28,18,400,gold),
      text(s.rows[1].head,72,412,520,44,31,600),
      text(s.rows[1].body,72,468,535,38,24,400,muted),
      image(s.asset,792,160,360,240,'contain','6 × 12 cm dermal graft'),
      image(s.megafillAsset,792,414,360,202.5,'contain','MegaFill syringes'),
      text('MegaDerm stock at HIGHST',72,574,680,28,18,600,gold),
      text('3–5 mm thick     5 × 6, 5 × 8, 5 × 10, 6 × 12 cm',72,610,680,33,22,400,muted),
      ...footer(n)
    ];
    else if(s.type==='graft-shape-complications') items=[
      ...header(s.title),
      text('Shape and length',72,163,1136,28,18,400,muted),
      ...s.figures.flatMap((figure,j)=>{
        const x=72+j*392;
        return [
          text(figure.label,x,211,352,34,25,600,j===0?muted:ink),
          rect(x,256,352,1,j===0?rule:gold),
          image(figure.asset,x+24,278,304,342,'contain',figure.label)
        ];
      }),
      ...footer(n)
    ];
    else if(s.type==='graft-complications') items=[
      ...header(s.title),
      text('Contour and position',72,163,1136,28,18,400,muted),
      ...s.figures.flatMap((figure,j)=>{
        const x=72+j*292;
        return [
          text(figure.label,x,211,260,33,24,600),
          rect(x,256,260,1,gold),
          ...(figure.assets
            ? figure.assets.map((asset,k)=>image(asset,x+k*136,286,124,292,'contain',figure.label+(k?' — graft':' — surface')))
            : [image(figure.asset,x,286,260,292,'contain',figure.label)]),
          ...(figure.assets?[text('Surface',x,592,124,24,15,400,muted),text('Graft',x+136,592,124,24,15,400,muted)]:[])
        ];
      }),
      ...footer(n)
    ];
    else if(s.type==='graft-animation') items=[
      ...header(s.title),
      text('Normal ↔ graft-related change',72,163,1136,28,18,400,muted),
      ...s.labels.flatMap((label,j)=>{
        const x=72+j*(1136/6);
        return [text(label,x,209,177,47,19,600),rect(x,265,177,1,gold)];
      }),
      {...image(s.asset,72,278,1136,340,'contain',s.alt),stillAsset:s.stillAsset},
      ...footer(n)
    ];
    else if(s.type==='case-profile') items=[
      ...caseHeader(s),
      text('Patient profile',72,173,432,34,23,600,gold),
      table(s.profile,72,220,448,280,[155,293]),
      text(s.profileImageLabel||'Before',568,173,640,34,23,600,gold),
      ...photo(s.profileAsset||s.beforeAsset,s.profileImageLabel||'Preoperative photograph',568,218,640,360),
      text('Operative focus',72,544,448,30,21,600,gold),
      text(s.focus,72,589,1136,53,22),
      ...footer(n)
    ];
    else if(s.type==='case-result') {
      const columns=s.specimen ? [
        {label:'Before',asset:s.beforeAsset},
        {label:'Excess skin and dermal graft',asset:s.specimenAsset},
        {label:'After',asset:s.afterAsset}
      ] : [{label:'Before',asset:s.beforeAsset},{label:'After',asset:s.afterAsset}];
      const gap=24,w=(1136-gap*(columns.length-1))/columns.length;
      items=[...caseHeader(s),
        ...columns.flatMap((c,j)=>[
          text(c.label,72+j*(w+gap),169,w,32,columns.length===3?21:23,600,gold),
          ...photo(c.asset,c.label==='Before'?'Preoperative photograph':c.label==='After'?'Postoperative photograph':'Removed tissue photograph',72+j*(w+gap),211,w,282)
        ]),
        table(s.measurements,72,511,1136,128,[536,300,300],true,19),
        text(s.measurementContext||'Length measurement state: —     Postoperative interval: —',72,644,1136,20,13,400,muted),
        ...footer(n)
      ];
    }
    else if(s.type==='aftercare') {
      items=templateItems('case',n);
      items[0].text=s.subtitle;
      items[1].text=s.title;
      const frame=items.findIndex(o=>o.role==='video-placeholder');
      const {x,y,w,h}=items[frame];
      items[frame]=s.asset
        ? image(s.asset,x,y,w,h,'contain','Postoperative care: '+s.title)
        : {...rect(x,y,w,h,'#F4F4F1'),role:'photo-placeholder',label:'Postoperative care: '+s.title};
    }
    else if(s.type==='media') {
      items=templateItems('case',n);
      items[0].text=s.caseLabel||(s.caseNumber?'Case '+Number(s.caseNumber):s.subtitle||'Dressing technique');
      items[1].text=s.title;
    }
    else if(s.type==='closing') items=[
      image('highst-logo.png',72,64,192,54),
      text(s.title,72,263,1136,85,54,600),
      text(s.subtitle,72,384,1136,50,30,400,muted),
      ...footer(n)
    ];
    else items=[
      ...header(s.title),
      ...s.rows.flatMap((r,j)=>{
        const y=195+j*135;
        return [text(r.head,72,y,1136,40,29,600),text(r.body,72,y+51,1136,42,24,400,muted),...(j< s.rows.length-1?[rect(72,y+104,1136,1,rule)]:[])];
      }),
      ...(s.caption?[text(s.caption,72,625,1100,28,16,400,muted)]:[]),
      ...footer(n)
    ];
    return {...s,items};
  })};
};
