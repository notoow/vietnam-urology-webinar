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

module.exports = function layoutDeck(deck) {
  return {width:1280,height:720,slides:deck.map((s,i)=>{
    const n=i+1; let items;
    if(s.type==='cover') items=templateItems('cover',n);
    else if(s.type==='evaluation') items=templateItems('evaluation',n);
    else if(s.type==='profile') items=[
      image('highst-logo.png',72,64,192,54),
      text('Jinmo Koo',72,248,710,82,54,600),
      text(s.subtitle,72,351,710,45,28,400,muted),
      image('jinmo-koo-profile.jpg',866,64,342,592,'cover','Jinmo Koo, HIGHST Urology'),
      ...footer(n)
    ];
    else if(s.type==='products') items=[
      ...header(s.title),
      text(s.rows[0].head,72,196,520,44,31,600),
      text('Acellular dermal matrix',72,252,520,38,25,400,muted),
      text('Hydrated / Freeze-dried',72,296,520,38,25,400,muted),
      text(s.rows[1].head,72,412,520,44,31,600),
      text(s.rows[1].body,72,468,535,38,24,400,muted),
      image(s.asset,648,194,560,348,'contain','Packaged dermal grafts supplied by HIGHST'),
      text('MegaDerm stock at HIGHST',72,574,1100,28,18,600,gold),
      text('3–5 mm thick     5 × 6, 5 × 8, 5 × 10, 6 × 12 cm',72,610,1100,33,22,400,muted),
      ...footer(n)
    ];
    else if(s.type==='media'||s.type==='aftercare') {
      items=templateItems('case',n);
      items[0].text=s.caseNumber?'Case '+Number(s.caseNumber):s.subtitle||'Dressing technique';
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
