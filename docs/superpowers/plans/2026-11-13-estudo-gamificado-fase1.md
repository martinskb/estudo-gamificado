# Estudo Gamificado — Fase 1 (demo 16/11) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar, num link público, o app web de estudo (cronômetro, ofensiva, progresso, trilhas com vídeos reais do YouTube e exercícios) funcionando para a demo ao vivo de segunda 16/11/2026 às 8h.

**Architecture:** Monorepo com `backend/` (FastAPI + SQLAlchemy, Postgres em produção, SQLite nos testes) e `frontend/` (React + Vite + TypeScript, PWA). Regras de negócio (pontos, meta, ofensiva) ficam em funções puras testadas. Gemini e YouTube ficam atrás de interfaces (`AIClient`, `VideoSearch`) com versões falsas nos testes. A geração de trilha roda em background e o frontend acompanha por polling.

**Tech Stack:** Python 3.12 (uv), FastAPI, SQLAlchemy 2, Pydantic 2, httpx, google-genai, pytest · React 18 + Vite + TypeScript, react-router, vite-plugin-pwa, Vitest · Render (API), Vercel (site), Postgres gratuito (Neon ou Supabase).

**Spec:** `docs/superpowers/specs/2026-11-13-estudo-gamificado-design.md`

**Escopo deste plano:** só a **Fase 1**. A Fase 2 (semana de base, códigos de participante, CSV, social, upload de PDF/slides) ganha um plano próprio logo após a demo.

## Global Constraints

- Fuso para "dia": `America/Belem`. Semana começa na segunda.
- Pontos: 10 por sessão com tempo ativo ≥ 20 min (1200 s), no máximo 3 sessões pontuadas por dia. Sessões menores são registradas com 0 ponto.
- Tempo ativo **exclui pausas**. Meta cumprida = tempo ativo ≥ meta × 60.
- Meta por sessão em minutos, padrão **25**. Meta da semana em dias, padrão **4**.
- Dia estudado = qualquer sessão concluída naquele dia (dia de `ended_at` em Belém).
- Proteção da ofensiva: +1 a cada 7 dias seguidos, máximo **2**, consumida automaticamente quando um dia passado não teve estudo.
- Acertar exercício **nunca** dá pontos.
- Login: apelido 3–20 caracteres `[A-Za-z0-9_]`, sem diferenciar maiúsculas; PIN `^\d{4}$`. Nada de e-mail.
- Nome, matrícula e contato nunca vão para a IA. Só texto de tema, parte, pergunta e URL do vídeo.
- Todo link de vídeo vem da busca da YouTube Data API. A IA nunca inventa link.
- Respostas e questões da IA mostram o rótulo "Gerado por IA — confira no seu material".
- Chaves (Gemini, YouTube, banco) só no backend, lidas de variáveis de ambiente.
- Textos da interface em português do Brasil.
- Visual: tema neutro com tokens CSS em `frontend/src/theme/tokens.css`. A identidade (nome, cores, logo) é decidida com o Kaio na Task 11.
- Mecânicas inspiradas no Duolingo, com nome e visual próprios. Nada de marca, mascote ou cores do Duolingo.

## Review Focus

1. **Recarregar a página ou bloquear o celular com o cronômetro rodando:** a sessão continua com o tempo certo. Teste: `timerState.test.ts::survives reload`, na Task 4.
2. **Sessão que cruza a meia-noite** (23:50 → 00:10 em Belém) conta no dia em que terminou, mesmo com o servidor em UTC. Teste: `test_rules.py::test_study_day_uses_belem_end_date`, na Task 2.
3. **Toque duplo em "Concluir"** (ou reenvio por rede ruim) não cria duas sessões nem dá ponto em dobro. Teste: `test_sessions_api.py::test_conclude_is_idempotent`, na Task 2.
4. **Tema digitado estranho** (vazio, 200 caracteres) ou Gemini devolvendo JSON quebrado: validação 3–120 caracteres, uma nova tentativa e, se falhar de novo, status `failed` com mensagem. Testes: `test_generate.py::test_malformed_ai_json_retries_then_fails` e `test_trails_api.py::test_topic_length_validated`, na Task 6.
5. **YouTube sem resultados para uma parte, ou cota estourada:** a parte aparece com "nenhuma aula encontrada" e a trilha fica pronta mesmo assim; com cota estourada, `failed` com `error="quota"`, e o frontend oferece temas do catálogo. Testes: `test_generate.py::test_part_without_videos_still_ready` e `::test_quota_marks_failed`, na Task 6.

---

## Estrutura de arquivos

