const V='optic-v5',S=self.registration.scope,U=p=>new URL(p,S).href,
CORE=['./','index.html','manifest.json','icon-192.png','icon-512.png'].map(U),
LIBS=['https://cdn.jsdelivr.net/npm/mediabunny@1.61.3/dist/bundles/mediabunny.cjs','https://cdn.jsdelivr.net/npm/mediabunny@1.61.3/dist/bundles/mediabunny.mjs','https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js'],
M={ignoreSearch:true,ignoreVary:true};
// Captions engine files live in IndexedDB; serve them from real same-origin URLs (/_opt/...) so the library can resolve relative paths and start its workers.
const ASSETS={'transcriber.js':'transcribe-lib','shout.wasm.js':'transcribe-shout'};
const idbGet=k=>new Promise((ok,no)=>{const q=indexedDB.open('optic',1);q.onupgradeneeded=()=>q.transaction.abort();q.onerror=()=>no(q.error);q.onsuccess=()=>{try{const g=q.result.transaction('assets').objectStore('assets').get(k);g.onsuccess=()=>ok(g.result);g.onerror=()=>no(g.error)}catch(e){no(e)}}});
async function opt(u){
  const f=u.pathname.split('/_opt/')[1];let b=ASSETS[f]?await idbGet(ASSETS[f]).catch(()=>null):null;
  if(!b){const res=await fetch('https://cdn.jsdelivr.net/npm/@transcribe/shout/src/shout/'+f,{mode:'cors'}).catch(()=>null);if(!res||!res.ok)return new Response('Not found',{status:404});b=await res.blob()}
  return new Response(b,{headers:{'Content-Type':f.endsWith('.wasm')?'application/wasm':'text/javascript','Cross-Origin-Embedder-Policy':'credentialless','Cross-Origin-Resource-Policy':'same-origin'}});
}
// Browsers refuse to show a redirected response for a page load, so store a clean copy.
const clean=async r=>new Response(await r.blob(),{status:200,headers:{'Content-Type':r.headers.get('Content-Type')||'application/octet-stream'}});
// Page loads get COOP/COEP headers: that makes the page cross-origin isolated, which the captions engine (threaded WebAssembly) requires. GitHub Pages can't set these itself.
const iso=(r,res)=>{if(r.mode!=='navigate'||!res||res.type==='opaque'||res.type==='error')return res;const h=new Headers(res.headers);h.set('Cross-Origin-Opener-Policy','same-origin');h.set('Cross-Origin-Embedder-Policy','credentialless');return new Response(res.body,{status:res.status,statusText:res.statusText,headers:h})};
// Every file is cached on its own: one missing file can never block the install.
self.addEventListener('install',e=>e.waitUntil((async()=>{
  const c=await caches.open(V);
  await Promise.all([
    ...CORE.map(u=>fetch(new Request(u,{cache:'reload'})).then(async r=>r.ok&&c.put(u,await clean(r))).catch(()=>{})),
    ...LIBS.map(u=>fetch(u,{mode:'cors'}).then(r=>r.ok&&c.put(u,r)).catch(()=>{}))]);
  self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==V)await caches.delete(k);
  await clients.claim();
})()));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  const u=new URL(r.url);if(u.origin===location.origin&&u.pathname.includes('/_opt/'))return e.respondWith(opt(u));
  e.respondWith((async()=>{
    const c=await caches.open(V),same=new URL(r.url).origin===location.origin;
    let hit=await c.match(r,M);
    if(!hit&&r.mode==='navigate')hit=await c.match(U('./'),M)||await c.match(U('index.html'),M);
    if(hit&&!same)return hit;
    const net=fetch(r).then(async res=>{if(res.ok&&(same||LIBS.includes(r.url)))c.put(r,res.redirected?await clean(res):res.clone());return res}).catch(()=>null);
    if(hit)return iso(r,hit);
    const res=await net;
    return res?iso(r,res):(r.mode==='navigate'?new Response('Offline',{status:503}):Response.error());
  })());
});
