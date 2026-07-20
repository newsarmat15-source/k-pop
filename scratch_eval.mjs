import { readFileSync } from "fs";
import pg from "pg";
const DBURL = (readFileSync(".env","utf8").match(/DATABASE_URL=(.+)/)||[])[1].trim().replace(/^["']|["']$/g,"");
const asr = JSON.parse(readFileSync("scratch_supernova_asr.json","utf8")).words;
const norm = s=>(s||"").toLowerCase().replace(/[^가-힣a-z]/g,"");
function sim(a,b){a=norm(a);b=norm(b);if(!a||!b)return 0;if(a===b)return 1;const bs=b.split("");let c=0;for(const ch of a.split("")){const i=bs.indexOf(ch);if(i>=0){c++;bs.splice(i,1);}}return c/Math.max(a.length,b.length);}
function align(ourW,asrW){const times=new Array(ourW.length).fill(null);const anchor=new Array(ourW.length).fill(false);let j=0,m=0;
for(let i=0;i<ourW.length;i++){let best=-1,bs=0.5;for(let k=j;k<Math.min(asrW.length,j+30);k++){const s=sim(ourW[i],asrW[k].kr);if(s>bs){bs=s;best=k;}}if(best>=0){times[i]=asrW[best].t;anchor[i]=true;j=best+1;m++;}}
const idx=times.map((t,i)=>t!=null?i:-1).filter(i=>i>=0);
for(let i=0;i<times.length;i++){if(times[i]!=null)continue;let lo=null,hi=null;for(const k of idx){if(k<i)lo=k;if(k>i){hi=k;break;}}if(lo!=null&&hi!=null)times[i]=+(times[lo]+(times[hi]-times[lo])*(i-lo)/(hi-lo)).toFixed(2);else if(lo!=null)times[i]=+(times[lo]+0.3*(i-lo)).toFixed(2);else if(hi!=null)times[i]=+(times[hi]-0.3*(hi-i)).toFixed(2);}
return{times,anchor,m};}
const db=new pg.Client({connectionString:DBURL,ssl:{rejectUnauthorized:false}});await db.connect();
const{rows}=await db.query("select data from songs where title='Supernova'");const song=rows[0].data;
const refs=[];for(const v of song.verses||[])for(const ln of v.lines||[])for(const w of ln.w||[])refs.push(w.k);
const{times,anchor,m}=align(refs,asr);
// проверки
let back=0,maxgap=0,gapAt=-1;for(let i=1;i<times.length;i++){if(times[i]<times[i-1]-0.01)back++;const g=times[i]-times[i-1];if(g>maxgap){maxgap=g;gapAt=i;}}
console.log(`слов ${refs.length}, якорей ${m} (${Math.round(m/refs.length*100)}%), обратных скачков ${back}, макс.разрыв ${maxgap.toFixed(1)}с @слово${gapAt}`);
// длиннейшие интерполированные пробелы (сколько слов подряд без якоря)
let run=0,worst=0,worstAt=0;for(let i=0;i<anchor.length;i++){if(!anchor[i]){run++;if(run>worst){worst=run;worstAt=i;}}else run=0;}
console.log(`длиннейшая цепочка без якоря: ${worst} слов подряд (кончается @слово${worstAt}, t≈${times[worstAt]})`);
console.log("--- каждое 8-е слово: idx | t | якорь | слово ---");
for(let i=0;i<refs.length;i+=8)console.log(`${i}\t${times[i]}\t${anchor[i]?"★":" "}\t${refs[i]}`);
await db.end();