```
backend/
  pyproject.toml
  app/main.py              # create_app(), CORS, inclui routers
  app/config.py            # Settings (env)
  app/db.py                # engine, SessionLocal, Base, get_db
  app/models.py            # todos os modelos ORM (app pequeno: um arquivo)
  app/events.py            # log_event()
  app/auth.py              # router /auth, current_user dependency, PIN hash/lockout
  app/study/rules.py       # funções puras: pontos, meta, dia de estudo
  app/study/router.py      # /sessions, /me/settings
  app/progress/streak.py   # funções puras: ofensiva, proteção, semana
  app/progress/router.py   # /progress
  app/ai/client.py         # AIClient Protocol, QuizItem, GeminiClient
  app/ai/youtube.py        # VideoSearch Protocol, VideoHit, QuotaExceeded, YouTubeSearch
  app/trails/catalog.py    # normalize(), match()
  app/trails/generate.py   # generate_trail(), analyze_videos()
  app/trails/router.py     # /catalog, /trails, /parts
  app/exercises/router.py  # /parts/{id}/quiz, /exercises/{id}/answer
  app/assistant/router.py  # /assistant
  app/ranking/router.py    # /ranking
  scripts/seed_catalog.py  # gera os temas do catálogo
  tests/...
frontend/
  src/api/client.ts, src/api/types.ts
  src/theme/tokens.css
  src/auth/LoginPage.tsx, src/auth/auth.ts
  src/timer/timerState.ts (+ .test.ts), src/timer/TimerPage.tsx, src/timer/Celebration.tsx
  src/home/HomePage.tsx
  src/progress/ProgressPage.tsx, src/progress/Calendar.tsx
  src/trails/NewTrailPage.tsx, src/trails/TrailPage.tsx, src/trails/QuizPage.tsx
  src/assistant/AssistantPanel.tsx
  src/ranking/RankingPage.tsx
  src/App.tsx, src/main.tsx
render.yaml
```

---

### Task 0: Contas e chaves (Kaio, em paralelo com as Tasks 1–4)

Não tem código. Sem estas chaves, as Tasks 6 a 9 não rodam de verdade.

- [ ] **Step 1:** Criar a chave da Gemini API no Google AI Studio e anotar qual modelo **Flash** está disponível no plano grátis. Esse modelo vai na variável `GEMINI_MODEL`.
- [ ] **Step 2:** No Google Cloud Console, criar um projeto, ativar a **YouTube Data API v3** e gerar uma chave de API (`YOUTUBE_API_KEY`).
- [ ] **Step 3:** Criar um Postgres grátis no Neon ou no Supabase e anotar a `DATABASE_URL`.
- [ ] **Step 4:** Criar contas no Render e na Vercel, ligadas ao GitHub.
- [ ] **Step 5:** Guardar tudo em `backend/.env`, que fica fora do git:
  `DATABASE_URL`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `YOUTUBE_API_KEY`, `CORS_ORIGINS`.

---

### Task 1: Repositório, base do backend e login por apelido + PIN

**Files:**
- Create: `.gitignore`, `backend/pyproject.toml`, `backend/app/{main,config,db,models,events,auth}.py`, `backend/tests/conftest.py`, `backend/tests/test_auth.py`

**Interfaces:**
- Produces:
  - `create_app() -> FastAPI`; `get_db() -> Iterator[Session]`; `Base`
  - `current_user(...) -> User` (dependency; lê `Authorization: Bearer <token>`)
  - Modelos: `User(id, nickname, nickname_lower unique, pin_hash, week_goal_days=4, in_ranking=False, failed_pins=0, locked_until: datetime|None, created_at)`, `AuthToken(token pk, user_id, created_at)`, `Event(id, user_id|None, kind, ok: bool, latency_ms|None, data: JSON, created_at)`
  - `log_event(db, kind: str, *, user_id: int|None=None, ok: bool=True, latency_ms: int|None=None, **data) -> None`
  - `POST /auth/enter {nickname, pin}` → 201 (novo) ou 200 (existente) `{token, user: {id, nickname}}`; 401 PIN errado; 429 bloqueado; 422 formato inválido
  - `GET /me` → `{id, nickname, week_goal_days, in_ranking}`
  - fixture `client` (TestClient com SQLite em memória) e `auth_headers(nickname="ana", pin="1234") -> dict`

- [ ] **Step 1:** `git init` na raiz. Criar `.gitignore` (`.env`, `__pycache__`, `.venv`, `node_modules`, `dist`, `*.db`). Em `backend/`, rodar `uv init --python 3.12` e `uv add fastapi uvicorn[standard] sqlalchemy psycopg[binary] pydantic-settings httpx google-genai`, depois `uv add --dev pytest`.
- [ ] **Step 2: Testes que falham** em `tests/test_auth.py`:
  - `test_new_nickname_creates_account`: POST `{"nickname":"Ana_1","pin":"1234"}` → 201, com `token` no corpo.
  - `test_same_nickname_any_case_logs_in`: depois de criar `Ana_1`, POST `{"nickname":"ana_1","pin":"1234"}` → 200 e o mesmo `user.id`.
  - `test_wrong_pin_401`: PIN `"9999"` → 401.
  - `test_lockout_after_5_wrong`: cinco PINs errados e depois o PIN certo → 429.
  - `test_invalid_formats_422`: apelido `"ab"`, apelido `"a b"`, PIN `"12a4"` e PIN `"12345"` → todos 422.
  - `test_me_requires_token`: GET `/me` sem token → 401; com token → 200 e `week_goal_days == 4`.
