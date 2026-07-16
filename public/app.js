let IDOLS=[], picked=null;         // picked = один выбранный айдол или null
const state={song:"ballad",clip:"girlcrush",dance:"lesserafim",genderTab:"girl",lang1:"ko",lang2:"ko",bilingual:false};
// Портреты — статичные файлы, всегда берём с живого хоста (нужен публичный HTTPS для fal.ai),
// независимо от того, где физически крутится сама генерация (локально/preview/прод).
const IMAGE_BASE="https://k-pop-black.vercel.app";

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
  const elId = name.indexOf('cabinet')===0 ? 'view-cabinet' : 'view-'+name;
  document.querySelectorAll('main').forEach(m=>m.classList.remove('show'));
  document.getElementById(elId).classList.add('show');
  document.querySelectorAll('.navtab').forEach(t=>t.classList.toggle('on',t.dataset.view===name));
  if(name==='cabinet-own'){renderCabinet(null)}
  if(name==='lenta'){renderLenta()}
  if(name==='feed'){loadChart().then(renderChart)}
  window.scrollTo({top:0,behavior:'instant'});
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
    // Витрина айдолов встроена прямо сюда, а не спрятана за отдельной кнопкой —
    // "Мой продакшн" без айдола сразу же предлагает его выбрать.
    body.innerHTML=`<div class="cab-empty">
      <h2 class="pick-h">${t('pick_h')}</h2>
      <p>${t('pick_sub')}</p>
    </div>
    <div class="gender-tabs" id="cabGenderTabs">
      <button class="gtab on" data-g="girl">${t('tab_girls')}</button>
      <button class="gtab" data-g="boy">${t('tab_boys')}</button>
    </div>
    <div class="grid" id="cabGrid"></div>`;
    renderCabGrid();
    [...document.querySelectorAll('#cabGenderTabs .gtab')].forEach(t=>{
      t.onclick=()=>{
        state.genderTab=t.dataset.g;
        [...document.querySelectorAll('#cabGenderTabs .gtab')].forEach(x=>x.classList.remove('on'));
        t.classList.add('on');
        renderCabGrid();
      };
    });
    return;
  }
  const idolCreatedAt=isOther?viewedIdol.idol.created_at:myIdol.created_at;
  const streak=idolCreatedAt?Math.max(1,Math.floor((Date.now()-new Date(idolCreatedAt).getTime())/86400000)+1):1;
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
      <button class="onb-help" onclick="openOnb()" title="?">?</button>
      <div class="idol-hero">
        <div class="idol-ph holo-frame"><div class="ph-inner"><img src="${idol.img}"></div></div>
        <div class="idol-meta">
          <div class="idol-name">${idol.name} ${AI_BADGE}</div>
          <div class="idol-concept">${idol.concept} ${t('concept_suffix')}</div>
          <div class="lvl">
            <div class="lvl-top"><span>${t('your_korean')}</span><b>${t('level')} ${lvl} · ${langPct}%</b></div>
            <div class="bar"><i style="width:${langPct}%"></i></div>
          </div>
          <div class="streak-chip">🔥 ${streak} ${t('days_together')}</div>
        </div>
      </div>

      <button class="lesson-cta" onclick="openLessons()">
        <span class="lc-emoji">🇰🇷</span>
        <span class="lc-text"><b>${t('lesson_start')}</b><small>${t('lesson_sub')(idol.name)}</small></span>
        <span class="lc-arrow">→</span>
      </button>

      <div class="tiles">
        <button class="tile" onclick="openSongs()"><span class="t-emoji">🎵</span><b>${t('tile_song')}</b><small>${t('tile_song_sub')}</small></button>
        <button class="tile" onclick="openWorkbook()"><span class="t-emoji">📓</span><b>${t('tile_wb')}</b><small>${t('tile_wb_sub')}</small></button>
        <button class="tile" onclick="openChat(t('seed_phrase'))"><span class="t-emoji">💬</span><b>${t('tile_phrase')}</b><small>${t('tile_phrase_sub')}</small></button>
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

      <button class="sub-link" onclick="startCheckout('sub')">${t('sub_link')}</button>
    </div>
  `;
  if(!isOther)maybeOnboard();
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
  renderCabinet(null);
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
function closeChat(){document.getElementById('chatOv').classList.remove('show')}
document.getElementById('chatOv').onclick=e=>{if(e.target.id==='chatOv')closeChat()};
function fmtMsg(s){return escapeHtml(s).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/(?<![:/])\*(?!\s)(.+?)(?<!\s)\*/g,'<i>$1</i>')}
function chatBubble(m){
  const mine=m.sender==='owner';
  return `<div class="chat-msg ${mine?'me':'idol'}"><div class="chat-b">${fmtMsg(m.content)}</div></div>`;
}
function escapeHtml(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
async function openChat(prefill){
  if(!currentUser){openAuth('signup');return}
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
    else{log.insertAdjacentHTML('beforeend',chatBubble(d.reply))}
  }catch(e){document.getElementById('chatTyping')?.remove();log.insertAdjacentHTML('beforeend','<div class="chat-empty">'+t('chat_net')+'</div>')}
  btn.disabled=false;log.scrollTop=log.scrollHeight;inp.focus();
}

/* ===================== УРОК-ФУНДАМЕНТ ===================== */
// Прогресс уроков и словарь копятся локально (server-sync — следующий шаг).
function lsnUid(){return (currentUser&&currentUser.id)||'guest'}
function lsnDone(){try{return JSON.parse(localStorage.getItem('so_done_'+lsnUid())||'[]')}catch(e){return[]}}
function lsnSaveDone(arr){localStorage.setItem('so_done_'+lsnUid(),JSON.stringify(arr))}
function lsnVocab(){try{return JSON.parse(localStorage.getItem('so_vocab_'+lsnUid())||'[]')}catch(e){return[]}}
function lsnSaveVocab(arr){localStorage.setItem('so_vocab_'+lsnUid(),JSON.stringify(arr))}
function allLessons(){return (window.CURRICULUM?window.CURRICULUM.units:[]).flatMap(u=>u.lessons.map(l=>({...l,unit:u})))}
function lessonPct(){const all=allLessons();if(!all.length)return 0;return lsnDone().length/all.length*100}
function optLabel(o){return typeof o==='string'?o:o[getLang()]}

function closeLessons(){document.getElementById('lessonOv').classList.remove('show')}
document.getElementById('lessonOv').onclick=e=>{if(e.target.id==='lessonOv')closeLessons()};

function openLessons(){
  if(!currentUser){openAuth('signup');return}
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
  const pct=Math.round(lessonPct());
  html=`<div class="lsn-progress"><div class="lsn-pbar"><i style="width:${pct}%"></i></div><span>${done.length}/${flat.length} · ${pct}%</span></div>`+html;
  document.getElementById('lessonBody').innerHTML=html;
  document.getElementById('lessonBody').scrollTop=0;
}

function renderBlock(b){
  const L=getLang();
  if(b.type==='hangul')return `<div class="lb-hangul"><span class="lb-char">${b.char}</span><span class="lb-rom">${b.rom}</span><span class="lb-mean">${b[L]}</span></div>`;
  if(b.type==='example')return `<div class="lb-ex"><span class="lb-kr">${b.kr}</span><span class="lb-rom">${b.rom}</span><span class="lb-mean">${b[L]}</span></div>`;
  if(b.type==='tip')return `<div class="lb-tip">💡 ${b[L]}</div>`;
  return `<div class="lb-text">${b[L]}</div>`;
}

function openLesson(id){
  const lesson=allLessons().find(l=>l.id===id);
  if(!lesson)return;
  document.getElementById('lessonOv').classList.add('show');
  document.getElementById('lsnBack').style.visibility='visible';
  document.getElementById('lessonTitle').textContent=lesson.title[getLang()];
  const blocks=lesson.blocks.map(renderBlock).join('');
  const quiz=(lesson.quiz||[]).map((q,qi)=>`
    <div class="lq" data-qi="${qi}">
      <div class="lq-q">${qi+1}. ${q.q[getLang()]}</div>
      <div class="lq-opts">${q.opts.map((o,oi)=>`<button class="lq-opt" onclick="pickQuiz(${qi},${oi})" data-oi="${oi}">${optLabel(o)}</button>`).join('')}</div>
    </div>`).join('');
  window._lsnCur=lesson; window._lsnAns={};
  document.getElementById('lessonBody').innerHTML=`
    <div class="lsn-goal">🎯 ${(lesson.goal&&lesson.goal[getLang()])||''}</div>
    <div class="lsn-teacher">${blocks}</div>
    <div class="lsn-vocab-note">${t('lsn_vocab_note')(lesson.vocab.length)}</div>
    <div class="lsn-quiz-h">${t('lsn_quiz_h')}</div>
    ${quiz}
    <div class="lsn-quiz-msg" id="lsnQuizMsg"></div>
    <button class="btn accent lsn-finish" id="lsnFinish" onclick="finishLesson()">${t('lsn_check')}</button>
    <button class="lsn-ask" onclick="askTeacher()">${t('lsn_ask')}</button>`;
  document.getElementById('lessonBody').scrollTop=0;
}

function pickQuiz(qi,oi){
  window._lsnAns[qi]=oi;
  document.querySelectorAll(`.lq[data-qi="${qi}"] .lq-opt`).forEach(b=>b.classList.toggle('sel',+b.dataset.oi===oi));
}

function finishLesson(){
  const lesson=window._lsnCur;if(!lesson)return;
  const quiz=lesson.quiz||[];
  const msg=document.getElementById('lsnQuizMsg');
  // все вопросы отвечены?
  for(let i=0;i<quiz.length;i++){if(window._lsnAns[i]===undefined){msg.className='lsn-quiz-msg warn';msg.textContent=t('lsn_answer_all');return}}
  // проверка
  let wrong=0;
  quiz.forEach((q,qi)=>{
    const ok=window._lsnAns[qi]===q.answer;
    if(!ok)wrong++;
    document.querySelectorAll(`.lq[data-qi="${qi}"] .lq-opt`).forEach(b=>{
      const oi=+b.dataset.oi;
      b.classList.toggle('correct',oi===q.answer);
      b.classList.toggle('wrong',oi===window._lsnAns[qi]&&oi!==q.answer);
    });
  });
  if(wrong>0){msg.className='lsn-quiz-msg warn';msg.textContent=t('lsn_wrong')(wrong);return}
  // успех → завершаем
  const done=lsnDone();
  if(!done.includes(lesson.id)){
    done.push(lesson.id);lsnSaveDone(done);
    // слова → в словарь (без дублей)
    const voc=lsnVocab();const have=new Set(voc.map(v=>v.kr));
    lesson.vocab.forEach(v=>{if(!have.has(v.kr))voc.push({...v,from:'lesson'})});
    lsnSaveVocab(voc);
  }
  msg.className='lsn-quiz-msg ok';msg.textContent=t('lsn_passed');
  const fin=document.getElementById('lsnFinish');
  fin.textContent=t('lsn_next');fin.onclick=()=>{
    const flat=allLessons();const idx=flat.findIndex(l=>l.id===lesson.id);
    const next=flat[idx+1];
    if(next&&!lsnDone().includes(next.id))openLesson(next.id);else openLessons();
  };
  toast(t('lsn_toast'));
  if(typeof renderCabinet==='function'&&myIdol)try{renderCabinet(null)}catch(e){}
}

function askTeacher(){
  const lesson=window._lsnCur;
  closeLessons();
  openChat(lesson?t('lsn_ask_seed')(lesson.title[getLang()]):'');
}

/* ===================== РАБОЧАЯ ТЕТРАДЬ ===================== */
// Читает тот же реестр слов, что копят уроки (so_vocab_<uid>).
// slang:true → вкладка «Сленг» (из песен / вручную), иначе → «Слова».
function closeWorkbook(){document.getElementById('wbOv').classList.remove('show')}
document.getElementById('wbOv').onclick=e=>{if(e.target.id==='wbOv')closeWorkbook()};

function openWorkbook(tab){
  if(!currentUser){openAuth('signup');return}
  window._wbTab=tab||window._wbTab||'words';
  document.getElementById('wbOv').classList.add('show');
  document.getElementById('wbTitle').textContent='📓 '+t('wb_h');
  renderWorkbook();
}

function renderWorkbook(){
  const L=getLang();
  const voc=lsnVocab();
  const isSlang=window._wbTab==='slang';
  const list=voc.filter(v=>!!v.slang===isSlang);
  document.getElementById('wbTabs').innerHTML=`
    <button class="wb-tab ${!isSlang?'on':''}" onclick="switchWb('words')">${t('wb_words')} <span>${voc.filter(v=>!v.slang).length}</span></button>
    <button class="wb-tab ${isSlang?'on':''}" onclick="switchWb('slang')">${t('wb_slang')} <span>${voc.filter(v=>!!v.slang).length}</span></button>`;
  const items=list.length?list.map((v,i)=>`
    <div class="wb-row">
      <div class="wb-word"><b>${escapeHtml(v.kr)}</b>${v.rom?`<i>${escapeHtml(v.rom)}</i>`:''}</div>
      <div class="wb-mean">${escapeHtml(v[L]||v.ru||v.en||'')}</div>
      <div class="wb-src">${v.from==='lesson'?'📘':v.from==='song'?'🎵':'✍️'}</div>
      <button class="wb-del" title="${t('wb_del')}" onclick="wbDelete(${JSON.stringify(v.kr).replace(/"/g,'&quot;')})">✕</button>
    </div>`).join(''):`<div class="wb-empty">${isSlang?t('wb_empty_slang'):t('wb_empty_words')}</div>`;
  document.getElementById('wbBody').innerHTML=`
    <div class="wb-add">
      <input id="wbKr" placeholder="한국어" maxlength="40">
      <input id="wbMean" placeholder="${t('wb_mean_ph')}" maxlength="60">
      <button class="btn accent wb-addbtn" onclick="wbAddWord()">+</button>
    </div>
    <div class="wb-hint">${isSlang?t('wb_hint_slang'):t('wb_hint_words')}</div>
    <div class="wb-list">${items}</div>`;
}

function switchWb(tab){window._wbTab=tab;renderWorkbook()}

function wbAddWord(){
  const kr=document.getElementById('wbKr').value.trim();
  const mean=document.getElementById('wbMean').value.trim();
  if(!kr){toast(t('wb_need_kr'));return}
  const voc=lsnVocab();
  if(voc.some(v=>v.kr===kr)){toast(t('wb_dup'));return}
  voc.push({kr,rom:'',ru:mean,en:mean,from:'manual',slang:window._wbTab==='slang'});
  lsnSaveVocab(voc);
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
function allSongs(){return window.SONGS||[]}
function closeSongs(){karaStop();document.getElementById('songOv').classList.remove('show')}
document.getElementById('songOv').onclick=e=>{if(e.target.id==='songOv')closeSongs()};

function openSongs(){
  if(!currentUser){openAuth('signup');return}
  karaStop();
  document.getElementById('songOv').classList.add('show');
  document.getElementById('songBack').style.visibility='hidden';
  document.getElementById('songTitle').textContent=t('songs_h');
  const done=songsDone();const L=getLang();
  const cards=allSongs().map(s=>{
    const isDone=done.includes(s.id);
    return `<button class="song-item ${isDone?'done':''}" onclick="openSong('${s.id}')">
      <span class="lsn-badge">${isDone?'✓':'🎵'}</span>
      <span class="lsn-txt"><b>${escapeHtml(s.title)}</b><small>${escapeHtml(s.artist)} · ${s.level?s.level[L]:''}</small></span>
    </button>`;
  }).join('')||`<div class="wb-empty">${t('songs_empty')}</div>`;
  document.getElementById('songBody').innerHTML=`
    <div class="song-intro">${t('songs_intro')}</div>
    <div class="lsn-list">${cards}</div>
    <div class="lsn-unit">${t('songs_done_h')} · ${done.length}/${allSongs().length}</div>`;
  document.getElementById('songBody').scrollTop=0;
}

// ---- Караоке-движок: подсветка по таймкодам + авто-пауза в конце куплета ----
function karaBuild(song){
  const verses=song.verses.map(v=>{
    const lines=v.lines.map((ln,i)=>{
      const end=(i+1<v.lines.length?v.lines[i+1].t:v.end);
      const total=Math.max(0.1,end-ln.t);
      const weights=ln.w.map(x=>Math.max(1,(x.k||'').replace(/\s/g,'').length));
      const sum=weights.reduce((a,b)=>a+b,0);
      let acc=ln.t;
      const words=ln.w.map((x,j)=>{const t0=acc;acc+=total*weights[j]/sum;return {...x,t0,t1:acc};});
      return {...ln,end,words};
    });
    return {...v,lines,start:lines[0].t};
  });
  return {song,verses,vIdx:0,paused:false,continuous:false,videoOffset:song.videoOffset||0,
    get off(){return this.videoOffset},player:null,timer:null,saved:{},tok:[],lastLine:null};
}

function openSong(id){
  const song=allSongs().find(s=>s.id===id);if(!song)return;
  karaStop();
  window._kara=karaBuild(song);
  document.getElementById('songOv').classList.add('show');
  document.getElementById('songBack').style.visibility='visible';
  document.getElementById('songTitle').textContent=song.title;
  document.getElementById('songBody').innerHTML=`
    <div class="kara">
      <div class="song-top">
        <div class="song-video"><div id="ytPlayer"></div></div>
        <a class="song-yt" href="https://www.youtube.com/watch?v=${song.ytId}" target="_blank" rel="noopener">${t('song_open_yt')} ↗</a>
      </div>
      <div class="kara-lines" id="karaLines"></div>
      <div class="kara-pause" id="karaPause" style="display:none"></div>
      <div class="kara-bar">
        <label class="kara-toggle"><span>${t('kara_cont')}</span><span class="tgl"><input type="checkbox" id="karaCont" onchange="karaToggleCont()"><i></i></span></label>
      </div>
    </div>`;
  document.getElementById('songBody').scrollTop=0;
  renderKaraVerse();
  loadYT(()=>{
    const K=window._kara;if(!K)return;
    K.player=new YT.Player('ytPlayer',{videoId:song.ytId,host:'https://www.youtube-nocookie.com',playerVars:{playsinline:1,rel:0,modestbranding:1,origin:location.origin},events:{}});
    K.timer=setInterval(karaTick,120);
  });
}

function loadYT(cb){
  if(window.YT&&window.YT.Player)return cb();
  const prev=window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady=function(){if(prev)try{prev()}catch(e){}cb()};
  if(!document.getElementById('ytapi')){const s=document.createElement('script');s.id='ytapi';s.src='https://www.youtube.com/iframe_api';document.head.appendChild(s);}
}

function karaStop(){
  const K=window._kara;if(!K)return;
  if(K.timer)clearInterval(K.timer);
  try{K.player&&K.player.destroy&&K.player.destroy()}catch(e){}
  window._kara=null;
}

function karaTick(){
  const K=window._kara;if(!K||!K.player||!K.player.getCurrentTime)return;
  if(K.paused)return;
  const t=K.player.getCurrentTime()-K.off;
  let v=K.verses[K.vIdx];
  if(t<v.start-0.5){const vi=K.verses.findIndex(x=>t>=x.start&&t<x.end);if(vi!==-1&&vi!==K.vIdx){K.vIdx=vi;renderKaraVerse();v=K.verses[K.vIdx];}}
  if(t>=v.end-0.04){
    if(K.continuous){if(K.vIdx<K.verses.length-1){K.vIdx++;renderKaraVerse();}return;}
    K.player.pauseVideo();K.paused=true;showVersePause();return;
  }
  updateKaraWords(t);
}

function renderKaraVerse(){
  const K=window._kara;const v=K.verses[K.vIdx];const L=getLang();
  K.tok=[];
  const html=v.lines.map(ln=>{
    const toks=ln.words.map(w=>{
      const idx=K.tok.length;K.tok.push({t0:w.t0,t1:w.t1});
      return `<span class="tok" data-i="${idx}"><span class="tok-k">${escapeHtml(w.k)}</span><span class="tok-r">${escapeHtml(w.r)}</span><span class="tok-m">${escapeHtml(w[L]||'')}</span></span>`;
    }).join('');
    return `<div class="kline">${toks}</div>`;
  }).join('');
  document.getElementById('karaLines').innerHTML=html;
  document.getElementById('karaPause').style.display='none';
}

function updateKaraWords(t){
  const box=document.getElementById('karaLines');if(!box)return;
  const K=window._kara;const toks=box.querySelectorAll('.tok');
  let activeEl=null;
  toks.forEach((el,i)=>{
    const tk=K.tok[i];if(!tk)return;
    const done=t>=tk.t1,on=!done&&t>=tk.t0;
    el.classList.toggle('done',done);
    el.classList.toggle('on',on);
    if(on)activeEl=el;
  });
  // активная строка сама остаётся в поле зрения (клип закреплён сверху)
  if(activeEl){const line=activeEl.closest('.kline');if(line&&line!==K.lastLine){K.lastLine=line;line.scrollIntoView({behavior:'smooth',block:'center'});}}
}

function showVersePause(){
  const K=window._kara;const v=K.verses[K.vIdx];const L=getLang();
  const last=K.vIdx>=K.verses.length-1;
  const vocab=v.vocab||[];
  const p=document.getElementById('karaPause');
  p.style.display='block';
  setTimeout(()=>p.scrollIntoView({behavior:'smooth',block:'center'}),40);
  p.innerHTML=`
    <div class="kp-h">${t('kara_verse')} ${K.vIdx+1}/${K.verses.length}</div>
    ${v.tr?`<div class="kp-tr">${v.tr[L]}</div>`:''}
    ${v.note?`<div class="kp-note">💡 ${v.note[L]}</div>`:''}
    ${vocab.length?`<div class="kp-vocab">${vocab.map((w,i)=>`<button class="kp-word ${K.saved[K.vIdx+'_'+i]?'on':''}" ${K.saved[K.vIdx+'_'+i]?'disabled':''} onclick="karaSave(${i})">${K.saved[K.vIdx+'_'+i]?'✓ ':'+ '}${escapeHtml(w.kr)}</button>`).join('')}</div>`:''}
    <div class="kp-ctrl">
      <button class="kp-btn ghost" onclick="karaRepeat()">↻ ${t('kara_repeat')}</button>
      ${last?`<button class="btn accent kp-btn" onclick="songComplete()">${t('song_finish')}</button>`:`<button class="btn accent kp-btn" onclick="karaNext()">${t('kara_nextv')} ⏭</button>`}
    </div>`;
}

function karaRepeat(){const K=window._kara,v=K.verses[K.vIdx];K.paused=false;document.getElementById('karaPause').style.display='none';K.player.seekTo(v.start+K.off,true);K.player.playVideo();}
function karaNext(){const K=window._kara;if(K.vIdx<K.verses.length-1)K.vIdx++;const v=K.verses[K.vIdx];K.paused=false;renderKaraVerse();K.player.seekTo(v.start+K.off,true);K.player.playVideo();}
function karaToggleCont(){const K=window._kara;K.continuous=document.getElementById('karaCont').checked;if(K.continuous&&K.paused){K.paused=false;document.getElementById('karaPause').style.display='none';K.player.playVideo();}}
function karaSave(i){const K=window._kara,v=K.verses[K.vIdx],w=(v.vocab||[])[i];if(!w)return;const voc=lsnVocab();if(!voc.some(x=>x.kr===w.kr)){voc.push({...w,from:'song'});lsnSaveVocab(voc);}K.saved[K.vIdx+'_'+i]=true;showVersePause();toast(t('song_save_toast'));}

function songComplete(){
  const K=window._kara;if(!K)return;
  const id=K.song.id;const done=songsDone();
  if(!done.includes(id)){done.push(id);songsSaveDone(done)}
  toast(t('song_done_toast'));
  openSongs();
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
function onbKey(){return 'so_onboarded_'+lsnUid()}
function maybeOnboard(){if(!currentUser||!myIdol)return;if(localStorage.getItem(onbKey()))return;setTimeout(openOnb,450)}
function closeOnb(){document.getElementById('onbOv').classList.remove('show');localStorage.setItem(onbKey(),'1')}
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
  showView('cabinet-own');
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
function renderAuthForm(mode,errMsg){
  const box=document.getElementById('authBox');
  const isSignup=mode==='signup';
  box.innerHTML=`
    <h3>${isSignup?t('au_signup'):t('au_login')}</h3>
    ${errMsg?`<div class="err" style="margin-bottom:12px">${errMsg}</div>`:''}
    ${isSignup?`<input id="authUsername" placeholder="${t('au_user')}" autocomplete="username">`:''}
    <input id="authEmail" type="email" placeholder="${t('au_email')}" autocomplete="email">
    <input id="authPassword" type="password" placeholder="${t('au_pass')}" autocomplete="${isSignup?'new-password':'current-password'}">
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
    nav_home:"My idol", footer:"STAGE ONE · learn Korean with an AI idol you pick · your friend and tutor in one",
    pick_h:"Pick an idol — they become your friend and teach you Korean 🇰🇷", pick_sub:"One idol free, yours forever. Chat every day and learn Korean the fun way.",
    tab_girls:"Girls", tab_boys:"Boys",
    concept_suffix:"· your idol tutor", your_korean:"Your Korean", level:"level", days_together:"days together",
    lesson_start:"Start a lesson", lesson_sub:n=>`${n} teaches you Korean, step by step`,
    lessons_h:"Lessons", lsn_vocab_note:n=>`${n} new words will be saved to your Workbook`, lsn_quiz_h:"Check yourself", lsn_check:"Check answers", lsn_ask:"Ask the teacher a question", lsn_answer_all:"Answer every question first.", lsn_wrong:n=>`${n} wrong — look again and retry.`, lsn_passed:"All correct! Lesson complete 🎉", lsn_next:"Next lesson →", lsn_toast:"Lesson done · words saved · card progress +", lsn_ask_seed:tt=>`I have a question about the lesson "${tt}": `,
    tile_wb:"Workbook", tile_wb_sub:"your words & slang",
    wb_h:"Workbook", wb_words:"Words", wb_slang:"Slang", wb_del:"Remove", wb_mean_ph:"meaning", wb_need_kr:"Type the Korean word", wb_dup:"Already in your workbook",
    wb_empty_words:"No words yet — finish lessons and they’ll pile up here automatically.", wb_empty_slang:"No slang yet — it’ll collect from song breakdowns. You can add your own too.",
    wb_hint_words:"📘 auto from lessons · ✍️ added by you", wb_hint_slang:"🎵 from songs · ✍️ added by you",
    songs_h:"Break a song", songs_intro:"Pick a song. Your idol walks you through it line by line — meaning, grammar and slang.", songs_empty:"No songs yet.", songs_done_h:"Songs you’ve done", song_guide:"Play the video, then step through the lyrics line by line below.", song_next:"Next line", song_finish:"Finish song ✓", song_save:tab=>`+ ${tab}`, song_saved:"Saved ✓", song_save_toast:"Saved to your Workbook", song_done_toast:"Song complete 🎉", song_open_yt:"Open on YouTube",
    kara_hint:"Press play — words light up in time. At each verse end it pauses for the breakdown. If the highlight drifts from the clip, tap “Sync” exactly when you hear the verse’s first word.", kara_synctap:"Sync", kara_syncdone:"Synced to the clip ✓", kara_cont:"Don’t stop", kara_verse:"Verse", kara_repeat:"Repeat verse", kara_nextv:"Next verse",
    onb_title:"How it all works", onb_tour:"Show me around →", onb_ok:"Got it", onb_next:"Next", onb_done:"Done",
    tile_song:"Break a song", tile_song_sub:"line by line", tile_slang:"Song slang", tile_slang_sub:"real Korean", tile_phrase:"Ask a phrase", tile_phrase_sub:"translation + grammar",
    seed_song:"Break down this song: ", seed_slang:"Teach me some Korean slang from songs 🙂", seed_phrase:"How do you say in Korean: ",
    coll_h:"Photocards", coll_note:n=>`New ${n} cards unlock as you finish lessons and quizzes — keep going to reveal them all.`,
    close_h:"💞 Your closeness", close_stage:["Just met","Getting closer","Close friends"],
    close_note:(n,s)=>`${n} speaks to you in <b>${s}</b> — the more you learn, the closer you get, and speech turns friendly.`,
    speech:["polite 존댓말 (jondaetmal)","존댓말, soon 반말","friendly 반말 (banmal)"],
    sub_link:"Subscribe · unlimited lessons · $10/mo →",
    chat_title:n=>`Lesson with ${n}`, chat_ph:"Answer or ask in Korean…",
    chat_loading:"Loading chat…", chat_first:"Say hi first — your idol will reply 💛", chat_need_idol:"Get an idol first.", chat_err:"Idol didn't reply", chat_net:"Network unavailable",
    au_signup:"Sign up", au_login:"Log in", au_logout:"Log out", au_user:"Name", au_email:"Email", au_pass:"Password (min 8 chars)", au_create:"Create account", au_have:"Already have an account?", au_no:"No account yet?",
    forgot_link:"Forgot password?", forgot_h:"Reset password", forgot_send:"Send reset link", forgot_sent:"If that email exists, we sent a reset link. Check your inbox.", back_login:"← Back to log in",
  },
  ru:{
    nav_home:"Мой айдол", footer:"STAGE ONE · учи корейский с AI-айдолом, которого выбрал сам · твой друг и преподаватель в одном лице",
    pick_h:"Выбери айдола — он станет твоим другом и научит тебя корейскому 🇰🇷", pick_sub:"Один айдол бесплатно и навсегда твой. Общайся каждый день — учи корейский играючи.",
    tab_girls:"Девушки", tab_boys:"Парни",
    concept_suffix:"· твой айдол-учитель", your_korean:"Твой корейский", level:"уровень", days_together:"дней вместе",
    lesson_start:"Начать урок", lesson_sub:n=>`${n} учит корейскому — шаг за шагом`,
    lessons_h:"Уроки", lsn_vocab_note:n=>`${n} новых слов сохранятся в Рабочую тетрадь`, lsn_quiz_h:"Проверь себя", lsn_check:"Проверить", lsn_ask:"Задать вопрос учителю", lsn_answer_all:"Сначала ответь на все вопросы.", lsn_wrong:n=>`Ошибок: ${n} — посмотри ещё раз и попробуй снова.`, lsn_passed:"Всё верно! Урок пройден 🎉", lsn_next:"Следующий урок →", lsn_toast:"Урок пройден · слова сохранены · прогресс карточек +", lsn_ask_seed:tt=>`У меня вопрос по уроку «${tt}»: `,
    tile_wb:"Рабочая тетрадь", tile_wb_sub:"твои слова и сленг",
    wb_h:"Рабочая тетрадь", wb_words:"Слова", wb_slang:"Сленг", wb_del:"Удалить", wb_mean_ph:"перевод", wb_need_kr:"Впиши корейское слово", wb_dup:"Уже есть в тетради",
    wb_empty_words:"Пока пусто — проходи уроки, и слова сами накопятся здесь.", wb_empty_slang:"Пока пусто — сленг накопится из разборов песен. Можно добавить и своё.",
    wb_hint_words:"📘 авто с уроков · ✍️ добавил ты", wb_hint_slang:"🎵 из песен · ✍️ добавил ты",
    songs_h:"Разбор песни", songs_intro:"Выбери песню. Айдол разберёт её строка за строкой — смысл, грамматику и сленг.", songs_empty:"Пока нет песен.", songs_done_h:"Пройденные песни", song_guide:"Включи видео, а затем разбирай текст строку за строкой ниже.", song_next:"Следующая строка", song_finish:"Завершить песню ✓", song_save:tab=>`+ в ${tab}`, song_saved:"Сохранено ✓", song_save_toast:"Сохранено в Рабочую тетрадь", song_done_toast:"Песня пройдена 🎉", song_open_yt:"Открыть на YouTube",
    kara_hint:"Нажми play — слова подсвечиваются в такт. В конце куплета — пауза для разбора. Если подсветка не совпадает с клипом — жми «Синхрон» ровно когда слышишь первое слово куплета.", kara_synctap:"Синхрон", kara_syncdone:"Синхронизировано ✓", kara_cont:"Не останавливать", kara_verse:"Куплет", kara_repeat:"Повторить куплет", kara_nextv:"Следующий куплет",
    onb_title:"Как здесь всё устроено", onb_tour:"Показать по экрану →", onb_ok:"Понятно", onb_next:"Далее", onb_done:"Готово",
    tile_song:"Разбор песни", tile_song_sub:"строка за строкой", tile_slang:"Сленг из песен", tile_slang_sub:"живой корейский", tile_phrase:"Спросить фразу", tile_phrase_sub:"перевод + грамматика",
    seed_song:"Разбери песню: ", seed_slang:"Научи меня корейскому сленгу из песен 🙂", seed_phrase:"Как сказать по-корейски: ",
    coll_h:"Фотокарточки", coll_note:n=>`Новые карточки ${n} открываются за пройденные уроки и проверочные — учись, чтобы открыть все.`,
    close_h:"💞 Ваша близость", close_stage:["Только познакомились","Сближаетесь","Близкие друзья"],
    close_note:(n,s)=>`${n} говорит с тобой на <b>${s}</b> — чем больше учишься, тем ближе вы, и речь становится дружеской.`,
    speech:["вежливом 존댓말 (jondaetmal)","존댓말, скоро перейдёт на 반말","дружеском 반말 (banmal)"],
    sub_link:"Подписка · безлимит уроков · $10/мес →",
    chat_title:n=>`Урок с ${n}`, chat_ph:"Ответь или спроси по-корейски…",
    chat_loading:"Загружаю переписку…", chat_first:"Напиши первым — твой айдол ответит 💛", chat_need_idol:"Сначала заведи айдола.", chat_err:"Айдол не ответил", chat_net:"Сеть недоступна",
    au_signup:"Регистрация", au_login:"Вход", au_logout:"Выйти", au_user:"Имя", au_email:"Email", au_pass:"Пароль (мин. 8 символов)", au_create:"Создать аккаунт", au_have:"Уже есть аккаунт?", au_no:"Нет аккаунта?",
    forgot_link:"Забыли пароль?", forgot_h:"Сброс пароля", forgot_send:"Отправить ссылку", forgot_sent:"Если такой email есть — мы отправили ссылку для сброса. Проверь почту.", back_login:"← Назад ко входу",
  }
};
function t(k){const d=T[getLang()]||T.en;return d[k]!==undefined?d[k]:(T.en[k]!==undefined?T.en[k]:k)}
function applyStatic(){
  const s=document.getElementById('langSel');if(s)s.value=getLang();
  const nav=document.querySelector('.navtab[data-view="cabinet-own"]');if(nav)nav.textContent=t('nav_home');
  const f=document.querySelector('footer.wrap');if(f)f.innerHTML=t('footer');
  const ct=document.getElementById('chatText');if(ct)ct.placeholder=t('chat_ph');
}
applyStatic();

const authReady=checkAuth();
boot();
