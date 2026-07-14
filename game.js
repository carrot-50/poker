/* ================= 세븐포커 =================
   카드 이미지 규칙: cards/랭크_of_무늬.png
   예) cards/ace_of_spades.png, cards/10_of_hearts.png, cards/king_of_clubs.png
   뒷면: cards/back.png
   이미지가 없으면 자동으로 CSS 카드로 표시됩니다.
============================================== */
const CARD_CONFIG = {
  path: 'cards/',
  ext: '.png',
  suitFile: { S: 'spades', D: 'diamonds', H: 'hearts', C: 'clubs' },
  rankFile: r => ({1:'ace',11:'jack',12:'queen',13:'king'}[r] || String(r)),
  back: 'back'
};

const SUITS = ['S','D','H','C'];                 // 서열: ♠ > ◆ > ♥ > ♣
const SUIT_RANK = { S:4, D:3, H:2, C:1 };
const SUIT_SYM  = { S:'♠', D:'◆', H:'♥', C:'♣' };
const SUIT_RED  = { S:false, D:true, H:true, C:false };

const ANTE = 100, PPING = 100, START_MONEY = 10000, MAX_RAISES = 2;

const HAND_NAMES = {
  13:'로열 스트레이트 플러시', 12:'백 스트레이트 플러시', 11:'스트레이트 플러시',
  10:'포카드', 9:'풀하우스', 8:'플러시', 7:'마운틴', 6:'백 스트레이트',
  5:'스트레이트', 4:'트리플', 3:'투페어', 2:'원페어', 1:'탑'
};
const RANK_KO = r => ({14:'A',13:'K',12:'Q',11:'J'}[r] || String(r));

/* ---------- 유틸 ---------- */
const $ = id => document.getElementById(id);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rv = c => c.r === 1 ? 14 : c.r;   // A는 14로 취급

function buildDeck(){
  const d = [];
  for(const s of SUITS) for(let r=1;r<=13;r++) d.push({r,s});
  for(let i=d.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [d[i],d[j]]=[d[j],d[i]]; }
  return d;
}

/* ---------- 족보 판정 (5장) ---------- */
function eval5(cards){
  const cs = [...cards].sort((a,b)=> rv(b)-rv(a) || SUIT_RANK[b.s]-SUIT_RANK[a.s]);
  const vals = cs.map(rv);
  const flush = cs.every(c=>c.s===cs[0].s);
  const uniq = [...new Set(vals)];
  let straightHigh = 0, isBack = false;
  if(uniq.length===5){
    if(vals[0]-vals[4]===4) straightHigh = vals[0];
    else if(vals.join()==='14,5,4,3,2'){ straightHigh = 5; isBack = true; }
  }
  const cnt = {};
  vals.forEach(v=>cnt[v]=(cnt[v]||0)+1);
  const groups = Object.entries(cnt).map(([v,n])=>({v:+v,n})).sort((a,b)=> b.n-a.n || b.v-a.v);
  const topSuit = SUIT_RANK[cs[0].s];

  if(flush && straightHigh===14) return [13, topSuit];
  if(flush && isBack)            return [12, topSuit];
  if(flush && straightHigh)      return [11, straightHigh, topSuit];
  if(groups[0].n===4){
    const kick = groups.find(g=>g.n===1).v;
    return [10, groups[0].v, kick];
  }
  if(groups[0].n===3 && groups[1].n===2) return [9, groups[0].v, groups[1].v];
  if(flush) return [8, ...vals, topSuit];
  if(straightHigh===14) return [7, topSuit];                       // 마운틴
  if(isBack)            return [6, SUIT_RANK[cs.find(c=>rv(c)===5).s]];
  if(straightHigh)      return [5, straightHigh, SUIT_RANK[cs.find(c=>rv(c)===straightHigh).s]];
  if(groups[0].n===3){
    const ks = groups.filter(g=>g.n===1).map(g=>g.v);
    return [4, groups[0].v, ...ks];
  }
  if(groups[0].n===2 && groups[1].n===2){
    const kick = groups.find(g=>g.n===1).v;
    const pairSuit = Math.max(...cs.filter(c=>rv(c)===groups[0].v).map(c=>SUIT_RANK[c.s]));
    return [3, groups[0].v, groups[1].v, kick, pairSuit];
  }
  if(groups[0].n===2){
    const ks = groups.filter(g=>g.n===1).map(g=>g.v);
    const pairSuit = Math.max(...cs.filter(c=>rv(c)===groups[0].v).map(c=>SUIT_RANK[c.s]));
    return [2, groups[0].v, ...ks, pairSuit];
  }
  return [1, ...vals, topSuit];
}