- [ ] **Step 3:** Rodar `cd backend && uv run pytest tests/test_auth.py -v` → espera FAIL.
- [ ] **Step 4:** Implementar.
  - PIN com `hashlib.pbkdf2_hmac('sha256', pin, salt, 200_000)`, guardado como `salt$hash`.
  - Token: `secrets.token_urlsafe(32)` salvo em `AuthToken`.
  - Bloqueio: 5 erros seguidos → `locked_until = now + 5 min`; acerto zera `failed_pins`.
  - `Base.metadata.create_all` no startup.
  - CORS a partir de `CORS_ORIGINS`, separado por vírgula.
  - `DATABASE_URL` padrão `sqlite:///./dev.db`.
- [ ] **Step 5:** Rodar `uv run pytest -v` → espera PASS.
- [ ] **Step 6:** Commit: `feat(backend): base FastAPI e login por apelido + PIN`.

---

### Task 2: Sessões de estudo, pontos e meta

**Files:**
- Create: `backend/app/study/rules.py`, `backend/app/study/router.py`, `backend/tests/test_rules.py`, `backend/tests/test_sessions_api.py`
- Modify: `backend/app/models.py` (adicionar `StudySession`), `backend/app/main.py` (incluir router)

**Interfaces:**
- Consumes: `current_user`, `get_db`, `log_event` (Task 1); `compute_streak` (Task 3, usado aqui só a partir da Task 3, ver Step 6)
- Produces:
  - `points_for_session(active_seconds: int, scored_today: int) -> int`
  - `goal_met(active_seconds: int, goal_minutes: int) -> bool`
  - `study_day(ended_at: datetime) -> date` (Belém)
  - Modelo `StudySession(id, client_id: str unique, user_id, topic, part_id|None, goal_minutes, started_at, ended_at, active_seconds, note|None, points, goal_met, day: date)`
  - `POST /sessions {client_id, topic, part_id?, goal_minutes, started_at, ended_at, active_seconds, note?}` → `{id, points, goal_met, streak_before, streak_after}`
  - `GET /sessions?topic=` → lista desc por `ended_at` `[{id, topic, part_id, day, active_seconds, goal_minutes, goal_met, points, note}]`
  - `PUT /me/settings {week_goal_days?: 1..7, in_ranking?: bool}`

- [ ] **Step 1: Testes que falham** em `tests/test_rules.py`:
  - `points_for_session(1200, 0) == 10`; `points_for_session(1199, 0) == 0`; `points_for_session(3600, 2) == 10`; `points_for_session(3600, 3) == 0`
  - `goal_met(1500, 25) is True`; `goal_met(1499, 25) is False`
  - `test_study_day_uses_belem_end_date`: `ended_at = datetime(2026,11,15,3,10,tzinfo=UTC)` (00:10 em Belém) → `date(2026,11,15)`; `datetime(2026,11,15,2,50,tzinfo=UTC)` → `date(2026,11,14)`
- [ ] **Step 2:** Rodar `uv run pytest tests/test_rules.py -v` → FAIL. Implementar `rules.py` → PASS.
- [ ] **Step 3: Testes de API que falham** em `tests/test_sessions_api.py`:
  - `test_conclude_awards_points`: sessão de 1500 s com meta 25 → `points == 10`, `goal_met is True`.
  - `test_fourth_scored_session_same_day_zero_points`: quatro sessões de 1300 s no mesmo dia → a quarta tem `points == 0`.
  - `test_conclude_is_idempotent`: o mesmo `client_id` enviado duas vezes → 200 nas duas, uma linha no banco e pontos contados uma vez.
  - `test_active_seconds_cannot_exceed_wall_time`: `active_seconds` maior que `ended_at - started_at` (+5 s de folga) → 422.
  - `test_history_filters_by_topic`.
- [ ] **Step 4:** Implementar o router. Contar `scored_today` como as sessões do usuário no mesmo `day` com `points > 0`. Registrar `log_event("session_concluded", ...)`. `streak_before` e `streak_after` retornam `0` até a Task 3 ligar a ofensiva.
- [ ] **Step 5:** `uv run pytest -v` → PASS.
- [ ] **Step 6:** Commit: `feat(backend): sessões, pontos e meta`.

