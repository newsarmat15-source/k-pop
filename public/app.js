let IDOLS=[], picked=null;         // picked = один выбранный айдол или null
const state={song:"ballad",clip:"girlcrush",dance:"lesserafim",genderTab:"girl",lang1:"ko",lang2:"ko",bilingual:false};
// Портреты — статичные файлы, всегда берём с живого хоста (нужен публичный HTTPS для fal.ai),
// независимо от того, где физически крутится сама генерация (локально/preview/прод).
const IMAGE_BASE="https://k-pop-black.vercel.app";

// Оплата спрятана до перехода на боевой Stripe-аккаунт. Сейчас в проде — тестовый
// (sandbox) ключ: реальная карта платёж не проведёт (charges_enabled=false). Показывать
// платёжку 10 приглашённым нельзя — потеряем человека на ошибке оплаты. Метрика 31.07 —
// возвраты, не выручка. Включить = true после боевого онбординга Stripe + STRIPE_WEBHOOK_SECRET.
const PAY_ENABLED=false;

// 5 унифицированных жанров: каждый = одна танцевальная энергия (см. GENRE_ALIAS в pipeline.js).
const SONG=[["ballad","Баллада","эмоции, минимум движений"],["girlcrush","Girl-crush","жёстко, хип-хоп/трэп"],
["retro","Ретро-фанк","грув, city-pop, R&B"],["future","Future","EDM, хайперпоп"],["easy","Y2K поп","лайтово, качает"]];
const LANGUAGE=[["ko","Корейский","родной язык K-pop"],["en","Английский",""],["ja","Японский",""],["zh","Китайский",""]];
const LANG_CODE={ko:"KR",en:"EN",ja:"JA",zh:"ZH"};
const LANG_COLOR={ko:"#e8a9c9",en:"#9fd8ff",ja:"#ffb3d9",zh:"#f3d9ac"};
const CLIP=[["girlcrush","Girl-crush","тёмная сцена, неон"],["ethereal","Ethereal","пастель, воздух"],
["neon","Neon city","ночной город"],["studio","Studio","чистый бэкдроп"],["street","Street","улица, деним"],["stage","Big stage","стадион, софиты"]];
const DANCE=[
["lesserafim","LE SSERAFIM","резкая, дерзкая","girl"],["aespa","aespa","футуризм, мощь","girl"],
["ive","IVE","элегантная","girl"],["idle","(G)I-DLE","чувственная","girl"],
["babymonster","BABYMONSTER","жёсткий хип-хоп","girl"],["katseye","KATSEYE","глобал-поп","girl"],
["blackpink","BLACKPINK","дерзко и элегантно","girl"],["newjeans","NewJeans","естественная, лёгкая","girl"],
["twice","TWICE","нежно и ярко","girl"],["meovv","MEOVV","бойцовская, дерзкая","girl"],
["straykids","Stray Kids","мощный хип-хоп","boy"],["ateez","ATEEZ","театральность, драйв","boy"],
["enhypen","ENHYPEN","атмосферность","boy"],["txt","TXT","лёгкость, тепло","boy"],
];
// Стилизованная типографика названий групп — не фото/лого, вариации шрифта/трекинга/наклона
// на основе двух декоративных гарнитур (Unbounded/Playfair), чтобы каждая "звучала" узнаваемо
// без копирования официального брендинга.
const WORDMARK={
  lesserafim:"font-family:var(--f-serif);font-style:italic;font-weight:600;letter-spacing:.02em",
  aespa:"font-family:var(--f-display);font-weight:900;letter-spacing:-.02em;text-transform:lowercase",
  ive:"font-family:var(--f-serif);font-style:italic;font-weight:800;letter-spacing:.01em",
  idle:"font-family:var(--f-display);font-weight:700;letter-spacing:.05em",
  babymonster:"font-family:var(--f-display);font-weight:900;letter-spacing:.06em",
  katseye:"font-family:var(--f-display);font-weight:500;letter-spacing:.14em",
  blackpink:"font-family:var(--f-display);font-weight:900;letter-spacing:-.01em",
  newjeans:"font-family:'Segoe UI',sans-serif;font-weight:300;letter-spacing:.18em",
  twice:"font-family:var(--f-display);font-weight:700;letter-spacing:.08em",
  meovv:"font-family:var(--f-display);font-weight:900;letter-spacing:.03em;font-style:italic",
  straykids:"font-family:var(--f-display);font-weight:900;letter-spacing:.02em;font-style:italic",
  ateez:"font-family:var(--f-display);font-weight:700;letter-spacing:.16em",
  enhypen:"font-family:var(--f-serif);font-weight:800;letter-spacing:.1em",
  txt:"font-family:var(--f-display);font-weight:500;letter-spacing:.1em",
};
function wordmark(key,label){
  const style=WORDMARK[key]||"";
  return style?`<span style="${style}">${label}</span>`:label;
}