function combos(arr, k){
  const out = [];
  (function go(start, cur){
    if(cur.length===k){ out.push([...cur]); return; }
    for(let i=start;i<arr.length;i++){ cur.push(arr[i]); go(i+1,cur); cur.pop(); }
  })(0,[]);
  return out;
}

function cmpScore(a,b){
  const n = Math.max(a.length,b.length);
  for(let i=0;i<n;i++){ const d=(a[i]||0)-(b[i]||0); if(d) return d; }
  return 0;
}

function bestHand(cards){
  if(cards.length<=5){
    // 5장 미만: 페어류/탑만 부분 판정
    const sc = evalPartial(cards);
    return { score: sc, name: HAND_NAMES[sc[0]] || '탑' };
  }
  let best = null;
  for(const c of combos(cards,5)){
    const sc = eval5(c);
    if(!best || cmpScore(sc,best)>0) best = sc;
  }
  return { score: best, name: HAND_NAMES[best[0]] };
}

function evalPartial(cards){
  const cs=[...cards].sort((a,b)=>rv(b)-rv(a)||SUIT_RANK[b.s]-SUIT_RANK[a.s]);
  const vals=cs.map(rv), cnt={};
  vals.forEach(v=>cnt[v]=(cnt[v]||0)+1);
  const groups=Object.entries(cnt).map(([v,n])=>({v:+v,n})).sort((a,b)=>b.n-a.n||b.v-a.v);
  const topSuit=SUIT_RANK[cs[0].s];
  if(groups[0]?.n===4) return [10, groups[0].v];
  if(groups[0]?.n===3 && groups[1]?.n===2) return [9, groups[0].v, groups[1].v];
  if(groups[0]?.n===3) return [4, groups[0].v, ...groups.filter(g=>g.n===1).map(g=>g.v)];
  if(groups[0]?.n===2 && groups[1]?.n===2) return [3, groups[0].v, groups[1].v, ...groups.filter(g=>g.n===1).map(g=>g.v)];
  if(groups[0]?.n===2) return [2, groups[0].v, ...groups.filter(g=>g.n===1).map(g=>g.v)];
  return [1, ...vals, topSuit];
}

/* ---------- 상태 ---------- */
const players = [
  { id:0, name:'나',     money:START_MONEY, isHuman:true  },
  { id:1, name:'김포커', money:START_MONEY, isHuman:false },
  { id:2, name:'이올인', money:START_MONEY, isHuman:false },
];
let pot=0, deck=[], raisesThisStreet=0, gameOver=false;

/* ---------- 렌더링 ---------- */
function cardFileName(c){
  return CARD_CONFIG.path + CARD_CONFIG.rankFile(c.r) + '_of_' + CARD_CONFIG.suitFile[c.s] + CARD_CONFIG.ext;
}
function cardEl(c, faceUp, opts={}){
  const el = document.createElement('div');
  el.className = 'card dealt';
  if(!faceUp){
    el.classList.add('back');
    const img = new Image();
    img.src = CARD_CONFIG.path + CARD_CONFIG.back + CARD_CONFIG.ext;
    img.onerror = ()=> el.classList.add('noimg');
    el.appendChild(img);
    el.insertAdjacentHTML('beforeend','<div class="fb"></div>');
  }else{
    const img = new Image();
    const base = cardFileName(c);
    const alt  = base.replace(CARD_CONFIG.ext, '2'+CARD_CONFIG.ext);
    // J/Q/K는 인물 그림 버전(...2.png)을 우선 사용, 없으면 기본 버전으로
    const primary = (c.r>=11) ? alt : base;
    const secondary = (c.r>=11) ? base : alt;
    img.src = primary;
    let retried = false;
    img.onerror = ()=>{
      if(!retried){ retried = true; img.src = secondary; }
      else el.classList.add('noimg');
    };
    el.appendChild(img);
    const red = SUIT_RED[c.s] ? ' red':'';
    const rk = RANK_KO(rv(c));
    el.insertAdjacentHTML('beforeend',
      `<div class="fb${red}"><div class="corner">${rk}<br>${SUIT_SYM[c.s]}</div>`+
      `<div class="pip">${SUIT_SYM[c.s]}</div><div class="corner bottom">${rk}<br>${SUIT_SYM[c.s]}</div></div>`);
  }
  if(opts.hiddenMine) el.classList.add('hiddenmine');
  return el;
}