---

### Task 3: Ofensiva com proteção e endpoint de progresso

**Files:**
- Create: `backend/app/progress/streak.py`, `backend/app/progress/router.py`, `backend/tests/test_streak.py`, `backend/tests/test_progress_api.py`
- Modify: `backend/app/study/router.py` (preencher `streak_before`/`streak_after`)

**Interfaces:**
- Produces:
  - `@dataclass StreakState(streak: int, freezes: int, saved_days: list[date], studied_today: bool)`
  - `compute_streak(studied: set[date], today: date) -> StreakState`
  - `week_days_count(studied: set[date], today: date) -> int` (segunda a domingo, contando até `today`)
  - `GET /progress` → `{streak, freezes, studied_today, saved_days: [date], studied_days: [date] (últimos 365), week_days, week_goal_days, total_points, week_points, minutes_by_topic: [{topic, minutes}], trails: [{trail_id, title, parts_done, parts_total}]}` (o campo `trails` fica `[]` até a Task 7)

- [ ] **Step 1: Testes que falham** em `tests/test_streak.py`. O algoritmo percorre do primeiro dia estudado até ontem: dia estudado → `streak += 1` e, se `streak % 7 == 0`, `freezes = min(2, freezes + 1)`; dia sem estudo → se `freezes > 0 and streak > 0`, consome uma proteção e marca o dia como salvo; senão, `streak = 0`. O dia de hoje só soma se tiver estudo e nunca quebra a ofensiva.
  - `compute_streak(set(), D).streak == 0`
  - três dias seguidos terminando ontem, sem estudo hoje → `streak == 3`, `studied_today is False`
  - os mesmos três dias + hoje → `streak == 4`, `studied_today is True`
  - dias 1–3 e 5, sem o 4 e sem proteção → `streak == 1`
  - 7 dias seguidos, falta o dia 8, estuda no 9 → `streak == 8`, `freezes == 0`, `saved_days == [dia 8]`
  - 21 dias seguidos → `freezes == 2` (limite)
  - `week_days_count`: estudos na segunda, na quarta e no domingo anterior, com `today` = quinta → `2`
- [ ] **Step 2:** `uv run pytest tests/test_streak.py -v` → FAIL. Implementar → PASS.
- [ ] **Step 3: Testes de API** em `tests/test_progress_api.py`:
  - `test_progress_after_sessions`: duas sessões hoje (topics "Cálculo" com 1500 s e "Física" com 600 s) → `studied_today`, `streak == 1`, `total_points == 10`, `minutes_by_topic` contém `{"topic":"Cálculo","minutes":25}`.
  - `test_session_returns_streak_change`: primeira sessão do dia → `streak_before == 0` e `streak_after == 1`; segunda sessão no mesmo dia → `1` e `1`.
- [ ] **Step 4:** Implementar o router e ligar `compute_streak` ao `POST /sessions`. → PASS.
- [ ] **Step 5:** Commit: `feat(backend): ofensiva com proteção e /progress`.

---

### Task 4: Frontend base, login, cronômetro e comemoração

**Files:**
- Create: `frontend/` (Vite React TS), `src/api/{client,types}.ts`, `src/theme/tokens.css`, `src/auth/{LoginPage.tsx,auth.ts}`, `src/timer/{timerState.ts,timerState.test.ts,TimerPage.tsx,Celebration.tsx}`, `src/App.tsx`

**Interfaces:**
- Consumes: `POST /auth/enter`, `GET /me`, `POST /sessions` (Tasks 1–3)
- Produces:
  - `api<T>(path: string, init?: RequestInit): Promise<T>`: base em `import.meta.env.VITE_API_URL`, envia o token de `localStorage["auth:token"]`; em 401 limpa o token e vai para `/entrar`.
  - `type TimerState = { clientId: string; topic: string; partId: number|null; goalMinutes: number; startedAt: number; pausedAt: number|null; pausedMs: number }`
  - `startTimer(topic, goalMinutes, partId, now): TimerState`, `pause(s, now)`, `resume(s, now)`, `activeSeconds(s, now): number`, `saveTimer(s|null)`, `loadTimer(): TimerState|null` (chave `"timer:v1"`)
  - Rotas: `/entrar`, `/` (Home, Task 5), `/estudar` (cronômetro; aceita `?topic=&part=`)

- [ ] **Step 1:** Criar o projeto com `npm create vite@latest frontend -- --template react-ts`, depois `npm i react-router-dom` e `npm i -D vitest`.
- [ ] **Step 2: Testes que falham** em `timerState.test.ts`:
  - `activeSeconds` 90 s depois do início → `90`
  - pausa em +60 s, retoma em +120 s e mede em +180 s → `120`
  - pausado em +60 s e medido em +300 s → `60`
  - `survives reload`: `saveTimer(s)` e depois `loadTimer()` devolve um objeto igual, e `activeSeconds` continua correto com o novo `now`
