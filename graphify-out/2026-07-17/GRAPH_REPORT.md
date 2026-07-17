# Graph Report - StageOne  (2026-07-17)

## Corpus Check
- 73 files · ~358,115 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 595 nodes · 1049 edges · 73 communities (47 shown, 26 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `215aa362`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Frontend App Logic (app.js)
- Auth & Clip API Handlers
- Dance Move System (pipeline.js)
- Kling Stack & Orchestration Decisions
- NPM Dependencies
- Monetization, Legal & Auth Strategy
- test-follow-streak.mjs
- Vote/Training Integration Test
- Clips Integration Test
- Multi-Segment Resume Test
- Multi-Segment V2 Test
- Vocal Isolation Test
- Multi-Segment Test
- Sync LipSync Test
- finishLesson
- Project Migration & Consolidation
- DB Client & Migrations
- Independent Segments Test
- Dev Server (dev-server.mjs)
- toggle
- test-follow-streak.mjs
- Local Server (local-server.mjs)
- Generate Endpoint Test
- Vercel Dispatcher Pattern
- readUserId
- supabase
- LipSync/Song API & Seedance Legacy
- Claude Tooling & Project Origin
- askTeacher
- Photocard Test
- API Status/Result Test
- Music Generation Test
- Vercel Config
- seed-test-clips-visual.mjs
- Clip Pull Script
- Finalize API Test
- Generate API Test
- LipSync API Test
- Song API Test
- Stitch API Test
- Bilingual Song Test
- Hailuo Model Test
- Kling Model Test
- Rejected UI Ideas
- clip.js
- Idol14 Content-Policy Flag
- Rejected: NFT Trading
- test-auth-flow.mjs
- openSong
- align-songs.mjs
- toast
- align-words.mjs
- Idol Portrait: MOMO
- Idol Portrait: ZARA
- Idol Portrait: NARU
- Idol Portrait: KIRA
- Idol Portrait: SORA
- Idol Portrait: LUNE
- Idol Portrait: idol2
- Idol Portrait: IRIS
- Idol Portrait: ONYX
- Idol Portrait: EMBER
- Idol Portrait: KOA
- Idol Portrait: SABLE
- Idol Portrait: HALO
- Idol Portrait: REI
- askTeacher
- getLang
- generate
- renderLangOpts
- showView

## God Nodes (most connected - your core abstractions)
1. `readUserId()` - 22 edges
2. `supabase()` - 22 edges
3. `getLang()` - 18 edges
4. `toast()` - 17 edges
5. `showView()` - 13 edges
6. `finishLesson()` - 12 edges
7. `openAuth()` - 12 edges
8. `StageOne — прогресс по этапам` - 12 edges
9. `StageOne — проектный документ` - 12 edges
10. `fetchWithRetry()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `handleCreate()` --calls--> `readUserId()`  [EXTRACTED]
  api/clip.js → lib/session.js
- `handleUpdate()` --calls--> `readUserId()`  [EXTRACTED]
  api/clip.js → lib/session.js
- `handleFollow()` --calls--> `readUserId()`  [EXTRACTED]
  api/engage.js → lib/session.js
- `handleTrain()` --calls--> `readUserId()`  [EXTRACTED]
  api/engage.js → lib/session.js
- `handleVote()` --calls--> `readUserId()`  [EXTRACTED]
  api/engage.js → lib/session.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Files comprising the StageOne_app_v2.4 codebase** — full_dialogue_2026_07_08_stageone_app_v2_4, full_dialogue_2026_07_08_api_generate_js, full_dialogue_2026_07_08_api_result_js, full_dialogue_2026_07_08_api_status_js, full_dialogue_2026_07_08_public_index_html, full_dialogue_2026_07_08_idols_json [INFERRED 0.85]

## Communities (73 total, 26 thin omitted)

### Community 0 - "Frontend App Logic (app.js)"
Cohesion: 0.05
Nodes (43): authReady, awardsHtml(), BIO_SAMPLE, bioState, CLIP, CLIP_COLOR, CLIP_ICON, closeOnb() (+35 more)

### Community 1 - "Auth & Clip API Handlers"
Cohesion: 0.12
Nodes (8): db, testUsers, cookie, r1, r2, r3, db, db

### Community 2 - "Dance Move System (pipeline.js)"
Cohesion: 0.10
Nodes (43): BOY_REGISTER, BOY_TEXTURE, BOY_TIMBRE, buildClipMoves(), CLIP, DANCE_GENDER, DANCE_LEGACY, detectSilences() (+35 more)

### Community 4 - "NPM Dependencies"
Cohesion: 0.08
Nodes (24): @anthropic-ai/sdk, @elevenlabs/elevenlabs-js, @fal-ai/client, ffmpeg-static, dependencies, @anthropic-ai/sdk, @elevenlabs/elevenlabs-js, @fal-ai/client (+16 more)

### Community 5 - "Monetization, Legal & Auth Strategy"
Cohesion: 0.15
Nodes (12): StageOne — прогресс по этапам, Закрыто, Приоритет (на будущие сессии), Что не сделано / открыто прямо сейчас, Этап 1 — 07.07.2026 — Стратегия и первая сборка (в обычном Claude), Этап 2 — 08.07.2026 — Диагностика Seedance, выбор видео-платформы, Этап 3 — 08.07.2026 — Легальный вокал, Этап 4 — 08.07.2026 — Пересборка кода под новый пайплайн (+4 more)

### Community 6 - "test-follow-streak.mjs"
Cohesion: 0.13
Nodes (12): db, ownerCookie, r1, r2, r3, r4, r5, r6 (+4 more)

### Community 7 - "Vote/Training Integration Test"
Cohesion: 0.46
Nodes (7): handleForgot(), handleLogin(), handleLogout(), handleMe(), handler(), handleReset(), handleSignup()

### Community 8 - "Clips Integration Test"
Cohesion: 0.15
Nodes (10): cookie, db, intruderCookie, r1, r2, r3, r4, r5 (+2 more)

### Community 9 - "Multi-Segment Resume Test"
Cohesion: 0.44
Nodes (12): downloadTo(), fetchVideoResult(), generateVideoSegment(), log(), main(), pollUntilComplete(), runFfmpeg(), runLipsync() (+4 more)

### Community 10 - "Multi-Segment V2 Test"
Cohesion: 0.44
Nodes (12): downloadTo(), fetchVideoResult(), generateVideoSegment(), log(), main(), pollUntilComplete(), runFfmpeg(), runLipsync() (+4 more)

### Community 11 - "Vocal Isolation Test"
Cohesion: 0.40
Nodes (12): downloadTo(), fetchVideoResult(), isolateVocals(), log(), main(), pollUntilComplete(), runFfmpeg(), runLipsync() (+4 more)

### Community 12 - "Multi-Segment Test"
Cohesion: 0.38
Nodes (11): downloadTo(), fetchVideoResult(), generateVideoSegment(), log(), main(), pollUntilComplete(), runFfmpeg(), runLipsync() (+3 more)

### Community 13 - "Sync LipSync Test"
Cohesion: 0.48
Nodes (11): downloadTo(), fetchVideoResult(), generateVideo15s(), log(), main(), pollUntilComplete(), runSyncLipsync(), sleep() (+3 more)

### Community 14 - "finishLesson"
Cohesion: 0.23
Nodes (13): addSong(), karaSave(), lsnSaveDone(), lsnSaveVocab(), lsnUid(), lsnVocab(), renderWorkbook(), saveUserSong() (+5 more)

### Community 15 - "Project Migration & Consolidation"
Cohesion: 0.20
Nodes (10): api/generate.js (mentioned in v2.4 codebase), api/result.js (mentioned in v2.4 codebase), api/status.js (mentioned in v2.4 codebase), CLAUDE.md (special auto-loaded context file for Claude Code), StageOne_ПОЛНЫЙ_ДИАЛОГ.md (exported dialogue bridge doc from Claude.ai), git version control (to be initialized to stop Downloads version sprawl v2.2/v2.3/v2.4), idols.json + 15 portraits (mentioned in v2.4 codebase), C:\Users\user\Projects\StageOne (target project folder consolidating scattered Downloads versions, git-tracked) (+2 more)

### Community 16 - "DB Client & Migrations"
Cohesion: 0.24
Nodes (7): dbClient(), applied, client, DIR, __dirname, files, c

### Community 17 - "Independent Segments Test"
Cohesion: 0.51
Nodes (9): downloadTo(), fetchVideoResult(), generateVideoSegment(), log(), main(), pollUntilComplete(), sleep(), TMP (+1 more)

### Community 18 - "Dev Server (dev-server.mjs)"
Cohesion: 0.28
Nodes (8): __dirname, handleApi(), MIME, PUBLIC, ROOT, send(), server, serveStatic()

### Community 19 - "toggle"
Cohesion: 0.24
Nodes (12): allSongs(), closeSongs(), escapeHtml(), karaStop(), loadCatalog(), onSongSearchInput(), openSongs(), renderSongList() (+4 more)

### Community 21 - "test-follow-streak.mjs"
Cohesion: 0.13
Nodes (11): cookie, db, ownerCookie, r1, r2, r3, r4, r5 (+3 more)

### Community 22 - "Local Server (local-server.mjs)"
Cohesion: 0.29
Nodes (5): __dirname, LOG_PATH, MIME, root, server

### Community 23 - "Generate Endpoint Test"
Cohesion: 0.33
Nodes (6): CLIP, DANCE, imageUrls, main(), sleep(), SONG

### Community 24 - "Vercel Dispatcher Pattern"
Cohesion: 0.15
Nodes (12): 10. Ассеты, 1. Продукт, 2. Заказчик и формат работы, 3. Текущий стек (актуально на 10.07.2026), 4. Пайплайн клипа, 5. Что ОТВЕРГНУТО (не возвращаться), 6. Монетизация, 7. Открытые задачи (+4 more)

### Community 25 - "readUserId"
Cohesion: 0.40
Nodes (7): handleCreate(), handleMyIdol(), handlePublicView(), handler(), createSessionCookie(), readUserId(), sign()

### Community 26 - "supabase"
Cohesion: 0.57
Nodes (7): handleChart(), handleFollow(), handler(), handleTrain(), handleVote(), ymd(), supabase()

### Community 27 - "LipSync/Song API & Seedance Legacy"
Cohesion: 0.67
Nodes (3): api/generate.js (original Seedance version), C2PA "AI-generated" Watermark, Seedance 2.0 (original video model)

### Community 28 - "Claude Tooling & Project Origin"
Cohesion: 0.40
Nodes (5): Claude.ai (web version, no shared memory with Claude Code), Claude Code (CLI tool used to develop StageOne), Seedance (video generation service, 15-second limit constraint mentioned), StageOne (AI K-pop idol video app project), Windows voice dictation (Win+H, Russian language pack)

### Community 29 - "askTeacher"
Cohesion: 0.22
Nodes (13): annotate(), annotateChunk(), build(), db, DBURL, ENV, FAL, firstKoreanAsrSec() (+5 more)

### Community 30 - "Photocard Test"
Cohesion: 0.90
Nodes (4): log(), main(), sleep(), withRetry()

### Community 31 - "API Status/Result Test"
Cohesion: 0.83
Nodes (3): main(), makeRes(), sleep()

### Community 33 - "Vercel Config"
Cohesion: 0.50
Nodes (3): maxDuration, functions, api/pipeline.js

### Community 34 - "seed-test-clips-visual.mjs"
Cohesion: 0.33
Nodes (3): db, r1, stamp

### Community 44 - "Rejected UI Ideas"
Cohesion: 0.40
Nodes (9): buildPersona(), callLLM(), closenessGuide(), handleHistory(), handler(), handleSend(), langName(), levelGuide() (+1 more)

### Community 45 - "clip.js"
Cohesion: 0.70
Nodes (4): handleCreate(), handleList(), handler(), handleUpdate()

### Community 47 - "Rejected: NFT Trading"
Cohesion: 0.43
Nodes (7): client(), config, handleCheckout(), handler(), handleWebhook(), PRODUCTS, rawBody()

### Community 49 - "test-auth-flow.mjs"
Cohesion: 0.13
Nodes (22): claimIdol(), doFollow(), doTrain(), fmtRest(), idHash(), IDOLS, loadChart(), mockPushLive() (+14 more)

### Community 50 - "openSong"
Cohesion: 0.36
Nodes (9): annotate(), config, groupVerses(), handleBuild(), handler(), itunesSuggest(), lrclibFind(), parseSynced() (+1 more)

### Community 51 - "align-songs.mjs"
Cohesion: 0.38
Nodes (6): computeOffset(), DBURL, firstKoreanAsrSec(), [mode, ytId, firstSec], runDB(), TMP

### Community 52 - "toast"
Cohesion: 0.33
Nodes (7): checkAuth(), closeAuthOv(), doLogout(), loadMyIdol(), renderAuthArea(), renderAuthForm(), submitAuth()

### Community 53 - "align-words.mjs"
Cohesion: 0.32
Nodes (5): alignWords(), db, DBURL, norm(), sim()

### Community 68 - "askTeacher"
Cohesion: 0.33
Nodes (6): askTeacher(), closeChat(), closeLessons(), closeWorkbook(), navClear(), saveNav()

### Community 69 - "getLang"
Cohesion: 0.21
Nodes (13): applyStatic(), buildQuiz(), chatBubble(), fmtMsg(), getLang(), optLabel(), renderBlock(), renderKaraVerse() (+5 more)

### Community 70 - "generate"
Cohesion: 0.40
Nodes (5): errBox(), generate(), generateOneSegment(), pollJob(), stepsHtml()

### Community 72 - "renderLangOpts"
Cohesion: 0.21
Nodes (16): bilingualUnlocked(), boot(), buildOpts(), langSwatch(), LANGUAGE, lbl(), loadNav(), nativeGenres() (+8 more)

### Community 73 - "showView"
Cohesion: 0.31
Nodes (14): allLessons(), finishLesson(), karaBuild(), lessonPct(), lsnDone(), navOv(), openAuth(), openChat() (+6 more)

## Knowledge Gaps
- **196 isolated node(s):** `state`, `LANG_CODE`, `LANG_COLOR`, `CLIP`, `DANCE` (+191 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase()` connect `supabase` to `Auth & Clip API Handlers`, `seed-test-clips-visual.mjs`, `test-follow-streak.mjs`, `Clips Integration Test`, `clip.js`, `test-follow-streak.mjs`, `readUserId`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `readUserId()` connect `readUserId` to `supabase`, `Dance Move System (pipeline.js)`, `clip.js`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **What connects `state`, `LANG_CODE`, `LANG_COLOR` to the rest of the system?**
  _197 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend App Logic (app.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.053061224489795916 - nodes in this community are weakly interconnected._
- **Should `Auth & Clip API Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.125 - nodes in this community are weakly interconnected._
- **Should `Dance Move System (pipeline.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.0966183574879227 - nodes in this community are weakly interconnected._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._