
(() => {
  const style=document.createElement('style');
  style.textContent=`
    .privacy.demo::before{background:#c88418;box-shadow:0 0 0 5px rgba(200,132,24,.12)}
    .backend-proof{display:none;margin:12px 0;border:1px solid rgba(23,107,87,.2);background:#edf8f3;border-radius:16px;padding:13px;font-size:12px;color:#315c50;line-height:1.5}
    .backend-proof.visible{display:block}.backend-proof strong{color:var(--accent)}
    .trace-tools{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px}.trace-tool{background:white;border:1px solid rgba(23,107,87,.14);border-radius:999px;padding:4px 7px;font-size:10px;font-weight:800}
    .error-box{display:none;margin:12px 0;border:1px solid rgba(161,60,60,.25);background:#fff1f1;color:#7c2929;border-radius:16px;padding:13px;font-size:13px;line-height:1.45}.error-box.visible{display:block}
  `;
  document.head.appendChild(style);

  const privacy=document.querySelector('.privacy');
  const appStatus=document.querySelector('.app-head .status');
  privacy.id='privacyStatus'; appStatus.id='appStatus';
  const warning=document.getElementById('warning');
  const backendProof=document.createElement('div'); backendProof.id='backendProof'; backendProof.className='backend-proof';
  const errorBox=document.createElement('div'); errorBox.id='errorBox'; errorBox.className='error-box';
  warning.after(backendProof,errorBox);
  els.backendProof=backendProof; els.errorBox=errorBox; els.privacyStatus=privacy; els.appStatus=appStatus;

  const originalSelectScenario=selectScenario;
  const originalResetResults=resetResults;
  const originalShowResults=showResults;
  const originalDecision=decision;

  function updateMode(){
    const live=currentKey==='legal';
    privacy.textContent=live?'Live GitLaw API · ausschließlich Demo-Daten':'Interaktiver Browser-Prototyp · keine Übertragung';
    privacy.classList.toggle('demo',!live);
    appStatus.innerHTML=live?'Kanzlei: <strong>Live GitLaw API</strong> · kein automatischer Versand':'Produktprototyp · <strong>lokale Auswertung</strong> · keine Übertragung';
    els.runBtn.textContent=live?'Live mit GitLaw analysieren →':'Outcome Engine starten →';
  }

  selectScenario=function(key){ originalSelectScenario(key); updateMode(); };
  resetResults=function(){
    originalResetResults();
    backendProof.classList.remove('visible'); backendProof.innerHTML='';
    errorBox.classList.remove('visible'); errorBox.textContent='';
    document.querySelector('.result-top').style.display='';
    document.querySelector('.cards').style.display='';
    document.querySelector('.review').style.display='';
    els.runBtn.textContent=currentKey==='legal'?'Live mit GitLaw analysieren →':'Outcome Engine starten →';
  };

  function isoToGerman(iso){const m=String(iso||'').match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}.${m[2]}.${m[1]}`:iso;}
  async function runLive(text){
    const started=performance.now();
    const r=await fetch('/api/analyze',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({letter_text:text})
    });
    const p=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(p.upstream_error||p.detail||p.error||`Live gateway failed (${r.status})`);
    const a=p.artefacts||{},c=a.classification||{},f=a.frist||{},meta=a.meta||{};
    const docs=(a.required_documents||[]).map(d=>d.name_de||d.name||String(d)).filter(Boolean);
    const draft=a.mandant_notification?.body||a.anwalt_response?.body||'Kein Entwurf erzeugt — manuell prüfen.';
    const relative=!f.deadline_iso&&Boolean(f.raw_text),missing=!f.deadline_iso&&!f.raw_text,matched=Boolean(a.matched_case);
    const tasks=[matched?`Akte ${a.matched_case.aktenzeichen||'zugeordnet'} öffnen`:'Akte manuell zuordnen'];
    if(f.deadline_iso||f.raw_text)tasks.push('Frist nach Originalprüfung vormerken');
    if(docs.length)tasks.push(`${docs.length} angeforderte Unterlage${docs.length===1?'':'n'} anfordern`);
    if(a.mandant_notification||a.anwalt_response)tasks.push('Entwurf anwaltlich prüfen');
    const blockers=[];if(!matched)blockers.push('keine eindeutige Aktenzuordnung');if(relative)blockers.push('relative Frist benötigt Zugangsdatum');if(missing)blockers.push('keine eindeutige Frist erkannt');
    const trace=(p.tool_trace||[]).map(t=>t.tool).filter(Boolean);
    return {type:(c.letter_type?c.letter_type.replaceAll('_',' '):(meta.betreff||'Behördenkorrespondenz')),summary:p.final_message||c.reasoning_de||'GitLaw hat den Brief strukturiert verarbeitet.',deadline:{date:f.deadline_iso?isoToGerman(f.deadline_iso):(f.raw_text||'Nicht eindeutig erkannt'),relative,missing},docs:docs.length?docs:['Keine ausdrücklich geforderten Unterlagen erkannt'],tasks,draft,urgency:c.urgency?c.urgency[0].toUpperCase()+c.urgency.slice(1):'Manuell prüfen',blocker:blockers.length>0,warning:blockers.length?`Sicher gestoppt: ${blockers.join(' · ')}.`:'Live-Ergebnis: Vor Freigabe gegen das Originaldokument prüfen.',live:true,backend:{runId:p.agent_run_id||'—',status:p.status||'completed',latencyMs:p.gateway?.elapsed_ms||Math.round(performance.now()-started),costUsd:Number(p.total_cost_usd||0),iterations:p.iterations||trace.length,trace}};
  }

  showResults=function(r){
    originalShowResults(r);
    els.confidence.textContent=r.live?'GitLaw live':'Demo-Auswertung';
    if(r.backend){const b=r.backend;backendProof.innerHTML=`<strong>Live backend execution</strong><br>Run ${escapeHtml(b.runId)} · ${escapeHtml(b.status)} · ${(b.latencyMs/1000).toFixed(1)} s · $${b.costUsd.toFixed(4)} · ${b.iterations} iterations<div class="trace-tools">${b.trace.map(t=>`<span class="trace-tool">${escapeHtml(t)}</span>`).join('')}</div>`;backendProof.classList.add('visible');}
    errorBox.classList.remove('visible');
  };

  runWorkflow=async function(){
    const text=els.documentText.value.trim();if(text.length<50){alert('Bitte füge einen aussagekräftigen Dokumenttext ein.');return;}
    resetResults();els.runBtn.disabled=true;els.runBtn.textContent=currentKey==='legal'?'GitLaw verarbeitet live …':'Workflow läuft …';
    try{
      steps[0].classList.add('active');await new Promise(r=>setTimeout(r,180));steps[0].classList.remove('active');steps[0].classList.add('done');
      steps[1].classList.add('active');currentResult=currentKey==='legal'?await runLive(text):makeResult(text);steps[1].classList.remove('active');steps[1].classList.add('done');
      for(let i=2;i<5;i++){steps[i].classList.add('active');await new Promise(r=>setTimeout(r,140));steps[i].classList.remove('active');steps[i].classList.add('done');}
      steps[5].classList.add('active');showResults(currentResult);
    }catch(e){
      steps.forEach(s=>s.classList.remove('active'));els.resultEmpty.style.display='none';els.results.classList.add('visible');document.querySelector('.result-top').style.display='none';document.querySelector('.cards').style.display='none';document.querySelector('.review').style.display='none';errorBox.textContent=`Live-Verbindung fehlgeschlagen: ${e.message}. Es wurde kein lokales Ergebnis als echt ausgegeben.`;errorBox.classList.add('visible');currentResult=null;
    }finally{els.runBtn.disabled=false;els.runBtn.textContent=currentKey==='legal'?'Live erneut analysieren':'Erneut analysieren';}
  };
  decision=function(kind){originalDecision(kind);steps[5].classList.remove('active');steps[5].classList.add('done');};
  els.runBtn.onclick=runWorkflow;els.approveBtn.onclick=()=>decision('approve');els.reviseBtn.onclick=()=>decision('revise');els.rejectBtn.onclick=()=>decision('reject');
  const fine=document.querySelector('.fineprint');fine.textContent='Der Kanzlei-Fall ruft GitLaw Pro live auf und zeigt Agent-Run, Tool-Trace, Laufzeit und Kosten. Andere Rollen bleiben interaktive Produktprototypen. Keine Nachricht wird automatisch versendet.';
  updateMode();
})();