- [ ] **Step 3:** `npx vitest run` → FAIL. Implementar `timerState.ts` → PASS.
- [ ] **Step 4:** Implementar o `LoginPage` (apelido + PIN numérico com `inputMode="numeric"`, mensagens para 401 "PIN incorreto" e 429 "Muitas tentativas, espere 5 minutos").
- [ ] **Step 5:** Implementar o `TimerPage`:
  - campos de tema e meta (padrão 25);
  - Iniciar, Pausar/Retomar, Concluir; display atualizado a cada segundo a partir de `activeSeconds`;
  - salvar o estado a cada mudança;
  - ao Concluir, pedir a anotação (opcional), enviar `POST /sessions`, limpar o cronômetro e mostrar `Celebration` com "Ofensiva X → Y", os pontos ganhos e "Meta cumprida!" quando for o caso.
  O botão Concluir fica desabilitado enquanto a requisição estiver em andamento.
- [ ] **Step 6:** `tokens.css` com variáveis (`--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--ok`, `--warn`, `--radius`, `--space-*`), modo escuro via `prefers-color-scheme` e layout mobile-first.
- [ ] **Step 7:** Verificação manual: `uv run uvicorn app.main:app --reload` e `npm run dev`. Entrar, iniciar o cronômetro, recarregar a página no meio (o tempo continua), concluir e ver a comemoração.
- [ ] **Step 8:** Commit: `feat(frontend): login, cronômetro persistente e comemoração`.

---

### Task 5: Home e tela de Progresso + primeiro deploy

**Files:**
- Create: `src/home/HomePage.tsx`, `src/progress/{ProgressPage.tsx,Calendar.tsx}`, `render.yaml`, `frontend/vercel.json`
- Modify: `src/App.tsx`, `frontend/vite.config.ts` (PWA)

**Interfaces:**
- Consumes: `GET /progress`, `GET /sessions`, `PUT /me/settings`
- Produces: rotas `/` e `/progresso`

- [ ] **Step 1:** `HomePage`:
  - ofensiva em destaque, com o número e o ícone de proteção ×N;
  - aviso "Você ainda não estudou hoje — sua ofensiva está em risco" quando `!studied_today && streak > 0`;
  - "X de Y dias nesta semana";
  - botões "Estudar agora" e "Quero aprender…" (o segundo leva para a Task 7);
  - lista de trilhas (vazia por enquanto).
- [ ] **Step 2:** `Calendar.tsx`: grade estilo GitHub das últimas 20 semanas, com colunas por semana e linhas de segunda a domingo. Tem três estados: estudado (`--accent`), salvo por proteção (`--warn`) e vazio. Feito em CSS grid, sem biblioteca.
- [ ] **Step 3:** `ProgressPage`:
  - o calendário;
  - minutos por tema em barras horizontais CSS;
  - meta da semana editável (1 a 7);
  - pontos totais e da semana;
  - histórico por tema com as anotações;
  - progresso das trilhas, ainda vazio.
- [ ] **Step 4:** PWA: `npm i -D vite-plugin-pwa`, com manifest (`name` provisório "Estudo", `display: standalone`, ícones placeholder 192/512) e service worker que guarda só os assets estáticos, nunca a API.
- [ ] **Step 5: Deploy (antecipado para tirar o risco da frente).**
  - `render.yaml`: web service com `rootDir: backend`, build `pip install uv && uv sync --frozen`, start `uv run uvicorn app.main:app --host 0.0.0.0 --port $PORT`, `PYTHON_VERSION=3.12` e as variáveis da Task 0.
  - Na Vercel, `rootDir: frontend`, com `VITE_API_URL` apontando para o Render e `vercel.json` com rewrite para a SPA.
  - Pôr a URL da Vercel em `CORS_ORIGINS`.
- [ ] **Step 6:** Verificação: abrir a URL da Vercel no celular e no PC, entrar com o mesmo apelido e PIN nos dois, concluir uma sessão no celular e ver o progresso atualizado no PC. Instalar como app pelo Chrome do PC.
- [ ] **Step 7:** Commit: `feat: home, progresso, PWA e deploy`.

---

### Task 6: Clientes de IA e YouTube + geração de trilha em background

**Files:**
- Create: `backend/app/ai/{client,youtube}.py`, `backend/app/trails/{catalog,generate,router}.py`, `backend/tests/fakes.py`, `backend/tests/{test_catalog,test_generate,test_trails_api}.py`
- Modify: `backend/app/models.py`, `backend/app/main.py`

