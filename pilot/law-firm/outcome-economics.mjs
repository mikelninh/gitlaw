/** Internal decision support, not billing or accounting. No case text belongs here.
 * Rows are one unique attempt; group them by outcomeId. Never discard failed costs.
 * Real customer results and synthetic rehearsals must not share a report.
 */
const finiteNonnegative=(v,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0)throw new TypeError(`${name} must be a finite nonnegative number`);return v;};
const optional=(v,name)=>v===null?null:finiteNonnegative(v,name);
const sumOrUnknown=values=>values.some(v=>v===null)?null:values.reduce((a,b)=>a+b,0);
const divide=(a,b)=>a===null||b===null||b===0?null:a/b;
export function summariseOutcomes(rows, {revenueNetEur=null,paymentFeesEur=null,allocatedHostingEur=null}={}) {
 if(!Array.isArray(rows)||!rows.length)throw new TypeError('At least one attempt is required');
 const ids=new Set(),outcomes=new Map(),classes=new Set();
 for(const r of rows){
  if(!r||typeof r.attemptId!=='string'||!r.attemptId||typeof r.outcomeId!=='string'||!r.outcomeId)throw new TypeError('Stable opaque attempt and outcome IDs are required');
  if(ids.has(r.attemptId))throw new Error('Duplicate attemptId');ids.add(r.attemptId);
  if(!['synthetic','observed'].includes(r.evidenceClass))throw new Error('Unknown evidence class');classes.add(r.evidenceClass);
  if(!['accepted','rejected','pending','failed'].includes(r.status))throw new Error('Unknown outcome status');
  if(r.status==='accepted' && r.reviewerConfirmed!==true)throw new Error('Acceptance requires a recorded human review');
  for(const k of ['modelEur','toolsEur','operatorMinutes','operatorHourlyEur','customerMinutes'])optional(r[k],k);
  if(typeof r.criticalFailure!=='boolean')throw new TypeError('criticalFailure must be explicitly recorded');
  if(r.baselineMinutes!==null)finiteNonnegative(r.baselineMinutes,'baselineMinutes');
  const group=outcomes.get(r.outcomeId)??[];group.push(r);outcomes.set(r.outcomeId,group);
 }
 if(classes.size!==1)throw new Error('Synthetic and observed evidence must be reported separately');
 const synthetic=classes.has('synthetic');
 if(synthetic && revenueNetEur!==null)throw new Error('Synthetic evidence cannot carry customer revenue');
 let accepted=0;const baseline=[],after=[];
 for(const attempts of outcomes.values()){
  const acceptedRows=attempts.filter(r=>r.status==='accepted');
  if(acceptedRows.length>1)throw new Error('One final acceptance per outcome is allowed; version new work separately');
  if(acceptedRows.length&&attempts.at(-1).status!=='accepted')throw new Error('Acceptance cannot precede later attempts; resolve review first');
  if(acceptedRows.length){accepted++;const bases=attempts.map(r=>r.baselineMinutes).filter(v=>v!==null);if(bases.length&&bases.some(v=>v!==bases[0]))throw new Error('Conflicting baseline for an outcome');baseline.push(bases.length?bases[0]:null);after.push(sumOrUnknown(attempts.map(r=>r.customerMinutes)));}
 }
 const model=sumOrUnknown(rows.map(r=>r.modelEur)),tools=sumOrUnknown(rows.map(r=>r.toolsEur));
 const operator=sumOrUnknown(rows.map(r=>r.operatorMinutes===null||r.operatorHourlyEur===null?null:r.operatorMinutes/60*r.operatorHourlyEur));
 const revenue=optional(revenueNetEur,'revenueNetEur'),fees=optional(paymentFeesEur,'paymentFeesEur'),hosting=optional(allocatedHostingEur,'allocatedHostingEur');
 const total=sumOrUnknown([model,tools,operator,fees,hosting]);
 const baselineTotal=sumOrUnknown(baseline),afterTotal=sumOrUnknown(after);
 const paired=accepted>0&&baselineTotal!==null&&afterTotal!==null;
 const costKnown=total!==null,critical=rows.some(r=>r.criticalFailure);
 return {schema:'gitlaw.outcome-economics.v1',evidenceClass:synthetic?'synthetic':'observed',attempts:rows.length,outcomes:outcomes.size,acceptedOutcomes:accepted,realAcceptedOutcomes:synthetic?0:accepted,criticalFailure:critical,costs:{modelEur:model,toolsEur:tools,operatorEur:operator,paymentFeesEur:fees,allocatedHostingEur:hosting,totalEur:total},costPerAcceptedOutcomeEur:divide(total,accepted),revenueNetEur:revenue,contributionEur:revenue===null||!costKnown?null:revenue-total,contributionMargin:revenue===null||!costKnown?null:divide(revenue-total,revenue),acceptedCohortBaselineMinutes:paired?baselineTotal:null,acceptedCohortCustomerMinutes:paired?afterTotal:null,acceptedCohortMinutesSaved:paired?baselineTotal-afterTotal:null,customerMinutesAllAttempts:sumOrUnknown(rows.map(r=>r.customerMinutes)),decision:critical?'BLOCK':synthetic?'DEMO_ONLY':!accepted||!costKnown||revenue===null?'MEASURE_MORE':'REVIEW_WITH_CUSTOMER',limitations:['No automatic legal or production authorization.','Revenue is operator-supplied; reconcile it with invoices, refunds and accounting.','Contribution excludes unallocated development, acquisition, fixed overhead and tax.','Accepted-cohort time effects do not establish causal savings for all attempted cases.']};
}
