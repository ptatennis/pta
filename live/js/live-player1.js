(function(){
  'use strict';

  let match=null, index=0, playing=false, mainTimer=null, internalTimers=[];
  let ballAnimation=null, shadowAnimation=null;
  let synchronizedMode=false, liveStartTimestamp=null, resyncTimer=null;
  let state={sets:[0,0],games:[0,0],points:['0','0'],server:0,setNumber:1,gameNumber:1};
  let positions={players:[{x:50,y:17},{x:50,y:83}],ball:{x:50,y:50}};
  const $=id=>document.getElementById(id);

  const COURT_POSITIONS={
    neutral:[{x:50,y:16},{x:50,y:84}],
    returnBase:[{x:50,y:22},{x:50,y:78}]
  };

  function later(fn,ms){
    const id=setTimeout(fn,Math.max(0,ms));
    internalTimers.push(id);
    return id;
  }

  function clearTimers(){
    clearTimeout(mainTimer);
    internalTimers.forEach(clearTimeout);
    internalTimers=[];
    if(ballAnimation){ ballAnimation.cancel(); ballAnimation=null; }
    if(shadowAnimation){ shadowAnimation.cancel(); shadowAnimation=null; }
  }

  function setMatch(data){
    clearTimers();
    match=data; index=0; playing=false;
    $('name0').textContent=data.players[0].name;
    $('name1').textContent=data.players[1].name;
    $('p0').querySelector('.tag').textContent=initials(data.players[0].name);
    $('p1').querySelector('.tag').textContent=initials(data.players[1].name);
    $('surfaceLabel').textContent=data.surfaceLabel;
    if($('courtSurfaceTitle')) $('courtSurfaceTitle').textContent=data.surfaceLabel;
    applySurface(data.surface);
    $('log').innerHTML=''; $('stats').innerHTML='';
    state={sets:[0,0],games:[0,0],points:['0','0'],server:0,setNumber:1,gameNumber:1};
    resetPositions();
    renderScore();
    renderProgress();
    $('currentPhase').textContent='Матч готов';
    $('status').textContent='Матч готов к трансляции.';

    configureSynchronizedBroadcast();
  }

  function initials(name){ return name.split(' ').filter(Boolean).map(x=>x[0]).join('').slice(0,3).toUpperCase(); }

  function applySurface(surface){
    const court=$('court');
    court.classList.remove('surface-hard','surface-grass','surface-clay');
    court.classList.add('surface-'+(surface||'hard'));
    document.body.dataset.surface=surface||'hard';
  }

  function resetPositions(){
    movePlayer(0,COURT_POSITIONS.neutral[0].x,COURT_POSITIONS.neutral[0].y,0);
    movePlayer(1,COURT_POSITIONS.neutral[1].x,COURT_POSITIONS.neutral[1].y,0);
    setBall(50,50);
  }

  function renderScore(){
    for(let i=0;i<2;i++){
      $('sets'+i).textContent=state.sets[i];
      $('games'+i).textContent=state.games[i];
      $('points'+i).textContent=state.points[i];
      $('row'+i).classList.toggle('serving',state.server===i);
      $('p'+i).classList.toggle('is-serving',state.server===i);
    }
    if(match) $('serverBanner').textContent=`Подаёт: ${match.players[state.server].name}`;
  }

  function renderProgress(rally='—'){
    $('setNumber').textContent=state.setNumber;
    $('gameNumber').textContent=state.gameNumber;
    $('rallyNumber').textContent=rally;
  }

  function log(text){
    const div=document.createElement('div');
    div.className='log-entry';
    div.textContent=text;
    $('log').prepend(div);
  }

  function playerName(i){ return match.players[i].name; }

  function movePlayer(i,x,y,ms=380,mode='run'){
    const el=$('p'+i);
    const prev=positions.players[i];
    const distance=Math.hypot(x-prev.x,y-prev.y);
    el.style.setProperty('--move-duration',Math.max(0,ms)+'ms');
    el.classList.toggle('running',mode==='run' && distance>3 && ms>80);
    el.classList.toggle('recovering',mode==='recover');
    el.classList.toggle('anticipating',mode==='anticipate');
    el.classList.toggle('moving-left',x<prev.x-.5);
    el.classList.toggle('moving-right',x>prev.x+.5);
    el.style.left=x+'%';
    el.style.top=y+'%';
    positions.players[i]={x,y};
    later(()=>el.classList.remove('running','recovering','anticipating','moving-left','moving-right'),ms+50);
  }

  function setBall(x,y){
    const ball=$('ball'), shadow=$('ballShadow');
    ball.style.left=x+'%'; ball.style.top=y+'%';
    shadow.style.left=x+'%'; shadow.style.top=y+'%';
    shadow.style.opacity='.42';
    positions.ball={x,y};
  }

  function trajectoryFrames(start,end,serve=false){
    const frames=[];
    const steps=serve?8:10;
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const x=start.x+(end.x-start.x)*t;
      const y=start.y+(end.y-start.y)*t;
      const arc=Math.sin(Math.PI*t)*(serve?1.75:1.38);
      frames.push({
        left:x+'%', top:y+'%',
        transform:`translate(-50%,-50%) scale(${1+arc*.22})`,
        offset:t
      });
    }
    return frames;
  }

  function shadowFrames(start,end,serve=false){
    const frames=[];
    const steps=serve?8:10;
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const x=start.x+(end.x-start.x)*t;
      const y=start.y+(end.y-start.y)*t;
      const arc=Math.sin(Math.PI*t);
      frames.push({
        left:x+'%',top:y+'%',
        transform:`translate(-50%,-50%) scale(${1-arc*.38})`,
        opacity:String(.42-arc*.25),
        offset:t
      });
    }
    return frames;
  }

  function animateBallTo(x,y,ms=360,serve=false){
    const ball=$('ball'), shadow=$('ballShadow');
    if(ballAnimation)ballAnimation.cancel();
    if(shadowAnimation)shadowAnimation.cancel();
    const start={...positions.ball};
    ball.classList.add('in-flight');
    ballAnimation=ball.animate(trajectoryFrames(start,{x,y},serve),{
      duration:Math.max(100,ms), easing:'linear', fill:'forwards'
    });
    shadowAnimation=shadow.animate(shadowFrames(start,{x,y},serve),{
      duration:Math.max(100,ms), easing:'linear', fill:'forwards'
    });
    positions.ball={x,y};
    ballAnimation.onfinish=()=>{
      ball.style.left=x+'%'; ball.style.top=y+'%';
      shadow.style.left=x+'%'; shadow.style.top=y+'%'; shadow.style.opacity='.42';
      ball.classList.remove('in-flight');
      ballAnimation.cancel(); ballAnimation=null;
      if(shadowAnimation){shadowAnimation.cancel(); shadowAnimation=null;}
    };
  }

  function animateRacket(i,type='swing'){
    const el=$('p'+i);
    el.classList.remove('swing','serve-motion');
    void el.offsetWidth;
    el.classList.add(type);
    later(()=>el.classList.remove(type),460);
  }

  function showBounce(x,y){
    const b=$('bounce');
    b.style.left=x+'%'; b.style.top=y+'%';
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  }

  function showContact(x,y,player){
    const flash=$('hitFlash'), ball=$('ball'), athlete=$('p'+player);
    flash.style.left=x+'%'; flash.style.top=y+'%';
    flash.classList.remove('show');
    ball.classList.remove('at-contact');
    athlete.classList.remove('contact');
    void flash.offsetWidth;
    flash.classList.add('show');
    ball.classList.add('at-contact');
    athlete.classList.add('contact');
    later(()=>{flash.classList.remove('show');ball.classList.remove('at-contact');athlete.classList.remove('contact');},260);
  }

  function servePosition(playerIndex){
    const pointIndex=scorePointIndex(state.points);
    const deuceSide=pointIndex%2===0;
    const x=deuceSide?61:39;
    return playerIndex===0?{x,y:12}:{x:100-x,y:88};
  }

  function scorePointIndex(points){
    const value={'0':0,'15':1,'30':2,'40':3,'AD':4};
    return (value[points[0]]||0)+(value[points[1]]||0);
  }

  function fallbackServeTarget(serverIndex,zone){
    const xByZone={wide:29,body:45,tee:58};
    let x=xByZone[zone]||50;
    if(serverIndex===1)x=100-x;
    return{x,y:serverIndex===0?61:39};
  }

  function fallbackShotTarget(hitter,target){
    const x={left:28,center:50,right:72}[target]||50;
    return{x,y:hitter===0?79:21};
  }

  function contactOffset(playerIndex,contact){
    const lateral=contact.x<50?2.4:-2.4;
    return{
      x:Math.max(18,Math.min(82,contact.x+lateral)),
      y:Math.max(playerIndex===0?9:55,Math.min(playerIndex===0?45:91,contact.y+(playerIndex===0?-1.8:1.8)))
    };
  }

  function recoveryPosition(playerIndex,from){
    const home=COURT_POSITIONS.neutral[playerIndex];
    return{
      x:home.x+(from.x-home.x)*.28,
      y:home.y+(from.y-home.y)*.38
    };
  }

  function prepareOpponent(opponent,target,duration){
    const approach=contactOffset(opponent,target);
    movePlayer(opponent,approach.x,approach.y,duration,'anticipate');
  }

  function playServe(e,duration){
    const server=e.player,receiver=1-server;
    const pos=servePosition(server);
    const target=e.visualTarget||fallbackServeTarget(server,e.zone);
    const setup=Math.max(170,Math.min(360,duration*.30));
    const toss=Math.max(120,duration*.15);
    const flight=Math.max(250,duration*.47);

    movePlayer(server,pos.x,pos.y,setup,'run');
    movePlayer(receiver,COURT_POSITIONS.returnBase[receiver].x,COURT_POSITIONS.returnBase[receiver].y,setup,'anticipate');
    setBall(pos.x+(server===0?2:-2),pos.y+(server===0?3:-3));

    later(()=>{
      animateBallTo(pos.x,pos.y+(server===0?-5:5),toss,true);
    },Math.max(20,setup-toss));

    later(()=>{
      animateRacket(server,'serve-motion');
      showContact(pos.x,pos.y+(server===0?-3:3),server);
      animateBallTo(target.x,target.y,flight,true);
      prepareOpponent(receiver,target,flight*.88);
      later(()=>showBounce(target.x,target.y),flight*.80);
      const recover=recoveryPosition(server,pos);
      later(()=>movePlayer(server,recover.x,recover.y,flight*.72,'recover'),flight*.12);
    },setup);
  }

  function playShot(e,duration){
    const hitter=e.player,opponent=1-hitter;
    const contact=e.contact||{...positions.ball};
    const target=e.visualTarget||fallbackShotTarget(hitter,e.target);
    const finalStep=Math.max(90,Math.min(190,duration*.18));
    const hold=Math.max(45,Math.min(85,duration*.07));
    const flight=Math.max(260,duration*.62);
    const hitterPos=contactOffset(hitter,contact);

    /* Предыдущий удар уже направил игрока сюда; сейчас только последний шаг к мячу. */
    movePlayer(hitter,hitterPos.x,hitterPos.y,finalStep,'run');
    animateBallTo(contact.x,contact.y,finalStep*.88,false);

    later(()=>{
      setBall(contact.x,contact.y);
      showContact(contact.x,contact.y,hitter);
      animateRacket(hitter,'swing');
    },finalStep);

    later(()=>{
      animateBallTo(target.x,target.y,flight,false);

      if(e.isFinal && e.finishType==='winner' && e.pointWinner===hitter){
        /* Победный удар: соперник читает направление поздно и остаётся в стороне от мяча. */
        const miss=e.defenderTarget||{
          x:target.x<50?Math.min(80,target.x+24):Math.max(20,target.x-24),
          y:opponent===0?22:78
        };
        movePlayer(opponent,miss.x,miss.y,flight*.76,'run');
      }else if(e.isFinal && e.finishType==='unforced_error'){
        /* При ошибке мяч уходит в аут, а соперник не бежит точно в точку падения. */
        const ready=recoveryPosition(opponent,positions.players[opponent]);
        movePlayer(opponent,ready.x,ready.y,flight*.58,'anticipate');
      }else{
        prepareOpponent(opponent,target,flight*.88);
      }

      later(()=>showBounce(target.x,target.y),flight*.80);
      const recover=recoveryPosition(hitter,hitterPos);
      later(()=>movePlayer(hitter,recover.x,recover.y,flight*.68,'recover'),flight*.18);
    },finalStep+hold);
  }

  function settleAfterPoint(winner){
    const loser=1-winner;
    const winnerHome=recoveryPosition(winner,positions.players[winner]);
    const loserHome=recoveryPosition(loser,positions.players[loser]);
    movePlayer(winner,winnerHome.x,winnerHome.y,350,'recover');
    movePlayer(loser,loserHome.x,loserHome.y,350,'recover');
  }

  function playEvent(e,duration){
    switch(e.type){
      case 'match_start':
        state.server=e.server;
        $('currentPhase').textContent='Начало матча';
        log(`Матч начался. Первым подаёт ${playerName(e.server)}.`);
        $('status').textContent=`Матч начался. Первым подаёт ${playerName(e.server)}.`;
        break;
      case 'game_start':
        state.server=e.server;
        state.games=e.games;
        state.points=['0','0'];
        state.setNumber=e.setNumber;
        state.gameNumber=e.games[0]+e.games[1]+1;
        renderProgress();
        resetPositions();
        $('currentPhase').textContent=`${e.setNumber}-й сет • гейм ${state.gameNumber}`;
        $('status').textContent=`${playerName(e.server)} готовится к подаче.`;
        break;
      case 'serve':
        $('currentPhase').textContent=e.firstServe?'Первая подача':'Вторая подача';
        $('status').textContent=`${playerName(e.player)} выполняет подачу — ${e.speed} км/ч${e.firstServe?'':' (вторая)'}.`;
        playServe(e,duration);
        break;
      case 'fault':
        $('currentPhase').textContent='Ошибка подачи';
        $('status').textContent='Первая подача не попала в квадрат.';
        break;
      case 'shot':
        renderProgress(e.rallyIndex);
        $('currentPhase').textContent=`Розыгрыш • удар ${e.rallyIndex}`;
        $('status').textContent=`${playerName(e.player)} успевает к мячу и бьёт ${e.shot==='forehand'?'форхендом':'бэкхендом'}.`;
        playShot(e,duration);
        break;
      case 'point_end': {
        const [a,b]=e.score.split(':'); state.points=[a,b];
        const finish={ace:'эйс',double_fault:'двойная ошибка',winner:'удар навылет',unforced_error:'невынужденная ошибка'}[e.finishType];
        $('currentPhase').textContent='Очко завершено';
        $('status').textContent=`${playerName(e.winner)} берёт очко — ${finish}.`;
        log(`${playerName(e.winner)} выигрывает очко: ${finish}. Счёт ${e.score}.`);
        settleAfterPoint(e.winner);
        break;
      }
      case 'game_end':
        state.games=e.games; state.points=['0','0'];
        $('currentPhase').textContent='Гейм завершён';
        $('status').textContent=`Гейм выигрывает ${playerName(e.winner)}.`;
        log(`Гейм за ${playerName(e.winner)}. Счёт по геймам ${e.games[0]}:${e.games[1]}.`);
        break;
      case 'set_end':
        state.sets=e.sets; state.games=[0,0]; state.points=['0','0'];
        $('currentPhase').textContent=`${e.setNumber}-й сет завершён`;
        $('status').textContent=`Сет за ${playerName(e.winner)}.`;
        log(`${playerName(e.winner)} выигрывает сет ${e.score[0]}:${e.score[1]}.`);
        break;
      case 'match_end':
        renderStats(e.stats);
        $('currentPhase').textContent='Матч завершён';
        $('status').textContent=`Победитель матча — ${playerName(e.winner)}!`;
        log(`Матч окончен. Победитель — ${playerName(e.winner)}.`);
        break;
    }
    renderScore();
  }

  function renderStats(stats){
    const rows=[
      ['Эйсы','aces'],['Двойные ошибки','doubleFaults'],['Виннеры','winners'],
      ['Невынужденные ошибки','unforcedErrors'],['Выигранные очки','pointsWon'],
      ['Выигранные брейк-пойнты','breakPointsWon'],['Самый длинный розыгрыш','longestRally']
    ];
    $('stats').innerHTML=`<div class="stats-head">Показатель</div><div class="stats-head">${initials(match.players[0].name)}</div><div class="stats-head">${initials(match.players[1].name)}</div>`+
      rows.map(([label,key])=>`<div>${label}</div><div class="stat-value">${stats[0][key]}</div><div class="stat-value">${stats[1][key]}</div>`).join('');
  }


  function configureSynchronizedBroadcast(){
    const params=new URLSearchParams(window.location.search);
    const rawStart=params.get('start');
    const parsedStart=rawStart ? Number(rawStart) : NaN;

    synchronizedMode=Number.isFinite(parsedStart);
    liveStartTimestamp=synchronizedMode ? parsedStart : null;

    if(!synchronizedMode){
      setManualControls(true);
      return;
    }

    setManualControls(false);
    synchronizeToClock(true);

    clearInterval(resyncTimer);
    resyncTimer=setInterval(()=>{
      if(!document.hidden) synchronizeToClock(false);
    },5000);
  }

  function setManualControls(enabled){
    const play=$('play');
    const pause=$('pause');
    const speed=$('speed');

    if(play){
      play.disabled=!enabled;
      play.textContent=enabled?'▶ Начать трансляцию':'● Синхронизированный эфир';
    }
    if(pause) pause.disabled=!enabled;
    if(speed){
      speed.disabled=!enabled;
      if(!enabled) speed.value='1';
    }
  }

  function synchronizeToClock(force=false){
    if(!synchronizedMode || !match || !Number.isFinite(liveStartTimestamp)) return;

    clearTimers();
    const elapsed=Math.max(0,Date.now()-liveStartTimestamp);

    if(elapsed < 0){
      playing=false;
      return;
    }

    rebuildSnapshot(elapsed);

    if(index>=match.events.length){
      playing=false;
      return;
    }

    playing=true;
    const nextEvent=match.events[index];
    const wait=Math.max(0,nextEvent.time-elapsed);

    if(force || wait<80){
      mainTimer=setTimeout(stepSynchronized,wait);
    }else{
      mainTimer=setTimeout(stepSynchronized,wait);
    }
  }

  function rebuildSnapshot(elapsed){
    clearTimers();
    index=0;
    state={sets:[0,0],games:[0,0],points:['0','0'],server:0,setNumber:1,gameNumber:1};
    positions={players:[{...COURT_POSITIONS.neutral[0]},{...COURT_POSITIONS.neutral[1]}],ball:{x:50,y:50}};
    resetPositions();
    $('log').innerHTML='';
    $('stats').innerHTML='';

    const messages=[];

    while(index<match.events.length && match.events[index].time<=elapsed){
      applySnapshotEvent(match.events[index],messages);
      index++;
    }

    renderScore();
    renderProgress();
    renderSnapshotMessages(messages.slice(-35));

    if(index>=match.events.length){
      $('currentPhase').textContent='Матч завершён';
    }else{
      const next=match.events[index];
      const seconds=Math.max(0,Math.ceil((next.time-elapsed)/1000));
      if(seconds>1) $('status').textContent=`Прямой эфир синхронизирован. Следующее событие через ${seconds} сек.`;
    }
  }

  function applySnapshotEvent(e,messages){
    switch(e.type){
      case 'match_start':
        state.server=e.server;
        messages.push(`Матч начался. Первым подаёт ${playerName(e.server)}.`);
        break;
      case 'game_start':
        state.server=e.server;
        state.games=[...e.games];
        state.points=['0','0'];
        state.setNumber=e.setNumber;
        state.gameNumber=e.games[0]+e.games[1]+1;
        positions.players=[{...COURT_POSITIONS.neutral[0]},{...COURT_POSITIONS.neutral[1]}];
        positions.ball={x:50,y:50};
        break;
      case 'serve': {
        const server=e.player;
        const receiver=1-server;
        const pos=servePosition(server);
        const target=e.visualTarget||fallbackServeTarget(server,e.zone);
        positions.players[server]={...pos};
        positions.players[receiver]=contactOffset(receiver,target);
        positions.ball={...target};
        break;
      }
      case 'shot': {
        const hitter=e.player;
        const opponent=1-hitter;
        const contact=e.contact||positions.ball;
        const target=e.visualTarget||fallbackShotTarget(hitter,e.target);
        positions.players[hitter]=recoveryPosition(hitter,contactOffset(hitter,contact));
        if(e.isFinal && e.finishType==='winner' && e.pointWinner===hitter){
          positions.players[opponent]=e.defenderTarget||recoveryPosition(opponent,positions.players[opponent]);
        }else if(e.isFinal && e.finishType==='unforced_error'){
          positions.players[opponent]=recoveryPosition(opponent,positions.players[opponent]);
        }else{
          positions.players[opponent]=contactOffset(opponent,target);
        }
        positions.ball={...target};
        break;
      }
      case 'point_end': {
        const [a,b]=e.score.split(':');
        state.points=[a,b];
        const finish={ace:'эйс',double_fault:'двойная ошибка',winner:'удар навылет',unforced_error:'невынужденная ошибка'}[e.finishType]||'очко';
        messages.push(`${playerName(e.winner)} выигрывает очко: ${finish}. Счёт ${e.score}.`);
        $('currentPhase').textContent='Очко завершено';
        $('status').textContent=`${playerName(e.winner)} берёт очко — ${finish}.`;
        break;
      }
      case 'game_end':
        state.games=[...e.games];
        state.points=['0','0'];
        messages.push(`Гейм за ${playerName(e.winner)}. Счёт по геймам ${e.games[0]}:${e.games[1]}.`);
        break;
      case 'set_end':
        state.sets=[...e.sets];
        state.games=[0,0];
        state.points=['0','0'];
        state.setNumber=e.setNumber+1;
        messages.push(`${playerName(e.winner)} выигрывает сет ${e.score[0]}:${e.score[1]}.`);
        break;
      case 'match_end':
        renderStats(e.stats);
        $('currentPhase').textContent='Матч завершён';
        $('status').textContent=`Победитель матча — ${playerName(e.winner)}!`;
        messages.push(`Матч окончен. Победитель — ${playerName(e.winner)}.`);
        break;
    }

    movePlayer(0,positions.players[0].x,positions.players[0].y,0,'recover');
    movePlayer(1,positions.players[1].x,positions.players[1].y,0,'recover');
    setBall(positions.ball.x,positions.ball.y);
  }

  function renderSnapshotMessages(messages){
    $('log').innerHTML='';
    messages.forEach(message=>log(message));
  }

  function stepSynchronized(){
    if(!playing || !match || !synchronizedMode) return;

    const elapsed=Math.max(0,Date.now()-liveStartTimestamp);

    if(index>=match.events.length){
      playing=false;
      return;
    }

    const event=match.events[index];
    const lag=elapsed-event.time;

    if(lag>1800){
      synchronizeToClock(true);
      return;
    }

    if(event.time>elapsed+40){
      mainTimer=setTimeout(stepSynchronized,event.time-elapsed);
      return;
    }

    const next=match.events[index+1];
    const rawDuration=next?Math.max(120,next.time-event.time):700;
    const minimum=event.type==='shot'?520:event.type==='serve'?600:260;
    const duration=Math.max(minimum,rawDuration);

    index++;
    playEvent(event,duration);

    if(event.type==='match_end'){
      playing=false;
      return;
    }

    const nextElapsed=Math.max(0,Date.now()-liveStartTimestamp);
    const wait=next?Math.max(0,next.time-nextElapsed):duration;
    mainTimer=setTimeout(stepSynchronized,wait);
  }

  function step(){
    if(!playing||!match||index>=match.events.length)return;
    const e=match.events[index];
    const next=match.events[index+1];
    const speed=Math.max(.25,Number($('speed').value)||1);
    const raw=next?next.time-e.time:700;
    const minimum=e.type==='shot'?520:e.type==='serve'?600:260;
    const duration=Math.max(minimum,raw/speed);
    index++;
    playEvent(e,duration);
    if(e.type==='match_end'){playing=false;return;}
    mainTimer=setTimeout(step,duration);
  }

  $('play').onclick=()=>{
    if(synchronizedMode)return;
    if(!match)return;
    if(index>=match.events.length)setMatch(match);
    if(playing)return;
    playing=true;
    step();
  };
  $('pause').onclick=()=>{
    if(synchronizedMode)return;
    playing=false;
    clearTimers();
  };
  $('file').onchange=async e=>{
    const file=e.target.files[0];
    if(file)setMatch(JSON.parse(await file.text()));
  };

  document.addEventListener('visibilitychange',()=>{
    if(synchronizedMode && !document.hidden) synchronizeToClock(true);
  });
  window.addEventListener('focus',()=>{
    if(synchronizedMode) synchronizeToClock(true);
  });
  window.addEventListener('pageshow',()=>{
    if(synchronizedMode && match) synchronizeToClock(true);
  });

  fetch('data/live-match.json',{cache:'no-store'})
    .then(r=>{if(!r.ok)throw new Error();return r.json();})
    .then(setMatch)
    .catch(()=>{$('status').textContent='Положи live-match.json в public/data или выбери файл вручную.';});
})();
