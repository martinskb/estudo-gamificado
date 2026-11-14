# Lume

**Aprenda qualquer coisa, um disco de cada vez.**

O Lume é um app web (PWA) que ajuda a criar **constância** para aprender: da matéria da faculdade à cronologia da Marvel. Cada tema que a pessoa está aprendendo vira um álbum na estante: capa, disco que gira enquanto o cronômetro de foco roda, ofensiva de dias seguidos e um disco que vai de vinil a diamante com as horas focadas. Se quiser, o Lume monta uma trilha com os melhores vídeos gratuitos do YouTube e exercícios de fixação gerados por IA.

Projeto da disciplina Tópicos Integradores — Análise e Desenvolvimento de Sistemas, UNAMA (Belém, PA). O pré-projeto original está em [`ideia/`](ideia/).

- **App:** https://lume-foco.vercel.app
- **Código:** https://github.com/martinskb/lume
- **API:** https://estudo-api-1k65.onrender.com (plano grátis: dorme após 15 min sem uso e leva ~1 min para acordar)

## O que ele faz

| | |
|---|---|
| **Estante** | Cada tema é um álbum (foto em duotone nas cores da capa, ou capa automática) com o disco aparecendo, em prateleiras Aprendendo e Concluídos. Segurar o álbum (ou botão direito) abre o menu do app: tocar, trocar/tirar foto, concluir, apagar. Criar tema é instantâneo, sem IA, pelo botão + do meio da barra. |
| **Músicas para estudar** | No Perfil, a pessoa adiciona os próprios arquivos de música; ficam só no aparelho e tocam baixinho enquanto o disco gira. |
| **Foco** | O play do tema transforma a tela numa sala à meia-luz: o toca-discos em ângulo sobre a mesa, o disco girando enquanto o cronômetro roda e o braço avançando pelos sulcos até a meta (15/25/45/60 min ou outro valor pelo lápis). Pausar, concluir e descartar ficam ali mesmo; na trilha, o toca-discos fica junto das aulas. Sobrevive a recarregar a página ou bloquear o celular. |
| **Constância** | Ofensiva de dias seguidos com proteção (+1 a cada 7 dias, até 2), pontos (10 por sessão de 20 min+, até 3 por dia), meta de dias por semana. |
| **Níveis do disco** | Por tema: Vinil → Prata (1 h) → Ouro (5 h) → Platina (15 h) → Diamante (40 h); o acabamento do disco mostra o nível, com animação e som ao subir. |
| **Trilha com vídeos** (opcional) | A IA divide o tema em partes; cada parte recebe vídeos reais do YouTube e exercícios gerados a partir do conteúdo do vídeo. |
| **Assistente** | Ícone discreto no canto do foco e da trilha; abre um campo simples ("Qual a sua dúvida?") por cima da tela, com fórmulas desenhadas (KaTeX). |
| **Progresso e ranking** | Calendário de dias estudados, minutos por tema, histórico; ranking semanal opcional por apelido. |
| **Perfil** | Avatar com inicial, trocar apelido, números gerais, sons liga/desliga, músicas para estudar e "Instalar o app" (abre em tela cheia). |

Visual "vinil": creme ou preto quente com âmbar, títulos em Fraunces. Tema claro/escuro segue o dispositivo (o foco é sempre a sala escura). Funciona no celular (barra embaixo com o + no meio) e no computador (barra discreta no topo, toca-discos ao lado da estante).

## Como é feito

```
frontend/  React 19 + Vite + TypeScript, PWA (vite-plugin-pwa)   → Vercel
backend/   FastAPI + SQLAlchemy 2 (Python 3.12, uv)              → Render
banco      Postgres (Neon) em produção, SQLite local e nos testes
IA         Gemini (plano grátis, troca de modelo quando a cota de um acaba)
vídeos     YouTube Data API v3 (só links de busca real; a IA nunca inventa link)
```

Pastas principais:

```
backend/app/
  auth.py            entrada por apelido + PIN (bloqueio após 5 erros)
  study/             sessões, pontos e meta
  progress/          ofensiva com proteção, /progress
  topics/            estante: temas, capas, níveis do disco, migração dos dados antigos
  trails/            trilhas (geração em segundo plano), catálogo
  exercises/         exercícios de fixação
  assistant/         assistente de dúvidas
  ranking/  profile/
  ai/                cliente do Gemini (com defesas contra prompt injection) e do YouTube
backend/scripts/     seed_catalog, seed_demo_users, seed_demo_account, dev_fake
frontend/src/
  home/  topics/  timer/  trails/  progress/  ranking/  profile/  auth/
  api/               cliente HTTP + cache stale-while-revalidate
  ui/                skeleton, dicas que aparecem uma vez, sons, confirmação em dois toques
  local/             fotos das capas e músicas guardadas só no aparelho (IndexedDB)
  vinyl/             disco (acabamento pelo nível), capa com disco e toca-discos
  theme/             tokens de cor (claro/escuro) e estilos
```