**Interfaces:**
- Produces:
  - `@dataclass QuizItem(question: str, options: list[str] (4), correct_index: int, explanation: str)`
  - `class AIClient(Protocol)`: `split_topic(topic: str, level: str) -> list[str]` (4–6 títulos) · `topic_quiz(topic: str, part: str, n: int) -> list[QuizItem]` · `video_quiz(youtube_url: str, part: str, n: int) -> list[QuizItem]` · `answer(question: str, topic: str|None) -> str`
  - `GeminiClient(api_key, model)`: implementa `AIClient` pedindo JSON (`response_mime_type="application/json"`); `video_quiz` passa a URL como `file_data`; timeout de 60 s (90 s em `video_quiz`). Levanta `AIError` quando o JSON vem inválido.
  - `@dataclass VideoHit(youtube_id, title, channel, duration_s)`; `class VideoSearch(Protocol)`: `search(query: str, max_results: int = 3) -> list[VideoHit]`; `YouTubeSearch(api_key)` faz `search.list` (`type=video`, `videoEmbeddable=true`, `relevanceLanguage=pt`, `videoDuration=medium`) e depois `videos.list` para obter a duração. Levanta `QuotaExceeded` em 403 de cota.
  - `normalize(s: str) -> str` (minúsculas, sem acento, espaços colapsados) · `match(q: str, titles: dict[int, str], limit=5) -> list[int]` (por sobreposição de palavras normalizadas, maior primeiro, ignorando zero)
  - Modelos: `Trail(id, title, topic_norm unique, level, status: generating|ready|failed, step: str, error|None, is_catalog, created_at)`, `Part(id, trail_id, order, title)`, `Video(id, part_id, youtube_id, title, channel, duration_s, analysis: pending|done|failed)`, `Exercise(id, part_id, video_id|None, source: topic|video, question, options JSON, correct_index, explanation)`
  - `generate_trail(trail_id: int, ai: AIClient, yt: VideoSearch, session_factory) -> None`. Etapas: `step="dividindo o tema"` → partes; `"buscando aulas"` → vídeos por parte; `"criando exercícios"` → 4 `topic_quiz` por parte; `status="ready"`. Registra eventos com a latência de cada etapa.
  - `analyze_videos(trail_id, ai, session_factory) -> None`: para cada vídeo `pending`, `video_quiz` com 4 questões. Se der certo, salva com `source="video"` e marca `done`; se der erro, marca `failed` e mantém os exercícios do assunto.
  - Dependencies `get_ai() -> AIClient`, `get_videos() -> VideoSearch`, sobrescritas nos testes com `FakeAI` e `FakeVideos`.
  - `GET /catalog?q=` → `[{trail_id, title}]` (só trilhas `ready`)
  - `POST /trails {topic: 3..120 chars, level: "vestibular"|"superior"|"livre"}` → se o `topic_norm` já existe, devolve a trilha existente; senão cria `generating` e agenda `generate_trail` e depois `analyze_videos` (BackgroundTasks). Resposta `{trail_id, status}`.
  - `GET /trails/{id}` → `{id, title, status, step, error, parts: [{id, order, title, videos: [{youtube_id, title, channel, duration_s}]}]}`

- [ ] **Step 1: Testes que falham**:
  - `test_catalog.py`: `normalize("  Cálculo   I ") == "calculo i"`; `match("calculo", {1:"Cálculo I — Limites", 2:"Física"})` → `[1]`.
  - `test_generate.py` (com fakes):
    - `test_happy_path_ready`: 4 partes, 3 vídeos cada, 4 exercícios por parte, `status == "ready"`.
    - `test_malformed_ai_json_retries_then_fails`: `split_topic` levanta `AIError` duas vezes → `status == "failed"`; uma vez só → `ready`.
    - `test_part_without_videos_still_ready`: busca vazia numa parte → a parte fica sem vídeos e `status == "ready"`.
    - `test_quota_marks_failed`: `QuotaExceeded` → `status == "failed"`, `error == "quota"`.
    - `test_video_analysis_failure_keeps_topic_exercises`.
  - `test_trails_api.py`:
    - `test_topic_length_validated`: `"ab"` e 121 caracteres → 422.
    - `test_same_topic_reuses_trail`: `"Cálculo I"` e depois `"calculo i"` → mesmo `trail_id`.
    - `test_catalog_only_ready`.
- [ ] **Step 2:** `uv run pytest -v` → FAIL. Implementar até PASS. Cada sessão de banco em background abre a própria `Session` via `session_factory`. Se o processo reiniciar no meio, a trilha fica presa em `generating`; nesse caso, no startup, marcar `generating` com mais de 10 min como `failed`.
- [ ] **Step 3:** Teste manual real (com as chaves da Task 0): `uv run python -c` chamando `GeminiClient.split_topic("Funções do 1º grau","vestibular")` e `YouTubeSearch.search("função afim aula")`. Conferir que os links abrem.
- [ ] **Step 4:** Commit: `feat(backend): geração de trilhas com Gemini e YouTube`.

