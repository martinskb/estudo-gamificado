# Roteiro da demo — segunda 16/11, 8h

Sem slides: mostrar o app de verdade (pedido do professor). Projetar o **computador** em tela
cheia; mostrar o **celular** uma vez, para provar que é o mesmo app instalado.

**Site:** https://lume-foco.vercel.app · **API:** https://estudo-api-1k65.onrender.com

## Na véspera
- [ ] Gravar a tela (1–2 min) fazendo o roteiro inteiro: é o plano B se a internet da sala cair.
- [ ] Conta da apresentação com histórico (ofensiva, sessões, um tema perto de subir de nível).
      Apelido e PIN anotados fora deste arquivo.
- [ ] Uma foto bonita no celular para trocar a capa ao vivo.
- [ ] Uma ou duas músicas calmas adicionadas no Perfil (no aparelho da apresentação).
- [ ] Conferir que o catálogo tem os temas que vão aparecer (ex.: "Leis de Newton", "Python básico").

## 10 minutos antes
- [ ] Abrir https://estudo-api-1k65.onrender.com/health → `{"ok":true}` (o monitor deve manter acordado; se demorar, espere até 1 min).
- [ ] Entrar no PC e no celular com a conta da apresentação.
- [ ] Som do PC ligado (sons de conquista e música).
- [ ] Deixar numa aba a trilha reserva "Leis de Newton".

## Roteiro (~8 min)

1. **Problema** (30 s, com o app aberto na Estante)
   > "Muita gente começa a estudar e não mantém a rotina. Conteúdo bom já existe de graça na
   > internet; falta constância e ver o próprio progresso. O Lume organiza o estudo de qualquer
   > tema e transforma o esforço em progresso visível."

2. **Entrar** (20 s): só apelido + PIN — sem e-mail nem dados pessoais (LGPD).

3. **Estante** (40 s): cada tema é um álbum; o disco aparecendo mostra o nível
   (Vinil → Prata → Ouro → Platina → Diamante, pelas horas de foco). Ofensiva no topo.
   **Segurar** um álbum (ou botão direito) → menu do app: tocar, trocar foto, concluir, apagar.

4. **Tema e foco** (2 min) — o coração do app
   - Abrir o tema → capa com o disco, barra "Ouro em 2 h…", metas 15/25/45/60 ou o lápis.
   - **Play** → a tela vira a sala: o disco vai para o toca-discos e gira = cronômetro;
     o braço avança pelos sulcos até a meta. A música toca baixinho.
     > "O tempo é calculado pelo horário de início: funciona com a tela bloqueada e sem internet."
   - Pausar (o braço sai, o disco para) → retomar.
   - Ícone da dúvida → pergunta → resposta aparecendo em ~1 s ("Gerado por IA, confira").
   - Mostrar o **aviso de meta cumprida** com uma meta curta (lápis → 1 min), ou explicar.
   - **Concluir** → anotação → comemoração: o disco volta para a capa, ofensiva **N → N+1**, pontos.

5. **Trilha com vídeos** (1 min 30 s)
   - "Lado A · continuar faixa…" → faixas com **vídeos reais do YouTube** (a IA nunca inventa link)
     e **exercícios de fixação** criados a partir do vídeo (sem nota, não valem pontos).
   - Ao vivo: "+" → novo tema → "Montar trilha com vídeos" (mostra as etapas: dividindo, buscando
     aulas, criando exercícios). **Plano B:** abrir um tema do catálogo, que abre na hora.

6. **Progresso e ranking** (40 s): calendário de dias estudados (com o dia salvo pela proteção),
   minutos por tema, meta da semana; ranking semanal **opcional** por apelido.

7. **Perfil e celular** (40 s): músicas para estudar (só no aparelho), instalar o app;
   pegar o celular e mostrar o mesmo app instalado.

8. **Fechamento** (30 s)
   > "Do pré-projeto, mantivemos metas, cronômetro, pontos, ofensiva, ranking opcional e IA sob
   > demanda. Mudamos de Flutter para um app web instalável — um link roda no celular e no PC —
   > e ampliamos para qualquer tema, com trilhas de vídeos gratuitos. Os resultados vêm no piloto."

## Se algo der errado ao vivo
| Problema | O que fazer |
|---|---|
| API demorando (servidor dormindo) | Falar do problema/estante enquanto acorda; ou mostrar a gravação |
| Criação de trilha falha ou demora | Abrir um tema do catálogo ("trilha pronta, abre na hora") |
| IA indisponível | "Só o assistente depende da IA; o resto do app segue funcionando" — mostrar o resto |
| Internet da sala caiu | Gravação de tela (plano B) |

## Se perguntarem
- **Arquitetura:** React (PWA) na Vercel · FastAPI (Python) no Render · PostgreSQL (Neon) ·
  Gemini para dividir temas, exercícios e dúvidas · YouTube Data API para vídeos reais.
- **Por que web e não Flutter:** prazo, PCs sem emulador, um link roda em qualquer aparelho e
  instala como app; dá para gerar o pacote da Play Store depois.
- **Como sabem que estudou?** Não sabemos — o tempo é autodeclarado (o pré-projeto já assume).
  Medimos **constância**, não aprendizagem.
- **Custos/limites:** tudo em planos gratuitos. YouTube: ~16–25 trilhas novas por dia no total
  (3 por pessoa por dia; trilhas do catálogo não gastam cota). Gemini: o app alterna entre modelos.
- **Fluxo do clique ao banco:** o cronômetro roda no aparelho; ao concluir, a API valida, calcula
  pontos/meta/ofensiva e grava numa transação no PostgreSQL (sem duplicar se reenviar).

## Se a turma for testar junto
Pedir para **escolher temas do catálogo** em vez de criar novos (economiza a cota do YouTube).