function render(){
  for(const p of players){
    $('money-'+p.id).textContent = p.money.toLocaleString();
    const seat = $('seat-'+p.id);
    seat.classList.toggle('folded', !!p.folded);
    const hand = $('hand-'+p.id);
    hand.innerHTML = '';
    if(!p.cards) continue;
    for(const c of p.cards){
      const showFace = p.isHuman || c.open || (p.reveal && !p.folded);
      hand.appendChild(cardEl(c, showFace, { hiddenMine: p.isHuman && !c.open }));
    }
    const rl = $('rank-'+p.id);
    if(p.isHuman && p.cards.length>=3){
      rl.textContent = '내 족보: ' + bestHand(p.cards).name;
    } else if(p.reveal && !p.folded && p.cards.length===7){
      rl.textContent = bestHand(p.cards).name;
    } else rl.textContent = '';
  }
  $('pot').textContent = pot.toLocaleString();
}

function log(html){
  const el = $('log');
  el.insertAdjacentHTML('beforeend', `<div>${html}</div>`);
  el.scrollTop = el.scrollHeight;
}
function msg(t){ $('msg').textContent = t; }
function setActing(id){
  players.forEach(p=>$('seat-'+p.id).classList.remove('acting'));
  if(id!=null) $('seat-'+id).classList.add('acting');
}
function setBoss(id){
  players.forEach(p=>$('seat-'+p.id).classList.remove('boss'));
  if(id!=null) $('seat-'+id).classList.add('boss');
}
function showBanner(title, sub){
  $('banner-title').textContent = title;
  $('banner-sub').textContent = sub;
  $('banner').classList.add('show');
}
function hideBanner(){ $('banner').classList.remove('show'); }

/* ---------- 버튼 ---------- */
function buttons(list){
  return new Promise(resolve=>{
    const box = $('actions'); box.innerHTML='';
    for(const b of list){
      const btn = document.createElement('button');
      btn.className = 'btn' + (b.style ? ' '+b.style : '');
      btn.textContent = b.label;
      if(b.disabled) btn.disabled = true;
      btn.onclick = ()=>{ box.innerHTML=''; resolve(b.value); };
      box.appendChild(btn);
    }
  });
}
function pickCard(playerId, count, filter){
  return new Promise(resolve=>{
    const hand = $('hand-'+playerId);
    const els = [...hand.children];
    els.forEach((el,i)=>{
      if(filter && !filter(i)) return;
      el.classList.add('selectable');
      el.onclick = ()=>{
        els.forEach(e=>{ e.classList.remove('selectable'); e.onclick=null; });
        resolve(i);
      };
    });
  });
}

/* ---------- AI 판단 ---------- */
function aiDiscard(p){
  // 각 카드를 뺐을 때 남는 3장의 잠재력 평가
  let bestIdx=0, bestScore=-1;
  for(let i=0;i<4;i++){
    const rest = p.cards.filter((_,j)=>j!==i);
    let s = 0;
    const vals = rest.map(rv), suits = rest.map(c=>c.s);
    const cnt={}; vals.forEach(v=>cnt[v]=(cnt[v]||0)+1);
    for(const v in cnt){ if(cnt[v]===2) s+=60+ +v; if(cnt[v]===3) s+=200; }
    const sc={}; suits.forEach(x=>sc[x]=(sc[x]||0)+1);
    for(const x in sc){ if(sc[x]===3) s+=45; if(sc[x]===2) s+=8; }
    const sorted=[...new Set(vals)].sort((a,b)=>a-b);
    for(let k=0;k<sorted.length-1;k++) if(sorted[k+1]-sorted[k]<=2) s+=10;
    s += Math.max(...vals);
    if(s>bestScore){ bestScore=s; bestIdx=i; }
  }
  return bestIdx;
}
function aiOpen(p){
  // 페어는 숨기고, 가장 덜 중요한 카드를 오픈
  const vals = p.cards.map(rv), cnt={};
  vals.forEach(v=>cnt[v]=(cnt[v]||0)+1);
  let idx = 0, low = Infinity;
  p.cards.forEach((c,i)=>{
    const w = rv(c) + (cnt[rv(c)]>1 ? 100 : 0);
    if(w<low){ low=w; idx=i; }
  });
  return idx;
}
function aiStrength(p){
  const made = bestHand(p.cards).score;
  let s = made[0]*100 + (made[1]||0);
  // 드로우 보너스
  const sc={}; p.cards.forEach(c=>sc[c.s]=(sc[c.s]||0)+1);
  if(Math.max(...Object.values(sc))===4 && p.cards.length<7) s+=120;
  return s;
}
function aiDecide(p, toCall, street){
  const s = aiStrength(p) + (Math.random()*80-40);
  const potOdds = toCall / Math.max(pot,1);
  if(toCall===0){
    if(s>350 && p.money>PPING && raisesThisStreet<MAX_RAISES){
      const r = Math.random();
      if(r<0.35) return 'half';
      if(r<0.6) return 'quarter';
    }
    if(s>280 && raisesThisStreet<MAX_RAISES && Math.random()<0.3) return 'pping';
    return 'check';
  }
  if(raisesThisStreet<MAX_RAISES && p.money>toCall*2){
    if(s>420 && Math.random()<0.5) return 'half';
    if(s>330 && Math.random()<0.4) return 'quarter';
  }
  if(s>250) return 'call';
  if(s>150 && potOdds<0.35) return 'call';
  if(street<=5 && potOdds<0.2) return 'call';
  return 'die';
}

