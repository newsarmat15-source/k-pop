# Graph Report - StageOne  (2026-07-19)

## Corpus Check
- 95 files · ~384,500 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 715 nodes · 1206 edges · 83 communities (56 shown, 27 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.53)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `104df374`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Frontend App Logic (app.js)
- chat.js
- Dance Move System (pipeline.js)
- Kling Stack & Orchestration Decisions
- NPM Dependencies
- Monetization, Legal & Auth Strategy
- test-follow-streak.mjs
- Vote/Training Integration Test
- openSong
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
- test-clips.mjs
- match-modal.mjs
- LipSync/Song API & Seedance Legacy
- Claude Tooling & Project Origin
- askTeacher
- Photocard Test
- API Status/Result Test
- Music Generation Test
- Vercel Config
- align-modal.mjs
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
- write-ctc.mjs
- Idol14 Content-Policy Flag
- Rejected: NFT Trading
- test-auth-flow.mjs
- readUserId
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
- modal_align.py
- validate.mjs
- supabase
- renderLangOpts
- showView
- supabase.js
- test-auth-flow.mjs
- supabase
- seed-test-clips-visual.mjs
- maybeOnboard
- package.json
- openSong
- index.js
- Idolingo Discord Worker

## God Nodes (most connected - your core abstractions)
1. `getLang()` - 21 edges
2. `toast()` - 18 edges
3. `readUserId()` - 18 edges
4. `supabase()` - 17 edges
5. `showView()` - 13 edges
6. `finishLesson()` - 13 edges
7. `openAuth()` - 12 edges
8. `StageOne — прогресс по этапам` - 12 edges
9. `StageOne — проектный документ` - 12 edges
10. `fetchWithRetry()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `handleCreate()` --calls--> `readUserId()`  [EXTRACTED]
  api/clip.js → lib/session.js
- `handleUpdate()` --calls--> `readUserId()`  [EXTRACTED]
  api/clip.js → lib/session.js
- `handleFinalize()` --calls--> `readUserId()`  [EXTRACTED]
  api/pipeline.js → lib/session.js
- `handleGenerate()` --calls--> `readUserId()`  [EXTRACTED]
  api/pipeline.js → lib/session.js
- `handleLastframe()` --calls--> `readUserId()`  [EXTRACTED]
  api/pipeline.js → lib/session.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Files comprising the StageOne_app_v2.4 codebase** — full_dialogue_2026_07_08_stageone_app_v2_4, full_dialogue_2026_07_08_api_generate_js, full_dialogue_2026_07_08_api_result_js, full_dialogue_2026_07_08_api_status_js, full_dialogue_2026_07_08_public_index_html, full_dialogue_2026_07_08_idols_json [INFERRED 0.85]

## Communities (83 total, 27 thin omitted)

### Community 0 - "Frontend App Logic (app.js)"
Cohesion: 0.05
Nodes (43): authReady, awardsHtml(), BIO_SAMPLE, bioState, CLIP, CLIP_COLOR, CLIP_ICON, DANCE (+35 more)

### Community 1 - "chat.js"
Cohesion: 0.17
Nodes (25): config, createLinkToken(), discordOauth(), handler(), ingest(), lineReply(), lineWebhook(), listLinks() (+17 more)

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

### Community 8 - "openSong"
Cohesion: 0.16
Nodes (20): applyStatic(), buildQuiz(), connectCode(), connectDiscord(), escapeHtml(), getLang(), karaSave(), lsnSaveVocab() (+12 more)

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
Cohesion: 0.33
Nodes (5): Idolingo — реестр конструкции сервиса, Инфраструктура / бренд, Мессенджеры (омниканальность), Удержание / драйв, Ядро продукта (обучение)

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
Cohesion: 0.18
Nodes (17): addSong(), allSongs(), closeSongs(), karaStop(), loadCatalog(), lsnSaveDone(), lsnUid(), onSongSearchInput() (+9 more)

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

### Community 25 - "test-clips.mjs"
Cohesion: 0.15
Nodes (10): cookie, db, intruderCookie, r1, r2, r3, r4, r5 (+2 more)

### Community 26 - "match-modal.mjs"
Cohesion: 0.22
Nodes (9): alignWords(), db, DBURL, norm(), pct, refs, sim(), [songId, asrFile, mode = "dry"] (+1 more)

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
Cohesion: 0.33
Nodes (5): maxDuration, maxDuration, functions, api/bot.js, api/pipeline.js

### Community 44 - "Rejected UI Ideas"
Cohesion: 0.22
Nodes (14): annotate(), config, groupVerses(), handleBuild(), handler(), itunesSuggest(), lrclibFind(), parseSynced() (+6 more)

### Community 45 - "write-ctc.mjs"
Cohesion: 0.29
Nodes (7): clean(), db, DBURL, mapTimes(), refs, [songId, ctcFile, mode = "dry"], { times, ends }

### Community 47 - "Rejected: NFT Trading"
Cohesion: 0.43
Nodes (7): client(), config, handleCheckout(), handler(), handleWebhook(), PRODUCTS, rawBody()

### Community 49 - "test-auth-flow.mjs"
Cohesion: 0.16
Nodes (17): claimIdol(), doFollow(), doTrain(), doVote(), fmtRest(), idHash(), loadChart(), mockPushLive() (+9 more)

### Community 50 - "readUserId"
Cohesion: 0.40
Nodes (7): handleCreate(), handleMyIdol(), handlePublicView(), handler(), createSessionCookie(), readUserId(), sign()

### Community 51 - "align-songs.mjs"
Cohesion: 0.38
Nodes (6): computeOffset(), DBURL, firstKoreanAsrSec(), [mode, ytId, firstSec], runDB(), TMP

### Community 52 - "toast"
Cohesion: 0.23
Nodes (12): bilingualUnlocked(), checkAuth(), closeAuthOv(), doLogout(), langSwatch(), LANGUAGE, loadMyIdol(), renderAuthArea() (+4 more)

### Community 53 - "align-words.mjs"
Cohesion: 0.32
Nodes (5): alignWords(), db, DBURL, norm(), sim()

### Community 68 - "askTeacher"
Cohesion: 0.33
Nodes (6): askTeacher(), closeChat(), closeLessons(), closeWorkbook(), navClear(), saveNav()

### Community 69 - "modal_align.py"
Cohesion: 0.32
Nodes (4): align(), asr(), isolate_vocals(), Независимый ASR-проход: Whisper САМ слушает клип и слышит слова со своими     та

### Community 70 - "validate.mjs"
Cohesion: 0.15
Nodes (11): absd, asr, audio, db, DBURL, deltas, ds, key (+3 more)

### Community 71 - "supabase"
Cohesion: 0.50
Nodes (7): handleChart(), handleFollow(), handler(), handleStudy(), handleTrain(), handleVote(), ymd()

### Community 72 - "renderLangOpts"
Cohesion: 0.18
Nodes (16): boot(), buildOpts(), handleLinkReturn(), lbl(), loadNav(), nativeGenres(), pickQuiz(), renderDanceOpts() (+8 more)

### Community 73 - "showView"
Cohesion: 0.25
Nodes (16): allLessons(), chatBubble(), finishLesson(), fmtMsg(), lessonPct(), lsnDone(), navOv(), openAuth() (+8 more)

### Community 74 - "supabase.js"
Cohesion: 0.22
Nodes (4): db, testUsers, db, db

### Community 75 - "test-auth-flow.mjs"
Cohesion: 0.29
Nodes (4): cookie, r1, r2, r3

### Community 76 - "supabase"
Cohesion: 0.73
Nodes (5): handleCreate(), handleList(), handler(), handleUpdate(), supabase()

### Community 77 - "seed-test-clips-visual.mjs"
Cohesion: 0.33
Nodes (3): db, r1, stamp

### Community 78 - "maybeOnboard"
Cohesion: 0.50
Nodes (4): closeOnb(), maybeOnboard(), onbKey(), openOnb()

### Community 79 - "package.json"
Cohesion: 0.15
Nodes (12): discord.js, dependencies, discord.js, description, engines, node, main, name (+4 more)

### Community 80 - "openSong"
Cohesion: 0.24
Nodes (11): ensureYtPlayer(), karaBuild(), karaFocus(), karaOnError(), karaShowErr(), karaShowHint(), karaTick(), karaWatchdog() (+3 more)

### Community 81 - "index.js"
Cohesion: 0.32
Nodes (6): callIngest(), chunkMessage(), client, logErr(), missing, sendReply()

### Community 82 - "Idolingo Discord Worker"
Cohesion: 0.29
Nodes (6): 1. Create the Discord application + bot, 2. Environment variables, 3. Install & run locally, 4. Deploy to Fly.io, 5. Ingest contract (for reference), Idolingo Discord Worker

## Knowledge Gaps
- **241 isolated node(s):** `Ядро продукта (обучение)`, `Удержание / драйв`, `Мессенджеры (омниканальность)`, `Инфраструктура / бренд`, `config` (+236 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **27 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `supabase()` connect `supabase` to `test-follow-streak.mjs`, `supabase.js`, `test-auth-flow.mjs`, `seed-test-clips-visual.mjs`, `readUserId`, `test-follow-streak.mjs`, `test-clips.mjs`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `readUserId()` connect `readUserId` to `Dance Move System (pipeline.js)`, `supabase`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `Ядро продукта (обучение)`, `Удержание / драйв`, `Мессенджеры (омниканальность)` to the rest of the system?**
  _243 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend App Logic (app.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.05254901960784314 - nodes in this community are weakly interconnected._
- **Should `Dance Move System (pipeline.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.0966183574879227 - nodes in this community are weakly interconnected._
- **Should `NPM Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `test-follow-streak.mjs` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._