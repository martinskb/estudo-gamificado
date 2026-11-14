# Redesign "vinil"

Design aprovado: https://claude.ai/artifact/UxHsPwoqyuYvkcvKuuDz3C

Tema = álbum. Capa de hoje = capa do LP, com o disco aparecendo. Disco girando = cronômetro;
o braço avança pelos sulcos conforme a meta. Paleta creme / preto quente, destaque âmbar,
Fraunces nos títulos e no relógio, Inter no texto. Tema claro/escuro segue o aparelho.

## Etapas (um commit cada)

1. **Níveis** — Vinil 0 h → Prata 1 h → Ouro 5 h → Platina 15 h → Diamante 40 h (mesmas horas
   dos níveis de luz). Backend, testes, animação da comemoração.
2. **Base visual** — tokens (cores, fontes), paletas das capas em tons quentes (chaves iguais).
3. **Disco** — `Vinyl` (acabamento pelo nível, rótulo nas cores da capa), `Sleeve` (capa + disco
   aparecendo), `Turntable` (prato, braço pelo progresso, gira enquanto toca).
4. **Estante** — Início vira Estante: prateleiras Aprendendo / Concluídos, botão central de novo
   tema no celular, faixa "Tocando agora".
5. **Tema e foco** — capa com disco, barra até o próximo nível, play com metas; o play do tema abre
   o foco (`/tocando`) com o toca-discos; na trilha o toca-discos fica junto das aulas. Partes = faixas.
6. **Concluir** — disco volta para a capa, ofensiva, números, disco do nível.
7. **Computador** — toca-discos à esquerda e estante à direita no Início; na trilha, aulas à
   esquerda e toca-discos à direita.