/* ---------- 베팅 ---------- */
function alive(){ return players.filter(p=>!p.folded && p.money>0 || (!p.folded && p.allin)); }
function activeBettors(){ return players.filter(p=>!p.folded); }

function bossOf(list){
  let boss = null, bestSc = null;
  for(const p of list){
    const open = p.cards.filter(c=>c.open);
    const sc = evalPartial(open);
    if(!bestSc || cmpScore(sc,bestSc)>0){ bestSc=sc; boss=p; }
  }
  return boss;
}

async function bettingRound(street){
  raisesThisStreet = 0;
  const live = activeBettors();
  if(live.length<=1) return;
  const boss = bossOf(live);
  setBoss(boss.id);
  log(`— ${street}구 베팅 · 보스: <span class="hl">${boss.name}</span>`);

  players.forEach(p=>p.bet=0);
  let currentBet = 0;
  let order = [];
  const start = players.indexOf(boss);
  for(let i=0;i<players.length;i++) order.push(players[(start+i)%players.length]);
  order = order.filter(p=>!p.folded);

  let idx = 0, lastRaiser = null, acted = new Set();
  const checkDone = ()=>{
    const live = activeBettors();
    return live.every(p=> acted.has(p.id) && (p.bet===currentBet || p.money===0));
  };
  while(true){
    const p = order[idx % order.length];
    idx++;
    if(p.folded || p.money===0){ acted.add(p.id); if(checkDone()) break; continue; }
    if(p===lastRaiser) break;

    const toCall = currentBet - p.bet;
    setActing(p.id);
    let action;
    if(p.isHuman){
      const quarter = Math.min(toCall + Math.ceil((pot+toCall)/4), p.money);
      const half    = Math.min(toCall + Math.ceil((pot+toCall)/2), p.money);
      const list = [];
      if(toCall===0){
        list.push({label:'체크', value:'check'});
        if(raisesThisStreet<MAX_RAISES){
          list.push({label:`삥 (${PPING})`, value:'pping', style:'gold', disabled:p.money<PPING});
          list.push({label:`쿼터 (${quarter.toLocaleString()})`, value:'quarter', disabled:p.money<quarter||quarter<=0});
          list.push({label:`하프 (${half.toLocaleString()})`, value:'half', disabled:p.money<half||half<=0});
        }
      }else{
        list.push({label:`콜 (${Math.min(toCall,p.money).toLocaleString()})`, value:'call', style:'gold'});
        if(raisesThisStreet<MAX_RAISES){
          list.push({label:`쿼터 (${quarter.toLocaleString()})`, value:'quarter', disabled:p.money<=toCall});
          list.push({label:`하프 (${half.toLocaleString()})`, value:'half', disabled:p.money<=toCall});
        }
      }
      list.push({label:'다이', value:'die', style:'red'});
      msg('당신 차례입니다');
      action = await buttons(list);
    }else{
      await sleep(700);
      action = aiDecide(p, toCall, street);
      if(['half','quarter','pping'].includes(action) && raisesThisStreet>=MAX_RAISES) action = toCall>0?'call':'check';
      if(action==='pping' && (toCall>0 || p.money<PPING)) action = toCall>0?'call':'check';
    }

    if(action==='die'){
      p.folded = true;
      log(`<span class="lose">${p.name} 다이</span>`);
      msg(`${p.name} 다이`);
    }else if(action==='check'){
      log(`${p.name} 체크`);
      acted.add(p.id);
    }else if(action==='call'){
      const amt = Math.min(toCall, p.money);
      p.money-=amt; p.bet+=amt; pot+=amt;
      log(`${p.name} 콜 (${amt.toLocaleString()})`);
      acted.add(p.id);
    }else if(action==='pping'){
      const amt = Math.min(PPING, p.money);
      p.money-=amt; p.bet+=amt; pot+=amt; currentBet=p.bet;
      raisesThisStreet++; lastRaiser=p; acted=new Set([p.id]);
      log(`${p.name} <span class="hl">삥 ${amt.toLocaleString()}</span>`);
    }else if(action==='quarter' || action==='half'){
      const div = action==='quarter' ? 4 : 2;
      const raiseTo = toCall + Math.ceil((pot+toCall)/div);
      const amt = Math.min(raiseTo, p.money);
      p.money-=amt; p.bet+=amt; pot+=amt; currentBet=Math.max(currentBet,p.bet);
      raisesThisStreet++; lastRaiser=p; acted=new Set([p.id]);
      log(`${p.name} <span class="hl">${action==='quarter'?'쿼터':'하프'} ${amt.toLocaleString()}</span>`);
    }
    render();
    if(activeBettors().length===1) break;
    if(checkDone()) break;
  }
  setActing(null);
}