---

### Task 7: Telas de trilha (criar ao vivo, estudar a parte, concluir parte)

**Files:**
- Create: `src/trails/{NewTrailPage,TrailPage}.tsx`, `backend/tests/test_parts_api.py`
- Modify: `backend/app/models.py` (`UserTrail(user_id, trail_id)`, `PartDone(user_id, part_id, done_at)`), `backend/app/trails/router.py`, `backend/app/progress/router.py` (preencher `trails`), `src/home/HomePage.tsx`, `src/progress/ProgressPage.tsx`

**Interfaces:**
- Produces:
  - `POST /trails/{id}/start` → inscreve o usuário (idempotente)
  - `GET /me/trails` → `[{trail_id, title, parts_done, parts_total}]`
  - `GET /trails/{id}` passa a incluir `done: bool` por parte para o usuário atual
  - `POST /parts/{id}/done` → 409 `{"detail":"Estude ao menos uma sessão nesta parte"}` se não houver sessão com esse `part_id`; senão 200
  - Rotas: `/aprender` (NewTrailPage), `/trilha/:id` (TrailPage)

- [ ] **Step 1: Testes que falham** em `test_parts_api.py`: `test_done_requires_session` (409 sem sessão, 200 depois de uma sessão com `part_id`) e `test_progress_lists_trail_counts` (`parts_done == 1`, `parts_total == 4`).
- [ ] **Step 2:** Implementar no backend → PASS.
- [ ] **Step 3:** `NewTrailPage`:
  - campo "Quero aprender…" e nível;
  - enquanto digita (com debounce de 300 ms), mostra sugestões do `/catalog`;
  - ao enviar, faz `POST /trails` e consulta `GET /trails/{id}` a cada 2 s, mostrando o `step` como etapas marcadas ("Dividindo o tema ✓ · Buscando aulas…");
  - em `failed`, mostra "Não deu para montar essa trilha agora" + 3 temas do catálogo como atalho;
  - para de consultar depois de 120 s e trata como falha.
- [ ] **Step 4:** `TrailPage`:
  - barra de progresso;
  - lista de partes, cada uma com os vídeos (iframe `youtube-nocookie.com/embed/{id}` carregado só quando o aluno abre o vídeo) e o botão "Estudar esta parte", que leva a `/estudar?topic=<título da trilha>&part=<id>`;
  - botão "Concluí esta parte", que trata o 409 com a mensagem do servidor e, quando dá certo, oferece "Fazer exercícios" (Task 8);
  - parte sem vídeos mostra "Nenhuma aula encontrada para esta parte".
- [ ] **Step 5:** Home e Progresso passam a listar as trilhas com a barra de progresso.
- [ ] **Step 6:** Verificação manual: criar "Funções do 1º grau" ao vivo, ver as etapas, estudar uma parte, concluir e ver o progresso subir.
- [ ] **Step 7:** Commit: `feat: criar e estudar trilhas`.

---

### Task 8: Exercícios de fixação

**Files:**
- Create: `backend/app/exercises/router.py`, `backend/tests/test_exercises_api.py`, `src/trails/QuizPage.tsx`
- Modify: `backend/app/models.py` (`Attempt(id, user_id, exercise_id, choice, correct, created_at)`)

**Interfaces:**
- Produces:
  - `GET /parts/{id}/quiz?n=4` → `[{id, question, options, source}]`, sem `correct_index`; dá preferência a `source="video"` quando existir
  - `POST /exercises/{id}/answer {choice: 0..3}` → `{correct, correct_index, explanation}`; registra `Attempt` e `log_event("quiz_answer")`; **não mexe em pontos**
  - Rota `/trilha/:id/parte/:partId/exercicios`

- [ ] **Step 1: Testes que falham**:
  - `test_quiz_hides_answer`: nenhum item da resposta tem a chave `correct_index`.
  - `test_answer_does_not_change_points`: `total_points` do `/progress` é o mesmo antes e depois de responder certo.
  - `test_prefers_video_exercises`.
- [ ] **Step 2:** Implementar → PASS.
- [ ] **Step 3:** `QuizPage`:
  - uma questão por vez;
  - ao responder, mostra certo ou errado e a explicação;
  - no fim, "Você acertou X de N";
  - rótulo fixo "Gerado por IA — confira no seu material".
- [ ] **Step 4:** Commit: `feat: exercícios de fixação`.

---

### Task 9: Catálogo de temas populares

**Files:**
- Create: `backend/scripts/seed_catalog.py`, `backend/scripts/catalog_topics.txt`

**Interfaces:**
- Consumes: `generate_trail`, `analyze_videos`, `GeminiClient`, `YouTubeSearch` (Task 6)

