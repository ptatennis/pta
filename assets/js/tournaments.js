let all=[];const list=document.querySelector('#tournamentList');
function render(filter='all'){
 list.innerHTML='';all.filter(t=>filter==='all'||t.status===filter).forEach(t=>{
  const el=document.createElement('article');el.className='tournament card reveal';
  const rounds=t.bracket.length?t.bracket.map(r=>`<div class="round"><h4>${r.round}</h4>${r.matches.map(m=>`<div class="bracket-match"><div class="bracket-player ${m.winner===1?'winner':''}"><span>${m.p1}</span></div><div class="bracket-player ${m.winner===2?'winner':''}"><span>${m.p2}</span></div><div class="bracket-score">${m.score}</div></div>`).join('')}</div>`).join(''):'<div class="muted">Сетка будет опубликована после жеребьёвки.</div>';
  el.innerHTML=`<div class="tournament-summary"><img class="t-logo" src="${t.logo}"><div class="t-summary"><h3>${t.name}</h3><div class="meta"><span>📍 ${t.location}</span><span>📅 ${t.dates}</span><span>🎾 ${t.surfaceLabel}</span></div></div><div><span class="status ${t.status}">${t.statusLabel}</span><div class="chevron">⌄</div></div></div><div class="tournament-body"><div class="t-body-inner"><p class="t-description">${t.description}</p><div class="t-info-grid"><div class="card prizes"><div class="eyebrow">Призовой фонд</div>${t.prizes.map(p=>`<div class="prize"><span>${p.place}</span><strong>${p.money}</strong><span>${p.points} очков</span></div>`).join('')}</div><div><div class="eyebrow">Турнирная сетка</div><div class="bracket">${rounds}</div></div></div></div></div>`;
  el.querySelector('.tournament-summary').onclick=()=>el.classList.toggle('open');list.append(el);observer?.observe?.(el);
 });document.querySelectorAll('.reveal').forEach(x=>x.classList.add('visible'));
}
fetch('data/tournaments.json').then(r=>r.json()).then(data=>{all=data;render()});document.querySelectorAll('.chip').forEach(c=>c.onclick=()=>{document.querySelectorAll('.chip').forEach(x=>x.classList.remove('active'));c.classList.add('active');render(c.dataset.filter)});
