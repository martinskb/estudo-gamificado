# Estudo Gamificado — Design (protótipo web)

Data: 2026-11-13 · Base: `ideia/AV1 TI EstudoGamificado.pdf` (pré-projeto), com as mudanças combinadas na conversa.

## 1. Intenção e porquê

Um organizador de estudo **para qualquer tema** (vestibular a ensino superior), para quem estuda sozinho e não tem dinheiro para cursinho. O app **não tem conteúdo próprio**: ele organiza o estudo e aproveita o que já existe de graça na internet.

O núcleo, inspirado no Ziggur, é **cronômetro + estatísticas / progresso visível**. Em volta disso:
- o aluno diz "quero aprender X" e o app monta uma **trilha** com **aulas gratuitas do YouTube** encontradas por busca;
- ao fim de cada parte, **exercícios de fixação simples** (sem nota);
- **assistente de IA** para dúvidas, sob demanda;
- **gamificação** leve (pontos, sequência, ranking opcional) para incentivar constância.

Contexto acadêmico: disciplina Tópicos Integradores (ADS/UNAMA). **Demonstração ao vivo na segunda 16/11/2026 às 8h** (sem slides; mostrar o sistema funcionando, funcionalidades e problema). Artigo final/banner e piloto com voluntários até **30/11/2026**.

## 2. Objetivos, não-objetivos, anti-objetivos

**Objetivos**
- Demo de segunda: fluxo completo funcionando num link público, no celular e no PC.
- Até 30/11: app estável para um piloto curto com 10–20 voluntários e dados exportáveis para o artigo.

**Não-objetivos**
- Hospedar aulas, cursos, banco de questões ou provas.
- Avaliar aprendizagem ou dar nota. Exercícios são fixação opcional.
- App nativo (Android/iOS) ou app desktop separado — o "desktop" é a PWA instalada.
- Notificações push.
- Antifraude do cronômetro (tempo é autodeclarado, como o PDF já admite).

**Anti-objetivos** (falharia mesmo funcionando)
- Virar "plataforma de curso" que esconde o cronômetro/estatísticas atrás de conteúdo.
- Mostrar **link de vídeo inventado** (IA "lembrando" vídeos). Todo link vem de busca real.
- Pontos dependerem de acerto em exercício gerado por IA (um erro da IA prejudicaria o aluno).
- Demo de segunda travar esperando IA ao vivo.

## 3. Restrições

- Prazo: ~2,5 dias até a demo. Uma pessoa (Kaio) construindo com o Claude.
- Custo zero: só planos gratuitos.
- PCs do grupo fracos: nada de emulador; tudo testável no navegador.
- LGPD (do PDF): dados mínimos; identificação por apelido/código; **nome, matrícula e contato nunca vão para a API de IA**.
- O PDF dizia "sem geração automática de avaliações". Os exercícios mudam isso → no artigo, tratar como "fixação opcional, sem nota".

## 4. Abordagens consideradas

| | Abordagem | Prós | Contras |
|---|---|---|---|
| **A (escolhida)** | React (Vite) PWA na Vercel + FastAPI (Python) no Render + Postgres gerenciado (Supabase ou Neon) | Mantém o Python/FastAPI do PDF; servidor sem limite de tempo por requisição (análise de vídeo pode levar 30–90 s); código fácil de explicar | Dois deploys; Render free dorme após 15 min (≈30–60 s para acordar) |
| B | Next.js full-stack na Vercel + Supabase | Um código, um deploy, não dorme | Abandona Python; limite de tempo das funções arrisca a análise de vídeo |
| C | React + Supabase (auth/db/edge functions) | Mínimo de backend | Lógica espalhada no painel; também tem limite de tempo; difícil de explicar no artigo |

Kaio escolheu **A**.

## 5. Decisões já tomadas

**Plataforma**
- App web responsivo, instalável como **PWA** (serve de "versão desktop").
- Frontend React + Vite (Vercel). Backend FastAPI (Render, plano grátis). Banco **Postgres gerenciado gratuito** — não SQLite, porque o disco do Render free é apagado a cada reinício.
- Chaves (Gemini, YouTube) só no servidor.

