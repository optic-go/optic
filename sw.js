const V='optic-v1',CORE=['./','index.html','manifest.json','icon-192.png','icon-512.png'],
LIBS=['https://cdn.jsdelivr.net/npm/mediabunny@1.61.3/dist/bundles/mediabunny.cjs','https://cdn.jsdelivr.net/npm/mediabunny@1.61.3/dist/bundles/mediabunny.mjs','https://cdnjs.cloudflare.com/ajax/libs/lamejs/1.2.1/lame.min.js'];
self.addEventListener('install',e=>e.waitUntil((async()=>{
  const c=await caches.open(V);await c.addAll(CORE);
  await Promise.all(LIBS.map(u=>fetch(u,{mode:'cors'}).then(r=>r.ok&&c.put(u,r)).catch(()=>{})));
  self.skipWaiting();
})()));
self.addEventListener('activate',e=>e.waitUntil((async()=>{
  for(const k of await caches.keys())if(k!==V)await caches.delete(k);
  await clients.claim();
})()));
self.addEventListener('fetch',e=>{
  const r=e.request;if(r.method!=='GET')return;
  e.respondWith((async()=>{
    const c=await caches.open(V),hit=await c.match(r,{ignoreSearch:true}),same=new URL(r.url).origin===location.origin;
    if(hit&&!same)return hit;
    const net=fetch(r).then(res=>{if(res.ok&&(same||LIBS.includes(r.url)))c.put(r,res.clone());return res}).catch(()=>null);
    if(hit){e.waitUntil(net);return hit}
    return(await net)||(r.mode==='navigate'?c.match('index.html'):Response.error());
  })());
});
