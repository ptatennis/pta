Promise.all([fetch('data/site.json').then(r=>r.json()),fetch('data/tournaments.json').then(r=>r.json()),fetch('data/schedule.json').then(r=>r.json()),fetch('data/rankings.json').then(r=>r.json())]).then(([site,tournaments,schedule,rankings])=>{
 const active=tournaments.find(t=>t.status==='active')||tournaments[0];
 document.querySelector('#heroTournament').textContent=active.name;
 document.querySelector('#heroLocation').textContent=active.location;
 const next=schedule[0];document.querySelector('#miniMatch').innerHTML=`<div class="match-row"><b>${next.p1}</b><span class="score">${next.time}</span></div><div class="match-row"><b>${next.p2}</b><span>${next.date}</span></div>`;
 document.querySelector('#statPlayers').textContent=rankings.length;document.querySelector('#statEvents').textContent=tournaments.length;document.querySelector('#statLeader').textContent=rankings[0].name;document.querySelector('#statLive').textContent=site.live.active?'ON AIR':'OFF AIR';
});