## Rodar localmente

Requisitos: Python 3.12+ com [uv](https://docs.astral.sh/uv/) e Node 20+.

**Sem chaves (IA e YouTube simulados, banco local):**

```bash
cd backend && uv sync && uv run python -m scripts.dev_fake   # API em :8000, banco dev_fake.db
cd frontend && npm install && npm run dev                    # app em :5173
```

**Com as APIs reais:** copie `backend/.env.example` para `backend/.env`, preencha e rode `uv run uvicorn app.main:app --reload`.

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | Postgres (Neon) — local pode ficar `sqlite:///./dev.db` |
| `GEMINI_API_KEY` | chave do Google AI Studio |
| `GEMINI_MODEL` | lista em ordem de preferência, separada por vírgula |
| `YOUTUBE_API_KEY` | YouTube Data API v3 |
| `CORS_ORIGINS` | endereços do site, separados por vírgula |
| `VITE_API_URL` (frontend) | endereço da API |

## Testes

```bash
cd backend && uv run pytest -q      # ~180 testes
cd frontend && npx vitest run       # ~60 testes
```

## Scripts úteis (`backend/`)

| Comando | O que faz |
|---|---|
| `uv run python -m scripts.seed_catalog` | gera os temas do catálogo (`scripts/catalog_topics.txt`) |
| `uv run python -m scripts.seed_demo_users` | usuários de exemplo para o ranking |
| `uv run python -m scripts.seed_demo_account <apelido> <AAAA-MM-DD> "<trilha>" …` | histórico para a conta da apresentação |

## Publicação

- **Render:** Blueprint a partir de `render.yaml` (pasta `backend`); variáveis acima no painel.
- **Vercel:** projeto com raiz `frontend`, preset Vite, `VITE_API_URL` apontando para a API. Domínio: `lume-foco.vercel.app` (o antigo `estudo-gamificado-two.vercel.app` continua respondendo).
- **CORS:** `CORS_ORIGINS` no Render precisa listar cada domínio do site, sem barra no fim.
- **Trocar de domínio apaga, para quem usa, o login, as fotos das capas e as músicas** (o navegador guarda isso por domínio). Evitar depois que o piloto começar.
- Cada `git push` na `main` publica os dois.

## Privacidade e segurança

- Dados mínimos (LGPD): apelido e PIN, sem nome, e-mail ou matrícula. Fotos das capas e músicas ficam só no aparelho da pessoa (o servidor não guarda imagens nem áudio).
- Nada pessoal vai para a IA: só o texto do tema, da pergunta e a URL do vídeo.
- Prompt injection: texto de fora entra como dado cercado por marcadores aleatórios; tema que não é para aprender é recusado; partes, exercícios e respostas não podem ter links ou contatos; HTML vindo da IA nunca é executado.
- Chaves só no servidor; o cache do app é apagado ao sair da conta.

## Documentação

- [Design (spec)](docs/superpowers/specs/2026-11-13-estudo-gamificado-design.md) — intenção, decisões e o que mudou desde o pré-projeto
- [Plano da Fase 1](docs/superpowers/plans/2026-11-13-estudo-gamificado-fase1.md)
- [Checklist da demo](docs/demo-checklist.md)

## Próximos passos

- **Contas:** senha de verdade (no lugar do PIN) e **Conectar com Google** opcional, que libera ranking e foto de perfil. Detalhes no design.
- **Piloto:** modo semana de base, códigos de participante e exportação CSV dos indicadores.
- **Servidor sempre acordado (antes do piloto):** cadastrar `https://estudo-api-1k65.onrender.com/health` num monitor gratuito (ex.: UptimeRobot) com checagem a cada 5 min. O Render grátis dorme após 15 min sem acesso; as 750 h/mês do plano cobrem o mês inteiro ligado. Bônus: avisa por e-mail se o servidor cair. Mais robusto, se precisar: Google Cloud Run (mesmo código, acorda em segundos).
- **Exercícios** a partir de PDF/slides do aluno.
- **Play Store (quando decidirem publicar):** gerar o APK/AAB como TWA com o [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) a partir do site, publicar `/.well-known/assetlinks.json` na Vercel (para abrir sem barra de endereço) e criar a conta de desenvolvedor (US$ 25, uma vez). Até lá, no Android o botão "Instalar" do app já gera um app de verdade (WebAPK); no iPhone, o convite ensina a adicionar à Tela de Início.
