(async()=>{
  const base='https://cdn.jsdelivr.net/gh/mikelninh/gitlaw@110900d582af0b36b1b2df05bd3bd3c5b2ab8326/demo/outcome-engine/index.html';
  const live='https://cdn.jsdelivr.net/gh/mikelninh/gitlaw@d85d3171ea42a75f1df6a02c80d6572b425777eb/demo/outcome-engine/live-gitlaw.js';
  try{
    const response=await fetch(base,{cache:'no-store'});
    if(!response.ok)throw new Error(`UI ${response.status}`);
    const source=await response.text();
    const parsed=new DOMParser().parseFromString(source,'text/html');
    const scripts=[...parsed.querySelectorAll('script')].map(s=>s.textContent||'');
    parsed.querySelectorAll('script').forEach(s=>s.remove());
    document.title=parsed.title||'Outcome Engine';
    document.head.innerHTML=parsed.head.innerHTML;
    document.body.innerHTML=parsed.body.innerHTML;
    for(const code of scripts){
      const element=document.createElement('script');
      element.textContent=code;
      document.body.appendChild(element);
    }
    const adapter=document.createElement('script');
    adapter.src=live;
    adapter.onload=()=>document.documentElement.dataset.backend='gitlaw-live';
    adapter.onerror=()=>{throw new Error('Live adapter konnte nicht geladen werden')};
    document.body.appendChild(adapter);
  }catch(error){
    document.body.innerHTML=`<main style="min-height:100vh;display:grid;place-items:center;font-family:system-ui;background:#f4f2ed;color:#17201d"><div><h1>Demo konnte nicht geladen werden</h1><p>${String(error.message||error)}</p></div></main>`;
  }
})();