- [ ] **Step 1:** `catalog_topics.txt` com 12 temas, um por linha, no formato `nível|tema`. Por exemplo: `vestibular|Funções do 1º grau`, `vestibular|Leis de Newton`, `vestibular|Redação ENEM: estrutura dissertativa`, `vestibular|Estequiometria`, `vestibular|Brasil República`, `superior|Limites e derivadas`, `superior|Lógica de programação`, `superior|Estruturas de dados: listas e pilhas`, `superior|Banco de dados: SQL básico`, `superior|Estatística descritiva`, `livre|Inglês: present perfect`, `livre|Excel básico`.
- [ ] **Step 2:** O script `uv run python -m scripts.seed_catalog` lê o arquivo e, para cada tema, cria a `Trail` com `is_catalog=True`, roda `generate_trail` e `analyze_videos` em sequência, pula temas que já estão `ready` e imprime `tema: status (n vídeos analisados)`. Tem uma pausa de 5 s entre os temas para respeitar o limite por minuto do plano grátis.
- [ ] **Step 3:** Rodar contra o banco de produção (`DATABASE_URL` do Neon/Supabase). Esperado: todos `ready`; a análise dos vídeos pode ficar parcial por causa da cota de 8 h/dia.
- [ ] **Step 4:** Commit: `feat: catálogo de temas populares`.

---

### Task 10: Assistente de dúvidas e ranking (se der tempo)

**Files:**
- Create: `backend/app/assistant/router.py`, `backend/app/ranking/router.py`, `backend/tests/{test_assistant_api,test_ranking_api}.py`, `src/assistant/AssistantPanel.tsx`, `src/ranking/RankingPage.tsx`, `backend/scripts/seed_demo_users.py`

**Interfaces:**
- Produces:
  - `POST /assistant {question: 1..1000 chars, topic?: str}` → `{answer}`; limite de **20 por usuário por dia** (429 depois disso); erro da IA → 503 `{"detail":"Assistente indisponível, tente de novo"}`; `log_event("assistant", ok, latency_ms)`
  - `GET /ranking` → top 20 da semana por `week_points` entre `in_ranking=True`, `[{nickname, week_points, streak}]`, mais a posição do usuário (se ele participa)

- [ ] **Step 1: Testes que falham**:
  - `test_assistant_limit_20`: a 21ª pergunta no dia → 429.
  - `test_assistant_ai_error_503`.
  - `test_ranking_only_opt_in`: usuário com `in_ranking=False` não aparece.
- [ ] **Step 2:** Implementar → PASS.
- [ ] **Step 3:** `AssistantPanel` como painel deslizante, aberto por um botão na `TimerPage` e na `TrailPage`. Não bloqueia o cronômetro e tem estado de carregamento, botão "tentar de novo" e o rótulo de IA. `RankingPage` com um toggle "Participar do ranking".
- [ ] **Step 4:** `seed_demo_users.py`: 6 usuários de exemplo com sessões nos últimos 10 dias e `in_ranking=True`.
- [ ] **Step 5:** Commit: `feat: assistente de dúvidas e ranking semanal`.

---

### Task 11: Identidade visual e acabamento (checkpoint com o Kaio)

- [ ] **Step 1:** Montar 2 ou 3 direções visuais (nome provisório, paleta e a tela de Progresso + Home em cada uma) e mostrar ao Kaio. **Esperar a escolha.**
- [ ] **Step 2:** Aplicar a direção escolhida em `tokens.css`, no manifest da PWA (nome e ícones) e na tela de comemoração.
- [ ] **Step 3:** Verificação: abrir todas as telas em 360 px de largura e no desktop, nos modos claro e escuro, e conferir que nada estoura a largura e que o texto tem contraste legível.
- [ ] **Step 4:** Commit: `style: identidade visual`.

---

### Task 12: Ensaio da demo

- [ ] **Step 1:** No link de produção, fazer o roteiro completo pelo celular:
  1. entrar;
  2. criar um tema novo ao vivo;
  3. abrir um tema do catálogo;
  4. estudar uma parte;
  5. concluir e ver a ofensiva;
  6. responder os exercícios;
  7. ver o Progresso;
  8. (se pronto) assistente e ranking.
  Anotar e corrigir o que falhar.
- [ ] **Step 2:** Criar na conta da demo um histórico de cerca de 10 dias (pelo `seed_demo_users.py` ou por um usuário específico) para o calendário e a ofensiva não aparecerem vazios.
- [ ] **Step 3:** Escrever `docs/demo-checklist.md`:
  - abrir a URL da API uns 5 min antes para acordar o Render;
  - deixar o tema reserva do catálogo aberto numa aba;
  - anotar o apelido e o PIN da conta da demo.
- [ ] **Step 4:** Commit: `docs: checklist da demo`.