function svgIcon(inner,color){
  return `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
}
function swatch(inner,color){
  return `<div class="swatch" style="background:${color}22">${svgIcon(inner,color)}</div>`;
}
const SONG_ICON={
  ballad:'<line x1="5" y1="4" x2="5" y2="20"/><line x1="9.5" y1="4" x2="9.5" y2="15"/><line x1="14" y1="4" x2="14" y2="20"/><line x1="18.5" y1="4" x2="18.5" y2="15"/>',
  girlcrush:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/>',
  retro:'<circle cx="12" cy="11" r="6.5"/><line x1="4" y1="16" x2="20" y2="16"/><line x1="4" y1="19" x2="20" y2="19"/>',
  future:'<polygon points="13,2 5,14 11,14 9,22 19,9 13,9"/>',
  easy:'<polyline points="2,13 7,6 11,18 15,4 19,15 22,10"/>',
};
const SONG_COLOR={ballad:"#f3d9ac",girlcrush:"#9fd8ff",retro:"#ffe9a8",future:"#ffb3d9",easy:"#e8a9c9"};
const CLIP_ICON={
  girlcrush:'<path d="M12 3 L20 20 L4 20 Z"/>',
  ethereal:'<circle cx="8" cy="14" r="4.5"/><circle cx="13" cy="10.5" r="5.5"/><circle cx="18" cy="15" r="3.5"/>',
  neon:'<rect x="3" y="12" width="4" height="9"/><rect x="10" y="6" width="4" height="15"/><rect x="17" y="9" width="4" height="12"/>',
  studio:'<path d="M4 21 V11 Q4 4 12 4 Q20 4 20 11 V21"/>',
  street:'<line x1="8" y1="2" x2="4" y2="22"/><line x1="16" y1="2" x2="20" y2="22"/><line x1="12" y1="3" x2="11" y2="9"/><line x1="10.4" y1="13" x2="9.6" y2="18"/>',
  stage:'<path d="M2 19 Q12 5 22 19"/><circle cx="7" cy="21" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="22" r="1.1" fill="currentColor" stroke="none"/><circle cx="17" cy="21" r="1.1" fill="currentColor" stroke="none"/>',
};
const CLIP_COLOR={girlcrush:"#e8a9c9",ethereal:"#c9a9ff",neon:"#9fd8ff",studio:"#c7b3da",street:"#c98f68",stage:"#d9a441"};
const DANCE_BURST='<line x1="12" y1="2" x2="12" y2="8"/><line x1="12" y1="16" x2="12" y2="22"/>'+
  '<line x1="2" y1="12" x2="8" y2="12"/><line x1="16" y1="12" x2="22" y2="12"/>'+
  '<line x1="4.9" y1="4.9" x2="9.2" y2="9.2"/><line x1="14.8" y1="14.8" x2="19.1" y2="19.1"/>'+
  '<line x1="19.1" y1="4.9" x2="14.8" y2="9.2"/><line x1="9.2" y1="14.8" x2="4.9" y2="19.1"/>';
const DANCE_COLOR={
  lesserafim:"#e8a9c9",aespa:"#c9a9ff",ive:"#f3d9ac",idle:"#ffb3d9",babymonster:"#c98f68",katseye:"#9fd8ff",
  blackpink:"#d980ab",newjeans:"#ffe9a8",twice:"#e8a9c9",meovv:"#b34a5e",
  straykids:"#8f7ad9",ateez:"#c98f68",enhypen:"#9fd8ff",txt:"#f3d9ac",
};
// Родные жанры каждой группы (зеркалит GROUP_STYLE.genres в api/pipeline.js) — только эти
// жанры реально дают ей узнаваемый набор фирменных движений, остальные жанры для группы
// заблокированы в UI. ballad — универсальный пул без привязки к группе (buildClipMoves
// игнорирует groupKey для баллад), поэтому доступна всегда.
const GROUP_GENRES={
  lesserafim:["girlcrush","future"], aespa:["future","girlcrush"], ive:["retro","easy"],
  idle:["girlcrush","retro"],        babymonster:["girlcrush","future"], katseye:["easy","future"],
  blackpink:["girlcrush","retro"],   newjeans:["easy","retro"], twice:["retro","easy"],
  meovv:["girlcrush","retro"],
};
function nativeGenres(){
  // Мужские группы — легаси-хореография (DANCE_LEGACY в pipeline.js), жанр песни на неё
  // не влияет, поэтому для них ограничение жанров не действует, доступны все 5.
  if(!GROUP_GENRES[state.dance]) return SONG.map(([v])=>v);
  return [...new Set([...GROUP_GENRES[state.dance],"ballad"])];
}

/* ===================== НАВИГАЦИЯ МЕЖДУ ЭКРАНАМИ ===================== */
async function showView(name){
  // Раньше showView мог отрисоваться ДО того, как первый checkAuth() успел загрузить
  // currentUser/myIdol/myTraining (гонка при быстром клике сразу после открытия страницы) —
  // "Мой продакшн" тогда ошибочно показывал витрину выбора айдола вместо реального кабинета,
  // пока фоновый запрос не досчитывался сам по себе через несколько кликов. Теперь любой
  // переход между экранами сперва дожидается первой проверки авторизации.
  // Сама эта проверка (+ подтяжка своего айдола) — это 2-4 последовательных запроса к Supabase
  // (регион Сеул), на первом заходе после открытия страницы это заметно на глаз — без спиннера
  // выглядит как зависание. На все последующие переходы authReady уже разрешён, ждать нечего.
  if(name==='cabinet-own'&&!authReadyDone){
    document.querySelectorAll('main').forEach(m=>m.classList.remove('show'));
    document.getElementById('view-cabinet').classList.add('show');
    document.querySelectorAll('.navtab').forEach(t=>t.classList.toggle('on',t.dataset.view==='cabinet-own'));
    document.getElementById('cabBody').innerHTML='<div style="padding:100px 0;text-align:center"><div class="spinner" style="margin:0 auto"></div></div>';
    window.scrollTo({top:0,behavior:'instant'});
  }
  await authReady;
  authReadyDone=true;
  // Конструктор ведёт прямиком к платной генерации (Kling+ElevenLabs) — без аккаунта туда
  // попадать нельзя ни с одной кнопки (раньше можно было зайти в обход через "Топ-чарт" и
  // сгенерировать клип анонимно, реальные деньги списывались без регистрации).
  if(name==='constructor'&&!currentUser){
    openAuth('signup');
    toast('Сначала зарегистрируйся — это займёт полминуты');
    return;
  }
  const elId = (name==='roster'||name.indexOf('cabinet')===0) ? 'view-cabinet' : 'view-'+name;
  document.querySelectorAll('main').forEach(m=>m.classList.remove('show'));
  document.getElementById(elId).classList.add('show');
  document.querySelectorAll('.navtab').forEach(t=>t.classList.toggle('on',t.dataset.view===name));
  if(name==='cabinet-own'){renderCabinet(null)}
  if(name==='roster'){renderRoster()}
  if(name==='lenta'){renderLenta()}
  if(name==='feed'){loadChart().then(renderChart)}
  window.scrollTo({top:0,behavior:'instant'});
  window._view=name;saveNav({view:name});
}
// Сохранение навигации — чтобы обновление страницы возвращало туда, где был.
function saveNav(o){try{localStorage.setItem('so_nav',JSON.stringify(o))}catch(e){}}
function loadNav(){try{return JSON.parse(localStorage.getItem('so_nav')||'null')}catch(e){return null}}
function navOv(ov,id){saveNav({view:window._view||'cabinet-own',ov:ov,id:id||null})}
function navClear(){saveNav({view:window._view||'cabinet-own'})}
function restoreOverlay(nav){
  if(!nav||!nav.ov||!currentUser)return;
  try{
    if(nav.ov==='lessons')openLessons();
    else if(nav.ov==='lesson'&&nav.id)openLesson(nav.id);
    else if(nav.ov==='lessonQuiz'&&nav.id)openLessonQuiz(nav.id);
    else if(nav.ov==='hangulMap')openHangulMap();
    else if(nav.ov==='name')openNameHangul();
    // Распевку после перезагрузки не перезапускаем молча — возвращаем в список.
    else if(nav.ov==='daily')openLessons();
    else if(nav.ov==='songs')openSongs();
    else if(nav.ov==='song'&&nav.id)openSong(nav.id);
    else if(nav.ov==='workbook')openWorkbook();
    else if(nav.ov==='chat')openChat();
  }catch(e){}
}
document.querySelectorAll('.navtab').forEach(t=>t.onclick=()=>showView(t.dataset.view));

function toast(msg){
  const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
  clearTimeout(toast._h);toast._h=setTimeout(()=>t.classList.remove('show'),2200);
}

/* ===================== ЧАРТ — реальные айдолы и голоса из базы ===================== */
let CHART=null;
async function loadChart(){
  const r=await fetch('/api/engage?action=chart');
  const d=await r.json();
  const entries=(d.entries||[]);
  CHART=entries.map(e=>{
    const days=Math.max(1,Math.floor((Date.now()-new Date(e.idol.created_at).getTime())/86400000)+1);
    return {...e, allTimeVotes:e.votes, weeksAtTop:0, fastRise:e.growth>100, streak:days};
  });
}
const LAUREL='<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M4 20c3-6 3-11 0-16"/><path d="M20 20c-3-6-3-11 0-16"/><path d="M4 6c2 1 3 1 4 0M3 10c2 1 3 1 4 0M3 14c2 1 3 1 4 0M20 6c-2 1-3 1-4 0M21 10c-2 1-3 1-4 0M21 14c-2 1-3 1-4 0"/><path d="M12 22 L12 15"/></svg>';
// Тонкие декоративные уголки-скобки по 4 углам портрета — элегантная рамка (в духе Infinity Nikki).
const CORNERS='<i class="tl"><svg viewBox="0 0 16 16"><path d="M1 9V1H9" fill="none" stroke="var(--gold)" stroke-width="1.4"/></svg></i>'+
  '<i class="tr"><svg viewBox="0 0 16 16"><path d="M1 9V1H9" fill="none" stroke="var(--gold)" stroke-width="1.4"/></svg></i>'+
  '<i class="bl"><svg viewBox="0 0 16 16"><path d="M1 9V1H9" fill="none" stroke="var(--gold)" stroke-width="1.4"/></svg></i>'+
  '<i class="br"><svg viewBox="0 0 16 16"><path d="M1 9V1H9" fill="none" stroke="var(--gold)" stroke-width="1.4"/></svg></i>';
const AI_BADGE='<span class="ai-badge">AI IDOL</span>';
// Крупные детализированные трофеи (а не тонкие обводки) — визуально в духе настоящих
// азиатских музыкальных премий (золотой диск на подставке / медаль-звезда / гранёный камень),
// но названия свои (см. awardsHtml) — не копируем чужие названия наград, только жанр картинки.
// Свой namespace для ID градиентов на инстанс, чтобы не конфликтовать при повторной отрисовке.
let _awardUid=0;
function ICON_DISC(){
  const id='gd'+(_awardUid++);
  return `<svg viewBox="0 0 64 64" width="56" height="56"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#ffe9b0"/><stop offset="55%" stop-color="#d9a441"/><stop offset="100%" stop-color="#9c7326"/>
    </linearGradient></defs>
    <rect x="24" y="52" width="16" height="6" fill="#4a3418"/><rect x="30" y="40" width="4" height="13" fill="#8a6a30"/>
    <circle cx="32" cy="26" r="22" fill="url(#${id})" stroke="#5c431c" stroke-width="1.5"/>
    <circle cx="32" cy="26" r="15" fill="none" stroke="#fff4d6" stroke-width="1" stroke-opacity=".5"/>
    <path d="M20 16 A18 18 0 0 1 44 14" stroke="#fff8e6" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>
    <circle cx="32" cy="26" r="4" fill="#fff4d6"/></svg>`;
}
function ICON_COMET(){
  const id='gs'+(_awardUid++);
  return `<svg viewBox="0 0 64 64" width="56" height="56"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#efe3ff"/><stop offset="55%" stop-color="#c9a9ff"/><stop offset="100%" stop-color="#8f6fd9"/>
    </linearGradient></defs>
    <path d="M20 40 L14 58 L26 50 Z" fill="#8f6fd9"/><path d="M44 40 L50 58 L38 50 Z" fill="#8f6fd9"/>
    <path d="M32 6 L38 22 L55 22 L41 32 L46 49 L32 39 L18 49 L23 32 L9 22 L26 22 Z" fill="url(#${id})" stroke="#5c4a8f" stroke-width="1.2"/></svg>`;
}
function ICON_DIAMOND(){
  const id='gg'+(_awardUid++);
  return `<svg viewBox="0 0 64 64" width="56" height="56"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#e3f6ff"/><stop offset="55%" stop-color="#9fd8ff"/><stop offset="100%" stop-color="#5aa8d9"/>
    </linearGradient></defs>
    <rect x="22" y="54" width="20" height="5" fill="#3a5a70"/>
    <path d="M12 22 L32 8 L52 22 L32 58 Z" fill="url(#${id})" stroke="#3a5a70" stroke-width="1.3"/>
    <path d="M12 22 H52 M22 22 L32 8 L42 22 M22 22 L32 58 M42 22 L32 58" stroke="#e8f8ff" stroke-width="1" opacity=".55" fill="none"/></svg>`;
}

// До 3 крупных наград-плашек — у каждой своё значение, свои имена (не заимствованные у реальных премий).
function awardsHtml(e){
  const tiles=[];
  if(e.weeksAtTop>0) tiles.push(`<div class="award-tile">${ICON_DISC()}<b>${e.weeksAtTop}×</b><div class="lbl">Легенда сцены<br>${e.weeksAtTop} нед. подряд в топ-3</div></div>`);
  if(e.fastRise) tiles.push(`<div class="award-tile comet">${ICON_COMET()}<b>Взлёт</b><div class="lbl">Быстрый взлёт<br>топ-3 за 1-ю неделю</div></div>`);
  tiles.push(`<div class="award-tile diamond">${ICON_DIAMOND()}<b>${e.allTimeVotes}</b><div class="lbl">Народный любимец<br>голосов за всё время</div></div>`);
  return `<div class="awards">${tiles.join('')}</div>`;
}

function renderChart(){
  if(!CHART.length){
    document.getElementById('podium').innerHTML='';
    document.getElementById('rows-hot').innerHTML='<div class="lenta-empty">Пока ни одного айдола в чарте — стань первым.</div>';
    document.getElementById('rows-all').innerHTML='';
    return;
  }
  const top3=CHART.slice(0,3);
  const hot=[...CHART].sort((a,b)=>b.growth-a.growth).slice(0,5);
  const pod=document.getElementById('podium');
  const order=[1,0,2]; // 2й слева, 1й в центре, 3й справа
  const roman={1:'I',2:'II',3:'III'};
  pod.innerHTML=order.map(i=>{
    const e=top3[i];if(!e)return'';
    const rank=i+1;
    return `<div class="p-col"><div class="p-card" data-rank="${rank}" onclick="openCabinetFor('${e.idol.id}')">
      <div class="laurel" style="color:${rank===1?'var(--gold)':rank===2?'var(--silver)':'var(--bronze)'}">${LAUREL}</div>
      <div class="ph${rank===1?' holo-frame':''}"><span class="num">${rank}</span><div class="ph-inner"><img src="${e.idol.img}"></div></div>
      <div class="nm">${e.idol.name}</div>
      ${rank===1?AI_BADGE:''}
      <div class="owner">@${e.owner} · ${e.idol.concept||''}</div>
      <div class="votes">${e.votes} <span>голосов</span></div>
    </div><div class="step" data-rank="${rank}">${roman[rank]}</div></div>`;
  }).join('');
  document.getElementById('rows-hot').innerHTML=hot.map((e,i)=>`
    <div class="row hot" onclick="openCabinetFor('${e.idol.id}')">
      <div class="rnum">${i+1}</div>
      <img class="rph" src="${e.idol.img}">
      <div class="rinfo"><b>${e.idol.name}</b><div class="sub">@${e.owner} · ${e.idol.concept||''}</div></div>
      <div class="rvotes">+${e.growth}%<small>за неделю</small></div>
    </div>`).join('');
  document.getElementById('rows-all').innerHTML=CHART.map((e,i)=>`
    <div class="row" onclick="openCabinetFor('${e.idol.id}')">
      <div class="rnum">${i+1}</div>
      <img class="rph" src="${e.idol.img}">
      <div class="rinfo"><b>${e.idol.name}</b><div class="sub">@${e.owner} · ${e.idol.concept||''} · 🔥${e.streak}д</div></div>
      <div class="rvotes">${e.votes}<small>голосов</small></div>
    </div>`).join('');
}
let viewedIdol=null; // последняя загруженная через /api/idol карточка чужого айдола
async function openCabinetFor(idolId){
  const r=await fetch('/api/idol?id='+encodeURIComponent(idolId));
  const d=await r.json();
  if(!r.ok||d.ok===false){toast(d.error||'Не удалось открыть');return}
  viewedIdol=d;
  showView('cabinet');
  renderCabinet({idol:d.idol,owner:d.owner},true);
}

/* ===================== ЛИЧНЫЙ КАБИНЕТ / ПРОДАКШН ===================== */
// Прогресс тренировок реально хранится в training_stats (см. api/train.js).
// Стрик поддержки за КОНКРЕТНОГО айдола реально хранится в follows (см. api/follow.js).

// Лестница членства — 찐팬 (джинпэн, "настоящий фан") как финальная ступень, компактный блок, не отдельная страница.
const SUPPORT_TIERS=[
  {min:0,name:"Новый саппортер",next:30},
  {min:30,name:"Преданный фанат",next:180},
  {min:180,name:"찐팬 (джинпэн)",next:null},
];
function supportTierHtml(streak){
  let tier=SUPPORT_TIERS[0];
  for(const t of SUPPORT_TIERS){ if(streak>=t.min) tier=t; }
  const pct=tier.next?Math.min(100,Math.round((streak-tier.min)/(tier.next-tier.min)*100)):100;
  return `<div class="fp-h"><span>Путь фаната</span><b>${tier.name}</b></div>
    <div class="bar"><i style="width:${pct}%"></i></div>
    <div class="fp-note">${tier.next?`ещё ${tier.next-streak} дн. поддержки до следующей ступени`:'высшая ступень достигнута'}</div>`;
}

// Лайв — честная демо-версия: фото-заглушка + короткая персональная фраза, без диалога (одностороннее сообщение).
const LIVE_GREETINGS=[
  "Доброе утро! Иду на тренировку — сегодня разучиваю новое движение 🎵",
  "Ой, устала после занятия языком, но горжусь собой — уже почти выучила хук!",
  "Просто хотела передать привет тебе, мой продюсер 💛",
];
// Продюсер отправляет вручную (не автоматика) — уходит и подписчикам, И самому продюсеру
// (он тоже получатель, не только отправитель — Лайв в первую очередь для хозяина, он платит).
function mockPushLive(name){
  toast(`Демо: уведомление ушло бы вам и всем подписчикам ${name} — нужен PWA для настоящих push`);
}
const bioState={}; // id -> текст описания айдола, только в памяти (честный макет, без БД)
const BIO_SAMPLE=["Мечтает выступить на главной сцене города. Обожает city-pop и репетирует до рассвета.",
  "Резкая в танце, тёплая в жизни. Коронный приём — разворот на последней доле.",
  "Тянется к экспериментам со стилем — от баллады до hyperpop за один вечер."];
function fmtRest(ms){
  if(ms<=0) return null;
  const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000);
  return h>0?`${h}ч ${m}м`:`${m}м`;
}
// Стабильный псевдослучайный индекс из id (UUID-строка) — замена "id % N" для не-числовых id.
function idHash(id,mod){
  const s=String(id);
  let h=0;
  for(let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))>>>0;
  return h%mod;
}
function renderCabinet(chartEntry,readOnly){
  const body=document.getElementById('cabBody');
  const isOther=!!chartEntry;
  const idol=isOther?chartEntry.idol:myIdol;
  document.querySelectorAll('.navtab').forEach(t=>t.classList.toggle('on',t.dataset.view==='cabinet-own'&&!isOther));

  if(!idol){
    // Первый экран продукта. Не описание и не ролик, а сам разбор в работе: строка поётся,
    // слова заливаются, снизу синхронно заливается смысл, в конце вскрывается компоновка —
    // «слово А + слово Б = третий смысл». Человек видит товар, а не обещание товара.
    body.innerHTML=`<div class="cab-empty">
      <div class="hd-eyebrow">${t('hd_eyebrow')}</div>
      <h2 class="pick-h">${t('hd_h')}</h2>
      <p class="hd-sub">${t('hd_sub')}</p>
      <div class="hd" id="heroDemo"></div>
      <button class="btn accent no-idol-btn" onclick="showView('roster')">${t('no_idol_btn')}</button>
      <p class="hd-foot">${t('hd_foot')}</p>
    </div>`;
    startHeroDemo();
    return;
  }
  const idolCreatedAt=isOther?viewedIdol.idol.created_at:myIdol.created_at;
  const streak=idolCreatedAt?Math.max(1,Math.floor((Date.now()-new Date(idolCreatedAt).getTime())/86400000)+1):1;
  const studyStreak=isOther?0:((myTraining&&myTraining.study_streak)||0);
  const league=isOther?viewedIdol.idol.league:myIdol.league;
  const langPct=isOther?0:Math.max((myTraining?myTraining.language_pct:0),Math.round(lessonPct()));
  const movesVal=isOther?viewedIdol.movesLearned:(myTraining?myTraining.dance_moves_learned:0);
  const mockAward=isOther?{weeksAtTop:0,fastRise:false,allTimeVotes:viewedIdol.votes}:{weeksAtTop:2,fastRise:false,allTimeVotes:movesVal*57+340};
  const clipsData=isOther?(viewedIdol.clips||[]):myClips;
  // Фотокарточки: открывается по мере прогресса. Старт — 1 открыта, остальные заблюрены (интрига).
  const TOTAL_CARDS=8;
  const unlockedCards=Math.min(TOTAL_CARDS,1+Math.ceil((langPct/100)*(TOTAL_CARDS-1)));

  const langRest=fmtRest(myTraining&&myTraining.language_cooldown_until?new Date(myTraining.language_cooldown_until).getTime()-Date.now():0);
  const danceRest=fmtRest(myTraining&&myTraining.dance_cooldown_until?new Date(myTraining.dance_cooldown_until).getTime()-Date.now():0);
  const bioText=isOther?(BIO_SAMPLE[idHash(idol.id,BIO_SAMPLE.length)]):(bioState[idol.id]||'');

  const lvl=Math.max(1,Math.round(langPct/10));
  const si=langPct>=60?2:langPct>=25?1:0;
  body.innerHTML = isOther ? `
    <button class="cab-back" onclick="showView('cabinet-own')">← Назад</button>
    <div class="idol-hero">
      <div class="idol-ph"><img src="${idol.img}"></div>
      <div class="idol-meta">
        <div class="idol-name">${idol.name} ${AI_BADGE}</div>
        <div class="idol-concept">${idol.concept}</div>
        <div class="idol-bio-ro">${bioText||''}</div>
      </div>
    </div>` : `
    <div class="home">
      <button class="onb-help" onclick="openOnb()" title="${t('onb_title')}">${t('onb_help_chip')}</button>
      <div class="idol-hero">
        <div class="idol-ph holo-frame"><div class="ph-inner"><img src="${idol.img}"></div></div>
        <div class="idol-meta">
          <div class="idol-name">${idol.name} ${AI_BADGE}</div>
          <div class="idol-concept">${idol.concept} ${t('concept_suffix')}</div>
          ${(()=>{
            // Полоса прогресса меряет не абстрактные проценты курса, а понятое в КОНКРЕТНОЙ
            // песне. Процент курса стоял на нуле после первого урока — это убивало мотивацию;
            // покрытие песни сдвигается с первого же разобранного слова.
            const c=songCoverage();
            if(!c)return `<div class="lvl">
              <div class="lvl-top"><span>${t('your_korean')}</span><b>${t('level')} ${lvl} · ${langPct}%</b></div>
              <div class="bar"><i style="width:${langPct}%"></i></div></div>`;
            return `<button class="lvl lvl-song" onclick="openSongs()">
              <div class="lvl-top"><span>${escapeHtml(c.title)}</span><b>${c.known}/${c.total}</b></div>
              <div class="bar"><i style="width:${c.pct}%"></i></div>
              <div class="lvl-note">${t('cov_note')(c.known,c.total)}</div>
            </button>`;
          })()}
          <div class="streak-row">
            <span class="streak-chip">${studyStreak>0?`🔥 ${studyStreak} ${t('streak_days')}`:`🔥 ${t('streak_start')}`}</span>
            <span class="streak-chip alt">🗓 ${streak} ${t('days_together')}</span>
          </div>
        </div>
      </div>

      <!-- Вход в продукт — песня, а не алфавит: человек приходит понять, о чём поют,
           а хангыль обслуживает это желание. Урок ушёл в плитки под кнопкой. -->
      <button class="lesson-cta" onclick="openSongs()">
        <span class="lc-emoji">🎵</span>
        <span class="lc-text"><b>${t('song_cta')}</b><small>${t('song_cta_sub')}</small></span>
        <span class="lc-arrow">→</span>
      </button>

      <div class="tiles">
        <button class="tile" onclick="openLessons()"><span class="t-emoji">🇰🇷</span><b>${t('tile_lesson')}</b><small>${t('tile_lesson_sub')(idol.name)}</small></button>
        <button class="tile" onclick="openWorkbook()"><span class="t-emoji">📓</span><b>${t('tile_wb')}</b><small>${t('tile_wb_sub')}</small></button>
        <button class="tile" onclick="openChat()"><span class="t-emoji">💬</span><b>${t('tile_phrase')}</b><small>${t('tile_phrase_sub')}</small></button>
      </div>

      <div class="coll">
        <div class="coll-h">${t('coll_h')} <span>${unlockedCards}/${TOTAL_CARDS}</span></div>
        <div class="coll-grid">${Array.from({length:TOTAL_CARDS}).map((_,i)=>i<unlockedCards
          ?`<img src="${idol.img}" alt="">`
          :`<div class="card-locked"><span class="cl-lock">🔒</span></div>`).join('')}</div>
        <div class="coll-note">${t('coll_note')(idol.name)}</div>
      </div>

      <div class="closeness">
        <div class="close-h">${t('close_h')}</div>
        <div class="close-stage">${t('close_stage')[si]}</div>
        <div class="bar"><i style="width:${Math.max(6,langPct)}%"></i></div>
        <div class="close-note">${t('close_note')(idol.name,t('speech')[si])}</div>
      </div>

      <button class="connect-link" onclick="openConnect()">${t('connect_link')}</button>
      ${PAY_ENABLED?`<button class="sub-link" onclick="startCheckout('sub')">${t('sub_link')}</button>`:''}
    </div>
  `;
  if(!isOther)maybeOnboard();
}
/* Покрытие песни: сколько её слов человек уже разобрал в тетрадь. Берём последнюю
   открытую песню; если ни одной ещё не открывал — первую из каталога, чтобы полоса
   с самого начала показывала конкретную цель, а не пустой процент. */
function songCoverage(){
  try{
    const st=(typeof studiedSongs==='function')?(studiedSongs()||[]):[];
    let title='',words=[];
    if(st.length&&st[0].verses){
      title=st[0].title||'';
      st[0].verses.forEach(v=>(v.words||[]).forEach(w=>words.push(w.kr)));
    }else{
      const S=(window.SONGS||[])[0];if(!S)return null;
      title=S.title||'';
      songWordsByVerse(S).forEach(g=>g.words.forEach(w=>words.push(w.kr)));
    }
    const uniq=[...new Set(words.filter(Boolean))];
    if(!uniq.length)return null;
    const have={};lsnVocab().forEach(v=>{if(v&&v.kr)have[v.kr]=1});
    const known=uniq.filter(k=>have[k]).length;
    return {title,known,total:uniq.length,pct:Math.round(known/uniq.length*100)};
  }catch(e){return null}
}

/* ===== Живое демо разбора на первом экране =====
   Берём настоящие строки из каталога (не выдуманный макет): если разбор изменится,
   демо изменится вместе с ним и врать не начнёт. Ни YouTube, ни звука, ни генерации —
   строка «поётся» по таймеру, поэтому экран открывается мгновенно и работает офлайн.
   Вторая строка выбрана намеренно: 설국열차 — самый наглядный случай, когда сумма слов
   не равна смыслу («снежная страна» + «поезд» = название фильма «Сквозь снег»).      */
const HD_PICK=[[0,0],[1,1]];   // [куплет, строка]
const HD_HOLD=2600;            // сколько держим строку с раскрытой компоновкой, мс
function heroDemoLines(){
  const S=(window.SONGS||[])[0];if(!S||!S.verses)return[];
  const L=getLang();
  return HD_PICK.map(([vi,li])=>{
    const v=S.verses[vi],ln=v&&v.lines&&v.lines[li];
    if(!ln||!ln.w||!ln.w.length)return null;
    return {title:S.title,artist:S.artist,
      w:ln.w.map(w=>({k:w.k||'',r:(L==='ru'&&w.rr)?w.rr:(w.r||w.rom||''),m:w[L]||w.ru||w.en||''})),
      s:(ln.s&&(ln.s[L]||ln.s.en||ln.s.ru))||'',
      c:(ln.c&&(ln.c[L]||ln.c.en||ln.c.ru))||''};
  }).filter(Boolean);
}
function startHeroDemo(){
  const host=document.getElementById('heroDemo');if(!host)return;
  const lines=heroDemoLines();
  if(!lines.length){host.style.display='none';return}
  const token=(window._hdToken=(window._hdToken|0)+1);   // старый цикл сам себя погасит
  let idx=0;
  const play=()=>{
    if(token!==window._hdToken||!document.getElementById('heroDemo'))return;
    const d=lines[idx];
    // слово тем дольше, чем длиннее — иначе короткие частицы «проглатываются»
    const dur=d.w.map(w=>320+90*Math.max(1,w.k.replace(/\s/g,'').length));
    const total=dur.reduce((a,b)=>a+b,0);
    const sw=d.s?d.s.split(/\s+/).filter(Boolean):[];
    host.innerHTML=`
      <div class="hd-src">${escapeHtml(d.title)} · ${escapeHtml(d.artist)}</div>
      <div class="kline hd-line">${d.w.map(w=>
        `<span class="tok"><span class="tok-k" data-txt="${attrEsc(w.k)}">${escapeHtml(w.k)}</span>`+
        `<span class="tok-r" data-txt="${attrEsc(w.r)}">${escapeHtml(w.r)}</span>`+
        `<span class="tok-m">${escapeHtml(w.m)}</span></span>`).join('')}</div>
      ${d.s?`<div class="ksl hd-s"><div class="ksl-row"><span class="ksl-t">${
        sw.map(x=>`<span class="ksw" data-txt="${attrEsc(x)}">${escapeHtml(x)}</span>`).join(' ')}</span></div></div>`:''}
      ${d.c?`<p class="hd-c" id="hdCombo">🔗 ${escapeHtml(d.c)}</p>`:''}`;
    const toks=host.querySelectorAll('.tok'),sws=host.querySelectorAll('.ksw');
    const swSeg=[];let acc=0;
    sws.forEach(e=>{const wt=(e.textContent||'').length+1;swSeg.push([acc,acc+wt]);acc+=wt;});
    const swTotal=acc||1;
    const t0=(window.performance&&performance.now)?performance.now():Date.now();
    const step=()=>{
      if(token!==window._hdToken||!document.getElementById('heroDemo'))return;
      const now=(window.performance&&performance.now)?performance.now():Date.now();
      const el=now-t0;
      let a=0;
      for(let i=0;i<toks.length;i++){
        const f=el<=a?0:el>=a+dur[i]?100:((el-a)/dur[i])*100;
        toks[i].style.setProperty('--fill',f+'%');
        toks[i].classList.toggle('on',f>0&&f<100);
        toks[i].classList.toggle('done',f>=100);
        a+=dur[i];
      }
      const cut=Math.min(1,el/total)*swTotal;
      for(let i=0;i<sws.length;i++){
        const [s,e]=swSeg[i];
        sws[i].style.setProperty('--fill',(cut<=s?0:cut>=e?100:((cut-s)/(e-s))*100)+'%');
      }
      const box=host.querySelector('.hd-s');if(box)box.classList.toggle('on',el<total);
      if(el<total){requestAnimationFrame(step);return}
      const c=document.getElementById('hdCombo');if(c)c.classList.add('on');
      setTimeout(()=>{idx=(idx+1)%lines.length;play()},HD_HOLD);
    };
    requestAnimationFrame(step);
  };
  play();
}
function renderRoster(){
  const body=document.getElementById('cabBody');
  body.innerHTML=`<div class="cab-empty">
    <h2 class="pick-h">${t('pick_h')}</h2>
    <p>${t('pick_sub')}</p>
  </div>
  <div class="gender-tabs" id="cabGenderTabs">
    <button class="gtab ${state.genderTab!=='boy'?'on':''}" data-g="girl">${t('tab_girls')}</button>
    <button class="gtab ${state.genderTab==='boy'?'on':''}" data-g="boy">${t('tab_boys')}</button>
  </div>
  <div class="grid" id="cabGrid"></div>`;
  renderCabGrid();
  [...document.querySelectorAll('#cabGenderTabs .gtab')].forEach(tb=>{
    tb.onclick=()=>{
      state.genderTab=tb.dataset.g;
      [...document.querySelectorAll('#cabGenderTabs .gtab')].forEach(x=>x.classList.remove('on'));
      tb.classList.add('on');
      renderCabGrid();
    };
  });
}
function renderCabGrid(){
  const g=document.getElementById('cabGrid');
  if(!g)return;
  g.innerHTML='';
  IDOLS.filter(c=>c.gender===state.genderTab).forEach(c=>{
    const el=document.createElement('div');el.className='card';
    el.innerHTML=`<div class="ph"><img src="${c.img}" alt="${c.name}"></div>
      <div class="body"><div class="nm"><span class="cc" style="background:${c.color}"></span><b>${c.name}</b></div>
      <div class="concept">${c.concept}</div></div>`;
    el.onclick=()=>claimIdol(c);
    g.appendChild(el);
  });
}
async function claimIdol(c){
  if(!currentUser){
    openAuth('signup');
    toast('Сначала зарегистрируйся — это займёт полминуты');
    return;
  }
  const r=await fetch('/api/idol',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({name:c.name,concept:c.concept,portraitUrl:c.img,gender:c.gender})});
  const d=await r.json();
  if(!r.ok||d.ok===false){toast(d.error||'Не получилось создать айдола');return}
  myIdol={...d.idol,img:d.idol.portrait_url};
  myTraining=d.training;
  showView('cabinet-own');
  renderLangOpts();
  toast('Твой айдол теперь — '+c.name+' 🎉');
}
async function doTrain(kind){
  const r=await fetch('/api/engage?action=train',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind})});
  const d=await r.json();
  if(!r.ok||d.ok===false){toast(d.error||'Не получилось');return}
  const justUnlockedBilingual=kind==='lang'&&myTraining&&myTraining.language_pct<100&&d.training.language_pct>=100;
  myTraining=d.training;
  toast(justUnlockedBilingual?'🎉 Язык прокачан до 100% — теперь доступен клип на 2 языках!'
    :kind==='lang'?'Занятие языком пройдено · '+Math.round(myTraining.language_pct/10)+'/10 · следующее через 4ч'
                  :'Разучено новое движение · '+myTraining.dance_moves_learned+' всего · следующее через 4ч');
  renderCabinet(null);
  renderLangOpts();
}
// Мгновенный, но не задокументированный фидбэк на голос — эффект должен быть сюрпризом,
// поэтому нигде в интерфейсе это не анонсируется и не объясняется заранее.
function showVoteBlast(name,oldRank,newRank,diff){
  let el=document.getElementById('voteBlast');
  if(!el){
    el=document.createElement('div');el.id='voteBlast';el.className='vote-blast';
    el.innerHTML='<div class="vb-card"><div class="vb-fire">🔥</div><div id="vbText"></div></div>';
    el.onclick=()=>el.classList.remove('show');
    document.body.appendChild(el);
  }
  const txt = diff>0
    ? `<h3>Твой голос сработал!</h3><p>Ты поднял <b>${name}</b> на <b>${diff}</b> ${diff===1?'строчку':'строчки'} — с <b>#${oldRank}</b> на <b>#${newRank}</b>!</p>`
    : `<h3>Голос учтён</h3><p><b>${name}</b> держится на <b>#${newRank}</b> месте — спасибо за поддержку!</p>`;
  el.querySelector('#vbText').innerHTML=txt;
  el.classList.add('show');
  clearTimeout(showVoteBlast._t);
  showVoteBlast._t=setTimeout(()=>el.classList.remove('show'),3200);
}
async function doVote(idolId){
  if(!currentUser){openAuth('login');toast('Сначала войди в аккаунт');return}
  const idx=CHART.findIndex(e=>e.idol.id===idolId);
  if(idx<0)return;
  const oldRank=idx+1;
  const r=await fetch('/api/engage?action=vote',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idolId})});
  const d=await r.json();
  if(!r.ok||d.ok===false){toast(d.error||'Не получилось проголосовать');return}
  CHART[idx].votes=d.votes;
  CHART.sort((a,b)=>b.votes-a.votes);
  const newIdx=CHART.findIndex(e=>e.idol.id===idolId);
  const newRank=newIdx+1;
  showVoteBlast(CHART[newIdx].idol.name,oldRank,newRank,oldRank-newRank);
}
async function doFollow(idolId){
  if(!currentUser){openAuth('login');toast('Сначала войди в аккаунт');return}
  const wasFollowing=viewedIdol&&viewedIdol.myFollow&&viewedIdol.myFollow.following;
  const r=await fetch('/api/engage?action=follow',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({idolId,action:wasFollowing?'unfollow':'follow'})});
  const d=await r.json();
  if(!r.ok||d.ok===false){toast(d.error||'Не получилось');return}
  toast(d.following?'Подписка оформлена — стрик поддержки начался':'Отписался — стрик поддержки обнулён');
  await openCabinetFor(idolId);
}
// Оплата через Stripe (тестовый режим). product: sub | extra_clip | extra_idol.
async function startCheckout(product){
  if(!currentUser){openAuth('signup');toast('Сначала зарегистрируйся');return}
  toast('Открываю оплату…');
  try{
    const r=await fetch('/api/pay?action=checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product})});
    const d=await r.json();
    if(!r.ok||!d.url){toast(d.error||'Оплата пока недоступна');return}
    window.location.href=d.url;
  }catch(e){toast('Не удалось открыть оплату')}
}

// Чат с собственным айдолом.
// Закрытие возвращает туда, откуда чат открыли: из урока («спросить у айдола») —
// назад в тот же урок, а не на стартовую страницу кабинета (баг прогона 23.07).
function closeChat(){
  document.getElementById('chatOv').classList.remove('show');
  const back=window._chatReturn;window._chatReturn=null;
  if(back&&back.ov==='lesson'&&back.id){openLesson(back.id);return}
  navClear();
}
document.getElementById('chatOv').onclick=e=>{if(e.target.id==='chatOv')closeChat()};
function fmtMsg(s){return escapeHtml(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(?<![:/])\*(?!\s)(.+?)(?<!\s)\*/g,'<i>$1</i>')}
function chatBubble(m){
  const mine=m.sender==='owner';
  return `<div class="chat-msg ${mine?'me':'idol'}"><div class="chat-b">${fmtMsg(m.content)}</div></div>`;
}
function escapeHtml(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
async function openChat(prefill,returnTo){
  if(!currentUser){openAuth('signup');return}
  window._chatReturn=returnTo||null;
  navOv('chat');
  const ov=document.getElementById('chatOv');ov.classList.add('show');
  const log=document.getElementById('chatLog');
  log.innerHTML='<div class="chat-empty">'+t('chat_loading')+'</div>';
  try{
    const r=await fetch('/api/chat?action=history');
    const d=await r.json();
    if(!r.ok||d.ok===false){log.innerHTML='<div class="chat-empty">'+(d.error||'Ошибка')+'</div>';return}
    if(!d.idol){log.innerHTML='<div class="chat-empty">'+t('chat_need_idol')+'</div>';return}
    document.getElementById('chatTitle').textContent='🇰🇷 '+t('chat_title')(d.idol.name)+(d.idol.name_kr?' · '+d.idol.name_kr:'');
    log.innerHTML=d.messages.length?d.messages.map(chatBubble).join(''):'<div class="chat-empty">'+t('chat_first')+'</div>';
    log.scrollTop=log.scrollHeight;
    const inp=document.getElementById('chatText');
    if(prefill){inp.value=prefill}
    inp.focus();
  }catch(e){log.innerHTML='<div class="chat-empty">'+t('chat_net')+'</div>'}
}
async function sendChat(){
  const inp=document.getElementById('chatText');
  const text=inp.value.trim();
  if(!text)return;
  const log=document.getElementById('chatLog');
  const empty=log.querySelector('.chat-empty');if(empty)empty.remove();
  log.insertAdjacentHTML('beforeend',chatBubble({sender:'owner',content:text}));
  inp.value='';
  const btn=document.getElementById('chatSend');btn.disabled=true;
  log.insertAdjacentHTML('beforeend','<div class="chat-msg idol" id="chatTyping"><div class="chat-b">…</div></div>');
  log.scrollTop=log.scrollHeight;
  try{
    const r=await fetch('/api/chat?action=send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text,lang:getLang()})});
    const d=await r.json();
    document.getElementById('chatTyping')?.remove();
    if(!r.ok||d.ok===false){log.insertAdjacentHTML('beforeend','<div class="chat-empty">'+(d.error||t('chat_err'))+'</div>')}
    else{log.insertAdjacentHTML('beforeend',chatBubble(d.reply));pingStudy()}
  }catch(e){document.getElementById('chatTyping')?.remove();log.insertAdjacentHTML('beforeend','<div class="chat-empty">'+t('chat_net')+'</div>')}
  btn.disabled=false;log.scrollTop=log.scrollHeight;inp.focus();
}

// Засчитывает "занимался сегодня" на сервере → двигает настоящий стрик учёбы.
// Вызывается при сдаче урока и в чате. Идемпотентно: один зачёт в день.
async function pingStudy(){
  if(!currentUser)return null;
  try{
    const r=await fetch('/api/engage?action=study',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    const d=await r.json();
    if(d&&d.ok&&myTraining){myTraining.study_streak=d.streak;myTraining.best_streak=d.best;}
    return d;
  }catch(e){return null}
}

/* ===================== ОЗВУЧКА (корейский голос) =====================
   Движок переехал в public/tts-engine.js (подключён в index.html ДО app.js).
   Он определяет window.speakKo / window.speakKoStop и алиас window.speak
   для старых вызовов из уроков и квизов. Контракт: C:\Users\user\IDOLINGO_CONTRACT_tts.md.
   Здесь намеренно ничего нет: держать вторую копию speak() в app.js нельзя —
   объявление функции перетрёт алиас движка и озвучка молча откатится на старую. */
function speakBrowserFallbackNote(){}  // якорь секции, не удалять

/* ===================== УРОК-ФУНДАМЕНТ ===================== */
// Прогресс уроков и словарь копятся локально (server-sync — следующий шаг).
function lsnUid(){return (currentUser&&currentUser.id)||'guest'}
function lsnDone(){try{return JSON.parse(localStorage.getItem('so_done_'+lsnUid())||'[]')}catch(e){return[]}}
function lsnSaveDone(arr){localStorage.setItem('so_done_'+lsnUid(),JSON.stringify(arr))}
function lsnVocab(){try{return JSON.parse(localStorage.getItem('so_vocab_'+lsnUid())||'[]')}catch(e){return[]}}
function lsnSaveVocab(arr){localStorage.setItem('so_vocab_'+lsnUid(),JSON.stringify(arr))}
function allLessons(){return (window.CURRICULUM?window.CURRICULUM.units:[]).flatMap(u=>u.lessons.map(l=>({...l,unit:u})))}
function optLabel(o){return typeof o==='string'?o:o[getLang()]}
function lsnLS(k,def){try{const v=localStorage.getItem(k);return v===null?def:JSON.parse(v)}catch(e){return def}}
function lsnLSSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
// Озвучка идёт строго через единую точку входа (см. контракт TTS выше).
function lsnSay(s){try{if(typeof window.speakKo==='function')window.speakKo(s);else if(typeof speak==='function')speak(s)}catch(e){}}
function lsnSayBtn(s,cls){return `<button class="say${cls?' '+cls:''}" aria-label="🔊" onclick="event.stopPropagation();lsnSay(${JSON.stringify(String(s)).replace(/"/g,'&quot;')})">🔊</button>`}
function lsnIdolName(){return (typeof myIdol!=='undefined'&&myIdol&&myIdol.name)?myIdol.name:null}

/* --- ИНТЕРВАЛЬНОЕ ПОВТОРЕНИЕ (DSR-lite) ---------------------------------
   Эталон: FSRS-4.5, модель DSR — Difficulty / Stability / Retrievability
   (open-spaced-repetition, wiki «The Algorithm», ред. 18.03.2026).
   S — интервал, на котором вероятность вспомнить падает до 90%.
   R(t,S) = (1 + 19/81 · t/S) ^ −0.5 — кривая забывания FSRS-4.5.
   Прирост стабильности тем больше, чем ниже R в момент повторения
   (эффект распределённого повторения). Обучаемых параметров у нас нет —
   это осознанное упрощение: 21 параметр FSRS-6 не на чем обучать при 40
   буквах и localStorage. Механика та же, коэффициенты фиксированные.
   ЗАЧЕМ: даёт НЕслучайный повод вернуться завтра — «6 букв начали забываться»
   вместо «пройди урок 6 из 17». Прямо работает на метрику «три сессии подряд». */
const SRS_DECAY=-0.5, SRS_FACTOR=19/81;
function srsKey(k,v){return k+':'+v}
function srsAll(){return lsnLS('so_srs_'+lsnUid(),{})||{}}
function srsSave(o){lsnLSSet('so_srs_'+lsnUid(),o)}
function srsR(it){
  if(!it||!it.n)return 0;
  const days=Math.max(0,(Date.now()-(it.t||0))/86400000);
  return Math.pow(1+SRS_FACTOR*days/Math.max(0.2,it.s||1),SRS_DECAY);
}
// 0 — не видел, 1 — знакомлюсь, 2 — знаю, 3 — крепко (в карте это «золото»).
function srsTier(it){if(!it||!it.n)return 0;if(it.s>=21)return 3;if(it.s>=6)return 2;return 1}
// Заводит карточки при прохождении урока. Уже заведённые не трогает.
function srsSeed(items){
  const o=srsAll();let added=0;
  items.forEach(x=>{
    const key=srsKey(x.k,x.id);
    if(!o[key]){o[key]={s:1,d:5,t:0,n:0,k:x.k,kr:x.kr,rom:x.rom,ru:x.ru,en:x.en};added++}
  });
  if(added)srsSave(o);
  return added;
}
// Оценка ответа. Возвращает XP за рост уровня владения — прогресс двигается
// на КАЖДОМ ответе, а не только на «урок пройден целиком».
function srsGrade(key,ok){
  const o=srsAll();const it=o[key];if(!it)return 0;
  const before=srsTier(it);
  const R=srsR(it);
  if(ok){
    const grow=(1.6+1.8*(1-R))*(1.15-0.03*it.d);
    it.s=it.n?Math.max(it.s*Math.max(1.25,grow),it.s+0.5):1;
    it.d=Math.max(1,it.d-0.3);
  }else{
    it.s=Math.max(0.4,it.s*0.35);
    it.d=Math.min(10,it.d+1);
  }
  it.n=(it.n||0)+1;it.t=Date.now();
  o[key]=it;srsSave(o);
  const gained=srsTier(it)-before;
  return gained>0?(before===0?4:3)*gained:0;
}
// Очередь на сегодня: сначала то, что начало забываться (низкий R), потом новое.
function srsQueue(limit){
  const o=srsAll();
  const rows=Object.keys(o).map(k=>({key:k,it:o[k],R:srsR(o[k])}));
  const due=rows.filter(r=>!r.it.n||r.R<0.9).sort((a,b)=>a.R-b.R);
  const rest=rows.filter(r=>r.it.n&&r.R>=0.9).sort((a,b)=>a.R-b.R);
  return due.concat(rest).slice(0,limit||5);
}
function srsDueCount(){
  const o=srsAll();
  return Object.keys(o).filter(k=>{const it=o[k];return !it.n||srsR(it)<0.9}).length;
}
function srsLetterTier(ch){return srsTier(srsAll()[srsKey('c',ch)])}
function hangulLetters(){return window.HANGUL_LETTERS||[]}
function hangulKnown(){return hangulLetters().filter(l=>srsLetterTier(l.char)>0).length}

/* --- ОПЫТ И УРОВЕНЬ -------------------------------------------------------
   Причина бага «полоса Твой корейский стоит на нуле»: прогресс считался как
   доля ПРОЙДЕННЫХ УРОКОВ от всего курса. Один урок из пятнадцати = 7%,
   полоска шириной в несколько пикселей, и больше за урок не происходило
   ровно ничего. Теперь прогресс — это опыт, и он растёт на каждом действии:
   первое имя хангылем, распевка, каждая буква, перешедшая на новый уровень.
   Бюджет курса — 1000 XP, отсюда langPct = XP/10 и уровень = XP/100.        */
const XP_BUDGET=1000;
function lsnXp(){
  const k='so_xp_'+lsnUid();
  let v=lsnLS(k,null);
  // Миграция старых аккаунтов: у кого уже есть пройденные уроки — не обнуляем.
  if(v===null||typeof v!=='number'){v=lsnDone().length*30;lsnLSSet(k,v)}
  return v;
}
function lsnAddXp(n){
  if(!n)return 0;
  const v=Math.max(0,Math.min(XP_BUDGET*2,lsnXp()+n));
  lsnLSSet('so_xp_'+lsnUid(),v);
  return v;
}
// Формула уровня СОВПАДАЕТ с кабинетом (Math.round(langPct/10)) — иначе на
// одном экране «Уровень 2», а на другом «уровень 1», и доверия к цифрам нет.
function lsnLevel(){return Math.max(1,Math.min(10,Math.round(lsnXp()/100)))}
function lsnLevelBand(){
  const lvl=lsnLevel();
  const lo=lvl===1?0:lvl*100-50, hi=Math.min(XP_BUDGET,(lvl+1)*100-50);
  const xp=Math.min(hi,lsnXp());
  return {lvl:lvl,pct:hi>lo?Math.round((xp-lo)/(hi-lo)*100):100,toNext:Math.max(0,hi-xp)};
}
function lessonPct(){try{return Math.min(100,lsnXp()/XP_BUDGET*100)}catch(e){return 0}}

/* --- СЕРИЯ ДНЕЙ ------------------------------------------------------------
   Эталон — Duolingo. Их собственный эксперимент (blog.duolingo.com,
   19.11.2020): серию стали продлевать за ОДИН урок вместо дневной цели →
   +3,3% удержания на 14-й день, +19% новичков с серией. Вывод их команды:
   снизить порог ежедневного действия важнее, чем объём за день.
   Поэтому серию у нас продлевает распевка на 5 карточек, около минуты.
   Заморозки: две штуки (blog.duolingo.com, 31.01.2022 — три не дают прироста
   против двух). Серия 7 дней = порог, после которого учащийся Duolingo
   в 3,6 раза чаще доходит до конца курса — это ровно наша метрика возврата. */
function lsnDayStr(d){const x=d||new Date();return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')}
function lsnStreak(){return lsnLS('so_streak_'+lsnUid(),{last:'',n:0,best:0,fr:2})||{last:'',n:0,best:0,fr:2}}
function lsnStreakSave(s){lsnLSSet('so_streak_'+lsnUid(),s)}
function lsnStreakN(){
  const s=lsnStreak();
  const srv=(typeof myTraining!=='undefined'&&myTraining&&myTraining.study_streak)||0;
  // Серия жива, только если занимались сегодня или вчера — иначе показываем 0.
  const y=lsnDayStr(new Date(Date.now()-86400000));
  const alive=s.last===lsnDayStr()||s.last===y;
  return Math.max(alive?s.n:0,srv);
}
function lsnDoneToday(){return lsnStreak().last===lsnDayStr()}
function lsnTouchDay(){
  const s=lsnStreak();const today=lsnDayStr();
  if(s.last===today)return {n:s.n,best:s.best,fresh:false,froze:false,fr:s.fr};
  const y=lsnDayStr(new Date(Date.now()-86400000));
  const y2=lsnDayStr(new Date(Date.now()-2*86400000));
  let froze=false;
  if(s.last===y)s.n=(s.n||0)+1;
  else if(s.last===y2&&s.fr>0){s.fr--;s.n=(s.n||0)+1;froze=true}
  else s.n=1;
  s.last=today;
  s.best=Math.max(s.best||0,s.n);
  if(s.n%7===0)s.fr=Math.min(2,(s.fr||0)+1);
  lsnStreakSave(s);
  return {n:s.n,best:s.best,fresh:true,froze:froze,fr:s.fr};
}

/* --- РЕАКЦИИ АЙДОЛА -------------------------------------------------------
   Чего у Duolingo нет и быть не может: награда — не сова, а тот, ради кого
   человек и пришёл. Переменное вознаграждение: реплика выбирается случайно,
   на сериях выпадают редкие. Тон — дружеский, без заигрывания (красная линия
   по тону, см. docs/IDOL_BRAIN_SPEC.md).                                    */
const LSN_REACT={
  ru:{ok:['Да, вот так.','Точно.','Ага, слышу — правильно.','Идёт.','Быстро схватываешь.','Верно.'],
      miss:['Не страшно, смотри ещё раз.','Почти. Давай снова.','Я тоже путала эти две.','Мимо — но ты близко.'],
      hot:['Пять подряд. Ты сегодня в ударе.','Не останавливайся, идёт же!','Вот это темп.'],
      done:['На сегодня всё. Завтра жду.','Готово. Приходи завтра, продолжим.','Спасибо, что зашёл. До завтра.']},
  en:{ok:['Yes, exactly.','Got it.','Right on.','Nice.','You pick this up fast.','Correct.'],
      miss:['No worries, look again.','Almost. One more time.','I used to mix those two up too.','Missed it — but you were close.'],
      hot:['Five in a row. You are on fire today.','Keep going, this is working!','Look at that pace.'],
      done:['That is it for today. See you tomorrow.','Done. Come back tomorrow and we continue.','Thanks for showing up. Until tomorrow.']}
};
function lsnReact(kind){
  const pool=(LSN_REACT[getLang()]||LSN_REACT.en)[kind]||[];
  return pool.length?pool[Math.floor(Math.random()*pool.length)]:'';
}
function lsnIdolLine(kind){
  const nm=lsnIdolName();const txt=lsnReact(kind);
  if(!txt)return '';
  return `<div class="lsn-idol-line"><span class="lil-who">${nm?escapeHtml(nm):t('lsn_your_idol')}</span><span class="lil-txt">${escapeHtml(txt)}</span></div>`;
}

function closeLessons(){document.getElementById('lessonOv').classList.remove('show');navClear()}
document.getElementById('lessonOv').onclick=e=>{if(e.target.id==='lessonOv')closeLessons()};

/* Шапка экрана уроков: серия, опыт, буквы. Это и есть «прогресс виден» —
   три числа, которые двигаются каждый день, а не одна полоска на весь курс. */
function lsnHeader(){
  const n=lsnStreakN(), today=lsnDoneToday(), xp=lsnXp();
  const band=lsnLevelBand(), lvl=band.lvl, inLvl=band.pct, toNext=band.toNext;
  const known=hangulKnown(), all=hangulLetters().length||40;
  const fr=lsnStreak().fr||0;
  return `<div class="lsn-stats">
    <div class="lsn-stat ${today?'on':''}"><b>🔥 ${n}</b><small>${t('lsn_st_streak')}</small></div>
    <div class="lsn-stat"><b>⭐ ${xp}</b><small>${t('lsn_st_xp')}</small></div>
    <div class="lsn-stat"><b>가 ${known}/${all}</b><small>${t('lsn_st_letters')}</small></div>
  </div>
  <div class="lsn-lvl">
    <div class="lsn-lvl-top"><span>${t('lsn_level')} ${lvl}</span><span>${t('lsn_to_next')(toNext)}</span></div>
    <div class="lsn-pbar"><i style="width:${inLvl}%"></i></div>
  </div>
  ${fr<2?`<div class="lsn-freeze">${t('lsn_freeze')(fr)}</div>`:''}`;
}

function openLessons(){
  if(!currentUser){openAuth('signup');return}
  navOv('lessons');
  document.getElementById('lessonOv').classList.add('show');
  document.getElementById('lsnBack').style.visibility='hidden';
  document.getElementById('lessonTitle').textContent=t('lessons_h');
  const done=lsnDone();
  const flat=allLessons();
  // Урок открыт, если он пройден ИЛИ это следующий по очереди (последовательная разблокировка).
  const firstLockedIdx=flat.findIndex(l=>!done.includes(l.id));
  let html='';
  (window.CURRICULUM?window.CURRICULUM.units:[]).forEach(u=>{
    html+=`<div class="lsn-unit">${u.title[getLang()]}</div><div class="lsn-list">`;
    u.lessons.forEach(l=>{
      const idx=flat.findIndex(x=>x.id===l.id);
      const isDone=done.includes(l.id);
      const unlocked=isDone||idx===firstLockedIdx||firstLockedIdx===-1;
      const cls=isDone?'done':unlocked?'':'locked';
      const badge=isDone?'✓':unlocked?'▶':'🔒';
      html+=`<button class="lsn-item ${cls}" ${unlocked?`onclick="openLesson('${l.id}')"`:'disabled'}>
        <span class="lsn-badge">${badge}</span>
        <span class="lsn-txt"><b>${l.title[getLang()]}</b><small>${(l.goal&&l.goal[getLang()])||''}</small></span>
      </button>`;
    });
    html+='</div>';
  });

  const nm=lsnIdolName();
  const started=Object.keys(srsAll()).length>0;
  const due=srsDueCount();
  const doneToday=lsnDoneToday();
  // 1. Распевка — ежедневный минимум. Стоит первой, потому что именно она
  //    возвращает человека завтра. Пока учить нечего — ведёт в первый урок.
  const daily=started
    ? `<button class="lsn-daily ${doneToday?'ok':''}" onclick="${doneToday?'openDaily(1)':'openDaily()'}">
         <span class="ld-ico">${doneToday?'✓':'🎤'}</span>
         <span class="ld-txt"><b>${t('lsn_daily_h')}</b><small>${doneToday?t('lsn_daily_done'):t('lsn_daily_sub')(Math.min(5,Math.max(1,due||5)))}</small></span>
         <span class="ld-go">→</span>
       </button>`
    : `<button class="lsn-daily soft" onclick="openLesson('${(flat[0]&&flat[0].id)||'l1'}')">
         <span class="ld-ico">🎤</span>
         <span class="ld-txt"><b>${t('lsn_daily_h')}</b><small>${t('lsn_daily_locked')}</small></span>
         <span class="ld-go">→</span>
       </button>`;

  // 2. Имя хангылем — понятный лично тебе результат в первую минуту.
  const myName=lsnLS('so_name_kr_'+lsnUid(),null);
  const nameCard=myName&&myName.kr
    ? `<button class="lsn-name done" onclick="openNameHangul()">
         <span class="ln-kr">${escapeHtml(myName.kr)}</span>
         <span class="ln-txt"><b>${t('lsn_name_yours')}</b><small>${t('lsn_name_again')}</small></span>
       </button>`
    : `<button class="lsn-name" onclick="openNameHangul()">
         <span class="ln-kr">이름</span>
         <span class="ln-txt"><b>${t('lsn_name_h')}</b><small>${t('lsn_name_sub')}</small></span>
       </button>`;

  // 3. Карта хангыля — навигация по секторам, а не свалка букв.
  const map=`<button class="lsn-map" onclick="openHangulMap()">
      <span class="lm-ico">가</span>
      <span class="lm-txt"><b>${t('lsn_map_h')}</b><small>${t('lsn_map_sub')(hangulKnown(),hangulLetters().length||40)}</small></span>
      <span class="ld-go">→</span>
    </button>`;

  html=lsnHeader()+daily+nameCard+map
    +(nm?`<button class="lsn-ask-top" onclick="askIdolFree()">${t('lsn_ask_named')(escapeHtml(nm))}</button>`
        :`<button class="lsn-ask-top" onclick="closeLessons();showView('roster')">${t('lsn_ask_pick')}</button>`)
    +`<div class="topik-note"><span>🏅</span><span>${t('topik_note')}</span></div>`
    +`<div class="lsn-progress"><div class="lsn-pbar"><i style="width:${flat.length?Math.round(done.length/flat.length*100):0}%"></i></div><span>${done.length}/${flat.length}</span></div>`
    +html;
  document.getElementById('lessonBody').innerHTML=html;
  document.getElementById('lessonBody').scrollTop=0;
}

/* ===================== КАРТА ХАНГЫЛЯ =====================
   Требование: секторы — это навигация, а не свалка. Человек видит все 40 букв
   сразу и своё положение на них: цвет плитки = уровень владения из SRS.     */
function openHangulMap(){
  if(!currentUser){openAuth('signup');return}
  navOv('hangulMap');
  const L=getLang();
  document.getElementById('lessonOv').classList.add('show');
  document.getElementById('lsnBack').style.visibility='visible';
  document.getElementById('lessonTitle').textContent=t('lsn_map_h');
  const done=lsnDone();
  const sectors=(window.HANGUL_SECTORS||[]).map(s=>{
    const known=s.letters.filter(l=>srsLetterTier(l.char)>0).length;
    const isDone=done.includes(s.lessonId);
    const tiles=s.rule
      ? (s.groups||[]).map(g=>`<div class="hm-tile rule ${isDone?'t3':''}">
           <span class="hm-ch">${g.g}</span><span class="hm-rom">${escapeHtml(g[L]||'')}</span>
         </div>`).join('')
      : s.letters.map(l=>{
          const tier=srsLetterTier(l.char);
          const hint=[l.rom,L==='ru'?l.cyr:''].filter(Boolean).join(' · ')+(l[L]?' — '+l[L]:'');
          return `<button class="hm-tile t${tier}" onclick="lsnSay(${JSON.stringify(l.char).replace(/"/g,'&quot;')})" title="${escapeHtml(hint)}">
            <span class="hm-ch">${l.char}</span><span class="hm-rom">${escapeHtml(l.rom)}</span>${L==='ru'&&l.cyr?`<span class="hm-cyr">${escapeHtml(l.cyr)}</span>`:''}
          </button>`}).join('');
    // Подпись типа сектора: видно, что закрыты и гласные, и согласные, —
    // из одних только названий («Йотированные», «Напряжённые») это неочевидно.
    const kind=s.kind==='v'?t('lsn_map_kv'):s.kind==='c'?t('lsn_map_kc'):t('lsn_map_kr');
    return `<div class="hm-sec">
      <div class="hm-h"><span class="hm-icon">${s.icon}</span>
        <b>${s.title[L]}</b>
        <span class="hm-kind k-${s.kind}">${kind}</span>
        <span class="hm-count">${s.rule?(isDone?'✓':'—'):known+'/'+s.letters.length}</span></div>
      <div class="hm-grid">${tiles}</div>
      <button class="hm-go" onclick="openLesson('${s.lessonId}')">${isDone?t('lsn_map_repeat'):t('lsn_map_learn')}</button>
    </div>`;
  }).join('');
  // Шапка карты: сколько букв всего и сколько из них гласных/согласных.
  // Считаем по данным, а не хардкодом «40» — если сектор выпадет, это будет видно.
  const secs=(window.HANGUL_SECTORS||[]);
  const nV=secs.filter(s=>s.kind==='v').reduce((n,s)=>n+s.letters.length,0);
  const nC=secs.filter(s=>s.kind==='c').reduce((n,s)=>n+s.letters.length,0);
  document.getElementById('lessonBody').innerHTML=
    `<div class="hm-sum">${t('lsn_map_sum')(nV+nC,nV,nC)}</div>
     <div class="hm-legend"><span class="hm-dot t0"></span>${t('lsn_map_l0')}
      <span class="hm-dot t1"></span>${t('lsn_map_l1')}
      <span class="hm-dot t2"></span>${t('lsn_map_l2')}
      <span class="hm-dot t3"></span>${t('lsn_map_l3')}</div>${sectors||`<div class="hm-empty">${t('lsn_map_none')}</div>`}`;
  document.getElementById('lessonBody').scrollTop=0;
}

/* ===================== ПЕРВАЯ МИНУТА: ТВОЁ ИМЯ ХАНГЫЛЕМ =====================
   Не «урок 1 из 17», а результат, понятный лично тебе, ещё до первого урока.
   Спрос на это подтверждён массово: «write your name in Korean» — устойчивый
   формат в TikTok/Instagram (выдача Google, проверено 23.07.2026).           */
function openNameHangul(){
  navOv('name');
  document.getElementById('lessonOv').classList.add('show');
  document.getElementById('lsnBack').style.visibility='visible';
  document.getElementById('lessonTitle').textContent=t('lsn_name_h');
  const saved=lsnLS('so_name_kr_'+lsnUid(),null);
  const pre=(saved&&saved.src)||(currentUser&&currentUser.username)||'';
  document.getElementById('lessonBody').innerHTML=`
    <div class="lsn-goal">🎯 ${t('lsn_name_goal')}</div>
    <div class="ln-form">
      <input id="lsnNameIn" type="text" maxlength="24" placeholder="${t('lsn_name_ph')}" value="${escapeHtml(pre)}"
        oninput="renderNameHangul()" autocomplete="off" spellcheck="false">
    </div>
    <div id="lsnNameOut"></div>`;
  document.getElementById('lessonBody').scrollTop=0;
  renderNameHangul();
  const el=document.getElementById('lsnNameIn');
  if(el&&!pre)try{el.focus()}catch(e){}
}
function renderNameHangul(){
  const inp=document.getElementById('lsnNameIn'), out=document.getElementById('lsnNameOut');
  if(!inp||!out)return;
  const raw=inp.value.trim();
  if(!raw||typeof window.hangulizeName!=='function'){out.innerHTML=`<div class="ln-empty">${t('lsn_name_empty')}</div>`;return}
  const blocks=window.hangulizeName(raw);
  if(!blocks.length){out.innerHTML=`<div class="ln-empty">${t('lsn_name_nope')}</div>`;return}
  const kr=blocks.map(b=>b.block).join('');
  const nm=lsnIdolName();
  out.innerHTML=`
    <div class="ln-big">${escapeHtml(kr)} ${lsnSayBtn(kr)}</div>
    <div class="ln-blocks">${blocks.map(b=>`
      <div class="ln-block">
        <div class="ln-b-kr">${escapeHtml(b.block)}</div>
        <div class="ln-b-parts">${b.parts.map(p=>`<span>${p.char}<i>${escapeHtml(p.rom||'')}</i></span>`).join('')}</div>
      </div>`).join('')}</div>
    <div class="ln-note">${t('lsn_name_note')}</div>
    <button class="btn accent lsn-finish" onclick="saveNameHangul()">${t('lsn_name_save')}</button>
    <button class="lsn-ask" onclick="askIdolAboutName()">${nm?t('lsn_name_ask')(escapeHtml(nm)):t('lsn_ask_pick')}</button>`;
}
function saveNameHangul(){
  const inp=document.getElementById('lsnNameIn');if(!inp)return;
  const raw=inp.value.trim();if(!raw)return;
  const blocks=(window.hangulizeName||(()=>[]))(raw);
  if(!blocks.length)return;
  const kr=blocks.map(b=>b.block).join('');
  const first=!lsnLS('so_name_kr_'+lsnUid(),null);
  lsnLSSet('so_name_kr_'+lsnUid(),{src:raw,kr:kr});
  // Первое имя — самая крупная разовая награда в курсе: это точка,
  // где человек впервые получает личный результат, а не «прогресс урока».
  if(first){lsnAddXp(40);toast(t('lsn_name_toast')(kr))}
  else toast(t('lsn_name_saved'));
  syncCabinet();
  openLessons();
}
function askIdolAboutName(){
  if(!lsnIdolName()){closeLessons();showView('roster');return}
  const inp=document.getElementById('lsnNameIn');
  const raw=inp?inp.value.trim():'';
  const saved=lsnLS('so_name_kr_'+lsnUid(),null);
  const kr=saved&&saved.kr?saved.kr:((window.hangulizeName||(()=>[]))(raw).map(b=>b.block).join(''));
  closeLessons();
  openChat(t('lsn_name_seed')(raw||'',kr||''),{ov:'name'});
}

/* ===================== РАСПЕВКА — ЕЖЕДНЕВНЫЙ МИНИМУМ =====================
   5 карточек, около минуты. Продлевает серию. Мгновенная обратная связь на
   каждый ответ (не «проверить всё в конце»), реплика айдола на каждый ответ.
   Карточки берутся из очереди SRS: сначала то, что начало забываться.       */
function openDaily(extra){
  if(!currentUser){openAuth('signup');return}
  const q=srsQueue(5);
  if(!q.length){openLessons();return}
  navOv('daily');
  window._dq=q.map(r=>buildDrillItem(r,srsAll()));
  window._di=0;window._dOk=0;window._dXp=0;window._dRun=0;window._dExtra=!!extra;
  document.getElementById('lessonOv').classList.add('show');
  document.getElementById('lsnBack').style.visibility='visible';
  document.getElementById('lessonTitle').textContent=t('lsn_daily_h');
  renderDrill();
}
// Тип задания зависит от уровня владения: узнавание → припоминание.
// Знакомое узнавать бессмысленно, поэтому крепкие карточки идут «наоборот».
function buildDrillItem(row,store){
  const L=getLang();const it=row.it;
  const same=Object.keys(store).map(k=>store[k]).filter(x=>x.k===it.k&&x.kr!==it.kr);
  const reverse=srsTier(it)>=2;
  const label=x=>it.k==='c'?x.rom:(x[L]||x.ru||x.en||x.rom);
  const pool=[...new Set(same.map(label).filter(Boolean))];
  const distr=shuffle(pool).slice(0,3);
  const padC=['a','o','u','i','eo','eu','n','m','g','s','h','ya','b','d','j'];
  const padW=L==='ru'?['вода','день','рука','город','время']:['water','day','hand','city','time'];
  for(const p of (it.k==='c'?padC:padW)){if(distr.length>=3)break;if(p!==label(it)&&!distr.includes(p))distr.push(p)}
  const right=reverse?it.kr:label(it);
  const wrong=reverse?shuffle(same.map(x=>x.kr).filter(x=>x&&x!==it.kr)).slice(0,3):distr;
  while(reverse&&wrong.length<3)wrong.push(['가','너','도','미'][wrong.length]);
  const opts=shuffle([right,...wrong.slice(0,3)]);
  return {
    key:row.key, kr:it.kr, say:it.kr, reverse:reverse,
    q:reverse?(it.k==='c'?t('lsn_q_which')(label(it)):t('lsn_q_how')(label(it))):(it.k==='c'?t('lsn_q_read')(it.kr):t('lsn_q_mean')(it.kr)),
    show:reverse?'':it.kr,
    opts:opts, answer:opts.indexOf(right)
  };
}
function renderDrill(){
  const q=window._dq||[], i=window._di||0;
  if(i>=q.length){finishDrill();return}
  const it=q[i];
  document.getElementById('lessonBody').innerHTML=`
    <div class="dr-top"><div class="lsn-pbar"><i style="width:${Math.round(i/q.length*100)}%"></i></div><span>${i+1}/${q.length}</span></div>
    ${it.show?`<div class="dr-big">${escapeHtml(it.show)} ${lsnSayBtn(it.say)}</div>`:''}
    <div class="dr-q">${it.q}</div>
    <div class="lq-opts" id="drOpts">${it.opts.map((o,oi)=>`<button class="lq-opt dr-opt" onclick="answerDrill(${oi})">${escapeHtml(o)}</button>`).join('')}</div>
    <div class="dr-react" id="drReact"></div>`;
  document.getElementById('lessonBody').scrollTop=0;
}
function answerDrill(oi){
  const q=window._dq||[], i=window._di||0, it=q[i];
  if(!it||window._dLock)return;
  window._dLock=1;
  const ok=oi===it.answer;
  document.querySelectorAll('#drOpts .dr-opt').forEach((b,bi)=>{
    b.disabled=true;
    if(bi===it.answer)b.classList.add('correct');
    if(bi===oi&&!ok)b.classList.add('wrong');
  });
  window._dXp=(window._dXp||0)+srsGrade(it.key,ok);
  if(ok){window._dOk++;window._dRun=(window._dRun||0)+1}else window._dRun=0;
  lsnSay(it.say);
  const r=document.getElementById('drReact');
  if(r)r.innerHTML=lsnIdolLine(window._dRun>=5?'hot':ok?'ok':'miss');
  clearTimeout(window._dT);
  window._dT=setTimeout(()=>{window._dLock=0;window._di=i+1;renderDrill()},ok?850:1600);
}
function finishDrill(){
  const q=window._dq||[];
  const first=!lsnDoneToday();
  const st=lsnTouchDay();
  // 15 XP за первую распевку дня. Повторные дают до 5 — прокручивать её
  // десять раз подряд смысла нет, но и совсем без отдачи оставлять нельзя.
  const bonus=first?15:Math.min(5,window._dOk||0);
  const before=lsnLevel();lsnAddXp((window._dXp||0)+bonus);const after=lsnLevel();
  if(first&&typeof pingStudy==='function')pingStudy().then(d=>{
    if(d&&d.ok&&typeof myTraining!=='undefined'&&myTraining){myTraining.study_streak=d.streak;myTraining.best_streak=d.best}
    syncCabinet();
  });
  syncCabinet();
  const nm=lsnIdolName();
  const seven=st.n===7;
  document.getElementById('lessonBody').innerHTML=`
    <div class="dr-done">
      <div class="dd-flame">🔥</div>
      <div class="dd-n">${st.n}</div>
      <div class="dd-cap">${t('lsn_streak_days')(st.n)}</div>
      ${st.froze?`<div class="dd-froze">${t('lsn_froze')}</div>`:''}
      ${seven?`<div class="dd-seven">${t('lsn_seven')}</div>`:''}
      ${after>before?`<div class="dd-seven">${t('lsn_levelup')(after)}</div>`:''}
      <div class="dd-row"><span>${t('lsn_dr_right')}</span><b>${window._dOk||0}/${q.length}</b></div>
      <div class="dd-row"><span>${t('lsn_st_xp')}</span><b>+${(window._dXp||0)+bonus}</b></div>
      ${lsnIdolLine('done')}
      <button class="btn accent lsn-finish" onclick="openLessons()">${t('lsn_dr_back')}</button>
      ${nm?`<button class="lsn-ask" onclick="askIdolFree()">${t('lsn_ask_named')(escapeHtml(nm))}</button>`:''}
    </div>`;
  document.getElementById('lessonBody').scrollTop=0;
}
// Перерисовать кабинет под оверлеем, чтобы полоса «Твой корейский» и
// фотокарточки были уже обновлены, когда человек закроет урок.
function syncCabinet(){
  try{if(typeof renderCabinet==='function'&&typeof myIdol!=='undefined'&&myIdol&&document.getElementById('cabBody'))renderCabinet(null)}catch(e){}
}

// Кириллица показывается только русскому интерфейсу: англоязычному она шум.
// Источник значений — lib/ko-g2p.js, см. шапку curriculum.js.
// Точка-разделитель обязательна: «a» и «а» на глаз неразличимы, без неё
// латиница и кириллица читаются как повтор одной буквы.
function lsnCyr(b){return (getLang()==='ru'&&b&&b.cyr)?`<span class="lb-cyr"><i>·</i>${escapeHtml(b.cyr)}</span>`:''}
function renderBlock(b){
  const L=getLang();
  if(b.type==='hangul'){
    // Буква = знак + обе транскрипции + пояснение звука + слово-пример.
    // Колонкой, а не в одну строку: на 320px пять полей в ряд не помещаются.
    const ex=b.ex&&b.ex.kr
      ? `<button class="lb-hex" onclick="lsnSay(${JSON.stringify(b.ex.kr).replace(/"/g,'&quot;')})">
           <span class="lb-hex-kr">${escapeHtml(b.ex.kr)}</span>
           <span class="lb-hex-rom">${escapeHtml(b.ex.rom||'')}${L==='ru'&&b.ex.cyr?' · '+escapeHtml(b.ex.cyr):''}</span>
           <span class="lb-hex-mean">${escapeHtml(b.ex[L]||b.ex.ru||'')}</span>
           <span class="lb-hex-say">🔊</span>
         </button>`
      : '';
    return `<div class="lb-hangul">
      <span class="lb-char">${b.char}</span>
      <div class="lb-hbody">
        <div class="lb-hline"><span class="lb-rom">${escapeHtml(b.rom)}</span>${lsnCyr(b)}${lsnSayBtn(b.char)}</div>
        <span class="lb-mean">${b[L]}</span>
        ${ex}
      </div>
    </div>`;
  }
  if(b.type==='example')return `<div class="lb-ex"><span class="lb-kr">${b.kr}</span><span class="lb-rom">${b.rom}</span>${lsnCyr(b)}<span class="lb-mean">${b[L]}</span>${lsnSayBtn(b.kr)}</div>`;
  if(b.type==='tip')return `<div class="lb-tip">💡 ${b[L]}</div>`;
  // Патчхим — сектор правил: 19 букв внизу дают 7 звуков, показываем группами.
  if(b.type==='batchim')return `<div class="lb-batchim"><span class="lb-bg">${b.g}</span><span class="lb-bc">${b.chars}</span><span class="lb-mean">${b[L]}</span></div>`;
  // «Что ты теперь умеешь» — ощутимый результат вместо «урок 1 из 17».
  if(b.type==='win')return `<div class="lb-win"><span>✦</span><span>${b[L]}</span></div>`;
  return `<div class="lb-text">${b[L]}</div>`;
}
// Айдол — не учитель, а друг, который учит. Безличного «учителя» в интерфейсе
// нет нигде: если своего айдола ещё нет, зовём выбрать его, а не обезличиваем.
function lsnAskBtn(){
  const nm=lsnIdolName();
  return nm
    ? `<button class="lsn-ask" onclick="askTeacher()">${t('lsn_ask_named')(escapeHtml(nm))}</button>`
    : `<button class="lsn-ask" onclick="closeLessons();showView('roster')">${t('lsn_ask_pick')}</button>`;
}

// СТРАНИЦА 1 — материал (буквы/слова + озвучка), внизу «Далее → проверка».
function openLesson(id){
  const lesson=allLessons().find(l=>l.id===id);
  if(!lesson)return;
  navOv('lesson',id);
  window._lsnCur=lesson;
  document.getElementById('lessonOv').classList.add('show');
  document.getElementById('lsnBack').style.visibility='visible';
  document.getElementById('lessonTitle').textContent=lesson.title[getLang()];
  const blocks=lesson.blocks.map(renderBlock).join('');
  const secs=(window.HANGUL_SECTORS||[]);
  const secI=secs.findIndex(s=>s.lessonId===lesson.id);
  const sec=secI>=0?secs[secI]:null;
  document.getElementById('lessonBody').innerHTML=`
    <div class="lsn-goal">🎯 ${(lesson.goal&&lesson.goal[getLang()])||''}</div>
    ${sec?`<button class="lsn-secline" onclick="openHangulMap()">${t('lsn_sec_of')(sec.title[getLang()],secI+1,secs.length)}</button>`:''}
    <div class="lsn-teacher">${blocks}</div>
    <div class="lsn-vocab-note">${t('lsn_vocab_note')(lesson.vocab.length)}</div>
    <button class="btn accent lsn-finish" onclick="openLessonQuiz('${lesson.id}')">${t('lsn_next_quiz')}</button>
    ${lsnAskBtn()}`;
  document.getElementById('lessonBody').scrollTop=0;
}

// Проверочная генерируется по ВСЕМ буквам/словам урока (не по 2 захардкоженным).
function shuffle(a){a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function buildQuiz(lesson){
  const L=getLang();
  const hangul=lesson.blocks.filter(b=>b.type==='hangul');
  const exs=lesson.blocks.filter(b=>b.type==='example');
  const qs=[];
  const romPool=[...new Set(hangul.map(b=>b.rom))];
  const padRom=['a','o','u','i','eo','eu','n','m','g','s','h'];
  hangul.forEach(b=>{
    let distr=shuffle(romPool.filter(r=>r!==b.rom)).slice(0,3);
    for(const p of padRom){if(distr.length>=3)break;if(p!==b.rom&&!distr.includes(p))distr.push(p);}
    const opts=shuffle([b.rom,...distr]);
    qs.push({q:{ru:`Как читается ${b.char}?`,en:`How is ${b.char} read?`},opts,answer:opts.indexOf(b.rom),say:b.char});
  });
  const meanPool=[...new Set(exs.map(b=>b[L]))];
  exs.forEach(b=>{
    const distr=shuffle(meanPool.filter(m=>m!==b[L])).slice(0,3);
    if(distr.length>=2){
      const opts=shuffle([b[L],...distr]);
      qs.push({q:{ru:`Что значит «${b.kr}»?`,en:`What does “${b.kr}” mean?`},opts,answer:opts.indexOf(b[L]),say:b.kr});
    }
  });
  if(!qs.length)return (lesson.quiz||[]).map(q=>({q:q.q,opts:q.opts.map(o=>optLabel(o)),answer:q.answer}));
  // Не больше 8 вопросов: проверочная на 15 экранов подряд — это не проверка,
  // а наказание за длинный урок. Размер шага держим маленьким намеренно.
  return shuffle(qs).slice(0,8);
}

/* СТРАНИЦА 2 — проверочная. По одному вопросу на экран и МГНОВЕННАЯ обратная
   связь на каждый тап (раньше все ответы проверялись одной кнопкой в конце —
   человек десять раз тыкал вслепую и только потом узнавал результат).
   Ошибка не отбрасывает в начало: неверная карточка возвращается в конец
   очереди. Наказание за ошибку — прямой источник отвала, а не мотивация. */
function openLessonQuiz(id){
  const lesson=allLessons().find(l=>l.id===id);if(!lesson)return;
  window._lsnCur=lesson;
  window._lsnQuiz=buildQuiz(lesson);
  window._lsnI=0;window._lsnOk=0;window._lsnMiss=0;window._lsnRun=0;window._lsnRetry=0;window._lsnLock=0;
  navOv('lessonQuiz',id);
  document.getElementById('lessonOv').classList.add('show');
  document.getElementById('lsnBack').style.visibility='visible';
  document.getElementById('lessonTitle').textContent=t('lsn_quiz_h');
  renderQuizStep();
}
function renderQuizStep(){
  const quiz=window._lsnQuiz||[], i=window._lsnI||0, lesson=window._lsnCur;
  if(!lesson)return;
  if(i>=quiz.length){finishLesson();return}
  const q=quiz[i], L=getLang();
  document.getElementById('lessonBody').innerHTML=`
    <div class="dr-top"><div class="lsn-pbar"><i style="width:${Math.round(i/quiz.length*100)}%"></i></div><span>${i+1}/${quiz.length}</span></div>
    ${q.say?`<div class="dr-big">${escapeHtml(q.say)} ${lsnSayBtn(q.say)}</div>`:''}
    <div class="dr-q">${q.q[L]}</div>
    <div class="lq-opts" id="lqOpts">${q.opts.map((o,oi)=>`<button class="lq-opt dr-opt" onclick="pickQuiz(${oi})">${escapeHtml(o)}</button>`).join('')}</div>
    <div class="dr-react" id="lqReact"></div>
    <button class="lsn-toinfo" onclick="openLesson('${lesson.id}')">← ${t('lsn_toinfo')}</button>`;
  document.getElementById('lessonBody').scrollTop=0;
}
function pickQuiz(oi){
  const quiz=window._lsnQuiz||[], i=window._lsnI||0, q=quiz[i];
  if(!q||window._lsnLock)return;
  window._lsnLock=1;
  const ok=oi===q.answer;
  document.querySelectorAll('#lqOpts .dr-opt').forEach((b,bi)=>{
    b.disabled=true;
    if(bi===q.answer)b.classList.add('correct');
    if(bi===oi&&!ok)b.classList.add('wrong');
  });
  if(ok){window._lsnOk++;window._lsnRun=(window._lsnRun||0)+1}
  else{
    window._lsnMiss++;window._lsnRun=0;
    // Промах возвращаем в конец очереди — но не больше трёх раз за урок,
    // иначе проверочная превращается в бесконечную.
    if((window._lsnRetry||0)<3){window._lsnRetry++;quiz.push(q)}
  }
  if(q.say)lsnSay(q.say);
  const r=document.getElementById('lqReact');
  if(r)r.innerHTML=lsnIdolLine(window._lsnRun>=5?'hot':ok?'ok':'miss');
  clearTimeout(window._lsnT);
  window._lsnT=setTimeout(()=>{window._lsnLock=0;window._lsnI=i+1;renderQuizStep()},ok?800:1600);
}

function finishLesson(){
  const lesson=window._lsnCur;if(!lesson)return;
  const quiz=window._lsnQuiz||[];
  const L=getLang();
  const first=!lsnDone().includes(lesson.id);
  let xp=0;
  if(first){
    const done=lsnDone();done.push(lesson.id);lsnSaveDone(done);
    const voc=lsnVocab();const have=new Set(voc.map(v=>v.kr));
    lesson.vocab.forEach(v=>{if(!have.has(v.kr))voc.push({...v,from:'lesson'})});
    lsnSaveVocab(voc);
    xp+=30;
  }
  // Материал урока заводится в интервальное повторение: с этого момента у
  // распевки есть что показывать завтра — это и есть повод вернуться.
  const seed=[];
  lesson.blocks.forEach(b=>{
    if(b.type==='hangul')seed.push({k:'c',id:b.char,kr:b.char,rom:b.rom,ru:b.ru,en:b.en});
    if(b.type==='example')seed.push({k:'w',id:b.kr,kr:b.kr,rom:b.rom,ru:b.ru,en:b.en});
  });
  (lesson.vocab||[]).forEach(v=>seed.push({k:'w',id:v.kr,kr:v.kr,rom:v.rom,ru:v.ru,en:v.en}));
  srsSeed(seed);
  // Ответы урока засчитываются как повторения — буквы сразу получают уровень.
  const store=srsAll();let letters=0;
  seed.forEach(x=>{
    const key=srsKey(x.k,x.id);
    if(store[key]&&!store[key].n){xp+=srsGrade(key,true);if(x.k==='c')letters++}
  });
  const st=lsnTouchDay();
  if(st.fresh){xp+=10;if(typeof pingStudy==='function')pingStudy().then(d=>{
    if(d&&d.ok&&typeof myTraining!=='undefined'&&myTraining){myTraining.study_streak=d.streak;myTraining.best_streak=d.best}
    syncCabinet();
  })}
  const before=lsnLevel();lsnAddXp(xp);const after=lsnLevel();
  syncCabinet();
  document.getElementById('lessonTitle').textContent=lesson.title[L];
  const flat=allLessons();const idx=flat.findIndex(l=>l.id===lesson.id);const next=flat[idx+1];
  const win=(lesson.blocks.filter(b=>b.type==='win')[0]||{})[L]||'';
  document.getElementById('lessonBody').innerHTML=`
    <div class="dr-done">
      <div class="dd-flame">🎉</div>
      <div class="dd-cap">${t('lsn_passed')}</div>
      ${win?`<div class="lb-win"><span>✦</span><span>${win}</span></div>`:''}
      ${after>before?`<div class="dd-seven">${t('lsn_levelup')(after)}</div>`:''}
      ${st.fresh?`<div class="dd-froze">🔥 ${t('lsn_streak_days')(st.n)}</div>`:''}
      <div class="dd-row"><span>${t('lsn_dr_right')}</span><b>${window._lsnOk||0}/${quiz.length}</b></div>
      <div class="dd-row"><span>${t('lsn_st_xp')}</span><b>+${xp}</b></div>
      ${letters?`<div class="dd-row"><span>${t('lsn_st_letters')}</span><b>+${letters}</b></div>`:''}
      ${lesson.vocab&&lesson.vocab.length?`<div class="dd-row"><span>${t('lsn_dr_words')}</span><b>+${lesson.vocab.length}</b></div>`:''}
      ${lsnIdolLine('done')}
      <button class="btn accent lsn-finish" onclick="${next?`openLesson('${next.id}')`:'openLessons()'}">${next?t('lsn_next'):t('lsn_dr_back')}</button>
      <button class="lsn-ask" onclick="openLessons()">${t('lsn_dr_back')}</button>
    </div>`;
  document.getElementById('lessonBody').scrollTop=0;
  toast(t('lsn_toast'));
}

function askTeacher(){
  const lesson=window._lsnCur;
  if(!lsnIdolName()){closeLessons();showView('roster');return}
  closeLessons();
  openChat(lesson?t('lsn_ask_seed')(lesson.title[getLang()]):'', lesson?{ov:'lesson',id:lesson.id}:null);
}
function askIdolFree(){
  if(!lsnIdolName()){closeLessons();showView('roster');return}
  closeLessons();openChat('',{ov:'lessons'});
}

/* ===================== РАБОЧАЯ ТЕТРАДЬ ===================== */
// Читает тот же реестр слов, что копят уроки (so_vocab_<uid>).
// slang:true → вкладка «Сленг» (из песен / вручную), иначе → «Слова».
function closeWorkbook(){
  try{if(typeof window.speakKoStop==='function')window.speakKoStop()}catch(e){}
  document.getElementById('wbOv').classList.remove('show');navClear();
}
document.getElementById('wbOv').onclick=e=>{if(e.target.id==='wbOv')closeWorkbook()};

function openWorkbook(tab){
  if(!currentUser){openAuth('signup');return}
  navOv('workbook');
  window._wbTab=tab||window._wbTab||'words';
  _wbSrs=null;                    // uid мог смениться (вход/выход) — перечитать память слов
  window._wbReview=null;          // открытие тетради всегда начинается со списка, не с карточки
  document.getElementById('wbOv').classList.add('show');
  document.getElementById('wbTitle').textContent='📓 '+t('wb_h');
  renderWorkbook();
}

/* --- Память по каждому слову. Свой ключ so_wbsrs_<uid>: агент песни в него не пишет,
   он трогает только so_vocab_* и so_songstudy_*. Поле на слово: {l:уровень, d:когда снова, f:провалы}.
   Разведка: Anki/FSRS хранит на карточку difficulty/stability/retrievability и планирует показ
   [faqs.ankiweb.net, «What spaced repetition algorithm does Anki use»]; Duolingo на своей модели
   half-life regression получил +12% к возврату к активности и +9.5% к ежедневным повторениям
   [blog.duolingo.com, 14.12.2016]. Полноценный ML тут не нужен — нужен сам факт,
   что у слова есть состояние и срок. Интервалы в днях по уровням: --- */
const WB_INT=[0,1,2,4,8,16,32];
const WB_DAILY=7;    // потолок порции. Растущий «долг повторений» — известная причина бросить SRS,
                     // поэтому число на кнопке никогда не растёт выше семи.
const WB_LEECH=3;    // после трёх провалов слово помечается тяжёлым. Anki на 8 провалах прячет карточку
                     // [docs.ankiweb.net/leeches.html] — мы наоборот показываем её наверху списка.
let _wbSrs=null;
function wbSrs(){
  if(_wbSrs)return _wbSrs;
  try{_wbSrs=JSON.parse(localStorage.getItem('so_wbsrs_'+lsnUid())||'{}')||{}}catch(e){_wbSrs={}}
  if(typeof _wbSrs!=='object'||!_wbSrs)_wbSrs={};
  return _wbSrs;
}
function wbSaveSrs(){try{localStorage.setItem('so_wbsrs_'+lsnUid(),JSON.stringify(wbSrs()))}catch(e){}}
function wbSt(kr){const s=wbSrs()[kr];return (s&&typeof s==='object')?{l:s.l|0,d:s.d||0,f:s.f|0}:{l:0,d:0,f:0}}

/* Транслитерация хангыля (Revised Romanization) — чтобы транскрипция была У КАЖДОГО слова,
   а не только у тех, что пришли из урока. Ассимиляция на стыках не учитывается: показываем
   послоговое чтение, для чтения вслух этого достаточно. */
const WB_ON=['g','kk','n','d','tt','r','m','b','pp','s','ss','','j','jj','ch','k','t','p','h'];
const WB_VO=['a','ae','ya','yae','eo','e','yeo','ye','o','wa','wae','oe','yo','u','wo','we','wi','yu','eu','ui','i'];
const WB_CO=['','k','k','k','n','n','n','t','l','k','m','p','l','l','p','l','m','p','p','t','t','ng','t','t','k','t','p','t'];
function wbRomanize(s){
  let out='';
  for(const ch of String(s||'')){
    const c=ch.charCodeAt(0)-0xAC00;
    if(c>=0&&c<11172){out+=WB_ON[Math.floor(c/588)]+WB_VO[Math.floor((c%588)/28)]+WB_CO[c%28]}
    else out+=ch;
  }
  return out;
}
// rr — кириллическая транскрипция от агента песни (контракт IDOLINGO_CONTRACT_songs.md, §3).
function wbTr(v){const L=getLang();return (L==='ru'&&v.rr)?v.rr:(v.rom||wbRomanize(v.kr))}
function wbMean(v){const L=getLang();return v[L]||v.ru||v.en||''}
function wbDir(){return localStorage.getItem('so_wbdir')==='nat'?'nat':'kr'}
function wbSetDir(d){localStorage.setItem('so_wbdir',d);renderWorkbook()}
function wbReveal(el){el.classList.add('on')}
function wbAttr(s){return JSON.stringify(String(s)).replace(/"/g,'&quot;')}

// Слова текущей вкладки (с учётом фильтра по песне)
function wbScope(){
  const isSlang=window._wbTab==='slang';
  let list=lsnVocab().filter(v=>v&&v.kr&&!!v.slang===isSlang);
  if(window._wbSongFilter)list=list.filter(v=>v.songId===window._wbSongFilter);
  return list;
}
// Что показать сегодня: сначала тяжёлые, потом самые просроченные. Порция ограничена жёстко.
function wbDue(list){
  const now=Date.now();
  return list.filter(v=>wbSt(v.kr).d<=now)
    .sort((a,b)=>{const A=wbSt(a.kr),B=wbSt(b.kr);return (B.f-A.f)||(A.d-B.d)})
    .slice(0,WB_DAILY);
}
function wbNextDays(list){
  const now=Date.now();
  const next=list.map(v=>wbSt(v.kr).d).filter(d=>d>now).sort((a,b)=>a-b)[0];
  if(!next)return 1;
  return Math.max(1,Math.ceil((next-now)/86400000));
}

function renderWorkbook(){
  const tabs=document.getElementById('wbTabs'),body=document.getElementById('wbBody');
  if(!tabs||!body)return;
  if(window._wbReview){renderWbReview();return}
  const voc=lsnVocab();
  const tab=window._wbTab==='slang'?'slang':window._wbTab==='songs'?'songs':'words';
  const songs=(typeof window.studiedSongs==='function')?(window.studiedSongs()||[]):[];
  tabs.innerHTML=`
    <button class="wb-tab ${tab==='words'?'on':''}" onclick="switchWb('words')">${t('wb_words')} <span>${voc.filter(v=>v&&!v.slang).length}</span></button>
    <button class="wb-tab ${tab==='slang'?'on':''}" onclick="switchWb('slang')">${t('wb_slang')} <span>${voc.filter(v=>v&&!!v.slang).length}</span></button>
    <button class="wb-tab ${tab==='songs'?'on':''}" onclick="switchWb('songs')">${t('wb_songs')} <span>${songs.length}</span></button>`;
  if(tab==='songs'){renderWbSongs(songs);return}
  const isSlang=tab==='slang';
  const list=wbScope();
  const due=wbDue(list);
  const dir=wbDir();
  const rows=list.length?list.slice().sort((a,b)=>wbSt(b.kr).f-wbSt(a.kr).f).map(v=>{
    const st=wbSt(v.kr),tr=wbTr(v),mean=wbMean(v);
    const dots='<span class="on">'+'●'.repeat(st.l)+'</span>'+'○'.repeat(WB_INT.length-1-st.l);
    const say=`onpointerdown="wbSayDown(this,${wbAttr(v.kr)})" onpointerup="wbSayUp(this,${wbAttr(v.kr)})" onpointerleave="wbSayCancel()" onpointercancel="wbSayCancel()"`;
    const word=dir==='kr'
      ? `<b>${escapeHtml(v.kr)}</b><i>${escapeHtml(tr)}</i><span class="wb-mean">${escapeHtml(mean)}</span>`
      : `<b>${escapeHtml(mean||v.kr)}</b><span class="wb-hide" onclick="wbReveal(this)" title="${t('wb_tap')}"><em>${escapeHtml(v.kr)}</em><i>${escapeHtml(tr)}</i></span>`;
    return `<div class="wb-row${st.f>=WB_LEECH?' hard':''}">
      <button class="wb-say" aria-label="${t('wb_say')}" ${say}>🔊</button>
      <div class="wb-word">${word}</div>
      <div class="wb-meta">
        <span class="wb-prog" title="${t('wb_prog')}">${dots}</span>
        <span class="wb-src" title="${v.songTitle?escapeHtml(v.songTitle):''}">${v.from==='lesson'?'📘':v.from==='song'?'🎵':'✍️'}</span>
      </div>
      <button class="wb-del" aria-label="${t('wb_del')}" onclick="wbDelete(${wbAttr(v.kr)})">✕</button>
    </div>`;
  }).join(''):`<div class="wb-empty">${window._wbSongFilter?t('wb_empty_filter'):isSlang?t('wb_empty_slang'):t('wb_empty_words')}</div>`;
  const today=!list.length?''
    :due.length?`<button class="wb-go" onclick="wbStartReview()"><b>${t('wb_go')(due.length)}</b><small>${t('wb_go_sub')}</small></button>`
    :`<div class="wb-alldone"><b>${t('wb_alldone')}</b><small>${t('wb_next_in')(wbNextDays(list))}</small></div>`;
  const filter=window._wbSongFilter?`<button class="wb-chip" onclick="wbClearFilter()">${escapeHtml(t('wb_filter_on')(wbSongTitle(window._wbSongFilter)))} ✕</button>`:'';
  body.innerHTML=`
    ${today}
    ${filter}
    <div class="wb-dir" role="group" aria-label="${t('wb_dir_h')}">
      <button class="${dir==='kr'?'on':''}" onclick="wbSetDir('kr')">${t('wb_dir_a')}</button>
      <button class="${dir==='nat'?'on':''}" onclick="wbSetDir('nat')">${t('wb_dir_b')}</button>
    </div>
    <div class="wb-add">
      <input id="wbKr" placeholder="한국어" maxlength="40">
      <input id="wbMean" placeholder="${t('wb_mean_ph')}" maxlength="60">
      <button class="btn accent wb-addbtn" onclick="wbAddWord()">+</button>
    </div>
    <div class="wb-hint">${isSlang?t('wb_hint_slang'):t('wb_hint_words')}</div>
    <div class="wb-list">${rows}</div>`;
}

/* ---- Озвучка слова: короткий тап — обычно, долгий — медленно. Всё через speakKo. ---- */
let _wbHoldT=null,_wbHeld=false;
function wbSay(btn,txt,slow){
  if(btn)btn.classList.add('busy');
  const p=(typeof window.speakKo==='function')?window.speakKo(txt,{slow:!!slow}):Promise.resolve('fail');
  Promise.resolve(p).then(r=>{
    if(!btn)return;
    btn.classList.remove('busy');
    if(r==='fail')btn.classList.add('mute');
  }).catch(()=>{if(btn)btn.classList.remove('busy')});
}
function wbSayDown(btn,txt){_wbHeld=false;clearTimeout(_wbHoldT);_wbHoldT=setTimeout(()=>{_wbHeld=true;wbSay(btn,txt,true)},520)}
function wbSayUp(btn,txt){clearTimeout(_wbHoldT);if(_wbHeld){_wbHeld=false;return}wbSay(btn,txt,false)}
function wbSayCancel(){clearTimeout(_wbHoldT)}

/* ---- Повторение: одна порция, конец виден с первого экрана ---- */
function wbStartReview(){
  const due=wbDue(wbScope());
  if(!due.length)return;
  window._wbReview={q:due.map(v=>v.kr),i:0,ok:0,total:due.length,shown:false,again:{},done:false};
  renderWorkbook();
}
function wbExitReview(){window._wbReview=null;renderWorkbook()}
function renderWbReview(){
  const R=window._wbReview,tabs=document.getElementById('wbTabs'),body=document.getElementById('wbBody');
  tabs.innerHTML=`<button class="wb-tab wb-rev-back" onclick="wbExitReview()">${t('wb_back')}</button>
    <span class="wb-rev-count">${Math.min(R.i+1,R.total)} / ${R.total}</span>`;
  if(R.done){
    body.innerHTML=`<div class="wb-fin">
      <div class="wb-fin-n">${R.ok} / ${R.total}</div>
      <div class="wb-fin-h">${t('wb_fin_h')}</div>
      <div class="wb-fin-sub">${t('wb_fin_sub')(wbNextDays(wbScope()))}</div>
      <button class="btn accent wb-fin-btn" onclick="wbExitReview()">${t('wb_fin_btn')}</button>
    </div>`;
    return;
  }
  const kr=R.q[R.i];
  const v=lsnVocab().find(x=>x&&x.kr===kr);
  if(!v){R.i++;if(R.i>=R.q.length){R.done=true}renderWbReview();return}
  const st=wbSt(kr),tr=wbTr(v),mean=wbMean(v);
  // Направление задаёт не тумблер, а уровень слова: сперва узнавание (кор → родной),
  // с третьего уровня — воспроизведение (родной → кор). Это то же восхождение,
  // что Quizlet ведёт внутри Learn от выбора варианта к письменному ответу
  // [help.quizlet.com, «Studying with Learn»], и то, чего нет в плоском списке слов.
  const prod=st.l>=2;
  const q=prod?mean:v.kr, a=prod?v.kr:mean;
  const pct=Math.round(Math.min(R.i/R.total,1)*100);
  body.innerHTML=`
    <div class="wb-rev">
      <div class="wb-bar"><i style="transform:scaleX(${pct/100})"></i></div>
      <div class="wb-rev-mode">${prod?t('wb_rev_prod'):t('wb_rev_recog')}${st.f>=WB_LEECH?` · <span class="wb-hardtag">${t('wb_hard')}</span>`:''}</div>
      <div class="wb-rev-q">${escapeHtml(q)}</div>
      ${!prod?`<div class="wb-rev-tr">${escapeHtml(tr)}</div>`:''}
      <button class="wb-say big" aria-label="${t('wb_say')}"
        onpointerdown="wbSayDown(this,${wbAttr(v.kr)})" onpointerup="wbSayUp(this,${wbAttr(v.kr)})"
        onpointerleave="wbSayCancel()" onpointercancel="wbSayCancel()">🔊</button>
      ${R.shown
        ? `<div class="wb-rev-a">${escapeHtml(a)}${prod?`<span>${escapeHtml(tr)}</span>`:''}</div>
           ${v.songTitle?`<div class="wb-rev-from">${t('wb_from_song')} · ${escapeHtml(v.songTitle)}</div>`:''}
           <div class="wb-rev-btns">
             <button class="wb-no" onclick="wbGrade(0)">${t('wb_no')}</button>
             <button class="wb-yes" onclick="wbGrade(1)">${t('wb_yes')}</button>
           </div>`
        : `<div class="wb-rev-a ghost"></div>
           <div class="wb-rev-btns"><button class="wb-show" onclick="wbShowAnswer()">${t('wb_show')}</button></div>`}
    </div>`;
}
function wbShowAnswer(){if(window._wbReview){window._wbReview.shown=true;renderWbReview()}}
function wbGrade(ok){
  const R=window._wbReview;if(!R||R.done)return;
  const kr=R.q[R.i],st=wbSt(kr),now=Date.now(),all=wbSrs();
  if(ok){st.l=Math.min(st.l+1,WB_INT.length-1);st.d=now+WB_INT[st.l]*86400000;R.ok++}
  else{
    st.f++;st.l=Math.max(0,st.l-1);st.d=now+WB_INT[1]*86400000;
    if(!R.again[kr]){R.again[kr]=1;R.q.push(kr)}   // ещё один заход в этой же сессии, но только один
  }
  all[kr]=st;wbSaveSrs();
  R.i++;R.shown=false;
  if(R.i>=R.q.length){
    R.done=true;
    try{localStorage.setItem('so_wblast_'+lsnUid(),String(Date.now()))}catch(e){}
    try{window.dispatchEvent(new CustomEvent('so:wbreview',{detail:{done:R.ok,total:R.total}}))}catch(e){}
    // Повторение — такой же учебный день, как урок: кормит стрик и прогресс карточки.
    try{if(currentUser&&typeof pingStudy==='function')pingStudy().then(()=>{if(typeof renderCabinet==='function'&&myIdol)try{renderCabinet(null)}catch(e){}})}catch(e){}
  }
  renderWbReview();
}

/* ---- Вкладка «Разобранные песни». Данные — только чтение, контракт IDOLINGO_CONTRACT_songs.md ---- */
function wbSongTitle(id){
  const s=((typeof window.studiedSongs==='function')?(window.studiedSongs()||[]):[]).find(x=>x&&x.id===id);
  return s?s.title:'';
}
function wbOpenSong(id){if(typeof openSong==='function'){closeWorkbook();openSong(id)}}
function wbFilterSong(id){window._wbSongFilter=id;window._wbTab='words';renderWorkbook()}
function wbClearFilter(){window._wbSongFilter=null;renderWorkbook()}
function wbToggleAnalysis(id){window._wbOpenSong=(window._wbOpenSong===id?null:id);renderWorkbook();}
/* Разбор песни в тетради (правка Сармата 23.07): песня закрыта, клип не играет —
   а объяснить, почему сумма слов не равна смыслу фразы, можно только здесь, спокойно.
   Во время проигрывания на это нет времени: там объяснение спрятано под 🔗. */
function wbSongAnalysis(s){
  const L=getLang();
  const vs=(s.verses||[]).filter(v=>v&&((v.tr&&(v.tr[L]||v.tr.ru||v.tr.en))||v.sense||v.why||v.lit));
  if(!vs.length)return `<div class="wb-an"><p class="wb-an-none">${t('wb_an_none')}</p></div>`;
  const pick=o=>(o&&(o[L]||o.en||o.ru))||'';
  return `<div class="wb-an">`+vs.map(v=>{
    const combos=(v.sense||[]).filter(x=>x.c);
    return `<section class="wb-anv">
      <div class="wb-anv-h">${t('kara_verse')} ${v.i+1}</div>
      ${pick(v.tr)?`<p class="wb-an-tr">${escapeHtml(pick(v.tr))}</p>`:''}
      ${combos.map(x=>`<div class="wb-an-c">
        ${pick(x.s)?`<div class="wb-an-cs">${escapeHtml(pick(x.s))}</div>`:''}
        <p class="wb-an-cb">🔗 ${escapeHtml(pick(x.c))}</p>
      </div>`).join('')}
      ${pick(v.lit)?`<p class="wb-an-lit"><span class="kp-tag">${t('kara_lit')}</span>${escapeHtml(pick(v.lit))}</p>`:''}
      ${pick(v.why)?`<p class="wb-an-why"><span class="kp-tag">${t('kara_why')}</span>${escapeHtml(pick(v.why))}</p>`:''}
    </section>`;
  }).join('')+`</div>`;
}
function renderWbSongs(songs){
  const body=document.getElementById('wbBody');
  if(!songs.length){
    body.innerHTML=`<div class="wb-empty">${t('wb_empty_songs')}
      <button class="btn accent wb-empty-btn" onclick="closeWorkbook();openSongs()">${t('wb_empty_songs_btn')}</button></div>`;
    return;
  }
  body.innerHTML=`<div class="wb-hint">${t('wb_hint_songs')}</div><div class="wb-list">`+songs.map(s=>{
    const tot=s.wordsTotal|0,sav=s.wordsSaved|0;
    const pct=tot?Math.round(Math.min(sav/tot,1)*100):0;
    const open=window._wbOpenSong===s.id;
    return `<div class="wb-song">
      <div class="wb-song-t"><b>${escapeHtml(s.title||'')}</b><small>${escapeHtml(s.artist||'')}${s.done?' · ✓':''}</small></div>
      <div class="wb-bar sm"><i style="transform:scaleX(${pct/100})"></i></div>
      <div class="wb-song-n">${t('wb_song_words')(sav,tot)}</div>
      <div class="wb-song-btns">
        <button class="${open?'on':''}" aria-expanded="${open?'true':'false'}" onclick="wbToggleAnalysis(${wbAttr(s.id)})">${open?'▾':'▸'} ${t('wb_song_analysis')}</button>
        <button onclick="wbOpenSong(${wbAttr(s.id)})">${t('wb_song_open')}</button>
        <button onclick="wbFilterSong(${wbAttr(s.id)})" ${sav?'':'disabled'}>${t('wb_song_filter_btn')}</button>
      </div>
      ${open?wbSongAnalysis(s):''}
    </div>`;
  }).join('')+`</div>`;
}
/* ---- Наружу для агента проактива: сколько слов ждёт человека прямо сейчас.
   Ничего не рендерит, ничего не пишет. Контракт — в IDOLINGO_CONTRACT_songs.md, раздел «Тетрадь → проактив». ---- */
window.wbDueCount=function(){
  try{
    const now=Date.now();
    return lsnVocab().filter(v=>v&&v.kr&&wbSt(v.kr).d<=now).length;
  }catch(e){return 0}
};
window.wbDuePreview=function(n){
  try{
    const now=Date.now();
    return lsnVocab().filter(v=>v&&v.kr&&wbSt(v.kr).d<=now).slice(0,n||3)
      .map(v=>({kr:v.kr,rom:wbTr(v),mean:wbMean(v),songTitle:v.songTitle||''}));
  }catch(e){return[]}
};
window.wbLastReview=function(){try{return Number(localStorage.getItem('so_wblast_'+lsnUid()))||0}catch(e){return 0}};

// Агент песни шлёт это событие после каждой записи (контракт §2) — вкладка живая без перезагрузки.
if(!window._wbSongHook){
  window._wbSongHook=1;
  window.addEventListener('so:songstudy',()=>{
    const ov=document.getElementById('wbOv');
    if(ov&&ov.classList.contains('show')&&!window._wbReview)try{renderWorkbook()}catch(e){}
  });
}

function switchWb(tab){window._wbTab=tab;if(tab!=='words')window._wbSongFilter=null;renderWorkbook()}

function wbAddWord(){
  const kr=document.getElementById('wbKr').value.trim();
  const mean=document.getElementById('wbMean').value.trim();
  if(!kr){toast(t('wb_need_kr'));return}
  const voc=lsnVocab();
  if(voc.some(v=>v&&v.kr===kr)){toast(t('wb_dup'));return}
  voc.push({kr,rom:wbRomanize(kr),ru:mean,en:mean,from:'manual',slang:window._wbTab==='slang'});
  lsnSaveVocab(voc);
  window._wbSongFilter=null;
  renderWorkbook();
}

function wbDelete(kr){
  const voc=lsnVocab().filter(v=>v.kr!==kr);
  lsnSaveVocab(voc);
  renderWorkbook();
}

/* ===================== РАЗБОР ПЕСНИ ===================== */
function songsDone(){try{return JSON.parse(localStorage.getItem('so_songs_'+lsnUid())||'[]')}catch(e){return[]}}
function songsSaveDone(a){localStorage.setItem('so_songs_'+lsnUid(),JSON.stringify(a))}
function userSongs(){try{return JSON.parse(localStorage.getItem('so_usersongs_'+lsnUid())||'[]')}catch(e){return[]}}
function saveUserSong(s){const a=userSongs().filter(x=>x.id!==s.id);a.unshift(s);localStorage.setItem('so_usersongs_'+lsnUid(),JSON.stringify(a));}
// Каталог = общий с сервера (window._catalog) + локальный кэш + курируемые, без дублей.
function allSongs(){
  const seen=new Set(),out=[];
  for(const s of [...(window._catalog||[]),...userSongs(),...(window.SONGS||[])]){
    if(!s||!s.id||seen.has(s.id))continue;seen.add(s.id);out.push(s);
  }
  return out;
}
function loadCatalog(){
  fetch('/api/song?action=list').then(r=>r.json()).then(d=>{if(d&&d.songs){window._catalog=d.songs;renderSongList();}}).catch(()=>{});
}
function closeSongs(){
  // Если открыт конкретный клип — «закрыть» = вернуться к СПИСКУ песен (одна ступень назад),
  // а не вываливаться в кабинет (две ступени). В списке ✕/тап-фон закрывают оверлей.
  if(window._kara){openSongs();return}
  karaStop();document.getElementById('songOv').classList.remove('show');navClear();
}
document.getElementById('songOv').onclick=e=>{if(e.target.id==='songOv')closeSongs()};

function openSongs(){
  if(!currentUser){openAuth('signup');return}
  navOv('songs');
  karaStop();
  const st=document.getElementById('ytStage');if(st)st.style.display='none';
  document.getElementById('songOv').classList.add('show');
  document.getElementById('songBack').style.visibility='hidden';
  document.getElementById('songTitle').textContent=t('songs_h');
  document.getElementById('songBody').innerHTML=`
    <div class="song-intro">${t('songs_intro')}</div>
    <div class="song-search-wrap">
      <input class="song-search" id="songSearch" oninput="onSongSearchInput()" placeholder="🔎 ${t('song_search')}" autocomplete="off">
      <div id="songOnline" class="song-dropdown"></div>
    </div>
    <div class="song-search-hint">${t('song_search_hint')}</div>
    <div id="songList"></div>`;
  document.getElementById('songBody').scrollTop=0;
  renderSongList();
  loadCatalog();
}

function renderSongList(){
  const box=document.getElementById('songList');if(!box)return;
  const L=getLang();const done=songsDone();
  const q=(document.getElementById('songSearch')&&document.getElementById('songSearch').value||'').trim().toLowerCase();
  const list=allSongs().filter(s=>!q||(s.title+' '+s.artist).toLowerCase().includes(q));
  const cards=list.map(s=>{
    const isDone=done.includes(s.id);
    return `<button class="song-item ${isDone?'done':''}" onclick="openSong('${s.id}')">
      <span class="lsn-badge">${isDone?'✓':'🎵'}</span>
      <span class="lsn-txt"><b>${escapeHtml(s.title)}</b><small>${escapeHtml(s.artist)} · ${s.level?s.level[L]:''}</small></span>
    </button>`;
  }).join('');
  box.innerHTML=`<div class="lsn-list">${cards||`<div class="song-none">${q?t('song_none')(escapeHtml(q)):t('songs_empty')}</div>`}</div>
    <div class="lsn-unit">${t('songs_done_h')} · ${done.length}/${allSongs().length}</div>`;
}

// ---- Онлайн-поиск: юзер ищет любую песню → собираем разбор автоматически ----
let _songSearchTimer=null;
function onSongSearchInput(){
  renderSongList();
  clearTimeout(_songSearchTimer);
  const q=(document.getElementById('songSearch')&&document.getElementById('songSearch').value||'').trim();
  const o=document.getElementById('songOnline');
  if(q.length<2){if(o)o.innerHTML='';return;}
  _songSearchTimer=setTimeout(()=>songSearchOnline(q),300);
}
function songOnlineMsg(cls,txt){const b=document.getElementById('songOnline');if(b)b.innerHTML=`<div class="song-online-h">${t('song_online_h')}</div><div class="song-none ${cls||''}">${txt}</div>`;}
async function songSearchOnline(q){
  const box=document.getElementById('songOnline');if(!box)return;
  songOnlineMsg('','<span class="spinner sm"></span> '+t('song_searching'));
  try{
    const r=await fetch('/api/song?action=search&q='+encodeURIComponent(q));
    let d={};try{d=await r.json()}catch(e){}
    if(r.status===401){songOnlineMsg('warn',t('song_need_login'));return;}
    if(!r.ok||d.ok===false){songOnlineMsg('warn',(d&&d.error)||t('song_net'));return;}
    const have=new Set(allSongs().map(s=>(s.title+s.artist).toLowerCase()));
    const res=(d.results||[]).filter(x=>!have.has(((x.title||'')+(x.artist||'')).toLowerCase())).slice(0,6);
    if(!res.length){songOnlineMsg('',t('song_search_empty'));return;}
    box.innerHTML=`<div class="song-online-h">${t('song_online_h')}</div>`+res.map(x=>`
      <button class="song-item add" onclick="addSong(${JSON.stringify(x.artist).replace(/"/g,'&quot;')},${JSON.stringify(x.title).replace(/"/g,'&quot;')},this)">
        <span class="lsn-badge">➕</span>
        <span class="lsn-txt"><b>${escapeHtml(x.title)}</b><small>${escapeHtml(x.artist)}</small></span>
      </button>`).join('');
  }catch(e){songOnlineMsg('warn',t('song_net'));}
}
async function addSong(artist,track,btn){
  const badge=btn&&btn.querySelector('.lsn-badge');
  if(btn){btn.disabled=true;if(badge)badge.innerHTML='<span class="spinner sm"></span>';}
  songOnlineMsg('','<span class="spinner sm"></span> '+t('song_building'));
  try{
    const r=await fetch('/api/song?action=build&artist='+encodeURIComponent(artist)+'&track='+encodeURIComponent(track));
    const d=await r.json();
    if(!r.ok||d.ok===false||!d.song){toast(d.error||t('song_build_fail'));if(btn){btn.disabled=false;if(badge)badge.textContent='➕';}return;}
    saveUserSong(d.song);
    window._catalog=[d.song,...(window._catalog||[]).filter(s=>s.id!==d.song.id)];
    toast(t('song_added'));
    openSong(d.song.id);
  }catch(e){toast(t('song_net'));if(btn){btn.disabled=false;if(badge)badge.textContent='➕';}}
}

/* ---- «Разобранные песни»: данные для вкладки в тетради ----------------------
   Формат и гарантии описаны в IDOLINGO_CONTRACT_songs.md (его читает агент тетради).
   Тетрадь ТОЛЬКО читает: window.studiedSongs() + событие 'so:songstudy'.        */
function songStudyKey(){return 'so_songstudy_'+lsnUid()}
function songStudyAll(){try{const a=JSON.parse(localStorage.getItem(songStudyKey())||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}}
function studiedSongs(){return songStudyAll().slice().sort((a,b)=>(b.at||0)-(a.at||0))}
window.studiedSongs=studiedSongs;
// Все слова песни, сгруппированные по куплетам (дубли внутри куплета схлопнуты).
function songWordsByVerse(song){
  return ((song&&song.verses)||[]).map((v,i)=>{
    const seen={},words=[];
    (v.lines||[]).forEach(ln=>(ln.w||[]).forEach(w=>{
      const kr=((w&&w.k)||'').trim();
      if(!kr||seen[kr])return;seen[kr]=1;
      words.push({kr,rom:w.r||w.rom||'',rr:w.rr||'',ru:w.ru||'',en:w.en||''});
    }));
    const g={i,tr:v.tr||{ru:'',en:''},words};
    if(v.lit)g.lit=v.lit;if(v.why)g.why=v.why;
    // Построчный смысл и объяснение компоновок — чтобы вкладка «Разбор песен» в тетради
    // жила без каталога: человек открывает её и через неделю, когда песня уже закрыта.
    const sense=(v.lines||[]).map(ln=>({s:ln.s||null,c:ln.c||null})).filter(x=>x.s||x.c);
    if(sense.length)g.sense=sense;
    return g;
  });
}
function songStudyTouch(song,done){
  if(!song||!song.id)return;
  const all=songStudyAll();
  const prev=all.find(x=>x.id===song.id)||{};
  const have={};lsnVocab().forEach(v=>{have[v.kr]=1});
  let total=0,got=0;
  const verses=songWordsByVerse(song).map(g=>({...g,words:g.words.map(w=>{
    const saved=!!have[w.kr];total++;if(saved)got++;return {...w,saved};
  })}));
  const rec={id:song.id,title:song.title||'',artist:song.artist||'',ytId:song.ytId||'',
    at:Date.now(),done:!!done||!!prev.done,wordsTotal:total,wordsSaved:got,verses};
  try{localStorage.setItem(songStudyKey(),JSON.stringify([rec,...all.filter(x=>x.id!==song.id)].slice(0,60)))}catch(e){}
  try{window.dispatchEvent(new CustomEvent('so:songstudy',{detail:{id:song.id}}))}catch(e){}
}

// ---- Караоке-движок: подсветка по таймкодам + авто-пауза в конце куплета ----
function karaBuild(song){
  // wordAligned: у каждого слова свой абсолютный тайминг клипа (t) из ASR — самый точный.
  const wa=song.wordAligned||(song.verses&&song.verses[0]&&song.verses[0].lines[0]&&song.verses[0].lines[0].w[0]&&song.verses[0].lines[0].w[0].t!=null);
  const verses=song.verses.map(v=>{
    const lines=v.lines.map((ln,i)=>{
      let words;
      if(wa){
        words=ln.w.map(x=>({...x,t0:(x.t!=null?x.t:0),te:(x.te!=null?x.te:null)}));
      }else{
        const end=(i+1<v.lines.length?v.lines[i+1].t:v.end);
        const total=Math.max(0.1,end-ln.t);
        const weights=ln.w.map(x=>Math.max(1,(x.k||'').replace(/\s/g,'').length));
        const sum=weights.reduce((a,b)=>a+b,0);
        let acc=ln.t;
        words=ln.w.map((x,j)=>{const t0=acc;acc+=total*weights[j]/sum;return {...x,t0};});
      }
      return {...ln,words,t:(words.length?words[0].t0:(ln.t||0))};
    });
    return {...v,lines,start:(lines.length?lines[0].t:0)};
  });
  // Заливка слова: до его РЕАЛЬНОГО конца (te, из forced alignment), а не до начала
  // следующего. Иначе в инструментальных брейках/паузах слово размазывается через
  // всю пустоту. Есть te → заливаем за длительность слова, потом «залито» и стоит,
  // в паузе ничего не бежит. Нет te (старые песни) → фолбэк: до начала следующего.
  const allW=[];verses.forEach(v=>v.lines.forEach(ln=>ln.words.forEach(w=>allW.push(w))));
  for(let i=0;i<allW.length;i++){
    const nextStart=i+1<allW.length?allW[i+1].t0:allW[i].t0+0.6;
    let t1;
    if(allW[i].te!=null){t1=Math.min(allW[i].te,nextStart);if(t1<=allW[i].t0)t1=allW[i].t0+0.2;}
    else{t1=nextStart;if(t1<=allW[i].t0)t1=allW[i].t0+0.3;}
    allW[i].t1=t1;
  }
  // конец куплета = начало следующего (для аккуратной смены панели)
  for(let i=0;i<verses.length;i++){verses[i].end=(i+1<verses.length)?verses[i+1].start:(wa?(allW.length?allW[allW.length-1].t1:verses[i].start+4):(song.verses[i].end||verses[i].start+4));}
  // Глобальный список строк (для караоке-перехода в проигрышах): каждая строка —
  // её куплет, индекс в куплете, начало (1-е слово) и конец (последнее слово).
  const flatLines=[];
  verses.forEach((v,vi)=>v.lines.forEach((ln,li)=>{
    const ws=ln.words; if(!ws.length)return;
    const start=ws[0].t0;
    const end=Math.max(...ws.map(w=>(w.te!=null?w.te:(w.t1!=null?w.t1:w.t0))));
    flatLines.push({vi,li,start,end});
  }));
  return {song,verses,lines:flatLines,vIdx:0,videoOffset:wa?0:(song.videoOffset||0),
    get off(){return this.videoOffset},player:null,timer:null,saved:{},tok:[],lastLine:null,ready:false,readyTimer:null};
}

function openSong(id){
  // Холодный старт: каталог с сервера мог ещё не приехать (восстановление вкладки из
  // навигации). Раньше это оставляло пустой экран — теперь честно падаем в список песен.
  const song=allSongs().find(s=>s.id===id);if(!song){openSongs();return}
  navOv('song',id);
  if(window._kara&&window._kara.timer)clearInterval(window._kara.timer);
  window._kara=karaBuild(song);
  document.getElementById('songOv').classList.add('show');
  document.getElementById('songBack').style.visibility='visible';
  document.getElementById('songTitle').textContent=song.title;
  // Постоянный плеер: показываем сцену, обновляем ссылку/подписи, меняем видео БЕЗ пересоздания.
  document.getElementById('ytStage').style.display='';
  const lk=document.getElementById('ytOpenLink');if(lk)lk.href='https://www.youtube.com/watch?v='+song.ytId;
  const rl=document.getElementById('ytReloadLbl');if(rl)rl.textContent=t('song_reload');
  renderKaraBody();
  document.getElementById('songBody').scrollTop=0;
  songStudyTouch(song);
  window._ytLastErr=null;
  ensureYtPlayer(p=>{
    const K=window._kara;if(!K)return;
    K.player=p;
    // loadVideoById (а не cue) — форсит загрузку+проигрывание и ВЫВОДИТ плеер из «спящего»
    // состояния, в которое он попадает, когда оверлей закрывался (display:none усыпляет iframe).
    // Именно это лечит «вечную загрузку» при повторном заходе в песню после ✕→кабинет.
    // На iPhone/Safari (наша основная ЦА) автозапуск видео СО ЗВУКОМ запрещён системой —
    // если пытаться играть сами, iOS блокирует → «картинка есть, но не играет». Поэтому только
    // ГОТОВИМ клип (cue): показываем родную кнопку ▶ + подсказку, юзер тапает сам → играет со
    // звуком, караоке подхватывает время. Единственный надёжный путь на телефонах.
    try{p.cueVideoById(song.ytId)}catch(e){}
    K.loadAt=Date.now();K.recovered=false;K.playing=false;K.errored=false;karaShowErr(null);karaShowHint(true);
    if(K.timer)clearInterval(K.timer);
    K.timer=setInterval(karaTick,200); // опрос плеера; между опросами время идёт само (karaFrame)
    karaStartRaf();
  });
}
// Тело экрана песни: текст + панель куплета. Отдельной функцией, потому что из набора
// слов («все слова песни») мы возвращаемся обратно и пересобираем эту же разметку.
function renderKaraBody(){
  const b=document.getElementById('songBody');if(!b)return;
  b.innerHTML=`
    <div class="kara">
      <div class="kara-lines" id="karaLines"></div>
      <div class="kara-pause" id="karaPause" style="display:none"></div>
    </div>`;
  renderKaraVerse();
}

// Единственный плеер на всё приложение — создаётся ОДИН раз, дальше только loadVideoById.
function ensureYtPlayer(cb){
  if(window._ytPlayer&&window._ytReady)return cb(window._ytPlayer);
  if(window._ytCreating){const iv=setInterval(()=>{if(window._ytReady){clearInterval(iv);cb(window._ytPlayer);}},100);return;}
  window._ytCreating=true;
  loadYT(()=>{
    window._ytPlayer=new YT.Player('ytPlayer',{playerVars:{playsinline:1,rel:0,origin:location.origin},events:{
      onReady:()=>{window._ytReady=true;},
      onError:(e)=>karaOnError(e&&e.data)
    }});
    const iv=setInterval(()=>{if(window._ytReady){clearInterval(iv);cb(window._ytPlayer);}},100);
  });
}

// «Перезагрузить видео» — просто перезагрузить текущее в том же плеере (снимает застрявшую загрузку).
function karaReload(){
  const K=window._kara;if(!K||!window._ytPlayer||!K.song)return;
  try{window._ytPlayer.loadVideoById(K.song.ytId)}catch(e){}
}

function loadYT(cb){
  if(window.YT&&window.YT.Player)return cb();
  const prev=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=function(){if(prev)try{prev()}catch(e){}cb()};
  if(!document.getElementById('ytapi')){const s=document.createElement('script');s.id='ytapi';s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);}
}

// Плеер НЕ уничтожаем (переиспользуем). Только стоп таймера + пауза.
function karaStop(){
  const K=window._kara;
  if(K&&K.timer)clearInterval(K.timer);
  karaStopRaf();
  try{window._ytPlayer&&window._ytPlayer.pauseVideo&&window._ytPlayer.pauseVideo()}catch(e){}
  window._kara=null;
}

// Непрерывный плавный караоке: ведём строго по времени клипа, никаких внутренних пауз
// (пауза плеера сама останавливает getCurrentTime → подсветка замирает корректно).
// Watchdog повторного захода: если getCurrentTime не растёт и плеер завис на загрузке
// (state -1 unstarted / 3 buffering) — один раз тихо перезагружаем видео. Не трогаем, если
// юзер просто поставил на паузу (state 2) или ждёт тапа (5 cued).
function karaShowErr(html){const e=document.getElementById('ytErr');if(!e)return;if(html){e.innerHTML=html;e.style.display='flex';}else{e.style.display='none';e.innerHTML='';}}
// Подсказка «тапни ▶» — нужна на iOS, где автозапуск запрещён. Прячется, как только клип пошёл.
function karaShowHint(show){const e=document.getElementById('ytHint');if(!e)return;if(show){e.textContent=getLang()==='ru'?'▶ Нажми на клип, чтобы включить со звуком':'▶ Tap the clip to start with sound';e.style.display='block';}else{e.style.display='none';}}
// Ошибка плеера YouTube. 101/150 = владелец ЗАПРЕТИЛ встраивание (BTS/HYBE — почти все клипы);
// 100 = видео удалено/приватное; 2 = кривой id; 5 = ошибка html5-плеера. Показываем честно
// вместо вечного спиннера + крупную ссылку на YouTube. Заодно логируем битый id в консоль.
function karaOnError(code){
  window._ytLastErr=code;
  const K=window._kara;const yt=K&&K.song&&K.song.ytId;
  console.warn('[yt-error]',code,yt,K&&K.song&&K.song.title);
  if(K)K.errored=true;
  const url='https://www.youtube.com/watch?v='+(yt||'');
  const embed=(code===101||code===150);
  const msg=embed?'Владелец клипа запретил встраивание на других сайтах':(code===100?'Видео недоступно (удалено или приватное)':'Клип не запускается');
  karaShowErr(`<div class="yt-err-msg">${msg}</div><a class="btn accent sm" href="${url}" target="_blank" rel="noopener">▶ Смотреть на YouTube</a>`);
}
function karaWatchdog(K){
  let ct=0,st=-9;try{ct=K.player.getCurrentTime()||0;st=K.player.getPlayerState?K.player.getPlayerState():-9;}catch(e){}
  if(ct>0.05){K.playing=true;K.errored=false;karaShowErr(null);karaShowHint(false);return;}
  if(K.playing||K.errored)return;
  const stuck=(st===-1||st===3);
  if(!K.recovered&&stuck&&Date.now()-(K.loadAt||0)>4500){
    K.recovered=true;K.loadAt=Date.now();
    try{K.player.loadVideoById(K.song.ytId)}catch(e){}
  }
}
// Караоке-фокус: какая строка сейчас в центре внимания и «готовится» ли она (проигрыш).
// В паузе между строками: старая держится, потом (за LEAD до начала новой, но не раньше
// середины паузы) фокус уводится на следующую строку — она уже показана, но НЕ закрашена.
const KARA_LEAD=2.5; // макс. насколько заранее показать следующую строку в проигрыше
function karaFocus(K,t){
  const L=K.lines;if(!L||!L.length)return{vi:0,li:0,up:false};
  if(t<L[0].start)return{vi:L[0].vi,li:L[0].li,up:true};
  for(let i=0;i<L.length;i++){
    if(t>=L[i].start&&t<=L[i].end)return{vi:L[i].vi,li:L[i].li,up:false};
    if(i+1<L.length&&t>L[i].end&&t<L[i+1].start){
      const gap=L[i+1].start-L[i].end, lead=Math.min(gap/2,KARA_LEAD), trans=L[i+1].start-lead;
      if(t<trans)return{vi:L[i].vi,li:L[i].li,up:false};        // старая ещё висит
      return{vi:L[i+1].vi,li:L[i+1].li,up:true};                // новая показана, ждёт (не закрашена)
    }
  }
  return{vi:L[L.length-1].vi,li:L[L.length-1].li,up:false};
}
// Опрос плеера — редкий (200мс), он только СВЕРЯЕТ часы. Между опросами время
// доигрывается само в karaFrame (requestAnimationFrame), поэтому заливка идёт
// на частоте экрана, а не рывками по 8 кадров в секунду.
function karaTick(){
  const K=window._kara;if(!K||!K.player||!K.player.getCurrentTime)return;
  karaWatchdog(K);
  let ct=0,st=1;
  try{ct=K.player.getCurrentTime()||0;st=K.player.getPlayerState?K.player.getPlayerState():1;}catch(e){}
  K.clock={t:ct-K.off,wall:(window.performance&&performance.now?performance.now():Date.now()),run:st===1};
  karaApply(K.clock.t);
}
function karaNow(K){
  const c=K.clock;if(!c)return 0;
  if(!c.run)return c.t;
  const now=(window.performance&&performance.now?performance.now():Date.now());
  return c.t+(now-c.wall)/1000;
}
function karaStartRaf(){
  if(window._karaRaf||!window.requestAnimationFrame)return;
  window._karaRaf=requestAnimationFrame(karaFrame);
}
function karaStopRaf(){
  if(window._karaRaf){cancelAnimationFrame(window._karaRaf);window._karaRaf=null;}
}
function karaFrame(){
  window._karaRaf=null;
  const K=window._kara;
  if(!K)return;
  window._karaRaf=requestAnimationFrame(karaFrame);
  if(!K.clock||!K.clock.run)return;
  karaApply(karaNow(K));
}
function karaApply(t){
  const K=window._kara;if(!K)return;
  const f=karaFocus(K,t);
  if(f.vi!==K.vIdx){K.vIdx=f.vi;K.comboOpen=null;renderKaraVerse();}
  updateKaraWords(t,f);
  updateKaraSense(t);
  // Песня кончилась → сразу набор всех слов по куплетам. Это и есть момент,
  // ради которого мы держали человека: он только что всё услышал и понял.
  const last=K.lines[K.lines.length-1];
  if(last&&!K.recap&&!K.recapShown&&t>last.end+1.5){K.recapShown=true;openSongRecap();}
}

// Транскрипция под язык: для русского — кириллица (rr), иначе латиница (r/rom).
function romOf(w){const L=getLang();if(L==='ru'&&w&&w.rr)return w.rr;return (w&&(w.r!=null?w.r:w.rom))||'';}
// escapeHtml не трогает кавычки — для атрибутов нужен свой.
function attrEsc(s){return escapeHtml(s).replace(/"/g,'&quot;')}
function renderKaraVerse(){
  const K=window._kara;if(!K)return;
  const box=document.getElementById('karaLines');if(!box)return;
  const v=K.verses[K.vIdx];const L=getLang();
  K.tok=[];K.lastLine=null;
  const html=v.lines.map(ln=>{
    const toks=ln.words.map(w=>{
      const idx=K.tok.length;K.tok.push({t0:w.t0,t1:w.t1,fill:-1,cls:''});
      const kr=w.k||'',rm=romOf(w);
      // data-txt — та же строка для слоя-заливки (::after), см. .tok-k::after в style.css
      return `<span class="tok" data-i="${idx}"><span class="tok-k" data-txt="${attrEsc(kr)}">${escapeHtml(kr)}</span><span class="tok-r" data-txt="${attrEsc(rm)}">${escapeHtml(rm)}</span><span class="tok-m">${escapeHtml(w[L]||'')}</span></span>`;
    }).join('');
    return `<div class="kline">${toks}</div>`;
  }).join('');
  box.innerHTML=html;
  // Элементы кэшируем: заливка идёт 60 раз в секунду, querySelectorAll в кадре — расточительство.
  K.tokEls=box.querySelectorAll('.tok');
  K.lineEls=box.querySelectorAll('.kline');
  renderVersePanel();
}

// Плавная заливка: активное слово красится слева-направо по мере произношения.
// Красим через градиент по тексту (--fill), НЕ через ширину/высоту — те дёргают лейаут.
// Скролл/подсветка «готовности» ведёт по строке-фокусу (karaFocus) — в проигрыше
// заранее показывает следующую строку, не закрашивая её.
function updateKaraWords(t,f){
  const K=window._kara;if(!K||!K.tokEls)return;
  const els=K.tokEls;
  for(let i=0;i<els.length;i++){
    const tk=K.tok[i];if(!tk)continue;
    let cls,fill;
    if(t>=tk.t1){cls='done';fill=100;}
    else if(t>=tk.t0){cls='on';fill=Math.max(0,Math.min(100,((t-tk.t0)/((tk.t1-tk.t0)||1))*100));}
    else {cls='';fill=0;}
    const el=els[i];
    if(cls!==tk.cls){
      el.classList.toggle('on',cls==='on');
      el.classList.toggle('done',cls==='done');
      tk.cls=cls;
    }
    // Пишем в DOM только при заметном сдвиге — иначе каждый кадр дёргает стили впустую.
    const r=Math.round(fill*10)/10;
    if(r!==tk.fill){el.style.setProperty('--fill',r+'%');tk.fill=r;}
  }
  // строка-фокус: скроллим к ней; если «готовится» в проигрыше — помечаем .upcoming
  const lineEls=K.lineEls;if(!lineEls)return;
  const fl=f?lineEls[f.li]:null;
  if(fl&&(fl!==K.lastFocusEl||(!!f.up)!==K.lastUp)){
    for(let i=0;i<lineEls.length;i++)lineEls[i].classList.remove('upcoming');
    if(f.up)fl.classList.add('upcoming');
    K.lastFocusEl=fl;K.lastUp=!!f.up;
  }
  if(fl&&fl!==K.lastLine){K.lastLine=fl;fl.scrollIntoView({behavior:'smooth',block:'center'});}
}

// Панель куплета. Главное здесь — СМЫСЛОВОЙ перевод: не «слово=слово», а что фраза
// значит на самом деле, плюс раскрывающееся «дословно ≠ по смыслу» с объяснением,
// почему они расходятся. Отдельные слова во время проигрывания читать некогда —
// их набор ждёт в конце песни (openSongRecap).
//
// Правка 23.07: смысловой перевод теперь тоже ЗАЛИВАЕТСЯ по ходу песни, строка за
// строкой. Сверху человек видит, какие слова поют; снизу — что эти слова значат
// вместе, в тот же момент. Если у строки есть 🔗 — там объяснение, почему именно
// такая компоновка слов даёт такой смысл (раскрывается по тапу, чтобы не мешать).
function renderVersePanel(){
  const K=window._kara;if(!K)return;
  const p=document.getElementById('karaPause');if(!p)return;
  const v=K.verses[K.vIdx];const L=getLang();
  const tr=(v.tr&&(v.tr[L]||v.tr.en||v.tr.ru))||'';
  const lit=(v.lit&&(v.lit[L]||v.lit.en||v.lit.ru))||'';
  const why=(v.why&&(v.why[L]||v.why.en||v.why.ru))||'';
  const note=(v.note&&(v.note[L]||v.note.en||v.note.ru))||'';
  const open=!!K.senseOpen;
  // Построчный смысл есть — показываем его синхронно с пением; иначе старый цельный абзац.
  const sl=(v.lines||[]).map((ln,li)=>({li,txt:(ln.s&&(ln.s[L]||ln.s.en||ln.s.ru))||'',
    combo:(ln.c&&(ln.c[L]||ln.c.en||ln.c.ru))||''}));
  const synced=sl.some(x=>x.txt);
  K.sense=null;
  p.style.display='block';
  p.innerHTML=`
    <div class="kp-h">${t('kara_verse')} ${K.vIdx+1}/${K.verses.length}</div>
    ${synced
      ? `<div class="kp-slines" id="kpSlines">${sl.map(x=>{
          if(!x.txt)return '';
          const words=String(x.txt).split(/\s+/).filter(Boolean);
          const co=K.comboOpen===x.li;
          return `<div class="ksl" data-li="${x.li}">
            <div class="ksl-row">
              <span class="ksl-t">${words.map(w=>`<span class="ksw" data-txt="${attrEsc(w)}">${escapeHtml(w)}</span>`).join(' ')}</span>
              ${x.combo?`<button class="ksl-c${co?' on':''}" type="button" aria-expanded="${co?'true':'false'}" aria-label="${t('kara_combo_a')}" onclick="karaToggleCombo(${x.li})">🔗</button>`:''}
            </div>
            ${(x.combo&&co)?`<p class="ksl-cb">${escapeHtml(x.combo)}</p>`:''}
          </div>`;
        }).join('')}</div>`
      : (tr?`<div class="kp-tr">${escapeHtml(tr)}</div>`:`<div class="kp-tr kp-dim">${t('kara_tr_none')}</div>`)}
    ${(lit||why)?`<div class="kp-sense">
      <button class="kp-sense-t" type="button" aria-expanded="${open?'true':'false'}" onclick="karaToggleSense()">
        <span class="kp-caret">${open?'▾':'▸'}</span>${t('kara_sense_h')}</button>
      ${open?`<div class="kp-sense-b">
        ${synced&&tr?`<p class="kp-lit"><span class="kp-tag">${t('kara_whole')}</span>${escapeHtml(tr)}</p>`:''}
        ${lit?`<p class="kp-lit"><span class="kp-tag">${t('kara_lit')}</span>${escapeHtml(lit)}</p>`:''}
        ${why?`<p class="kp-why"><span class="kp-tag">${t('kara_why')}</span>${escapeHtml(why)}</p>`:''}
      </div>`:''}
    </div>`:''}
    ${note?`<p class="kp-note">💡 ${escapeHtml(note)}</p>`:''}
    <button class="kp-allwords" type="button" onclick="openSongRecap()">🗂 ${t('kara_allwords')}</button>`;
  if(synced)buildSenseFill(K,v);
}
// Готовим заливку смысловых строк: каждой строке — её окно времени (от первого до
// последнего слова куплета) и веса слов перевода, чтобы длинные слова заливались
// дольше коротких. Считаем один раз на куплет, в кадре только пишем --fill.
function buildSenseFill(K,v){
  const box=document.getElementById('kpSlines');if(!box)return;
  const rows=[];
  box.querySelectorAll('.ksl').forEach(el=>{
    const li=+el.getAttribute('data-li');
    const ws=(v.lines[li]&&v.lines[li].words)||[];
    if(!ws.length)return;
    const t0=ws[0].t0,t1=Math.max(...ws.map(w=>(w.t1!=null?w.t1:w.t0)));
    const els=el.querySelectorAll('.ksw');if(!els.length)return;
    let acc=0;const seg=[];
    els.forEach(e=>{const wt=(e.textContent||'').length+1;seg.push({a:acc,b:acc+wt,f:-1});acc+=wt;});
    rows.push({box:el,els,seg,total:acc||1,t0,t1:(t1>t0?t1:t0+0.5),p:-1});
  });
  K.sense=rows.length?rows:null;
}
function updateKaraSense(tm){
  const K=window._kara;const S=K&&K.sense;if(!S)return;
  for(let i=0;i<S.length;i++){
    const ln=S[i];
    const p=tm>=ln.t1?1:(tm<=ln.t0?0:(tm-ln.t0)/(ln.t1-ln.t0));
    if(Math.abs(p-ln.p)<0.002)continue;
    ln.p=p;
    const cut=p*ln.total;
    for(let j=0;j<ln.seg.length;j++){
      const s=ln.seg[j];
      const f=Math.round((cut<=s.a?0:cut>=s.b?100:((cut-s.a)/(s.b-s.a))*100)*10)/10;
      if(f!==s.f){ln.els[j].style.setProperty('--fill',f+'%');s.f=f;}
    }
    ln.box.classList.toggle('on',p>0&&p<1);
    ln.box.classList.toggle('done',p>=1);
  }
}
function karaToggleSense(){const K=window._kara;if(!K)return;K.senseOpen=!K.senseOpen;renderVersePanel();}
function karaToggleCombo(li){const K=window._kara;if(!K)return;K.comboOpen=(K.comboOpen===li?null:li);renderVersePanel();}

/* ---- Конец песни: все слова по куплетам + добавление в тетрадь ---- */
function songVocabEntry(song,vi,w){
  return {kr:w.kr,rom:w.rom||'',rr:w.rr||'',ru:w.ru||'',en:w.en||'',
    from:'song',songId:song.id,songTitle:song.title||'',verse:vi};
}
function openSongRecap(){
  const K=window._kara;if(!K)return;
  // Клип НЕ останавливаем: музыка продолжает играть, пока человек разбирает слова —
  // так набор слов ощущается частью песни, а не экзаменом после неё.
  K.recap=true;K.lastLine=null;K.tokEls=null;K.lineEls=null;K.sense=null;
  renderSongRecap();
  const b=document.getElementById('songBody');if(b)b.scrollTop=0;
}
function closeSongRecap(){
  const K=window._kara;if(!K)return;
  K.recap=false;
  renderKaraBody();
}
function renderSongRecap(){
  const K=window._kara;if(!K)return;
  const b=document.getElementById('songBody');if(!b)return;
  const L=getLang();
  const groups=songWordsByVerse(K.song);
  const have={};lsnVocab().forEach(x=>{have[x.kr]=1});
  let total=0,got=0;
  groups.forEach(g=>g.words.forEach(w=>{total++;if(have[w.kr])got++}));
  const body=groups.map(g=>{
    const allIn=g.words.length>0&&g.words.every(w=>have[w.kr]);
    const tr=(g.tr&&(g.tr[L]||g.tr.en||g.tr.ru))||'';
    return `<section class="rcp-v">
      <div class="rcp-vh">
        <span class="rcp-vn">${t('kara_verse')} ${g.i+1}</span>
        <button class="rcp-all" type="button" ${allIn?'disabled':''} onclick="songAddVerse(${g.i})">${allIn?'✓ '+t('song_saved'):t('song_add_verse')}</button>
      </div>
      ${tr?`<p class="rcp-tr">${escapeHtml(tr)}</p>`:''}
      <div class="rcp-words">${g.words.map((w,wi)=>{
        const on=!!have[w.kr];
        const rom=(L==='ru'&&w.rr)?w.rr:(w.rom||'');
        return `<div class="rcp-w${on?' on':''}">
          <button class="rcp-add" type="button" ${on?'disabled':''} onclick="songAddWord(${g.i},${wi})" aria-label="${escapeHtml(w.kr)} — ${t('song_save')(t('wb_words'))}">${on?'✓':'+'}</button>
          <span class="rcp-txt"><b class="rcp-k">${escapeHtml(w.kr)}</b>${rom?`<i class="rcp-r">${escapeHtml(rom)}</i>`:''}</span>
          <span class="rcp-m">${escapeHtml(w[L]||w.ru||w.en||'')}</span>
        </div>`;}).join('')||`<div class="rcp-none">${t('song_recap_none')}</div>`}</div>
    </section>`;}).join('');
  b.innerHTML=`<div class="rcp">
    <div class="rcp-head">
      <div class="rcp-h">${t('song_recap_h')}</div>
      <div class="rcp-sub">${t('song_recap_sub')(got,total)}</div>
    </div>
    ${body||`<div class="rcp-none">${t('song_recap_none')}</div>`}
    <button class="btn accent rcp-quiz" type="button" onclick="openSongQuiz()">🎯 ${t('sq_cta')}</button>
    <div class="rcp-foot">
      <button class="rcp-back" type="button" onclick="closeSongRecap()">${t('song_recap_back')}</button>
      <button class="rcp-done" type="button" onclick="songComplete()">${t('song_finish')}</button>
    </div>
  </div>`;
}
function songAddWord(vi,wi){
  const K=window._kara;if(!K)return;
  const g=songWordsByVerse(K.song)[vi];const w=g&&g.words[wi];if(!w)return;
  const voc=lsnVocab();
  if(!voc.some(x=>x.kr===w.kr)){voc.push(songVocabEntry(K.song,vi,w));lsnSaveVocab(voc);}
  songStudyTouch(K.song);
  if(K.recap)renderSongRecap();
  toast(t('song_save_toast'));
}
function songAddVerse(vi){
  const K=window._kara;if(!K)return;
  const g=songWordsByVerse(K.song)[vi];if(!g)return;
  const voc=lsnVocab();const have={};voc.forEach(x=>{have[x.kr]=1});
  let n=0;
  g.words.forEach(w=>{if(!have[w.kr]){voc.push(songVocabEntry(K.song,vi,w));have[w.kr]=1;n++;}});
  if(n)lsnSaveVocab(voc);
  songStudyTouch(K.song);
  if(K.recap)renderSongRecap();
  toast(n?t('song_added_n')(n):t('wb_dup'));
}

function songComplete(){
  const K=window._kara;if(!K)return;
  const id=K.song.id;const done=songsDone();
  if(!done.includes(id)){done.push(id);songsSaveDone(done)}
  songStudyTouch(K.song,true);
  toast(t('song_done_toast'));
  openSongs();
}

/* ===================== «ЗАЛАТАЙ СТРОКУ» — песня как задание =====================
   Причина правки — фраза Сармата «я прям не хочу учить корейский по этой вкладке».
   Разбор был текстом для чтения: ноль вопросов, ноль ответов, ноль следа в памяти.
   Здесь строка песни превращается в задание с пропуском.

   Чем это не LyricsTraining: там слова затираются случайно, по проценту сложности.
   Мы затираем ПРЕЖДЕ ВСЕГО те, что человек уже сохранил в тетрадь — то есть каждый
   прогон песни автоматически становится повторением, а не отдельной игрой.

   Клип на паузе: подпевать в момент ответа не просим. Пение помогает на ВХОДЕ, но
   мешает на выходе — текст и мелодия хранятся раздельно, воспроизведение пением
   даёт хуже вспоминание [Racette & Peretz, Memory & Cognition, 2007].            */
const SQ_MAX=8;      // длина сессии: около 90 секунд, не больше
function sqPause(){try{const K=window._kara;if(K&&K.player&&K.player.pauseVideo)K.player.pauseVideo()}catch(e){}}
function songQuizBuild(song){
  const L=getLang();
  const pool=[];   // все слова песни — из них берём и ответы, и отвлекающие
  const lines=[];
  ((song&&song.verses)||[]).forEach((v,vi)=>{
    (v.lines||[]).forEach(ln=>{
      const w=(ln.w||[]).filter(x=>x&&x.k&&/[가-힣]/.test(x.k));
      if(w.length<2)return;
      w.forEach(x=>pool.push(x));
      lines.push({vi,w,s:(ln.s&&(ln.s[L]||ln.s.en||ln.s.ru))||'',
        tr:(v.tr&&(v.tr[L]||v.tr.en||v.tr.ru))||''});
    });
  });
  if(!lines.length)return[];
  const uniq={};pool.forEach(w=>{if(!uniq[w.k])uniq[w.k]=w});
  const all=Object.values(uniq);
  if(all.length<4)return[];
  const saved={};lsnVocab().forEach(v=>{if(v&&v.kr)saved[v.kr]=1});
  const items=shuffle(lines).slice(0,SQ_MAX).map(ln=>{
    // Затираем в первую очередь уже сохранённое слово — это и есть повторение.
    const known=ln.w.filter(x=>saved[x.k]);
    const pick=(known.length?known:ln.w.filter(x=>x.k.replace(/\s/g,'').length>1))[0]
      ||ln.w[Math.floor(Math.random()*ln.w.length)];
    const gi=ln.w.indexOf(pick);
    const wrong=shuffle(all.filter(x=>x.k!==pick.k)).slice(0,3);
    const opts=shuffle([pick,...wrong]);
    return {w:ln.w,gi,s:ln.s||ln.tr,opts,answer:opts.findIndex(o=>o.k===pick.k),word:pick};
  });
  return items;
}
function openSongQuiz(){
  const K=window._kara;if(!K)return;
  const items=songQuizBuild(K.song);
  if(!items.length){toast(t('sq_none'));return}
  sqPause();
  window._sq={items,i:0,ok:0,wrong:[],lock:0,fix:false};
  renderSongQuiz();
}
function exitSongQuiz(){window._sq=null;renderSongRecap();}
function sqLineHtml(q,reveal){
  const L=getLang();
  return `<div class="kline sq-line">${q.w.map((w,wi)=>{
    const gap=wi===q.gi;
    const rom=(L==='ru'&&w.rr)?w.rr:(w.r||w.rom||'');
    if(gap&&!reveal)return `<span class="tok sq-gap"><span class="tok-k">▁▁▁</span><span class="tok-r">?</span><span class="tok-m"></span></span>`;
    return `<span class="tok${gap?' sq-was':''}"><span class="tok-k">${escapeHtml(w.k)}</span>`+
      `<span class="tok-r">${escapeHtml(rom)}</span><span class="tok-m">${escapeHtml(w[L]||w.ru||w.en||'')}</span></span>`;
  }).join('')}</div>`;
}
function renderSongQuiz(){
  const S=window._sq;if(!S)return;
  const b=document.getElementById('songBody');if(!b)return;
  if(S.i>=S.items.length){finishSongQuiz();return}
  const q=S.items[S.i];
  const say=q.w.map(w=>w.k).join(' ');
  b.innerHTML=`<div class="sq">
    <div class="dr-top"><div class="lsn-pbar"><i style="width:${Math.round(S.i/S.items.length*100)}%"></i></div><span>${S.i+1}/${S.items.length}</span></div>
    <div class="sq-h">${S.fix?t('sq_fix_h'):t('sq_h')} ${lsnSayBtn(say,'sq-say')}</div>
    ${sqLineHtml(q,false)}
    ${q.s?`<p class="sq-s">${escapeHtml(q.s)}</p>`:''}
    <div class="lq-opts" id="sqOpts">${q.opts.map((o,oi)=>
      `<button class="lq-opt dr-opt sq-opt" onclick="pickSongQuiz(${oi})">${escapeHtml(o.k)}</button>`).join('')}</div>
    <div class="dr-react" id="sqReact"></div>
    <button class="lsn-toinfo" onclick="exitSongQuiz()">← ${t('sq_back')}</button>
  </div>`;
  b.scrollTop=0;
}
function pickSongQuiz(oi){
  const S=window._sq;if(!S||S.lock)return;
  const q=S.items[S.i];if(!q)return;
  S.lock=1;
  const ok=oi===q.answer;
  document.querySelectorAll('#sqOpts .sq-opt').forEach((el,ei)=>{
    el.disabled=true;
    if(ei===q.answer)el.classList.add('correct');
    if(ei===oi&&!ok)el.classList.add('wrong');
  });
  if(ok)S.ok++;else if(!S.fix)S.wrong.push(q);
  // Промах учит, а не просто краснеет: строка сразу показывается целиком, со словом
  // на месте и его переводом — иначе человек уходит с вопросом и без ответа.
  const L=getLang();
  const r=document.getElementById('sqReact');
  if(r)r.innerHTML=(ok?'':`<div class="sq-fix">${sqLineHtml(q,true)}
    <p class="sq-mean"><b>${escapeHtml(q.word.k)}</b> — ${escapeHtml(q.word[L]||q.word.ru||q.word.en||'')}</p></div>`)
    +lsnIdolLine(ok?'ok':'miss');
  lsnSay(q.w.map(w=>w.k).join(' '));
  clearTimeout(S.t);
  S.t=setTimeout(()=>{S.lock=0;S.i++;renderSongQuiz()},ok?900:2200);
}
function startSongFix(){
  const S=window._sq;if(!S||!S.wrong.length)return;
  window._sq={items:S.wrong,i:0,ok:0,wrong:[],lock:0,fix:true,base:S};
  renderSongQuiz();
}
function finishSongQuiz(){
  const S=window._sq;if(!S)return;
  const b=document.getElementById('songBody');if(!b)return;
  const K=window._kara;
  const total=S.items.length;
  // Разбор ошибок бесплатный: он не считается новой сессией и не даёт опыта повторно.
  let xp=0,st=null;
  if(!S.fix){
    xp=6*S.ok+(S.wrong.length?0:8);
    st=lsnTouchDay();if(st.fresh)xp+=10;
    lsnAddXp(xp);
    if(K)songStudyTouch(K.song);
    syncCabinet();
  }
  b.innerHTML=`<div class="dr-done">
    <div class="dd-flame">${S.wrong.length?'🎧':'🎉'}</div>
    <div class="dd-cap">${S.fix?t('sq_fix_done'):t('sq_done')}</div>
    <div class="dd-row"><span>${t('lsn_dr_right')}</span><b>${S.ok}/${total}</b></div>
    ${xp?`<div class="dd-row"><span>${t('lsn_st_xp')}</span><b>+${xp}</b></div>`:''}
    ${st&&st.fresh?`<div class="dd-froze">🔥 ${t('lsn_streak_days')(st.n)}</div>`:''}
    ${lsnIdolLine('done')}
    ${S.wrong.length?`<button class="btn accent lsn-finish" onclick="startSongFix()">${t('sq_fix_btn')(S.wrong.length)}</button>`:''}
    <button class="${S.wrong.length?'lsn-ask':'btn accent lsn-finish'}" onclick="songComplete()">${t('song_finish')}</button>
    <button class="lsn-ask" onclick="exitSongQuiz()">${t('sq_back')}</button>
  </div>`;
  b.scrollTop=0;
}

/* ===================== ОНБОРДИНГ (памятка + гид-подсветка) ===================== */
const ONB_ROWS=[
  {ic:'📘', ru:'Уроки — учи корейский с нуля, шаг за шагом', en:'Lessons — learn Korean from zero, step by step'},
  {ic:'📓', ru:'Рабочая тетрадь — слова с уроков и песен копятся сами', en:'Workbook — words from lessons and songs pile up on their own'},
  {ic:'🎵', ru:'Разбор песни — айдол разбирает клип строка за строкой', en:'Song breakdown — your idol breaks a video down line by line'},
  {ic:'💬', ru:'Чат с айдолом — он держится за пройденные слова, чтобы ты понимал, и подкидывает новые', en:'Chat — he keeps to words you’ve learned so you follow, and slips in new ones'},
  {ic:'🔥', ru:'Ближе с каждым уроком — общение теплеет по мере прогресса', en:'Closer every lesson — the more you learn, the warmer he talks'},
  {ic:'🎴', ru:'Карточки — открываются за пройденные уроки и проверочные', en:'Photocards — unlock as you finish lessons and quizzes'}
];
const TOUR_STEPS=[
  {sel:'.lesson-cta', ru:'Отсюда начинаются уроки корейского.', en:'Korean lessons start here.'},
  {sel:'.tiles .tile:nth-child(1)', ru:'Разбирай клипы строка за строкой.', en:'Break songs down line by line.'},
  {sel:'.tiles .tile:nth-child(2)', ru:'Твои слова и сленг копятся здесь.', en:'Your words and slang collect here.'},
  {sel:'.tiles .tile:nth-child(3)', ru:'Спроси айдола о чём угодно.', en:'Ask your idol anything.'},
  {sel:'.closeness', ru:'Чем больше учишься — тем ближе айдол.', en:'The more you learn, the closer your idol gets.'},
  {sel:'.coll', ru:'Карточки открываются за твой прогресс.', en:'Cards unlock as you progress.'}
];
function onbKey(){return 'so_onb_count_'+lsnUid()}
// Плашка «как здесь всё устроено» показывается автоматически МАКСИМУМ 2 раза за всё время
// (счётчик в localStorage), и не чаще одного раза за сессию — дальше только по кнопке-чипу
// сверху (openOnb). До 23.07 она вылетала почти при каждом рендере кабинета.
function maybeOnboard(){
  if(!currentUser||!myIdol)return;
  if(window._onbShownThisSession)return;
  const n=parseInt(localStorage.getItem(onbKey())||'0',10);
  if(n>=2)return;
  window._onbShownThisSession=true;
  localStorage.setItem(onbKey(),String(n+1));
  setTimeout(openOnb,450);
}
function closeOnb(){document.getElementById('onbOv').classList.remove('show')}
document.getElementById('onbOv').onclick=e=>{if(e.target.id==='onbOv')closeOnb()};
function openOnb(){
  const L=getLang();
  document.getElementById('onbBody').innerHTML=`
    <div class="onb-title">${t('onb_title')}</div>
    <div class="onb-rows">${ONB_ROWS.map(r=>`<div class="onb-row"><span class="onb-ic">${r.ic}</span><span>${r[L]}</span></div>`).join('')}</div>
    <div class="onb-actions">
      <button class="btn accent onb-tour" onclick="closeOnb();startTour()">${t('onb_tour')}</button>
      <button class="onb-ok" onclick="closeOnb()">${t('onb_ok')}</button>
    </div>`;
  document.getElementById('onbOv').classList.add('show');
}

/* ===================== Привязка мессенджеров (омниканальность) ===================== */
// Мессенджер = то же окно в тот же тред. Discord — через OAuth (одна кнопка), LINE/Telegram —
// одноразовый код: юзер получает код в приложении и присылает его боту.
function closeConnect(){document.getElementById('connectOv').classList.remove('show')}
document.getElementById('connectOv').onclick=e=>{if(e.target.id==='connectOv')closeConnect()};
// Какой мессенджер вести первым — по языку интерфейса (там реально сидит аудитория).
// Совпадает с langChannel() в lib/reply.js: RU/UK → Telegram, JA/TH/ZH → LINE, иначе Discord.
const CONNECT_CH={
  telegram:{ic:'✈️',name:'Telegram',sub:()=>t('connect_telegram_sub'),go:"connectCode('telegram')"},
  line:    {ic:'💬',name:'LINE',    sub:()=>t('connect_line_sub'),    go:"connectCode('line')"},
  discord: {ic:'🎮',name:'Discord', sub:()=>t('connect_discord_sub'), go:'connectDiscord()'},
};
function primaryChannel(){const l=getLang();if(['ru','uk'].includes(l))return'telegram';if(['ja','th','zh'].includes(l))return'line';return'discord';}
async function openConnect(){
  const box=document.getElementById('connectBody');
  const prim=primaryChannel();
  const p=CONNECT_CH[prim];
  const others=Object.keys(CONNECT_CH).filter(k=>k!==prim);
  // Одна крупная кнопка под язык юзара = переезд в 2 касания. Остальные каналы — мелко ниже.
  box.innerHTML=`<div class="onb-title">${t('connect_h')}</div>
    <p class="connect-sub">${t('connect_sub')}</p>
    <div class="connect-rows">
      <button class="connect-row" style="border-color:var(--accent,#c9a24a);box-shadow:0 0 0 1px var(--accent,#c9a24a) inset" onclick="${p.go}">
        <span class="cr-ic">${p.ic}</span><b>${p.name}</b><small>${p.sub()}</small></button>
    </div>
    <div class="connect-other">${t('connect_other')}</div>
    <div class="connect-rows">
      ${others.map(k=>{const c=CONNECT_CH[k];return `<button class="connect-row sm" onclick="${c.go}"><span class="cr-ic">${c.ic}</span><b>${c.name}</b><small>${c.sub()}</small></button>`}).join('')}
    </div>
    <div id="connectResult"></div>`;
  document.getElementById('connectOv').classList.add('show');
  // Отметим уже привязанные каналы.
  try{
    const r=await fetch('/api/bot?action=links');const d=await r.json();
    if(d.links&&d.links.length){
      const names=d.links.map(l=>l.platform).join(', ');
      document.getElementById('connectResult').innerHTML=`<div class="connect-done">✓ ${t('connect_active')}: ${names}</div>`;
    }
  }catch(e){}
}
function connectDiscord(){
  // Уводим на серверный OAuth-старт (он знает сессию и создаёт state-токен).
  window.location.href='/api/bot?action=discord-oauth&lang='+encodeURIComponent(getLang());
}
async function connectCode(platform){
  const res=document.getElementById('connectResult');
  res.innerHTML=`<div class="connect-loading">…</div>`;
  try{
    const r=await fetch('/api/bot?action=link-token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang:getLang(),platform})});
    const d=await r.json();
    if(!r.ok||!d.code){res.innerHTML=`<div class="connect-err">${d.error||'Ошибка'}</div>`;return}
    // Telegram отдаёт готовый deep-link — привязка в один тап, код вводить не нужно.
    if(d.deeplink){
      res.innerHTML=`<div class="connect-code-box"><a class="ccb-link" href="${d.deeplink}" target="_blank" rel="noopener">${t('connect_open')}</a></div>`;
      window.open(d.deeplink,'_blank','noopener');
      return;
    }
    res.innerHTML=`<div class="connect-code-box">
      <div class="ccb-step">${t('connect_step1')}</div>
      <div class="ccb-code">${d.code}</div>
      <div class="ccb-step">${t('connect_step2')}</div>
    </div>`;
  }catch(e){res.innerHTML=`<div class="connect-err">${e.message}</div>`}
}
// Возврат с Discord OAuth: показать результат из ?link=.
function handleLinkReturn(){
  const p=new URLSearchParams(location.search).get('link');
  if(!p)return;
  const map={discord_ok:t('link_ok'),discord_fail:t('link_fail'),discord_expired:t('link_fail'),need_login:t('link_login'),no_idol:t('link_noidol')};
  if(map[p])toast(map[p]);
  history.replaceState({},'',location.pathname);
}

let _tourI=0;
function startTour(){_tourI=0;document.getElementById('tourLayer').classList.add('on');tourShow()}
function tourShow(){
  const step=TOUR_STEPS[_tourI];
  const el=step&&document.querySelector(step.sel);
  if(!el){if(_tourI<TOUR_STEPS.length-1){_tourI++;return tourShow()}return endTour()}
  el.scrollIntoView({block:'center',behavior:'smooth'});
  setTimeout(()=>positionTour(el,step),280);
}
function positionTour(el,step){
  const r=el.getBoundingClientRect(),pad=8;
  const hole=document.getElementById('tourHole');
  hole.style.top=(r.top-pad)+'px';hole.style.left=(r.left-pad)+'px';
  hole.style.width=(r.width+pad*2)+'px';hole.style.height=(r.height+pad*2)+'px';
  const tip=document.getElementById('tourTip');
  document.getElementById('ttText').textContent=step[getLang()];
  document.getElementById('ttCount').textContent=(_tourI+1)+'/'+TOUR_STEPS.length;
  document.getElementById('ttNext').textContent=_tourI>=TOUR_STEPS.length-1?t('onb_done'):t('onb_next');
  tip.style.left='50%';tip.style.transform='translateX(-50%)';
  if(r.bottom+150<window.innerHeight){tip.style.top=(r.bottom+pad+10)+'px';tip.style.bottom='auto'}
  else{tip.style.top='auto';tip.style.bottom=(window.innerHeight-r.top+pad+10)+'px'}
}
function tourNext(){_tourI++;if(_tourI>=TOUR_STEPS.length)return endTour();tourShow()}
function endTour(){document.getElementById('tourLayer').classList.remove('on')}

/* ===================== ЛЕНТА ПОДПИСОК ===================== */
const FAKE_PRODUCERS=['moonlight_stage','neon_producer','starlight_fan','crystal_prod'];
// Незалогиненным не показываем честную пустую ленту — она читается как "тут ничего нет,
// нечего и регистрироваться". Вместо этого блюрим правдоподобный превью (реальные портреты
// из витрины, без обращения к базе) и предлагаем регистрацию, чтобы разблокировать.
function renderLentaTeaser(body){
  const sample=IDOLS.slice(0,4);
  if(!sample.length){body.innerHTML='<div class="lenta-empty">Зарегистрируйся, чтобы видеть ленту.</div>';return}
  const kinds=[["Клип","новое выступление"],["Фотокарточка","новая карточка в коллекции"],["Лайв","живое фото со съёмок"]];
  const items=sample.map((c,i)=>`
    <div class="lenta-item">
      <div class="li-owner"><img src="${c.img}"><div><b>${c.name}</b><div class="who">Продюсер: @${FAKE_PRODUCERS[i%FAKE_PRODUCERS.length]}</div></div></div>
      <div class="li-photo"><img src="${c.img}"></div>
      <div class="li-body"><div class="kind">${kinds[i%kinds.length][0]}</div><div class="sub">${kinds[i%kinds.length][1]}</div></div>
    </div>`).join('');
  body.innerHTML=`<div class="lenta-teaser">
    <div class="lenta-blur">${items}</div>
    <div class="lenta-lock"><div class="lenta-lock-box">
      <div class="ll-h">Лента полна жизни 👀</div>
      <p>Новые клипы, фотокарточки и лайвы от продюсеров, на которых ты подписан. Зарегистрируйся, чтобы видеть их первым.</p>
      <button class="btn accent" onclick="openAuth('signup')">Зарегистрироваться</button>
    </div></div>
  </div>`;
}
function renderLenta(){
  const body=document.getElementById('lentaBody');
  if(!currentUser){renderLentaTeaser(body);return}
  const followed=CHART.slice(0,4); // мок: как будто пользователь подписан на топ-4
  if(!followed.length){body.innerHTML='<div class="lenta-empty">Пока никто не подписан — загляни в топ-чарт и подпишись на кого-нибудь.</div>';return}
  const kinds=[["Клип","новое выступление"],["Фотокарточка","новая карточка в коллекции"],["Лайв","живое фото со съёмок"]];
  const items=[];
  followed.forEach((e,i)=>{
    const k=kinds[i%kinds.length];
    items.push({e,kind:k[0],sub:k[1],t:i});
  });
  body.innerHTML=items.map(({e,kind,sub})=>`
    <div class="lenta-item">
      <div class="li-owner"><img src="${e.idol.img}"><div><b>${e.idol.name}</b><div class="who">Продюсер: @${e.owner}</div></div></div>
      <div class="li-photo"><img src="${e.idol.img}"></div>
      <div class="li-body">
        <div class="kind">${kind}</div>
        <div class="sub">${sub}</div>
      </div>
    </div>`).join('');
}

async function boot(){
  IDOLS=await (await fetch('/idols.json')).json();
  renderIdolGrid();
  buildOpts('optClip',CLIP,'clip',CLIP_ICON,CLIP_COLOR);
  renderDanceOpts();
  renderLangOpts();
  [...document.querySelectorAll('#idolGenderTabs .gtab')].forEach(t=>{
    t.onclick=()=>{
      state.genderTab=t.dataset.g;
      [...document.querySelectorAll('#idolGenderTabs .gtab')].forEach(x=>x.classList.remove('on'));
      t.classList.add('on');
      renderIdolGrid();
      renderDanceOpts();
    };
  });
  updateSummary();
  CHART=[];
  const nav=loadNav();
  await showView((nav&&nav.view)||'cabinet-own');
  restoreOverlay(nav);
  handleLinkReturn();
}
function renderIdolGrid(){
  const g=document.getElementById('grid');
  const emptyBox=document.getElementById('emptyGenre');
  g.innerHTML='';
  const list=IDOLS.filter(c=>c.gender===state.genderTab);
  emptyBox.style.display=list.length?'none':'block';
  list.forEach(c=>{
    const el=document.createElement('div');el.className='card'+(picked&&picked.id===c.id?' sel':'');el.id='c'+c.id;
    el.innerHTML=`<div class="ph"><img src="${c.img}" alt="${c.name}"><div class="check">✓</div></div>
      <div class="body"><div class="nm"><span class="cc" style="background:${c.color}"></span><b>${c.name}</b></div>
      <div class="concept">${c.concept}</div></div>`;
    el.onclick=()=>toggle(c.id);
    g.appendChild(el);
  });
}
function buildOpts(id,arr,key,iconTable,colorTable){
  const box=document.getElementById(id);
  box.innerHTML='';
  arr.forEach(([val,label,sub])=>{
    const b=document.createElement('button');b.className='opt'+(state[key]===val?' on':'');
    b.innerHTML=`${swatch(iconTable[val],colorTable[val])}<div class="txt">${label}<small>${sub}</small></div>`;
    b.onclick=()=>{state[key]=val;[...box.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');updateSummary()};
    box.appendChild(b);
  });
}
function renderDanceOpts(){
  const box=document.getElementById('optDance');
  box.innerHTML='';
  const list=DANCE.filter(([,,,gender])=>gender===state.genderTab);
  if(!list.some(([val])=>val===state.dance)) state.dance=list[0][0];
  list.forEach(([val,label,sub])=>{
    const b=document.createElement('button');b.className='opt'+(state.dance===val?' on':'');
    b.innerHTML=`${swatch(DANCE_BURST,DANCE_COLOR[val])}<div class="txt">${wordmark(val,label)}<small>${sub}</small></div>`;
    b.onclick=()=>{state.dance=val;[...box.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');updateSummary();renderSongOpts()};
    box.appendChild(b);
  });
  renderSongOpts(); // жанры песни зависят от выбранной группы — обновляем список блокировок
  updateSummary();
}
// Жанр песни ограничен родными жанрами выбранной группы (+ всегда доступная ballad).
// Несовместимые жанры показаны, но заблюрены и некликабельны — видно, что выбор есть,
// но пока недоступен, пока не выбрана подходящая группа.
function renderSongOpts(){
  const box=document.getElementById('optSong');
  box.innerHTML='';
  const avail=nativeGenres();
  if(!avail.includes(state.song)) state.song=avail[0];
  // Первый жанр в GROUP_GENRES[группа] — это тот, что совпадает с её fam в pipeline.js
  // (родной жанр, под который у группы больше всего фирменных движений). Для мужских
  // групп (нет в GROUP_GENRES) рекомендации нет — у них жанр не привязан к хореографии.
  const recommended=GROUP_GENRES[state.dance]?GROUP_GENRES[state.dance][0]:null;
  const groupLabel=lbl(DANCE,state.dance);
  SONG.forEach(([val,label,sub])=>{
    const locked=!avail.includes(val);
    const isRec=!locked&&val===recommended;
    const b=document.createElement('button');
    b.className='opt'+(state.song===val?' on':'')+(locked?' locked':' available')+(isRec?' recommended':'');
    if(isRec) b.title=`Родной стиль ${groupLabel} — здесь у неё больше всего фирменных движений`;
    b.innerHTML=`${swatch(SONG_ICON[val],SONG_COLOR[val])}<div class="txt">${label}${isRec?' <span class="rec-badge">★ рекомендуется</span>':''}<small>${isRec?`родной стиль ${groupLabel} · `:''}${sub}</small></div>`;
    if(!locked) b.onclick=()=>{state.song=val;[...box.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');updateSummary()};
    box.appendChild(b);
  });
  updateSummary();
}
function langSwatch(val){
  return `<div class="swatch" style="background:${LANG_COLOR[val]}22;color:${LANG_COLOR[val]};font-size:11px;font-weight:800;letter-spacing:.03em">${LANG_CODE[val]}</div>`;
}
function renderLangOpts(){
  const box=document.getElementById('optLang1');
  box.innerHTML='';
  LANGUAGE.forEach(([val,label,sub])=>{
    const b=document.createElement('button');b.className='opt'+(state.lang1===val?' on':'');
    b.innerHTML=`${langSwatch(val)}<div class="txt">${label}${state.bilingual?'<small>1-я половина</small>':(sub?`<small>${sub}</small>`:'')}</div>`;
    b.onclick=()=>{
      state.lang1=val;
      if(!state.bilingual) state.lang2=val;
      [...box.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');
      renderLangOpts();updateSummary();
    };
    box.appendChild(b);
  });
  renderBilingualBox();
}
// Билингвальный клип (разные языки в 2 половинах) открывается только когда у СВОЕГО айдола
// языковой навык прокачан до 100% — тренировка привязана к аккаунту, а не к тому, чей портрет
// сейчас личности выбран в витрине для генерации (см. PROGRESS.md — билингвальность была открытой задачей).
function bilingualUnlocked(){
  return !!(currentUser && myIdol && myTraining && myTraining.language_pct>=100);
}
function renderBilingualBox(){
  const box=document.getElementById('bilingualBox');
  const pct=(currentUser && myIdol && myTraining)?myTraining.language_pct:0;
  if(!bilingualUnlocked()){
    state.bilingual=false;state.lang2=state.lang1;
    let hint;
    if(!currentUser) hint='Войди и заведи своего айдола, чтобы начать тренировки.';
    else if(!myIdol) hint='Заведи своего айдола в «Моём продакшне», чтобы начать тренировки.';
    else hint=`Тренируй «Язык» в Личном кабинете, чтобы поднять прогресс.`;
    box.innerHTML=`<div class="lang-lock">🔒 <b>Спеть на 2 языках</b> — 1-я половина клипа на одном языке, 2-я на другом.
      Открывается при 100% в навыке «Язык».
      ${currentUser&&myIdol?`<div class="lang-progress">Сейчас: ${pct}% · ${hint}</div>`:`<div class="lang-progress">${hint}</div>`}</div>`;
    return;
  }
  box.innerHTML=`<label class="bilingual-toggle"><input type="checkbox" id="bilingualCheck" ${state.bilingual?'checked':''}>
    Спеть на 2 языках — 1-я половина на одном, 2-я на другом</label>
    <div class="opts" id="optLang2" style="display:${state.bilingual?'flex':'none'}"></div>`;
  document.getElementById('bilingualCheck').onchange=(e)=>{
    state.bilingual=e.target.checked;
    if(!state.bilingual) state.lang2=state.lang1;
    renderLangOpts();updateSummary();
  };
  if(state.bilingual){
    const box2=document.getElementById('optLang2');
    LANGUAGE.forEach(([val,label])=>{
      const b=document.createElement('button');b.className='opt'+(state.lang2===val?' on':'');
      b.innerHTML=`${langSwatch(val)}<div class="txt">${label}<small>2-я половина</small></div>`;
      b.onclick=()=>{state.lang2=val;[...box2.children].forEach(x=>x.classList.remove('on'));b.classList.add('on');updateSummary()};
      box2.appendChild(b);
    });
  }
}
function toggle(id){
  if(picked && picked.id===id){
    picked=null;
    document.getElementById('c'+id).classList.remove('sel');
  }else{
    if(picked) document.getElementById('c'+picked.id)?.classList.remove('sel');
    picked=IDOLS.find(x=>x.id===id);
    document.getElementById('c'+id).classList.add('sel');
  }
  const perso=document.getElementById('zone-perso');
  if(picked){
    perso.classList.add('show');
    document.getElementById('si1')?.classList.remove('on');
    document.getElementById('si2')?.classList.add('on');document.getElementById('si3')?.classList.add('on');
    perso.scrollIntoView({behavior:'smooth',block:'start'});
  }else{
    perso.classList.remove('show');
    document.getElementById('si1')?.classList.add('on');
    document.getElementById('si2')?.classList.remove('on');document.getElementById('si3')?.classList.remove('on');
  }
  renderSel();updateSummary();
}
function renderSel(){
  const row=document.getElementById('selRow');
  if(!picked){row.innerHTML='<div class="empty">Айдол не выбран</div>';return}
  row.innerHTML=`<div class="chip"><img src="${picked.img}"><b>${picked.name}</b></div>`;
}
function lbl(arr,val){const f=arr.find(x=>x[0]===val);return f?f[1]:val}
function updateSummary(){
  const s=document.getElementById('summary');const b=document.getElementById('genBtn');
  document.getElementById('pickTag').textContent=picked?'выбран 1 айдол':'выбери одного';
  if(!picked){s.innerHTML='Сначала выбери айдола в витрине ↑';b.disabled=true;return}
  b.disabled=false;
  const langTxt=state.bilingual?`${lbl(LANGUAGE,state.lang1)} + ${lbl(LANGUAGE,state.lang2)}`:lbl(LANGUAGE,state.lang1);
  s.innerHTML=`<b>${picked.name}</b> · ${lbl(SONG,state.song)} · ${lbl(CLIP,state.clip)} · танец ${wordmark(state.dance,lbl(DANCE,state.dance))} · ${langTxt}`;
}

function errBox(box,msg){
  box.innerHTML=`<div class="rb"><h3>Не получилось</h3>
    <div class="err" style="margin-top:12px">${msg}</div>
    <div class="racts"><button class="btn ghost" onclick="closeOv()">Закрыть</button>
    <button class="btn accent" onclick="generate()">Ещё раз</button></div></div>`;
}

function stepsHtml(active){
  const steps=[['video','Видео'],['song','Песня'],['sync','Склейка'],['stitch','Финал']];
  return '<div class="steps">'+steps.map(([k,l])=>{
    const cls = k===active ? 'active' : (steps.findIndex(x=>x[0]===k) < steps.findIndex(x=>x[0]===active) ? 'done' : '');
    return `<span class="${cls}">${l}</span>`;
  }).join('')+'</div>';
}

async function pollJob(requestId, onProgress){
  const started=Date.now();
  const MAX_MS=8*60*1000;
  for(;;){
    if(Date.now()-started>MAX_MS) throw new Error('Слишком долго (8 мин)');
    const sr=await fetch('/api/pipeline?action=status&id='+encodeURIComponent(requestId));
    const sd=await sr.json();
    if(!sr.ok) throw new Error(sd.error||'Ошибка статуса');
    if(sd.status==='ERROR') throw new Error('Ошибка fal: '+(sd.error||'')+' '+JSON.stringify(sd.detail||''));
    if(sd.status==='COMPLETED') return;
    const secs=Math.round((Date.now()-started)/1000);
    const q=(sd.queuePosition!=null&&sd.status==='IN_QUEUE')?` (в очереди: ${sd.queuePosition})`:'';
    onProgress(`${secs}с${q}…`);
    await new Promise(r=>setTimeout(r,5000));
  }
}

async function generateOneSegment({imageUrl,theme,dance,name,gender,angle,song,seed,part,parts,songUrl,startImageUrl},setLoad,segLabel){
  const MAX_ATTEMPTS=3;
  let lipsyncSubmit=null;
  let lastSilentVideoUrl=null;
  let gaveUpOnLipsync=false;
  for(let attempt=1;attempt<=MAX_ATTEMPTS;attempt++){
    setLoad('video',`${segLabel}: Kling рендерит видео${attempt>1?` (попытка ${attempt})`:''}…`);
    const videoSubmit=await fetch('/api/pipeline?action=generate',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({imageUrl,theme,dance,genre:song,memberName:name,angle,seed,part,parts,startImageUrl})}).then(r=>r.json());
    if(videoSubmit.ok===false||!videoSubmit.requestId) throw new Error((videoSubmit.error||`Не удалось поставить видео в очередь (${segLabel})`)+' '+JSON.stringify(videoSubmit.detail||''));

    await pollJob(videoSubmit.requestId,(t)=>setLoad('video',`${segLabel}: Kling рендерит видео… ${t}`));
    const videoResultResp=await fetch('/api/pipeline?action=result&id='+encodeURIComponent(videoSubmit.requestId));
    const videoResult=await videoResultResp.json();
    if(!videoResultResp.ok||videoResult.ok===false||!videoResult.videoUrl) throw new Error((videoResult.error||`Видео не получено (${segLabel})`)+' '+JSON.stringify(videoResult.detail||''));
    lastSilentVideoUrl=videoResult.videoUrl;

    setLoad('sync',`${segLabel}: синхронизируем губы под песню…`);
    const attemptSubmit=await fetch('/api/pipeline?action=lipsync',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({videoUrl:videoResult.videoUrl,songUrl})}).then(r=>r.json());

    const isFaceError=attemptSubmit.ok===false&&JSON.stringify(attemptSubmit.detail||'').includes('face_detection_error');
    if(isFaceError&&attempt<MAX_ATTEMPTS){continue;}
    if(isFaceError){gaveUpOnLipsync=true;break;} // лицо стабильно не детектится на этой хореографии — фолбэк ниже
    if(attemptSubmit.ok===false||!attemptSubmit.requestId) throw new Error((attemptSubmit.error||`Не удалось запустить склейку (${segLabel})`)+' '+JSON.stringify(attemptSubmit.detail||''));
    lipsyncSubmit=attemptSubmit;
    break;
  }

  // Kling LipSync не смог найти лицо ни на одной из попыток (быстрый/закрытый лицом танец) —
  // не проваливаем весь клип, кладём песню поверх немого видео без синхронизации губ.
  if(gaveUpOnLipsync){
    setLoad('sync',`${segLabel}: губы не синхронизируются на этой хореографии — накладываем песню без липсинка…`);
    const muxResp=await fetch('/api/pipeline?action=muxaudio',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({videoUrl:lastSilentVideoUrl,songUrl})}).then(r=>r.json());
    if(muxResp.ok===false||!muxResp.videoUrl) throw new Error((muxResp.error||`Не удалось наложить песню (${segLabel})`)+' '+JSON.stringify(muxResp.detail||''));
    // Тот же трим краёв, что и в обычном пути (см. ниже) — иначе на стыке сегментов в
    // склейке остаётся необрезанный "замёрзший" край, который читается как фриз на 1-2с.
    setLoad('sync',`${segLabel}: дошлифовываем…`);
    const muxFinalizeResp=await fetch('/api/pipeline?action=finalize',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({videoUrl:muxResp.videoUrl})}).then(r=>r.json());
    return (muxFinalizeResp.ok!==false&&muxFinalizeResp.videoUrl)?muxFinalizeResp.videoUrl:muxResp.videoUrl;
  }

  await pollJob(lipsyncSubmit.requestId,(t)=>setLoad('sync',`${segLabel}: синхронизируем губы… ${t}`));
  const finalResultResp=await fetch('/api/pipeline?action=result&id='+encodeURIComponent(lipsyncSubmit.requestId));
  const finalResult=await finalResultResp.json();
  if(!finalResultResp.ok||finalResult.ok===false||!finalResult.videoUrl) throw new Error((finalResult.error||`Видео сегмента не получено (${segLabel})`)+' '+JSON.stringify(finalResult.detail||''));

  setLoad('sync',`${segLabel}: дошлифовываем…`);
  const finalizeResp=await fetch('/api/pipeline?action=finalize',{method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({videoUrl:finalResult.videoUrl})}).then(r=>r.json());
  return (finalizeResp.ok!==false&&finalizeResp.videoUrl)?finalizeResp.videoUrl:finalResult.videoUrl;
}

async function generate(){
  if(!picked)return;
  if(!currentUser){openAuth('signup');toast('Сначала зарегистрируйся — это займёт полминуты');return}
  const ov=document.getElementById('ov');const box=document.getElementById('resultBox');
  ov.classList.add('show');
  const name=picked.name;
  const setLoad=(active,sub)=>{box.innerHTML=`<div class="rv"><div class="load"><div class="spinner"></div>
    <div class="big">Создаём выступление: ${name}…</div>
    ${stepsHtml(active)}
    <p>${sub}</p></div></div>`;};

  // Если вошёл и есть свой айдол — заводим запись в базе ДО начала генерации (честная история,
  // не только то, что видно в этой вкладке). Без аккаунта клип всё равно сгенерится (демо-режим),
  // просто не сохранится — см. "первый клип бесплатный" в позиционировании продукта.
  let clipId=null;
  if(currentUser&&myIdol){
    const cr=await fetch('/api/clip',{method:'POST'});
    const cd=await cr.json();
    if(cr.ok&&cd.ok) clipId=cd.clipId;
  }

  try{
    setLoad('video','Готовим 20-секундное выступление (2 части)…');
    const imageUrl=IMAGE_BASE+picked.img;
    // один seed на весь клип; part 0/1 дают каждой половине СВОЙ кусок танца (без повторов)
    const base={imageUrl,theme:state.clip,dance:state.dance,name,gender:picked.gender,song:state.song,seed:Math.floor(Math.random()*1e9),parts:2};

    // ОДНА песня на весь клип, режется на 2 половины → музыка не прыгает между частями
    setLoad('video','Генерируем одну песню на весь клип…');
    const songResp=await fetch('/api/pipeline?action=song',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({song:state.song,lengthMs:10000,parts:2,language:state.lang1,memberName:name,gender:picked.gender})}).then(r=>r.json());
    if(songResp.ok===false||!Array.isArray(songResp.songUrls)||songResp.songUrls.length<2) throw new Error(songResp.error||'Не удалось сгенерировать песню');
    const [songA,songB]=songResp.songUrls;

    const seg1=await generateOneSegment({...base,angle:'front',part:0,songUrl:songA},setLoad,'Часть 1/2');

    // последний кадр части 1 → старт части 2 (сцена/одежда/лицо продолжаются)
    setLoad('video','Часть 2/2: берём последний кадр части 1 для непрерывности…');
    let startImageUrl=null;
    try{
      const lf=await fetch('/api/pipeline?action=lastframe',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({videoUrl:seg1})}).then(r=>r.json());
      if(lf.ok&&lf.imageUrl) startImageUrl=lf.imageUrl;
    }catch(e){/* не критично — откатимся на портрет */}

    const seg2=await generateOneSegment({...base,angle:'side',part:1,songUrl:songB,startImageUrl},setLoad,'Часть 2/2');

    setLoad('stitch','Склеиваем обе части в один клип…');
    const stitchResp=await fetch('/api/pipeline?action=stitch',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({videoUrls:[seg1,seg2]})}).then(r=>r.json());
    if(stitchResp.ok===false||!stitchResp.videoUrl) throw new Error((stitchResp.error||'Не удалось склеить части')+'');
    const playUrl=stitchResp.videoUrl;

    if(clipId) await fetch('/api/clip',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({clipId,status:'done',videoUrl:playUrl,durationSec:20,costUsd:0.93})});

    box.innerHTML=`<div class="rv"><video src="${playUrl}" controls autoplay playsinline></video></div>
      <div class="rb"><h3>${name} — «${lbl(SONG,state.song)}»</h3>
      <p>${lbl(CLIP,state.clip)} · танец ${lbl(DANCE,state.dance)} · ~20с · ${state.bilingual?`${lbl(LANGUAGE,state.lang1)} + ${lbl(LANGUAGE,state.lang2)}`:lbl(LANGUAGE,state.lang1)}</p>
      <div class="racts"><button class="btn ghost" onclick="closeOv()">Готово</button>
      <a class="btn accent" href="${playUrl}" target="_blank" style="text-align:center;text-decoration:none">Скачать</a></div></div>`;
  }catch(e){
    if(clipId) await fetch('/api/clip',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({clipId,status:'failed',error:String(e.message||e)})}).catch(()=>{});
    errBox(box, e.message||String(e));
  }
}
function closeOv(){document.getElementById('ov').classList.remove('show')}
document.getElementById('ov').onclick=e=>{if(e.target.id==='ov')closeOv()};

/* ===================== АВТОРИЗАЦИЯ ===================== */
let currentUser=null, myIdol=null, myTraining=null, authReadyDone=false;
async function checkAuth(){
  const r=await fetch('/api/auth?action=me');
  const d=await r.json();
  currentUser=d.user||null;
  renderAuthArea();
  if(currentUser) await loadMyIdol();
  renderLangOpts();
}
let myClips=[];
async function loadMyIdol(){
  const r=await fetch('/api/idol');
  const d=await r.json();
  myIdol=d.idol?{...d.idol,img:d.idol.portrait_url}:null;
  myTraining=d.training||null;
  myClips=[];
  if(myIdol){
    const cr=await fetch('/api/clip?idolId='+encodeURIComponent(myIdol.id));
    const cd=await cr.json();
    myClips=cd.clips||[];
  }
}
function renderAuthArea(){
  const el=document.getElementById('authArea');
  if(currentUser){
    el.innerHTML=`<div class="auth-user"><b>@${currentUser.username||'producer'}</b><button class="btn ghost sm" onclick="doLogout()">${t('au_logout')}</button></div>`;
  }else{
    el.innerHTML=`<button class="btn ghost sm" onclick="openAuth('login')">${t('au_login')}</button><button class="btn accent sm" onclick="openAuth('signup')">${t('au_signup')}</button>`;
  }
}
function openAuth(mode){
  document.getElementById('authOv').classList.add('show');
  renderAuthForm(mode);
}
function closeAuthOv(){document.getElementById('authOv').classList.remove('show')}
document.getElementById('authOv').onclick=e=>{if(e.target.id==='authOv')closeAuthOv()};
function togglePass(id,btn){const el=document.getElementById(id);if(!el)return;const show=el.type==='password';el.type=show?'text':'password';if(btn)btn.textContent=show?'🙈':'👁';}
function renderAuthForm(mode,errMsg){
  const box=document.getElementById('authBox');
  const isSignup=mode==='signup';
  box.innerHTML=`
    <h3>${isSignup?t('au_signup'):t('au_login')}</h3>
    ${errMsg?`<div class="err" style="margin-bottom:12px">${errMsg}</div>`:''}
    ${isSignup?`<input id="authUsername" placeholder="${t('au_user')}" autocomplete="username">`:''}
    <input id="authEmail" type="email" placeholder="${t('au_email')}" autocomplete="email">
    <div class="pass-wrap"><input id="authPassword" type="password" placeholder="${t('au_pass')}" autocomplete="${isSignup?'new-password':'current-password'}"><button type="button" class="pass-eye" onclick="togglePass('authPassword',this)" aria-label="show password">👁</button></div>
    <button class="btn accent" style="width:100%" id="authSubmitBtn" onclick="submitAuth('${mode}')">${isSignup?t('au_create'):t('au_login')}</button>
    <div class="auth-switch">${isSignup?`${t('au_have')} <a onclick=\"renderAuthForm('login')\">${t('au_login')}</a>`:`${t('au_no')} <a onclick=\"renderAuthForm('signup')\">${t('au_signup')}</a>`}</div>
    ${isSignup?'':`<div class="auth-switch"><a onclick="renderForgotForm()">${t('forgot_link')}</a></div>`}
  `;
}
function renderForgotForm(sent){
  const box=document.getElementById('authBox');
  box.innerHTML=`
    <h3>${t('forgot_h')}</h3>
    ${sent?`<div class="msg ok" style="color:var(--good,#7fe8c9);font-size:13px;margin-bottom:12px">${t('forgot_sent')}</div>`:`
    <input id="forgotEmail" type="email" placeholder="${t('au_email')}" autocomplete="email">
    <button class="btn accent" style="width:100%" id="forgotBtn" onclick="submitForgot()">${t('forgot_send')}</button>`}
    <div class="auth-switch"><a onclick="renderAuthForm('login')">${t('back_login')}</a></div>
  `;
}
async function submitForgot(){
  const email=document.getElementById('forgotEmail').value.trim();
  if(!email){renderForgotForm();return}
  const b=document.getElementById('forgotBtn');b.disabled=true;b.textContent='…';
  try{await fetch('/api/auth?action=forgot',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})})}catch(e){}
  renderForgotForm(true);
}
async function submitAuth(mode){
  const email=document.getElementById('authEmail').value.trim();
  const password=document.getElementById('authPassword').value;
  const username=mode==='signup'?document.getElementById('authUsername').value.trim():undefined;
  if(!email||!password){renderAuthForm(mode,'Заполни email и пароль');return}
  const btn=document.getElementById('authSubmitBtn');
  btn.disabled=true;btn.textContent='Секунду…';
  const r=await fetch('/api/auth?action='+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password,username})});
  const d=await r.json();
  if(!r.ok||d.ok===false){renderAuthForm(mode,d.error||'Что-то пошло не так');return}
  currentUser=d.profile;
  await loadMyIdol();
  closeAuthOv();
  renderAuthArea();
  // После входа всегда открываем личный кабинет, а не тот экран, где юзер был до логина
  // (баг прогона 23.07: после входа показывалась витрина «Айдолы» вместо кабинета).
  await showView('cabinet-own');
  toast(mode==='signup'?'Аккаунт создан — добро пожаловать!':'С возвращением, @'+(d.profile.username||''));
}
async function doLogout(){
  await fetch('/api/auth?action=logout',{method:'POST'});
  currentUser=null;
  myIdol=null;
  myTraining=null;
  renderAuthArea();
  renderLangOpts();
  toast('Вы вышли из аккаунта');
}

// ===== Локализация интерфейса + чата (RU/EN одним переключателем) =====
function getLang(){return localStorage.getItem('s1_lang')||'en'}
function setLang(v){localStorage.setItem('s1_lang',v);location.reload()}
const T={
  en:{
    nav_home:"Backstage", nav_idols:"Idols", no_idol_h:"Find out what your idol is really singing", no_idol_sub:"Every line twice: word by word, and what those words actually mean together. Any K-pop song, right now.", no_idol_btn:"Pick an idol →",
    hd_eyebrow:"WORD BY WORD · AND WHAT IT REALLY MEANS", hd_sub:"Every line twice: word by word, and what those words actually mean together. Any K-pop song, right now.",
    hd_h:"Find out what your idol is really singing", hd_foot:"Your idol explains it — and then talks to you in Korean.", footer:"Idolingo · learn Korean with an AI idol you pick · your friend and tutor in one", lang_cap:"learning language",
    pick_h:"Pick an idol — they become your friend and teach you Korean 🇰🇷", pick_sub:"One idol free, yours forever. Chat every day and learn Korean the fun way.",
    tab_girls:"Girls", tab_boys:"Boys",
    concept_suffix:"· your idol tutor", your_korean:"Your Korean", level:"level", days_together:"days together", streak_days:"day streak", streak_start:"Start your streak — study today",
    lesson_start:"Start a lesson", lesson_sub:n=>`${n} teaches you Korean, step by step`,
    lessons_h:"Lessons", lsn_vocab_note:n=>`${n} new words will be saved to your Workbook`, lsn_quiz_h:"Check yourself", lsn_check:"Check answers", lsn_next_quiz:"Next: quick check →", lsn_toinfo:"back to the material", lsn_retry:"Try again", lsn_ask:"Ask a question", lsn_ask_named:nm=>`Ask ${nm}`, lsn_answer_all:"Answer every question first.", lsn_wrong:n=>`${n} wrong — look again and retry.`, lsn_passed:"Lesson complete 🎉", lsn_next:"Next lesson →", lsn_toast:"Lesson done · words saved · progress +", lsn_ask_seed:tt=>`I have a question about the lesson "${tt}": `,
    lsn_ask_pick:"Pick your idol — and ask them", lsn_your_idol:"your idol",
    lsn_st_streak:"day streak", lsn_st_xp:"XP", lsn_st_letters:"letters", lsn_level:"Level", lsn_to_next:n=>`${n} XP to the next level`,
    lsn_freeze:n=>n>0?`❄ ${n} streak freeze left — one missed day will not break the streak.`:"❄ No freezes left. Miss a day and the streak resets.",
    lsn_daily_h:"Warm-up", lsn_daily_sub:n=>`${n} cards, about a minute — keeps your streak alive`, lsn_daily_done:"Done today ✓ · come back for more anyway", lsn_daily_locked:"Finish your first lesson to unlock it",
    lsn_name_h:"Your name in Hangul", lsn_name_sub:"Read yourself in Korean — takes 10 seconds", lsn_name_yours:"Your name in Hangul", lsn_name_again:"change or check it again",
    lsn_name_goal:"By the end of this screen you will read your own name in Korean.", lsn_name_ph:"Type your name", lsn_name_empty:"Type your name above — I will build it out of Hangul letters.", lsn_name_nope:"Latin or Cyrillic letters only, please.",
    lsn_name_note:"This is a by-sound spelling, the way Koreans would hear your name — not an official transcription.",
    lsn_name_save:"That's me — save it", lsn_name_saved:"Saved", lsn_name_toast:kr=>`${kr} — that is you in Hangul. +40 XP`,
    lsn_name_ask:nm=>`Ask ${nm} if it looks right`, lsn_name_seed:(raw,kr)=>`My name is ${raw}. Would ${kr} be right in Hangul, or would you spell it differently?`,
    lsn_map_h:"Hangul map", lsn_map_sub:(k,n)=>`${k} of ${n} letters — vowels, consonants, diphthongs, batchim`, lsn_map_learn:"Learn this sector →", lsn_map_repeat:"Go through it again →",
    lsn_map_l0:"new", lsn_map_l1:"learning", lsn_map_l2:"known", lsn_map_l3:"solid",
    lsn_map_kv:"vowels", lsn_map_kc:"consonants", lsn_map_kr:"rule",
    lsn_map_sum:(n,v,c)=>`${n} letters in the alphabet — ${v} vowels and ${c} consonants, plus the batchim rule`,
    lsn_map_none:"The alphabet is still loading. Reopen this screen.",
    lsn_sec_of:(nm,i,n)=>`Sector "${nm}" · ${i} of ${n} on the Hangul map →`,
    lsn_q_read:ch=>`How is ${ch} read?`, lsn_q_mean:w=>`What does ${w} mean?`, lsn_q_which:r=>`Which letter is "${r}"?`, lsn_q_how:m=>`How do you say "${m}"?`,
    lsn_dr_right:"Correct", lsn_dr_words:"Words to the Workbook", lsn_dr_back:"Back to lessons",
    lsn_streak_days:n=>`${n} ${n===1?'day':'days'} in a row`, lsn_froze:"❄ A freeze covered your missed day — the streak holds.",
    lsn_seven:"7 days in a row. This is the point where it stops being an effort.", lsn_levelup:n=>`Level ${n} — new level!`,
    tile_wb:"Workbook", tile_wb_sub:"your words & slang",
    wb_h:"Workbook", wb_words:"Words", wb_slang:"Slang", wb_del:"Remove", wb_mean_ph:"meaning", wb_need_kr:"Type the Korean word", wb_dup:"Already in your workbook",
    wb_empty_words:"No words yet — finish lessons and they’ll pile up here automatically.", wb_empty_slang:"No slang yet — it’ll collect from song breakdowns. You can add your own too.",
    wb_hint_words:"📘 auto from lessons · ✍️ added by you", wb_hint_slang:"🎵 from songs · ✍️ added by you",
    wb_songs:"Songs", wb_hint_songs:"Songs you’ve broken down · every word is already in your words tab",
    wb_say:"Play the word · hold for slow", wb_prog:"How well it sits in memory", wb_tap:"tap to check yourself",
    wb_go:n=>`Review ${n} ${n===1?'word':'words'}`, wb_go_sub:"about a minute — that’s the whole batch",
    wb_alldone:"Today’s batch is done ✓", wb_next_in:n=>n<=1?"The next words come back tomorrow":`The next words come back in ${n} days`,
    wb_dir_h:"Direction", wb_dir_a:"한국어 → EN", wb_dir_b:"EN → 한국어",
    wb_hard:"tough one", wb_rev_recog:"do you know this word?", wb_rev_prod:"say it in Korean",
    wb_show:"Show", wb_no:"Didn’t know it", wb_yes:"Knew it", wb_back:"← workbook",
    wb_fin_h:"Batch complete", wb_fin_sub:n=>n<=1?"These words come back tomorrow — that’s how they stay.":`These words come back in ${n} days — that’s how they stay.`,
    wb_fin_btn:"Done", wb_from_song:"from the song",
    wb_empty_filter:"No words from this song in your workbook yet.", wb_filter_on:ttl=>`Words from “${ttl}”`,
    wb_empty_songs:"No songs broken down yet. Each one leaves its words here — and they come back to you on a schedule.",
    wb_empty_songs_btn:"Break your first song →",
    wb_song_words:(s,tot)=>`${s} of ${tot} words in your workbook`, wb_song_open:"Play it again", wb_song_filter_btn:"Its words",
    wb_song_analysis:"Breakdown", wb_an_none:"No breakdown saved for this song yet — open it once and it lands here.",
    songs_h:"Break a song", songs_intro:"Pick a song — your idol walks you through it line by line.", songs_empty:"No songs yet.", songs_done_h:"Songs you’ve done", song_search:"e.g. BLACKPINK DDU-DU or Ditto", song_search_hint:"Type the title/artist in English or Korean — not transliterated.", song_none:q=>`“${q}” isn’t here yet. Soon you’ll add any song — we’ll pull lyrics, translation and sync automatically.`, song_botnote:"Asks to sign in? That’s YouTube’s bot-check (worse on VPN) →", song_fail:"The clip couldn’t load — open it on YouTube below 👇 (the breakdown still works)", song_online_h:"Add from search", song_searching:"Searching the database…", song_search_empty:"Nothing with synced lyrics — try another spelling (English or Korean).", song_need_login:"Log in to search and add songs.", song_building:"Building the breakdown… (~30 sec)", song_build_fail:"Couldn’t build this one — try another song", song_added:"Added 🎉", song_net:"Network unavailable", song_guide:"Play the video, then step through the lyrics line by line below.", song_next:"Next line", song_finish:"Finish song ✓", song_save:tab=>`+ ${tab}`, song_saved:"Saved ✓", song_save_toast:"Saved to your Workbook", song_done_toast:"Song complete 🎉", song_open_yt:"Open on YouTube", song_reload:"Reload video",
    kara_hint:"Press play — words light up in time. At each verse end it pauses for the breakdown. If the highlight drifts from the clip, tap “Sync” exactly when you hear the verse’s first word.", kara_synctap:"Sync", kara_syncdone:"Synced to the clip ✓", kara_cont:"Don’t stop", kara_verse:"Verse", kara_repeat:"Repeat verse", kara_nextv:"Next verse",
    kara_sense_h:"Word-for-word ≠ what it means", kara_lit:"word-for-word", kara_why:"why they differ", kara_allwords:"All the words in this song", kara_tr_none:"No translation for this verse yet.",
    kara_whole:"the whole verse", kara_combo_a:"why these words mean this together",
    song_recap_h:"Every word, verse by verse", song_recap_sub:(a,b)=>`${a} of ${b} already in your workbook`, song_add_verse:"+ whole verse", song_added_n:n=>`${n} words added to the workbook`, song_recap_back:"← back to the lyrics", song_recap_none:"No words in this verse yet.",
    onb_title:"How it all works", onb_help_chip:"How it works", onb_tour:"Show me around →", onb_ok:"Got it", onb_next:"Next", onb_done:"Done",
    topik_note:"Built to the <b>TOPIK I</b> standard, modeled on the King Sejong Institute — steps you toward the official TOPIK proficiency exam.",
    song_cta:"Understand a song", song_cta_sub:"line by line — word for word and what it really means",
    cov_note:(k,tot)=>k?`You understand ${k} of ${tot} words in it`:`Not a single word of it yet — start with one line`,
    sq_cta:"Now patch the lines", sq_h:"Which word is missing?", sq_fix_h:"Once more — the ones you missed",
    sq_s:"", sq_back:"back to the words", sq_none:"This song has too few words for a drill yet.",
    sq_done:"Song cracked 🎉", sq_fix_done:"Now they are yours", sq_fix_btn:n=>`Go over ${n} missed →`,
    tile_lesson:"Hangul", tile_lesson_sub:nm=>`${nm} teaches you to read`,
    tile_song:"Break a song", tile_song_sub:"line by line", tile_slang:"Song slang", tile_slang_sub:"real Korean", tile_phrase:"Chat with your idol", tile_phrase_sub:"just talk, in Korean",
    seed_song:"Break down this song: ", seed_slang:"Teach me some Korean slang from songs 🙂", seed_phrase:"How do you say in Korean: ",
    coll_h:"Photocards", coll_note:n=>`New ${n} cards unlock as you finish lessons and quizzes — keep going to reveal them all.`,
    close_h:"💞 Your closeness", close_stage:["Just met","Getting closer","Close friends"],
    close_note:(n,s)=>`${n} speaks to you in <b>${s}</b> — the more you learn, the closer you get, and speech turns friendly.`,
    speech:["polite 존댓말 (jondaetmal)","존댓말, soon 반말","friendly 반말 (banmal)"],
    sub_link:"Subscribe · unlimited lessons · $10/mo →",
    connect_link:"💬 Chat with your idol in a messenger →",
    connect_h:"Chat in your messenger", connect_sub:"Same conversation, one more window. Reply to your idol from your favorite app — lessons and your notebook stay here.",
    connect_discord_sub:"one tap, no server needed", connect_line_sub:"Japan · Taiwan · Thailand",
    connect_telegram_sub:"one tap · opens Telegram", connect_other:"or another app",
    connect_active:"Connected", connect_open:"Open Telegram →", connect_step1:"1. Add the Idolingo bot and send it this code:", connect_step2:"2. Done — keep chatting right there. It's the same thread.",
    link_ok:"Discord connected 🎉 Open a DM with the bot and say hi!", link_fail:"Couldn't connect Discord — try again", link_login:"Log in first", link_noidol:"Get an idol first",
    chat_title:n=>`Lesson with ${n}`, chat_ph:"Answer or ask in Korean…",
    chat_loading:"Loading chat…", chat_first:"Say hi first — your idol will reply 💛", chat_need_idol:"Get an idol first.", chat_err:"Idol didn't reply", chat_net:"Network unavailable",
    au_signup:"Sign up", au_login:"Log in", au_logout:"Log out", au_user:"Name", au_email:"Email", au_pass:"Password (min 8 chars)", au_create:"Create account", au_have:"Already have an account?", au_no:"No account yet?",
    forgot_link:"Forgot password?", forgot_h:"Reset password", forgot_send:"Send reset link", forgot_sent:"If that email exists, we sent a reset link. Check your inbox.", back_login:"← Back to log in",
  },
  ru:{
    hd_eyebrow:"ДОСЛОВНО · И ЧТО ЭТО ЗНАЧИТ НА САМОМ ДЕЛЕ", hd_sub:"Каждая строчка дважды: слово за словом — и что эти слова значат вместе. Любая песня, прямо сейчас.",
    hd_h:"Пойми, о чём на самом деле поёт твой айдол", hd_foot:"Объясняет твой айдол — а потом сам заговорит с тобой по-корейски.",
    nav_home:"Гримёрка", nav_idols:"Айдолы", no_idol_h:"Пойми, о чём на самом деле поёт твой айдол", no_idol_sub:"Каждая строчка дважды: слово за словом — и что эти слова значат вместе.", no_idol_btn:"Выбрать айдола →", footer:"Idolingo · учи корейский с AI-айдолом, которого выбрал сам · твой друг и преподаватель в одном лице", lang_cap:"язык обучения",
    pick_h:"Выбери айдола — он станет твоим другом и научит тебя корейскому 🇰🇷", pick_sub:"Один айдол бесплатно и навсегда твой. Общайся каждый день — учи корейский играючи.",
    tab_girls:"Девушки", tab_boys:"Парни",
    concept_suffix:"· твой айдол-учитель", your_korean:"Твой корейский", level:"уровень", days_together:"дней вместе", streak_days:"дней подряд", streak_start:"Начни стрик — позанимайся сегодня",
    lesson_start:"Начать урок", lesson_sub:n=>`${n} учит корейскому — шаг за шагом`,
    lessons_h:"Уроки", lsn_vocab_note:n=>`${n} новых слов сохранятся в Рабочую тетрадь`, lsn_quiz_h:"Проверь себя", lsn_check:"Проверить", lsn_next_quiz:"Далее — проверка →", lsn_toinfo:"назад к материалу", lsn_retry:"Переписать", lsn_ask:"Задать вопрос", lsn_ask_named:nm=>`Спросить у ${nm}`, lsn_answer_all:"Сначала ответь на все вопросы.", lsn_wrong:n=>`Ошибок: ${n} — посмотри ещё раз и попробуй снова.`, lsn_passed:"Урок пройден 🎉", lsn_next:"Следующий урок →", lsn_toast:"Урок пройден · слова сохранены · прогресс +", lsn_ask_seed:tt=>`У меня вопрос по уроку «${tt}»: `,
    lsn_ask_pick:"Выбери своего айдола — и спроси у него", lsn_your_idol:"твой айдол",
    lsn_st_streak:"дней подряд", lsn_st_xp:"опыт", lsn_st_letters:"буквы", lsn_level:"Уровень", lsn_to_next:n=>`${n} опыта до следующего уровня`,
    lsn_freeze:n=>n>0?`❄ Осталось заморозок: ${n}. Один пропущенный день серию не оборвёт.`:"❄ Заморозок не осталось. Пропустишь день — серия обнулится.",
    lsn_daily_h:"Распевка", lsn_daily_sub:n=>`${n} карточек, около минуты — держит серию`, lsn_daily_done:"Сегодня сделано ✓ · можно пройти ещё раз", lsn_daily_locked:"Пройди первый урок, чтобы открыть",
    lsn_name_h:"Твоё имя хангылем", lsn_name_sub:"Прочитай себя по-корейски — 10 секунд", lsn_name_yours:"Твоё имя хангылем", lsn_name_again:"поменять или проверить ещё раз",
    lsn_name_goal:"К концу этого экрана ты прочитаешь своё имя по-корейски.", lsn_name_ph:"Впиши своё имя", lsn_name_empty:"Впиши имя выше — соберу его из букв хангыля.", lsn_name_nope:"Только латиница или кириллица.",
    lsn_name_note:"Это запись по звучанию — так твоё имя услышал бы кореец. Не официальная транскрипция.",
    lsn_name_save:"Это я — сохранить", lsn_name_saved:"Сохранено", lsn_name_toast:kr=>`${kr} — это ты хангылем. +40 опыта`,
    lsn_name_ask:nm=>`Спросить у ${nm}, верно ли`, lsn_name_seed:(raw,kr)=>`Меня зовут ${raw}. Хангылем это будет ${kr} или ты бы записала иначе?`,
    lsn_map_h:"Карта хангыля", lsn_map_sub:(k,n)=>`${k} из ${n} букв — гласные, согласные, дифтонги, патчхим`, lsn_map_learn:"Пройти сектор →", lsn_map_repeat:"Пройти ещё раз →",
    lsn_map_l0:"новая", lsn_map_l1:"учу", lsn_map_l2:"знаю", lsn_map_l3:"крепко",
    lsn_map_kv:"гласные", lsn_map_kc:"согласные", lsn_map_kr:"правило",
    // Формулировка без согласования с числом: «21 гласная», «22 гласных» —
    // подбирать окончание под каждое число незачем, двоеточие снимает вопрос.
    lsn_map_sum:(n,v,c)=>`${n} букв алфавита: гласных — ${v}, согласных — ${c}, плюс правило патчхима`,
    lsn_map_none:"Алфавит ещё грузится. Открой экран заново.",
    lsn_sec_of:(nm,i,n)=>`Сектор «${nm}» · ${i} из ${n} на карте хангыля →`,
    lsn_q_read:ch=>`Как читается ${ch}?`, lsn_q_mean:w=>`Что значит ${w}?`, lsn_q_which:r=>`Где буква «${r}»?`, lsn_q_how:m=>`Как будет «${m}»?`,
    lsn_dr_right:"Верно", lsn_dr_words:"Слов в тетрадь", lsn_dr_back:"К урокам",
    lsn_streak_days:n=>`${n} ${n%10===1&&n%100!==11?'день':(n%10>=2&&n%10<=4&&(n%100<10||n%100>=20))?'дня':'дней'} подряд`,
    lsn_froze:"❄ Заморозка закрыла пропущенный день — серия цела.",
    lsn_seven:"Семь дней подряд. Дальше это перестаёт быть усилием.", lsn_levelup:n=>`Уровень ${n} — новый уровень!`,
    tile_wb:"Рабочая тетрадь", tile_wb_sub:"твои слова и сленг",
    wb_h:"Рабочая тетрадь", wb_words:"Слова", wb_slang:"Сленг", wb_del:"Удалить", wb_mean_ph:"перевод", wb_need_kr:"Впиши корейское слово", wb_dup:"Уже есть в тетради",
    wb_empty_words:"Пока пусто — проходи уроки, и слова сами накопятся здесь.", wb_empty_slang:"Пока пусто — сленг накопится из разборов песен. Можно добавить и своё.",
    wb_hint_words:"📘 авто с уроков · ✍️ добавил ты", wb_hint_slang:"🎵 из песен · ✍️ добавил ты",
    wb_songs:"Песни", wb_hint_songs:"Разобранные песни · их слова уже лежат во вкладке «Слова»",
    wb_say:"Послушать слово · держи дольше — медленно", wb_prog:"Насколько крепко слово сидит", wb_tap:"тап — проверь себя",
    wb_go:n=>`Повторить ${n} ${n===1?'слово':(n<5?'слова':'слов')}`, wb_go_sub:"минута — это вся сегодняшняя порция",
    wb_alldone:"Сегодняшняя порция закрыта ✓", wb_next_in:n=>n<=1?"Следующие слова вернутся завтра":`Следующие слова вернутся через ${n} дн.`,
    wb_dir_h:"Направление", wb_dir_a:"한국어 → RU", wb_dir_b:"RU → 한국어",
    wb_hard:"тяжёлое", wb_rev_recog:"знаешь это слово?", wb_rev_prod:"скажи по-корейски",
    wb_show:"Показать", wb_no:"Не помню", wb_yes:"Помню", wb_back:"← в тетрадь",
    wb_fin_h:"Порция закрыта", wb_fin_sub:n=>n<=1?"Эти слова вернутся завтра — так они и остаются в голове.":`Эти слова вернутся через ${n} дн. — так они и остаются в голове.`,
    wb_fin_btn:"Готово", wb_from_song:"из песни",
    wb_empty_filter:"Слов из этой песни в тетради пока нет.", wb_filter_on:ttl=>`Слова из «${ttl}»`,
    wb_empty_songs:"Разобранных песен пока нет. Каждая оставляет здесь свои слова — и они сами возвращаются к тебе по расписанию.",
    wb_empty_songs_btn:"Разобрать первую песню →",
    wb_song_words:(s,tot)=>`${s} из ${tot} слов в тетради`, wb_song_open:"Слушать снова", wb_song_filter_btn:"Её слова",
    wb_song_analysis:"Разбор", wb_an_none:"Разбор этой песни ещё не сохранён — открой её один раз, и он появится здесь.",
    songs_h:"Разбор песни", songs_intro:"Выбери песню — айдол разберёт её строка за строкой.", songs_empty:"Пока нет песен.", songs_done_h:"Пройденные песни", song_search:"напр. BLACKPINK DDU-DU или Ditto", song_search_hint:"Пиши название/артиста по-английски или по-корейски — не русскими буквами.", song_none:q=>`«${q}» пока нет. Скоро можно будет добавить любую — текст, перевод и синхрон соберём автоматически.`, song_botnote:"Просит войти? Это бот-чек YouTube (чаще на VPN) →", song_fail:"Клип не загрузился — открой его на YouTube ниже 👇 (разбор всё равно работает)", song_online_h:"Добавить из поиска", song_searching:"Ищу в базе…", song_search_empty:"Нет с синхро-текстом — попробуй другое написание (англ. или кор.).", song_need_login:"Войди, чтобы искать и добавлять песни.", song_building:"Собираю разбор… (~30 сек)", song_build_fail:"Эту не получилось собрать — попробуй другую", song_added:"Добавлено 🎉", song_net:"Сеть недоступна", song_guide:"Включи видео, а затем разбирай текст строку за строкой ниже.", song_next:"Следующая строка", song_finish:"Завершить песню ✓", song_save:tab=>`+ в ${tab}`, song_saved:"Сохранено ✓", song_save_toast:"Сохранено в Рабочую тетрадь", song_done_toast:"Песня пройдена 🎉", song_open_yt:"Открыть на YouTube", song_reload:"Перезагрузить видео",
    kara_hint:"Нажми play — слова подсвечиваются в такт. В конце куплета — пауза для разбора. Если подсветка не совпадает с клипом — жми «Синхрон» ровно когда слышишь первое слово куплета.", kara_synctap:"Синхрон", kara_syncdone:"Синхронизировано ✓", kara_cont:"Не останавливать", kara_verse:"Куплет", kara_repeat:"Повторить куплет", kara_nextv:"Следующий куплет",
    kara_sense_h:"Дословно ≠ по смыслу", kara_lit:"дословно", kara_why:"почему расходится", kara_allwords:"Все слова песни", kara_tr_none:"Перевод этого куплета пока не собран.",
    kara_whole:"куплет целиком", kara_combo_a:"почему эти слова вместе значат это",
    song_recap_h:"Все слова, куплет за куплетом", song_recap_sub:(a,b)=>`${a} из ${b} уже в тетради`, song_add_verse:"+ весь куплет", song_added_n:n=>`${n} слов в тетради`, song_recap_back:"← назад к тексту", song_recap_none:"В этом куплете слов пока нет.",
    onb_title:"Как здесь всё устроено", onb_help_chip:"Как это устроено", onb_tour:"Показать по экрану →", onb_ok:"Понятно", onb_next:"Далее", onb_done:"Готово",
    topik_note:"Программа построена по стандарту <b>TOPIK I</b> — по образцу King Sejong Institute. Ведёт к официальному экзамену TOPIK.",
    song_cta:"Понять песню", song_cta_sub:"строка за строкой — дословно и по смыслу",
    cov_note:(k,tot)=>k?`Ты понимаешь ${k} из ${tot} слов в ней`:`Пока ни одного слова — начни с одной строчки`,
    sq_cta:"Залатать строки", sq_h:"Какого слова не хватает?", sq_fix_h:"Ещё раз — то, что не вышло",
    sq_s:"", sq_back:"назад к словам", sq_none:"В этой песне пока мало слов для проверки.",
    sq_done:"Песня разобрана 🎉", sq_fix_done:"Теперь они твои", sq_fix_btn:n=>`Разобрать ${n} промах${n===1?'':'а'} →`,
    tile_lesson:"Хангыль", tile_lesson_sub:nm=>`${nm} учит читать`,
    tile_song:"Разбор песни", tile_song_sub:"строка за строкой", tile_slang:"Сленг из песен", tile_slang_sub:"живой корейский", tile_phrase:"Чат с айдолом", tile_phrase_sub:"живое общение",
    seed_song:"Разбери песню: ", seed_slang:"Научи меня корейскому сленгу из песен 🙂", seed_phrase:"Как сказать по-корейски: ",
    coll_h:"Фотокарточки", coll_note:n=>`Новые карточки ${n} открываются за пройденные уроки и проверочные — учись, чтобы открыть все.`,
    close_h:"💞 Ваша близость", close_stage:["Только познакомились","Сближаетесь","Близкие друзья"],
    close_note:(n,s)=>`${n} говорит с тобой на <b>${s}</b> — чем больше учишься, тем ближе вы, и речь становится дружеской.`,
    speech:["вежливом 존댓말 (jondaetmal)","존댓말, скоро перейдёт на 반말","дружеском 반말 (banmal)"],
    sub_link:"Подписка · безлимит уроков · $10/мес →",
    connect_link:"💬 Общайся с айдолом в мессенджере →",
    connect_h:"Общение в мессенджере", connect_sub:"Тот же разговор — просто ещё одно окно. Отвечай айдолу в удобном приложении, а уроки и тетрадь остаются здесь.",
    connect_discord_sub:"одна кнопка, сервер не нужен", connect_line_sub:"Япония · Тайвань · Таиланд",
    connect_telegram_sub:"один тап · откроется Telegram", connect_other:"или другое приложение",
    connect_active:"Подключено", connect_open:"Открыть Telegram →", connect_step1:"1. Добавь бота Idolingo и пришли ему этот код:", connect_step2:"2. Готово — продолжай прямо там. Это тот же тред.",
    link_ok:"Discord подключён 🎉 Открой личку с ботом и напиши ему!", link_fail:"Не удалось подключить Discord — попробуй ещё раз", link_login:"Сначала войди", link_noidol:"Сначала заведи айдола",
    chat_title:n=>`Урок с ${n}`, chat_ph:"Ответь или спроси по-корейски…",
    chat_loading:"Загружаю переписку…", chat_first:"Напиши первым — твой айдол ответит 💛", chat_need_idol:"Сначала заведи айдола.", chat_err:"Айдол не ответил", chat_net:"Сеть недоступна",
    au_signup:"Регистрация", au_login:"Вход", au_logout:"Выйти", au_user:"Имя", au_email:"Email", au_pass:"Пароль (мин. 8 символов)", au_create:"Создать аккаунт", au_have:"Уже есть аккаунт?", au_no:"Нет аккаунта?",
    forgot_link:"Забыли пароль?", forgot_h:"Сброс пароля", forgot_send:"Отправить ссылку", forgot_sent:"Если такой email есть — мы отправили ссылку для сброса. Проверь почту.", back_login:"← Назад ко входу",
  }
};
function t(k){const d=T[getLang()]||T.en;return d[k]!==undefined?d[k]:(T.en[k]!==undefined?T.en[k]:k)}
function applyStatic(){
  const s=document.getElementById('langSel');if(s)s.value=getLang();
  const lc=document.getElementById('langCap');if(lc)lc.textContent=t('lang_cap');
  const nav=document.querySelector('.navtab[data-view="cabinet-own"]');if(nav)nav.textContent=t('nav_home');
  const navi=document.querySelector('.navtab[data-view="roster"]');if(navi)navi.textContent=t('nav_idols');
  const f=document.querySelector('footer.wrap');if(f)f.innerHTML=t('footer');
  const ct=document.getElementById('chatText');if(ct)ct.placeholder=t('chat_ph');
}
applyStatic();

const authReady=checkAuth();
boot();
