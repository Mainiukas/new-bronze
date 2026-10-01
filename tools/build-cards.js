const { chromium } = require('playwright'); const fs=require('fs');
const FONT='file:///tmp/claude-0/w/fontsource-cinzel-5.3.0/package/files/cinzel-latin-700-normal.woff';
const R={wales:['#2c3f7a','#1a2750'],midlands:['#5a2f5c','#351a37'],thames:['#8a6420','#5a3f10'],west:['#7a1f24','#4a1014'],southwest:['#1f5a55','#113835'],industry:['#6d6a64','#3e3c38']};
const ICON={ind_coal:'coal',ind_iron:'iron',ind_cotton:'loom',ind_port:'anchor',ind_shipyard:'shipyard'};
const b64=f=>'data:image/'+(f.endsWith('png')?'png':'jpeg')+';base64,'+fs.readFileSync(f).toString('base64');
function card(name,region,art){
 const [c1,c2]=R[region]; const ind=region==='industry'; const W=300,H=420;
 const arch='M40 150 Q40 58 150 50 Q260 58 260 150 L260 360 L40 360 Z';
 const banner=(x,flip)=>ind?`<g><circle cx="${x}" cy="46" r="24" fill="#1b1b1b" stroke="#b8b2a6" stroke-width="3"/><image href="${b64('/home/claude/brass-assets/'+ICON[art]+'.png')}" x="${x-19}" y="27" width="38" height="38"/></g>`:
  `<g><path d="M${x-15} 12 H${x+15} V128 L${x} 118 L${x-15} 128 Z" fill="url(#ban)" stroke="#120c08" stroke-width="2"/>
   <path d="M${x-15} 12 H${x+15} V128 L${x} 118 L${x-15} 128 Z" fill="none" stroke="#d9b877" stroke-opacity=".5" stroke-width="1" transform="translate(0 0)"/>
   <text transform="translate(${x} 66) rotate(90)" text-anchor="middle" dominant-baseline="central" font-family="C" font-size="${name.length>11?8:11}" fill="#f1e2c0" letter-spacing="${name.length>11?0.3:1}">${name.toUpperCase()}</text></g>`;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${W*2}" height="${H*2}" viewBox="0 0 ${W} ${H}">
<defs><style>@font-face{font-family:C;src:url(${FONT})}</style>
<linearGradient id="iron" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5a524a"/><stop offset=".5" stop-color="#2a2521"/><stop offset="1" stop-color="#4a433c"/></linearGradient>
<linearGradient id="ban" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>
<linearGradient id="gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f3dca8"/><stop offset=".5" stop-color="#b98c48"/><stop offset="1" stop-color="#7d5724"/></linearGradient>
<clipPath id="win"><path d="${arch}"/></clipPath>
<filter id="tone"><feColorMatrix type="saturate" values="${ind?'.55':'.7'}"/></filter>
<filter id="sh"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity=".6"/></filter>
<radialGradient id="vig" cx=".5" cy=".45" r=".7"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient></defs>
<rect width="${W}" height="${H}" rx="16" fill="#d8ccb4"/>
<rect x="6" y="6" width="${W-12}" height="${H-12}" rx="12" fill="url(#iron)"/>
<g clip-path="url(#win)"><image href="${b64('art/'+art+'.jpg')}" x="30" y="44" width="240" height="320" preserveAspectRatio="xMidYMid slice" filter="url(#tone)"/><rect x="30" y="44" width="240" height="320" fill="url(#vig)"/></g>
<path d="${arch}" fill="none" stroke="#120c08" stroke-width="7"/>
<path d="${arch}" fill="none" stroke="url(#gold)" stroke-width="2"/>
<!-- gothic tracery top -->
<g fill="none" stroke="#6e645a" stroke-width="3"><path d="M70 40 Q150 -2 230 40"/><path d="M110 30 Q150 14 190 30"/></g>
<g fill="#8a8076">${[30,270].map(x=>`<circle cx="${x}" cy="${H-30}" r="4"/>`).join('')}${[18,282].map(x=>[160,260].map(y=>`<circle cx="${x}" cy="${y}" r="3"/>`).join('')).join('')}</g>
${banner(42)}${banner(258)}
<g filter="url(#sh)"><path d="M28 360 H272 L262 378 L272 396 H28 L38 378 Z" fill="url(#ban)" stroke="#120c08" stroke-width="2"/>
<path d="M44 366 H256 V390 H44 Z" fill="none" stroke="#e6cc92" stroke-opacity=".6"/></g>
<text x="150" y="378" text-anchor="middle" dominant-baseline="central" font-family="C" font-size="${name.length>12?13:16}" fill="#f5e7c6" letter-spacing="1">${name.toUpperCase()}</text>
</svg>`;}
const cities=[['Caernarfon','wales','coastal'],['Wrexham','wales','valley'],['Carmarthen','wales','market'],['Merthyr Tydfil','wales','valley'],
['Stoke-on-Trent','midlands','canal'],['Derby','midlands','railway'],['Nottingham','midlands','mill_town'],['Lichfield','midlands','cathedral'],['Wolverhampton','midlands','moor'],['Birmingham','midlands','big_city'],['Leicester','midlands','mill_town'],
['Gloucester','thames','cathedral'],['Oxford','thames','georgian'],['Bristol','west','harbour'],['Swindon','west','railway'],['Southampton','west','harbour'],
['Barnstaple','southwest','coastal'],['Exeter','southwest','market'],['Plymouth','southwest','harbour']];
const inds=[['Coal Mine','industry','ind_coal'],['Iron Works','industry','ind_iron'],['Cotton Mill','industry','ind_cotton'],['Port','industry','ind_port'],['Shipyard','industry','ind_shipyard']];
(async()=>{const b=await chromium.launch();const p=await b.newPage();await p.setViewportSize({width:600,height:840});
 fs.mkdirSync('out',{recursive:true});
 for(const [n,r,a] of [...cities,...inds]){const s=card(n,r,a); const id=(r==='industry'?'industry_':'loc_')+n.toLowerCase().replace(/[^a-z]+/g,'_');
  fs.writeFileSync('out/'+id+'.svg',s);
  await p.setContent(`<html><body style="margin:0;background:transparent">${s}</body></html>`); await p.waitForTimeout(80);
  await p.screenshot({path:'out/'+id+'.png',omitBackground:true,clip:{x:0,y:0,width:600,height:840}});}
 await b.close();})();