**IA e busca**
- **Gemini API, plano gratuito** (chave do Google AI Studio). O plano de estudante do Google (assinatura do app Gemini) **não** aumenta a cota da API. Créditos de teste do Google Cloud ficam como opção para o piloto, não para segunda.
- **YouTube Data API v3** (grátis, ~100 buscas/dia): busca real de vídeos. Resultados guardados por tema/parte para economizar cota.
- Exercícios **a partir do vídeo**: Gemini recebe a URL pública do YouTube e gera as questões do conteúdo da aula. Limite grátis: 8 h de vídeo/dia, só vídeos públicos. Questões geradas **uma vez por vídeo e guardadas** (reutilizadas por todos). Se falhar, gera pelo **assunto da parte** da trilha.

**Catálogo de temas populares pré-gerados** *(ideia do Kaio)*
- Antes da demo, gerar e guardar no banco **~10–15 temas famosos** (ex.: tópicos de ENEM, cálculo, programação), cada um com trilha, vídeos e **análise dos vídeos pelo Gemini + exercícios** já prontos.
- Ao digitar um tema, o app sugere temas do catálogo parecidos; escolher um é instantâneo. Tema fora do catálogo é gerado na hora.
- Temas novos gerados por usuários também entram no cache e ficam reutilizáveis. *(decisão do Claude: escolha do catálogo e a forma de casar o texto digitado com o catálogo ficam com quem constrói.)*

**Cronômetro**
- Guarda o **horário de início** (e pausas) em vez de contar em memória — o navegador do celular congela a aba quando a tela apaga. A sessão sobrevive a bloquear o celular e a recarregar a página.

**Gamificação (do PDF)**
- 10 pontos por sessão concluída com **≥ 20 min**, no máximo **3 sessões pontuadas por dia**. Sessões menores são registradas sem pontos.
- Acertar exercício **não** dá pontos.
- "Dias estudados nesta semana" (conversa com o indicador de constância).
- Ranking semanal **opcional**, por apelido. Quem não entra continua vendo seu próprio progresso.

**Ofensiva** *(pedido do Kaio, mecânica inspirada no Duolingo — nome e visual próprios, sem copiar marca/mascote)*
- Contador de dias seguidos em destaque na tela inicial; estende com qualquer sessão concluída no dia.
- Tela de comemoração ao concluir sessão: "ofensiva 5 → 6".
- **Proteção da ofensiva**: ganha 1 a cada 7 dias seguidos, máximo 2 guardadas, usada automaticamente quando perde um dia.
- Aviso dentro do app "você ainda não estudou hoje" (sem push).
- Calendário de progresso marca dias da ofensiva e dias salvos por proteção.

**Social simples** *(pedido do Kaio, aprovado como proposto)*
- Seguir colegas por apelido ou código/link de convite.
- Lista de amigos: ofensiva de cada um + minutos na semana.
- **Cutucar** amigo que ainda não estudou hoje (aviso dentro do app).
- **Ranking entre amigos** como aba ao lado do ranking geral opcional.
- Novidade em relação ao PDF → citar no artigo.

**Entrada** *(detalhe = decisão do Claude)*
- Apelido + **PIN de 4 dígitos** escolhido no primeiro acesso. Sem e-mail, sem senha longa. Mesmo apelido + PIN entra em outro aparelho (celular e PC). Apelido já existente com PIN errado → recusado.
- Código de participante (piloto) é só um rótulo ligado à conta, não credencial.

**Meta** *(decisão do Claude)*
- **Meta por sessão, em minutos**, definida pelo aluno ao iniciar (padrão 25), vale para sessão livre e de trilha. "Meta cumprida" = tempo estudado (sem pausas) ≥ meta. É isso que o CSV conta como metas previstas/cumpridas.
- **Meta da semana = número de dias de estudo** (padrão 4), definida pelo aluno; aparece na tela de Progresso.

**Regras de contagem** *(decisão do Claude)*
- Tempo da sessão **exclui pausas**; os 20 min dos pontos usam esse tempo.
- **Dia estudado** = qualquer sessão concluída naquele dia (com ou sem pontos), fuso America/Belem. Vale para sequência, calendário e "dias na semana" — igual ao indicador "dias com estudo" do PDF.
- **Parte da trilha concluída** = aluno marca "concluí esta parte" (liberado após ao menos 1 sessão nela). Ao marcar, os exercícios são oferecidos.

## 6. O que o usuário faz (fluxos)

1. **Entrar**: digita apelido → entra.
2. **Novo tema**: "Quero aprender ___" (+ nível opcional: vestibular / superior / livre). IA divide em **4–6 partes**; para cada parte o servidor busca **~3 vídeos** no YouTube (idioma pt, duração média/longa). O tema vira um "livro" com barra de progresso.
3. **Estudar**: abre uma parte → vídeo embutido + **cronômetro** ligado àquela parte (iniciar / pausar / concluir) → anotação curta → sessão salva, pontos aplicados.
   - Também dá para fazer **sessão livre** (só tema + meta em minutos, sem trilha), como no PDF.