/* ---------- 게임 진행 ---------- */
async function playHand(){
  hideBanner();
  $('actions').innerHTML='';
  deck = buildDeck(); pot = 0;
  players.forEach(p=>{ p.cards=[]; p.folded=false; p.reveal=false; p.bet=0; });
  setBoss(null);

  // 앤티
  for(const p of players){
    const a = Math.min(ANTE, p.money);
    p.money-=a; pot+=a;
  }
  log(`<br>═══ 새 판 시작 (앤티 ${ANTE}) ═══`);

  // 4장 배분
  for(let i=0;i<4;i++) for(const p of players) p.cards.push({...deck.pop(), open:false});
  render();

  // 1장 버리기
  msg('버릴 카드 1장을 선택하세요');
  const d = await pickCard(0, 1);
  players[0].cards.splice(d,1);
  for(const p of players) if(!p.isHuman) p.cards.splice(aiDiscard(p),1);
  render();

  // 1장 오픈
  msg('공개할 카드 1장을 선택하세요');
  const o = await pickCard(0, 1);
  players[0].cards[o].open = true;
  for(const p of players) if(!p.isHuman) p.cards[aiOpen(p)].open = true;
  render();
  log('각자 1장씩 오픈');

  await bettingRound(4);

  // 5구, 6구
  for(const street of [5,6]){
    if(activeBettors().length<=1) break;
    for(const p of players) if(!p.folded) p.cards.push({...deck.pop(), open:true});
    render();
    log(`${street}번째 카드 오픈`);
    await bettingRound(street);
  }

  // 7구 히든
  if(activeBettors().length>1){
    for(const p of players) if(!p.folded) p.cards.push({...deck.pop(), open:false});
    render();
    log('7번째 카드 (히든) 지급');
    await bettingRound(7);
  }

  // 결과
  const live = activeBettors();
  let winner;
  if(live.length===1){
    winner = live[0];
    log(`<span class="hl">${winner.name}</span> 승리 — 전원 다이 (팟 ${pot.toLocaleString()})`);
  }else{
    players.forEach(p=>{ if(!p.folded) p.reveal=true; });
    let bestSc=null;
    for(const p of live){
      const bh = bestHand(p.cards);
      p.finalName = bh.name;
      log(`${p.name}: <span class="hl">${bh.name}</span>`);
      if(!bestSc || cmpScore(bh.score,bestSc)>0){ bestSc=bh.score; winner=p; }
    }
  }
  winner.money += pot;
  render();
  const sub = winner.finalName ? `${winner.finalName} · 팟 ${pot.toLocaleString()} 획득` : `팟 ${pot.toLocaleString()} 획득`;
  showBanner(winner.isHuman ? 'YOU WIN!' : `${winner.name} 승리`, sub);
  msg('');
  pot = 0;

  // 파산 체크
  await sleep(600);
  if(players[0].money<ANTE){
    await buttons([{label:'파산… 다시 시작', value:'restart', style:'red'}]);
    players.forEach(p=>p.money=START_MONEY);
  }else{
    players.forEach(p=>{ if(!p.isHuman && p.money<ANTE) p.money=START_MONEY; });
    await buttons([{label:'다음 판', value:'next', style:'gold'}]);
  }
  playHand();
}

$('btn-start').onclick = ()=>{ playHand(); };
render();
