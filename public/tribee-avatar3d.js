/* TriBee avatar in three.js.
   The catalog (OPT, DEFAULT), colours and the face/shirt drawings are copied from TriBee's tribee-buddy.js,
   so a look saved in a member's TriBee profile renders the same here. Box sizes follow draw() in that file. */
(()=>{"use strict";
const COLORS={
 skin:['#ffe0c4','#f6cba3','#e8b088','#cf9166','#a86c44','#7a4a2c','#ffd84d','#9fd3ff','#b9f0c0'],
 hair:['#1d1a1f','#3b2a20','#6b4526','#a8672f','#e0b04a','#c2452d','#9a9aa3','#7c6cf0','#e86aa6','#2f9d8f','#f4f1ea'],
 cloth:['#7c6cf0','#1f2430','#f4f1ea','#e2574c','#2f9d8f','#f2b33d','#3d7de0','#e86aa6','#6b7a3a','#8a6a4a','#2d3a5c','#6f7785']};
// Every slot is a list of items, like a catalog. Index 0 of the optional slots is "nothing".
const OPT={
 skin:COLORS.skin,
 eyes:['dot','round','tall','happy','big','lash','wink'],
 brows:['none','thin','thick','angry','worried'],
 nose:['none','dot','line','button'],
 mouth:['smile','open','smirk','oh','grin','flat','cat'],
 cheeks:['none','blush','freckles'],
 hair:['bald','short','fringe','spiky','bob','long','ponytail','buns','curly','mohawk'],
 hairColor:COLORS.hair,
 top:['tee','hoodie','jacket','stripe','deel','jersey','suit'],
 topColor:COLORS.cloth,
 bottom:['pants','shorts','skirt'],
 bottomColor:COLORS.cloth,
 shoes:['sneaker','boot','sandal'],
 shoeColor:['#ffffff','#1f2430','#e2574c','#f2b33d','#7c6cf0','#8a6a4a'],
 hat:['none','cap','beanie','headphones','crown','tophat'],
 glasses:['none','square','round','sun','mask'],
 back:['none','backpack','wings','cape'],
 hand:['none','book','pencil','cup'],
 move:['calm','wave','dance','jump']};
const LABEL={skin:'Арьсны өнгө',eyes:'Нүд',brows:'Хөмсөг',nose:'Хамар',mouth:'Ам',cheeks:'Хацар',hair:'Үсний загвар',hairColor:'Үсний өнгө',top:'Цамц',topColor:'Цамцны өнгө',bottom:'Өмд, банзал',bottomColor:'Өмдний өнгө',shoes:'Гутал',shoeColor:'Гутлын өнгө',hat:'Малгай',glasses:'Нүүрний гоёл',back:'Нуруунд',hand:'Гарт',move:'Хөдөлгөөн'};
const NAME={none:'Үгүй',dot:'Цэг',round:'Дугуй',tall:'Гонзгой',happy:'Инээсэн',big:'Том',lash:'Сормуустай',wink:'Ирмэсэн',thin:'Нарийн',thick:'Өтгөн',angry:'Зоригтой',worried:'Санаа зовсон',line:'Зураас',button:'Товч',smile:'Инээмсэг',open:'Баяртай',smirk:'Жуумалзсан',oh:'Гайхсан',grin:'Шүдтэй',flat:'Тайван',cat:'Муур',blush:'Ягаан',freckles:'Сэвхтэй',bald:'Үсгүй',short:'Богино',fringe:'Сэвлэгтэй',spiky:'Сэрвэгэр',bob:'Каре',long:'Урт',ponytail:'Гэзэг',buns:'Хоёр боодол',curly:'Буржгар',mohawk:'Самбай',tee:'Футболк',hoodie:'Юүдэнтэй',jacket:'Куртка',stripe:'Судалтай',deel:'Дээл',jersey:'Спорт',suit:'Костюм',pants:'Өмд',shorts:'Шорт',skirt:'Банзал',sneaker:'Пүүз',boot:'Гутал',sandal:'Шаахай',cap:'Саравчтай',beanie:'Ноосон',headphones:'Чихэвч',crown:'Титэм',tophat:'Бүрх',square:'Дөрвөлжин шил',sun:'Нарны шил',mask:'Амны хаалт',backpack:'Үүргэвч',wings:'Далавч',cape:'Нөмрөг',book:'Ном',pencil:'Харандаа',cup:'Аяга',calm:'Тайван',wave:'Даллах',dance:'Бүжиглэх',jump:'Үсрэх'};
const TABS=[['Сүүлд',null],['Бие',['skin']],['Нүүр',['eyes','brows','nose','mouth','cheeks']],['Үс',['hair','hairColor']],['Хувцас',['top','topColor','bottom','bottomColor','shoes','shoeColor']],['Гоёл',['hat','glasses','back','hand']],['Хөдөлгөөн',['move']],['Багц',null]];
const DEFAULT={skin:1,eyes:1,brows:1,nose:1,mouth:0,cheeks:1,hair:1,hairColor:0,top:1,topColor:0,bottom:0,bottomColor:10,shoes:0,shoeColor:0,hat:0,glasses:0,back:0,hand:0,move:1,build:35,height:50};
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const tidy=look=>{const L={...DEFAULT,...(look||{})};for(const k of Object.keys(OPT))L[k]=clamp(Math.round(Number(L[k]))||0,0,OPT[k].length-1);L.build=clamp(Number(L.build)||0,0,100);L.height=clamp(Number(L.height)||0,0,100);return L};
const shade=(hex,k)=>{const n=parseInt(hex.slice(1),16),f=c=>clamp(Math.round(c*k),0,255);return '#'+[n>>16&255,n>>8&255,n&255].map(c=>f(c).toString(16).padStart(2,'0')).join('')};
const INK='#2a2230';
const svg=(vb,body)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vb}" preserveAspectRatio="none">${body}</svg>`;
// The face: eyes, brows, nose, mouth and cheeks are separate items. 52×50 units.
function faceParts(L,ex){
 const g=k=>OPT[k][L[k]];let eyes=g('eyes'),brows=g('brows'),mouth=g('mouth');
 if(ex==='shy'){eyes='big';brows='worried';mouth='wavy'}if(ex==='sleepy'){eyes='sleepy';mouth='oh'}if(ex==='sad'){eyes=eyes==='happy'||eyes==='wink'?'round':eyes;brows='worried';mouth='sad'}if(ex==='excited'){mouth='open';eyes=eyes==='dot'?'round':eyes}if(ex==='proud'){eyes='happy';mouth='smile'}if(ex==='focused'){brows='angry';mouth='flat'}
 const E=(cx,side)=>{const y=22;switch(eyes){
  case 'dot':return `<circle cx="${cx}" cy="${y}" r="2.6" fill="${INK}"/>`;
  case 'tall':return `<rect x="${cx-2.6}" y="${y-5.5}" width="5.2" height="11" rx="2.6" fill="${INK}"/><circle cx="${cx+.8}" cy="${y-2.6}" r="1.1" fill="#fff"/>`;
  case 'happy':return `<path d="M${cx-4.5},${y+1.5} Q${cx},${y-5} ${cx+4.5},${y+1.5}" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  case 'big':return `<ellipse cx="${cx}" cy="${y}" rx="5" ry="6" fill="#fff" stroke="${INK}" stroke-width="1.4"/><circle cx="${cx+.6}" cy="${y+.6}" r="3.3" fill="${INK}"/><circle cx="${cx+1.8}" cy="${y-1.2}" r="1.3" fill="#fff"/>`;
  case 'lash':return `<ellipse cx="${cx}" cy="${y}" rx="3.6" ry="4.6" fill="${INK}"/><circle cx="${cx+1}" cy="${y-1.6}" r="1.2" fill="#fff"/><path d="M${cx+side*3},${y-4} l${side*3.4},-2.6 M${cx+side*4},${y-1.4} l${side*3.6},-1" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>`;
  case 'wink':return side<0?`<ellipse cx="${cx}" cy="${y}" rx="3.6" ry="4.6" fill="${INK}"/><circle cx="${cx+1}" cy="${y-1.6}" r="1.2" fill="#fff"/>`:`<path d="M${cx-4.5},${y} h9" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`;
  case 'sleepy':return `<path d="M${cx-4.5},${y} Q${cx},${y+4} ${cx+4.5},${y}" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/><path d="M${cx-4.5},${y-.6} h9" stroke="${INK}" stroke-width="1.8" stroke-linecap="round"/>`;
  default:return `<ellipse cx="${cx}" cy="${y}" rx="3.6" ry="4.6" fill="${INK}"/><circle cx="${cx+1}" cy="${y-1.6}" r="1.2" fill="#fff"/>`}};
 const B=(cx,side)=>{const y=13;switch(brows){
  case 'thin':return `<path d="M${cx-5},${y+1} Q${cx},${y-2} ${cx+5},${y+1}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`;
  case 'thick':return `<rect x="${cx-5.5}" y="${y-1.6}" width="11" height="3.4" rx="1.7" fill="${INK}"/>`;
  case 'angry':return `<path d="M${cx-5.5},${y+(side<0?-2.4:1.6)} L${cx+5.5},${y+(side<0?1.6:-2.4)}" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;
  case 'worried':return `<path d="M${cx-5.5},${y+(side<0?1.6:-2.4)} L${cx+5.5},${y+(side<0?-2.4:1.6)}" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  default:return ''}};
 const nose={dot:`<circle cx="26" cy="29" r="1.3" fill="${INK}" opacity=".45"/>`,line:`<path d="M26,26 v4.4" stroke="${INK}" stroke-width="1.5" stroke-linecap="round" opacity=".5"/>`,button:`<ellipse cx="26" cy="29.4" rx="2.8" ry="2" fill="${INK}" opacity=".22"/>`}[g('nose')]||'';
 const M={smile:`<path d="M19,35 Q26,43 33,35" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,open:`<path d="M18.5,34 h15 q0,9.5 -7.5,9.5 q-7.5,0 -7.5,-9.5 z" fill="${INK}"/><path d="M22,41 q4,-3 8,0 q-4,2.6 -8,0 z" fill="#ff8f8f"/>`,smirk:`<path d="M20,37 Q28,40 33,34" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,oh:`<ellipse cx="26" cy="37.5" rx="3" ry="3.8" fill="${INK}"/>`,grin:`<path d="M18,34 h16 q0,8 -8,8 q-8,0 -8,-8 z" fill="#fff" stroke="${INK}" stroke-width="1.8"/><path d="M18.5,37.6 h15 M23,34 v7 M29,34 v7" stroke="${INK}" stroke-width="1" opacity=".55"/>`,flat:`<path d="M21,37 h10" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`,cat:`<path d="M19,35.5 q3.5,4.5 7,0 q3.5,4.5 7,0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>`,wavy:`<path d="M19,38 q2.4,-3.4 4.8,0 t4.8,0 t4.8,0" fill="none" stroke="${INK}" stroke-width="2.2" stroke-linecap="round"/>`,sad:`<path d="M20,39.5 Q26,33.5 32,39.5" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`}[mouth];
 const ch=ex==='shy'?'shy':g('cheeks'),cheeks=ch==='shy'?`<ellipse cx="9.5" cy="31" rx="6.4" ry="4" fill="#ff5f72" opacity=".6"/><ellipse cx="42.5" cy="31" rx="6.4" ry="4" fill="#ff5f72" opacity=".6"/><path d="M6,29 l3,4 M10,29 l3,4 M39,29 l3,4 M43,29 l3,4" stroke="#e2374c" stroke-width=".9" stroke-linecap="round" opacity=".7"/>`:ch==='blush'?`<ellipse cx="9.5" cy="31" rx="4.4" ry="2.8" fill="#ff7f8a" opacity=".45"/><ellipse cx="42.5" cy="31" rx="4.4" ry="2.8" fill="#ff7f8a" opacity=".45"/>`:ch==='freckles'?[[8,30],[11,32.5],[13.5,29.5],[38.5,29.5],[41,32.5],[44,30]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r=".9" fill="#8a4a2c" opacity=".55"/>`).join(''):'';
 const gl=ex==='shy'?'none':g('glasses'),glass=gl==='square'?`<rect x="8" y="15.5" width="15" height="12.5" rx="3" fill="#fff" fill-opacity=".2" stroke="${INK}" stroke-width="1.8"/><rect x="29" y="15.5" width="15" height="12.5" rx="3" fill="#fff" fill-opacity=".2" stroke="${INK}" stroke-width="1.8"/><path d="M23,21 h6" stroke="${INK}" stroke-width="1.8"/>`:gl==='round'?`<circle cx="15.5" cy="22" r="7.6" fill="#fff" fill-opacity=".2" stroke="#b08a3c" stroke-width="1.7"/><circle cx="36.5" cy="22" r="7.6" fill="#fff" fill-opacity=".2" stroke="#b08a3c" stroke-width="1.7"/><path d="M23,21.5 h6" stroke="#b08a3c" stroke-width="1.7"/>`:gl==='sun'?`<rect x="6.5" y="16" width="17" height="11.5" rx="4.5" fill="${INK}"/><rect x="28.5" y="16" width="17" height="11.5" rx="4.5" fill="${INK}"/><path d="M23,20 h6" stroke="${INK}" stroke-width="2.2"/><path d="M10,19 l4,-1.6 M32,19 l4,-1.6" stroke="#fff" stroke-opacity=".5" stroke-width="1.4" stroke-linecap="round"/>`:gl==='mask'?`<path d="M6,29 Q26,24 46,29 V44 Q26,50 6,44 Z" fill="#dff1ff" stroke="#9cc4e4" stroke-width="1"/><path d="M9,34 h34 M9,39 h34" stroke="#9cc4e4" stroke-width=".9"/>`:'';
 const extra=ex==='sad'||ex==='shy'?`<path d="M44,6 q3.4,5.4 0,8.4 q-3.4,-3 0,-8.4 z" fill="#7cc4f0"/>`:'';
 return B(15.5,-1)+B(36.5,1)+`<g class="tbb-eyes">${E(15.5,-1)}${E(36.5,1)}</g>`+cheeks+nose+(gl==='mask'?'':M)+glass+extra;
}
// Shirt designs for the torso front, 64×64 units.
function shirt(top,tc,L){const d=shade(tc,.8),w='#fff';switch(top){
 case 'hoodie':return `<path d="M22,0 Q32,13 42,0" fill="${d}"/><path d="M27,7 v14 M37,7 v14" stroke="${w}" stroke-opacity=".9" stroke-width="2.2" stroke-linecap="round"/><path d="M17,40 h30 v12 q0,5 -5,5 h-20 q-5,0 -5,-5 z" fill="${d}"/>`;
 case 'jacket':return `<rect x="22" y="0" width="20" height="64" fill="#f4f1ea"/><path d="M22,0 L15,20 L22,24 M42,0 L49,20 L42,24" fill="none" stroke="${d}" stroke-width="2.4" stroke-linejoin="round"/><path d="M22,24 v40 M42,24 v40" stroke="${d}" stroke-width="2"/><circle cx="32" cy="34" r="1.6" fill="${d}"/><circle cx="32" cy="46" r="1.6" fill="${d}"/>`;
 case 'stripe':return [12,26,40,54].map(y=>`<rect x="0" y="${y}" width="64" height="6" fill="${w}" fill-opacity=".85"/>`).join('')+`<path d="M23,0 Q32,10 41,0" fill="${d}"/>`;
 case 'deel':return `<path d="M22,0 L50,24 L50,30" fill="none" stroke="#f2d48a" stroke-width="3.6" stroke-linejoin="round" stroke-linecap="round"/><circle cx="48" cy="22" r="2.4" fill="#f2d48a"/><rect x="0" y="40" width="64" height="9" fill="#f2b33d"/><path d="M22,0 Q32,7 42,0" fill="#f2d48a"/>`;
 case 'jersey':return `<path d="M0,0 h10 v64 h-10 z M54,0 h10 v64 h-10 z" fill="${w}" fill-opacity=".85"/><text x="32" y="44" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="800" font-size="26" fill="${w}">7</text><path d="M23,0 L32,11 L41,0" fill="${d}"/>`;
 case 'suit':return `<path d="M24,0 L32,22 L40,0 Z" fill="#f4f1ea"/><path d="M30,5 h4 l2,22 l-4,5 l-4,-5 z" fill="#e2574c"/><path d="M24,0 L14,22 L32,34 M40,0 L50,22 L32,34" fill="none" stroke="${d}" stroke-width="2.4" stroke-linejoin="round"/><circle cx="32" cy="46" r="1.7" fill="${d}"/><circle cx="32" cy="56" r="1.7" fill="${d}"/>`;
 default:return `<path d="M22,0 Q32,12 42,0" fill="${shade(OPT.skin[L.skin],.94)}"/><path d="M22,0 Q32,12 42,0" fill="none" stroke="${d}" stroke-width="2.4"/>`}}

/* ---------- three.js builder (same box list as draw(), 1 TriBee unit = S metres) ---------- */
const S=.0122;
const svgTex=(vb,body,bg,w=256)=>{const [vw,vh]=vb.split(' ').map(Number),h=Math.round(w*vh/vw),c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d');x.fillStyle=bg;x.fillRect(0,0,w,h);
 const t=new THREE.CanvasTexture(c);t.encoding=THREE.sRGBEncoding;t.anisotropy=4;const img=new Image();img.onload=()=>{x.drawImage(img,0,0,w,h);t.needsUpdate=true};img.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg(vb,body));return t};
const faceCols=col=>typeof col==='string'?[shade(col,.9),shade(col,.86),shade(col,1.08),shade(col,.7),col,shade(col,.8)]:[col.right,col.left,col.top,col.bottom,col.front,col.back];
const _c=new THREE.Color();
function boxGeo(w,h,d,col){const g=new THREE.BoxGeometry(w*S,h*S,d*S),cs=faceCols(col),a=new Float32Array(72);
 for(let f=0;f<6;f++){_c.set(cs[f]);for(let v=0;v<4;v++)a.set([_c.r,_c.g,_c.b],(f*4+v)*3)}g.setAttribute('color',new THREE.BufferAttribute(a,3));return g}
function merge(geos){let nv=0,ni=0;for(const g of geos){nv+=g.attributes.position.count;ni+=g.index.count}
 const P=new Float32Array(nv*3),N=new Float32Array(nv*3),U=new Float32Array(nv*2),C=new Float32Array(nv*3),I=new Uint32Array(ni);let vo=0,io=0;
 for(const g of geos){const a=g.attributes;P.set(a.position.array,vo*3);N.set(a.normal.array,vo*3);U.set(a.uv.array,vo*2);C.set(a.color.array,vo*3);for(let k=0;k<g.index.count;k++)I[io++]=g.index.array[k]+vo;vo+=a.position.count}
 const m=new THREE.BufferGeometry();m.setAttribute('position',new THREE.BufferAttribute(P,3));m.setAttribute('normal',new THREE.BufferAttribute(N,3));m.setAttribute('uv',new THREE.BufferAttribute(U,2));m.setAttribute('color',new THREE.BufferAttribute(C,3));m.setIndex(new THREE.BufferAttribute(I,1));m.computeBoundingSphere();return m}
const MAT=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.78,metalness:0});
// build(look, {fat, slouch, expression, shadow}) → THREE.Group, feet at y=0, facing +z
function build(look,o={}){
 const L=tidy(look),g=k=>OPT[k][L[k]],fat=clamp(o.fat||0,0,1),sl=clamp(o.slouch||0,0,1),ex=o.expression||'happy',bt=L.build/100,hs=.86+L.height/100*.26;
 const skin=g('skin'),hc=g('hairColor'),tc=g('topColor'),bc=g('bottomColor'),sc=g('shoeColor'),top=g('top'),bottom=g('bottom'),hair=g('hair'),hat=g('hat');
 const tw=52+bt*14+fat*24,td=28+bt*4+fat*22,th=62,aw=19+bt*5+fat*3,lw=24+bt*5+fat*4,lh=58*hs,hw=54,hh=50,hd=50;
 const X=70,FEET=206,hip=FEET-lh,tTop=hip-th,hy=tTop-hh/2+2,gap=2+fat*2,HT=hy-hh/2;
 const root=new THREE.Group(),body=new THREE.Group(),groups=[];root.add(body);body.userData={px:0,py:0,pz:0};
 // a joint: pivot in TriBee coordinates
 const joint=(parent,px,py,pz=0)=>{const j=new THREE.Group();j.position.set((px-X)*S-(parent.userData.px||0),(FEET-py)*S-(parent.userData.py||0),pz*S-(parent.userData.pz||0));j.userData={px:(px-X)*S,py:(FEET-py)*S,pz:pz*S,boxes:[],tex:[]};parent.add(j);groups.push(j);return j};
 const B=(j,w,h,d,x,y,z,col)=>{const geo=boxGeo(w,h,d,col);geo.translate((x-X)*S-j.userData.px,(FEET-y)*S-j.userData.py,z*S-j.userData.pz);j.userData.boxes.push(geo)};
 const BT=(j,w,h,d,x,y,z,col,front)=>{const cs=faceCols(col),mats=cs.map(c=>new THREE.MeshStandardMaterial({color:c,roughness:.78}));mats[4]=new THREE.MeshStandardMaterial({map:front,roughness:.7});
  const m=new THREE.Mesh(new THREE.BoxGeometry(w*S,h*S,d*S),mats);m.position.set((x-X)*S-j.userData.px,(FEET-y)*S-j.userData.py,z*S-j.userData.pz);m.castShadow=true;j.add(m)};
 // legs
 const legs=[-1,1].map(side=>{const x=X+side*(lw/2+gap/2),j=joint(body,x,hip),cut=bottom==='pants'?1:bottom==='shorts'?.42:.3,shoes=g('shoes'),sh=shoes==='boot'?20:shoes==='sandal'?7:13;
  B(j,lw,lh,lw,x,hip+lh/2,0,skin);B(j,lw+1.6,lh*cut,lw+1.6,x,hip+lh*cut/2,0,bc);
  if(shoes==='sandal'){B(j,lw+3,sh,lw+8,x,FEET-sh/2,3,sc);B(j,lw+1,4,5,x,FEET-sh-4,6,sc)}else{B(j,lw+3,sh,lw+9,x,FEET-sh/2,3,sc);B(j,lw+3.2,sh*.34,.8,x,FEET-sh*.17,3+(lw+9)/2,'#ffffff')}
  return j});
 const mid=joint(body,X,hip);
 if(bottom==='skirt')B(mid,tw+10,24,td+12,X,hip+10,0,bc);
 const up=joint(mid,X,hip);up.rotation.x=sl*13*Math.PI/180;
 const back=g('back');
 if(back==='backpack')B(up,tw*.74,th*.7,16,X,tTop+th*.42,-td/2-8,o.bagColor||'#e2574c');
 if(back==='cape')B(up,tw+8,th+lh*.55,3,X,tTop+(th+lh*.55)/2+2,-td/2-3,'#e2574c');
 const wings=[];if(back==='wings')for(const s of [-1,1]){const w=joint(up,X,tTop+20,-td/2-3);B(w,44,34,2,X+s*28,tTop+20,-td/2-3,{front:'#ffffff',back:'#e9e6f5',left:'#e9e6f5',right:'#e9e6f5',top:'#ffffff',bottom:'#e9e6f5'});w.userData.side=s;wings.push(w)}
 BT(up,tw,th,td,X,tTop+th/2,0,tc,svgTex('64 64',shirt(top,tc,L),tc,128));
 if(fat>.4)B(up,tw*.78,th*.42,8+fat*8,X,tTop+th*.68,td/2+(4+fat*4)/2-2,tc);
 const longSleeve=!['tee','stripe','jersey'].includes(top),hand=g('hand');
 const arms=[-1,1].map(side=>{const x=X+side*(tw/2+aw/2+.6),al=th-2,j=joint(up,x,tTop+5),sleeve=longSleeve?.86:.4;j.rotation.z=side*(3+fat*9)*Math.PI/180;j.userData.rz0=j.rotation.z;j.userData.side=side;
  B(j,aw,al,aw,x,tTop+al/2,0,skin);B(j,aw+1.4,al*sleeve,aw+1.4,x,tTop+al*sleeve/2,0,top==='jacket'||top==='suit'?shade(tc,.92):tc);
  if(side>0&&hand==='book')B(j,20,26,6,x+2,tTop+al-6,aw/2+5,'#3d7de0');
  if(side>0&&hand==='pencil')B(j,5,34,5,x,tTop+al-8,aw/2+4,'#f2b33d');
  if(side>0&&hand==='cup')B(j,15,16,15,x,tTop+al-3,aw/2+8,'#f4f1ea');
  return j});
 const head=joint(up,X,tTop);head.rotation.x=sl*9*Math.PI/180;
 BT(head,hw,hh,hd,X,hy,0,skin,svgTex('52 50',faceParts(L,ex),skin,256));
 const H=(w,h,d,x,y,z)=>B(head,w,h,d,x,y,z,hc);
 if(hair!=='bald'){
  if(hair==='mohawk'){H(10,16,hd+4,X,HT-6,0);H(10,10,hd-8,X,HT-17,-2)}
  else if(hair==='curly')[[-18,-6,12],[0,-9,14],[18,-6,12],[-20,-5,-10],[0,-8,-12],[20,-5,-10],[-29,6,0],[29,6,0],[-29,18,-12],[29,18,-12],[0,10,-27]].forEach(([dx,dy,dz])=>H(22,22,22,X+dx,HT+dy+2,dz));
  else{H(hw+5,15,hd+5,X,HT-.5,0);
   const bh=hair==='short'||hair==='spiky'?24:hair==='long'?hh+26:hair==='bob'?hh+2:30;H(hw+5,bh,7,X,HT+(hair==='short'||hair==='spiky'?12:hair==='long'?(hh+26)/2:hair==='bob'?(hh+2)/2:15),-hd/2-1);
   const sh=hair==='long'?hh+18:hair==='bob'?hh-4:20;for(const s of [-1,1])H(6,sh,hd*.62,X+s*(hw/2+1),HT+sh/2,-hd*.2);
   if(hair==='fringe'||hair==='bob'||hair==='buns')H(hw+5,13,5,X,HT+8,hd/2+1);
   if(hair==='short'||hair==='ponytail'||hair==='long'){H(hw*.64,12,5,X-hw*.2,HT+7,hd/2+1);H(hw*.36,8,5,X+hw*.3,HT+5,hd/2+1)}
   if(hair==='spiky'){[-18,-6,6,18].forEach((dx,i)=>H(10,12+(i%2)*5,10,X+dx,HT-12-(i%2)*2.5,i%2?6:-6));H(hw*.5,8,5,X,HT+6,hd/2+1)}
   if(hair==='ponytail'){H(14,14,14,X,HT+8,-hd/2-9);H(11,34,11,X,HT+30,-hd/2-12)}
   if(hair==='buns'){H(22,22,22,X-22,HT-13,-4);H(22,22,22,X+22,HT-13,-4)}}}
 const Hb=(w,h,d,x,y,z,c)=>B(head,w,h,d,x,y,z,c);
 if(hat==='cap'){const cc=o.hatColor||tc;Hb(hw+7,15,hd+7,X,HT-4,0,cc);Hb(hw*.8,4,22,X,HT+3,hd/2+12,shade(cc,.8));Hb(8,5,8,X,HT-13.5,0,shade(cc,.8))}
 if(hat==='beanie'){Hb(hw+7,20,hd+7,X,HT-3,0,tc);Hb(hw+10,9,hd+10,X,HT+6,0,shade(tc,.82));Hb(14,14,14,X,HT-19,0,'#ffffff')}
 if(hat==='headphones'){Hb(hw+12,6,10,X,HT-3,0,INK);Hb(8,24,22,X-hw/2-4.5,hy,0,tc);Hb(8,24,22,X+hw/2+4.5,hy,0,tc)}
 if(hat==='crown'){Hb(hw-6,8,hd-6,X,HT-4,0,'#f2b33d');[-18,0,18].forEach(dx=>{Hb(9,11,9,X+dx,HT-12,hd/2-8,'#f2b33d');Hb(9,11,9,X+dx,HT-12,-hd/2+8,'#f2b33d')});Hb(5,5,3,X,HT-4,hd/2-2,'#e2574c')}
 if(hat==='tophat'){Hb(hw+16,4,hd+16,X,HT-2,0,INK);Hb(hw-8,30,hd-8,X,HT-19,0,INK);Hb(hw-7,6,hd-7,X,HT-7,0,'#e2574c')}
 for(const j of groups)if(j.userData.boxes.length){const m=new THREE.Mesh(merge(j.userData.boxes),MAT);m.castShadow=true;j.add(m);j.userData.boxes=null}
 if(o.shadow!==false){const s=new THREE.Mesh(new THREE.CircleGeometry(.48,20).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:'#000',transparent:true,opacity:.3,depthWrite:false}));s.scale.set(1+fat*.5,1,.8+fat*.3);s.position.y=.04;root.add(s)}
 root.userData={body,legs,arms,up,head,wings,phase:Math.random()*6,move:g('move'),upRx:up.rotation.x,height:(FEET-HT+10)*S};
 return root}
// Animation. ch.userData.emote (or the look's own "move" while greeting) picks one of TriBee's moves:
// calm, wave, dance, jump. Walking and jumping in the world override it.
function animate(ch,speed,air,dt,t){const u=ch.userData,k=1-Math.exp(-dt*14),L=(o,ax,v)=>{o.rotation[ax]+=(v-o.rotation[ax])*k};
 u.phase+=dt*(speed>.2?2.4+speed*1.1:1);const a=air?0:Math.min(1,speed/5),s=Math.sin(u.phase),[al,ar]=u.arms,[ll,lr]=u.legs;
 const mv=speed>.3||air?null:(u.emote||(u.greet?u.move:null));
 let bodyY=0,sway=0,twist=0,lean=0;
 const armsZ=(zl,zr)=>{L(al,'z',zl);L(ar,'z',zr)};
 if(air){L(ll,'x',-.6);L(lr,'x',.35);L(al,'x',-2.6);L(ar,'x',-2.6);armsZ(al.userData.rz0,ar.userData.rz0)}
 else if(a>.02){L(ll,'x',-s*.8*a);L(lr,'x',s*.8*a);L(al,'x',s*.85*a);L(ar,'x',-s*.85*a);armsZ(al.userData.rz0,ar.userData.rz0);lean=.06*a;bodyY=Math.abs(Math.cos(u.phase))*.05*a}
 else if(mv==='wave'){L(ll,'x',0);L(lr,'x',0);L(al,'x',.05);L(ar,'x',0);L(al,'z',al.userData.rz0);ar.rotation.z=ar.userData.side*(2.5+Math.sin(t*10)*.35);sway=Math.sin(t*3)*.03}
 else if(mv==='dance'){const b=t*7.5;L(al,'x',-1.4+Math.sin(b)*1.1);L(ar,'x',-1.4-Math.sin(b)*1.1);armsZ(al.userData.side*.5,ar.userData.side*.5);L(ll,'x',Math.max(0,Math.sin(b))*-.5);L(lr,'x',Math.max(0,-Math.sin(b))*-.5);sway=Math.sin(b*.5)*.16;twist=Math.sin(b*.5)*.35;bodyY=Math.abs(Math.sin(b))*.08}
 else if(mv==='jump'){const b=(t*2.2)%1,h=b<.6?Math.sin(b/.6*Math.PI):0;bodyY=h*.55;L(ll,'x',h>.05?-.35:.15);L(lr,'x',h>.05?.35:.15);L(al,'x',h>.05?-2.8:0);L(ar,'x',h>.05?-2.8:0);armsZ(al.userData.side*(h>.05?.4:.07),ar.userData.side*(h>.05?.4:.07))}
 else{const idle=Math.sin(t*1.6+u.phase)*.04;L(ll,'x',0);L(lr,'x',0);L(al,'x',idle);L(ar,'x',-idle);armsZ(al.userData.rz0,ar.userData.rz0);bodyY=Math.sin(t*1.6+u.phase)*.008}
 for(const w of u.wings)w.rotation.y=w.userData.side*(.25+Math.sin(t*6)*.2);
 u.body.position.y+=(bodyY-u.body.position.y)*Math.min(1,dt*18);
 u.body.rotation.z+=(sway-u.body.rotation.z)*k;u.body.rotation.y+=(twist-u.body.rotation.y)*k;u.up.rotation.x+=(u.upRx+lean-u.up.rotation.x)*k}
const random=()=>{const L={};for(const k in OPT)L[k]=Math.floor(Math.random()*OPT[k].length);L.skin=Math.floor(Math.random()*6);L.glasses=Math.random()<.7?0:L.glasses;L.hat=Math.random()<.6?0:L.hat;L.back=Math.random()<.6?0:Math.min(L.back,1);L.hand=Math.random()<.7?0:L.hand;L.build=Math.round(Math.random()*70);L.height=Math.round(20+Math.random()*60);return tidy(L)};
// energy → shape, same rule as TriBee: regular study keeps the avatar fit, missed days make it sleepy and chubby
const shapeFor=e=>{const l=e>=70?0:e>=45?1:e>=20?2:3;return {fat:[0,.3,.62,1][l],slouch:[0,.25,.6,1][l],expression:['happy','neutral','sleepy','sad'][l]}};
window.TribeeAvatar3D={OPT,DEFAULT,COLORS,tidy,build,animate,random,shapeFor,faceParts,svg};
})();