4. **Fixar**: ao concluir a parte, 3–5 questões de múltipla escolha com explicação da resposta. Opcional.
5. **Dúvida**: botão de assistente → pergunta → resposta (marcada como gerada por IA, com aviso para conferir no material). Assíncrono, não bloqueia o cronômetro; limite de perguntas por dia; erro de API não afeta o resto do app.
6. **Progresso** (tela de destaque): calendário de dias estudados (estilo GitHub), minutos por tema, meta da semana, progresso de cada trilha, pontos, sequência, histórico de sessões por tema com anotações.
7. **Ranking**: semanal, opcional, por apelido.

## 7. Fases e escopo

### Fase 1 — demo de segunda 16/11 8h
**Obrigatório**
- Entrar por apelido.
- Criar tema → trilha gerada pela IA → vídeos reais do YouTube por parte.
- Cronômetro (com início guardado), pausa, conclusão, anotação; sessão livre.
- Pontos, **ofensiva com proteção**, dias na semana.
- Tela de Progresso/Estatísticas caprichada (é o coração do app).
- Exercícios por parte (pelo assunto da parte, no mínimo).
- Deploy público funcionando no celular e no PC; PWA instalável.

**Se der tempo**
- Exercícios pelo conteúdo do vídeo (Gemini + URL).
- Assistente de dúvidas.
- Ranking semanal com alguns usuários de exemplo.

- Registro de eventos desde o primeiro dia (uso do assistente, latência e falhas de IA/YouTube), para o CSV do piloto ter dados completos.

**Criação ao vivo na demo** (Kaio confirmou que vão criar um tema novo na frente da turma)
- Geração em etapas com tela de progresso ("dividindo o tema… buscando aulas…"), limite de tempo por etapa.
- Exercícios do tema novo: gerados pelo assunto da parte (rápido); análise do vídeo roda em segundo plano e substitui quando ficar pronta.
- Plano B: se Gemini/YouTube falhar ou estourar o tempo, mensagem clara + atalho para um tema do catálogo.

**Preparação da demo**: catálogo de temas populares já gerado; abrir o servidor uns minutos antes (cold start).

### Fase 2 — até 30/11
A semana de base começa **logo após a demo de 16/11**, então a ordem é:

**Primeiro (16–17/11)**
- Modo **semana de base** (registro manual sem cronômetro/pontos/ranking).
- Códigos de participante.
- Página de administração com **exportação CSV** dos indicadores (dias com estudo, sessões, metas previstas/cumpridas, minutos, uso da IA, falhas).

**Antes da semana de uso do piloto** *(decisão do Claude: o social precisa estar pronto quando os voluntários começarem a usar o app, não na semana de base)*
- Social simples (seguir, lista de amigos, cutucar, ranking entre amigos). Se sobrar tempo no fim de semana, entra já na demo.

**Depois**
- Itens "se der tempo" que ficarem de fora.
- **Exercícios a partir de PDF/slides (.pptx) do aluno**: extrai o texto, gera questões, **não guarda o arquivo**; aviso de que o texto vai para a IA. PDF escaneado fica fora.
- "Esconder vídeo ruim" → traz outro.
- "Reportar questão errada".

## 8. Fora do escopo por enquanto
Comunidade além do social simples (fóruns, ligas, grupos); notificações; OCR de PDF escaneado; antifraude; app nativo.

## 9. Riscos conhecidos
- **Cronograma do piloto**: 7+7 dias não cabem entre 16 e 30/11. Sugestão: encurtar para 4–5 dias cada fase ou começar a linha de base por formulário já. (Decisão do grupo, fora do código.)
- Cotas grátis (Gemini, YouTube) — mitigado por cache e fallback.
- Gemini grátis pode usar os dados para melhorar produtos do Google → só citar no artigo; nada pessoal é enviado.
- Respostas/questões da IA podem estar erradas → rótulo "gerado por IA", sem pontos por acerto.

## 10. Deixado para quem constrói
Modelo de dados exato, rotas da API, biblioteca de UI/gráficos, prompts, qual modelo Gemini (um Flash do plano grátis, conferir no AI Studio), qual Postgres (Supabase ou Neon), estrutura de pastas, testes.
