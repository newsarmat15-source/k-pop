# Graph Report - StageOne  (2026-07-14)

## Corpus Check
- 66 files · ~346,704 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 536 nodes · 823 edges · 71 communities (33 shown, 38 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f42a3c58`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Frontend App Logic (app.js)
- Auth & Clip API Handlers
- Dance Move System (pipeline.js)
- Kling Stack & Orchestration Decisions
- NPM Dependencies
- Monetization, Legal & Auth Strategy
- Follow/Streak Integration Test
- Vote/Training Integration Test
- Clips Integration Test
- Multi-Segment Resume Test
- Multi-Segment V2 Test
- Vocal Isolation Test
- Multi-Segment Test
- Sync LipSync Test
- ElevenLabs Music Pipeline
- Project Migration & Consolidation
- DB Client & Migrations
- Independent Segments Test
- Dev Server (dev-server.mjs)
- Clip Finalize Step & Gender UI
- Stitch Step & UI Decisions
- LipSync Quality & Timing Fixes
- Local Server (local-server.mjs)
- Generate Endpoint Test
- Vercel Dispatcher Pattern
- fal.ai Fetch Retry & LipSync
- Kling Video Model Selection
- LipSync/Song API & Seedance Legacy
- Claude Tooling & Project Origin
- Dance Clip QA Defects
- Photocard Test
- API Status/Result Test
- Music Generation Test
- Vercel Config
- LipSync & Frame Freeze Tradeoffs
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
- Stripe Payments (Unbuilt)
- Idol14 Content-Policy Flag
- Rejected: NFT Trading
- Rejected: External Dialogue DB
- Rejected: Photofit Builder
- Rejected: Song Overlay
- Founder (Сармат)
- Face-Detection Auto-Retry
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
- Rap Segment QA Frame Grid
- Seg1 QA Frame Grid
- Seg2 QA Frame Grid
- With-Sound Clip QA Montage

## God Nodes (most connected - your core abstractions)
1. `supabase()` - 26 edges
2. `readUserId()` - 24 edges
3. `toast()` - 12 edges
4. `StageOne — проектный документ` - 12 edges
5. `fetchWithRetry()` - 12 edges
6. `handler()` - 11 edges
7. `showView()` - 10 edges
8. `handleSong()` - 10 edges
9. `Этап 8: Production Deploy` - 10 edges
10. `renderCabinet()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `3-Step Vercel Deploy Guide` --conceptually_related_to--> `Этап 8: Production Deploy`  [INFERRED]
  README.md → PROGRESS.md
- `Japanese Lyrics Transcript (last.txt)` --conceptually_related_to--> `Language Selector (KO/EN/JA/ZH) + Bilingual Unlock`  [AMBIGUOUS]
  graphify-out/transcripts/last.txt → PROGRESS.md
- `handleGenerate()` --calls--> `readUserId()`  [EXTRACTED]
  api/pipeline.js → lib/session.js
- `handleLipsync()` --calls--> `readUserId()`  [EXTRACTED]
  api/pipeline.js → lib/session.js
- `handleSong()` --calls--> `readUserId()`  [EXTRACTED]
  api/pipeline.js → lib/session.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Files comprising the StageOne_app_v2.4 codebase** — full_dialogue_2026_07_08_stageone_app_v2_4, full_dialogue_2026_07_08_api_generate_js, full_dialogue_2026_07_08_api_result_js, full_dialogue_2026_07_08_api_status_js, full_dialogue_2026_07_08_public_index_html, full_dialogue_2026_07_08_idols_json [INFERRED 0.85]
- **QA Render Samples (video/audio URLs + Whisper Transcripts)** — review_rap_final_url, review_song_climax_url, review_song_ko_url, review_song_rap_url, review_withsound_url, review_rms, graphify_out_transcripts_rap_final, graphify_out_transcripts_song_climax, graphify_out_transcripts_song_ko, graphify_out_transcripts_rap_song, graphify_out_transcripts_withsound [INFERRED 0.85]

## Communities (71 total, 38 thin omitted)

### Community 0 - "Frontend App Logic (app.js)"
Cohesion: 0.05
Nodes (77): authReady, awardsHtml(), bilingualUnlocked(), BIO_SAMPLE, bioState, boot(), buildOpts(), chatBubble() (+69 more)

### Community 1 - "Auth & Clip API Handlers"
Cohesion: 0.09
Nodes (37): handleLogin(), handleLogout(), handleMe(), handler(), handleSignup(), handleCreate(), handleList(), handler() (+29 more)

### Community 2 - "Dance Move System (pipeline.js)"
Cohesion: 0.10
Nodes (42): BOY_REGISTER, BOY_TEXTURE, BOY_TIMBRE, buildClipMoves(), CLIP, DANCE_GENDER, DANCE_LEGACY, detectSilences() (+34 more)

### Community 3 - "Kling Stack & Orchestration Decisions"
Cohesion: 0.12
Nodes (16): Japanese Lyrics Transcript (last.txt), Orchestration Model "Версия 1" (Sila/Opus advises, Sarmat dispatches), AgentsRoom Desktop App, Fix: authReady Race Condition in "Мой продакшн", CLAUDE.md Rewrite (accurate stack doc), 22 Routes Collapsed to 5 Dispatcher Files, Этап 8: Production Deploy, FLUX.2 Pro Portrait Realism Test (+8 more)

### Community 4 - "NPM Dependencies"
Cohesion: 0.08
Nodes (24): @anthropic-ai/sdk, @elevenlabs/elevenlabs-js, @fal-ai/client, ffmpeg-static, dependencies, @anthropic-ai/sdk, @elevenlabs/elevenlabs-js, @fal-ai/client (+16 more)

### Community 5 - "Monetization, Legal & Auth Strategy"
Cohesion: 0.15
Nodes (13): AI-Friend-in-Phone Strategy, api/create-idol.js, api/signup.js, login.js, logout.js, me.js, China AI Anthropomorphic Interaction Law, DB Schema (profiles/idols/training_stats/clips/photocards/votes/follows/chat_messages/subscriptions), Density Fix: Badges/Tags/Counters, E2E Test Scripts (test-auth-flow, test-follow-streak, test-vote-train), api/train.js, vote.js, chart.js, follow.js, clip-create/list/update.js, idol.js (+5 more)

### Community 6 - "Follow/Streak Integration Test"
Cohesion: 0.13
Nodes (11): cookie, db, ownerCookie, r1, r2, r3, r4, r5 (+3 more)

### Community 7 - "Vote/Training Integration Test"
Cohesion: 0.13
Nodes (12): db, ownerCookie, r1, r2, r3, r4, r5, r6 (+4 more)

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

### Community 14 - "ElevenLabs Music Pipeline"
Cohesion: 0.67
Nodes (3): Этап 3: ElevenLabs Music API Choice, Rejected: Suno (No Official API), Rejected: Udio (Walled Garden after UMG)

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

### Community 20 - "Stitch Step & UI Decisions"
Cohesion: 0.22
Nodes (9): api/stitch.js (ffmpeg concat), Color Palette: Pink-Purple Duotone (Pop Futurism/Y3K), DANCE Dictionary Expanded to 13 Styles, Этап 6: Multi-Segment Clip + Gender UI Rebuild, Bug: Hardcoded SONG/CLIP/DANCE Arrays in index.html, Gender Tabs UI (#idolGenderTabs, state.genderTab), generateOneSegment() Function, Decision: Inline SVG Icons (No Real Photos) (+1 more)

### Community 21 - "LipSync Quality & Timing Fixes"
Cohesion: 0.33
Nodes (6): Choreography Rewrite: Storyboard by Thirds + cfg_scale 0.75, Этап 5: LipSync Quality Decision, Solution: Generate w/ Buffer + Volume-Based Trim, Rejected: Sync LipSync (Visual Glitches), Vocal Timing Instability at Clip Boundaries, RMS Volume Analysis Log (ffmpeg astats)

### Community 22 - "Local Server (local-server.mjs)"
Cohesion: 0.29
Nodes (5): __dirname, LOG_PATH, MIME, root, server

### Community 23 - "Generate Endpoint Test"
Cohesion: 0.33
Nodes (6): CLIP, DANCE, imageUrls, main(), sleep(), SONG

### Community 24 - "Vercel Dispatcher Pattern"
Cohesion: 0.15
Nodes (12): 10. Ассеты, 1. Продукт, 2. Заказчик и формат работы, 3. Текущий стек (актуально на 10.07.2026), 4. Пайплайн клипа, 5. Что ОТВЕРГНУТО (не возвращаться), 6. Монетизация, 7. Открытые задачи (+4 more)

### Community 26 - "Kling Video Model Selection"
Cohesion: 0.67
Nodes (3): Этап 1: Strategy & First Prototype, Этап 2: Kling 3.0 Selection, Seedance 2.0 v1/v2 Pipeline

### Community 27 - "LipSync/Song API & Seedance Legacy"
Cohesion: 0.33
Nodes (6): api/lipsync.js, api/song.js, Этап 4: Kling Pipeline Rebuild, api/generate.js (original Seedance version), C2PA "AI-generated" Watermark, Seedance 2.0 (original video model)

### Community 28 - "Claude Tooling & Project Origin"
Cohesion: 0.40
Nodes (5): Claude.ai (web version, no shared memory with Claude Code), Claude Code (CLI tool used to develop StageOne), Seedance (video generation service, 15-second limit constraint mentioned), StageOne (AI K-pop idol video app project), Windows voice dictation (Win+H, Russian language pack)

### Community 29 - "Dance Clip QA Defects"
Cohesion: 0.50
Nodes (5): QA defect: final grid cell is solid black (missing/dropped last frame), QA defect: face turns into blurred/pixelated mosaic in one frame (row 3, frame 1), Dance Clip QA Frame Montage (16 frames), AI idol dancing in denim/crop-top street outfit (subject of montage), Heavy motion blur on arms/hair across most dance frames

### Community 30 - "Photocard Test"
Cohesion: 0.90
Nodes (4): log(), main(), sleep(), withRetry()

### Community 31 - "API Status/Result Test"
Cohesion: 0.83
Nodes (3): main(), makeRes(), sleep()

### Community 33 - "Vercel Config"
Cohesion: 0.50
Nodes (3): maxDuration, functions, api/pipeline.js

### Community 44 - "Rejected UI Ideas"
Cohesion: 0.50
Nodes (7): buildPersona(), callLLM(), handleHistory(), handler(), handleSend(), levelGuide(), ownIdol()

### Community 47 - "Rejected: NFT Trading"
Cohesion: 0.43
Nodes (7): client(), config, handleCheckout(), handler(), handleWebhook(), PRODUCTS, rawBody()

## Ambiguous Edges - Review These
- `Japanese Lyrics Transcript (last.txt)` → `Language Selector (KO/EN/JA/ZH) + Bilingual Unlock`  [AMBIGUOUS]
  graphify-out/transcripts/last.txt · relation: conceptually_related_to

## Knowledge Gaps
- **207 isolated node(s):** `IDOLS`, `state`, `SONG`, `LANGUAGE`, `LANG_CODE` (+202 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **38 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Japanese Lyrics Transcript (last.txt)` and `Language Selector (KO/EN/JA/ZH) + Bilingual Unlock`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `supabase()` connect `Auth & Clip API Handlers` to `Clips Integration Test`, `Follow/Streak Integration Test`, `Vote/Training Integration Test`?**
  _High betweenness centrality (0.027) - this node is a cross-community bridge._
- **Why does `readUserId()` connect `Auth & Clip API Handlers` to `Dance Move System (pipeline.js)`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `IDOLS`, `state`, `SONG` to the rest of the system?**
  _227 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Frontend App Logic (app.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.050617283950617285 - nodes in this community are weakly interconnected._
- **Should `Auth & Clip API Handlers` be split into smaller, more focused modules?**
  _Cohesion score 0.08521870286576169 - nodes in this community are weakly interconnected._
- **Should `Dance Move System (pipeline.js)` be split into smaller, more focused modules?**
  _Cohesion score 0.09898989898989899 - nodes in this community are weakly interconnected._