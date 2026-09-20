# Contas Menor · Moza Banco

Aplicação web (Next.js + TypeScript) que lê o ficheiro **Plano de Actividades DCC**
(.xlsx) e apresenta, de forma gráfica e resumida, os dados de **Contas Menor**:

- Contas menor (total)
- Com maioridade atingida
- Por atingir maioridade
- Nos próximos 3 meses
- Superior a 3 meses

Todo o processamento acontece **no navegador** (client-side) — o ficheiro nunca
é enviado para nenhum servidor.

## Como funciona

1. O utilizador carrega o `.xlsx` do Plano de Actividades.
2. A aplicação procura automaticamente a aba **"Mapa de acompanhamento"**
   (ou qualquer aba que contenha uma linha "Contas menor").
3. Identifica a estrutura de colunas (Meses → Quinzenas/Semanas) e localiza
   as 5 linhas de métricas.
4. Extrai o **valor mais recente preenchido** de cada linha, calcula a
   variação (%) face ao período anterior, e desenha:
   - 5 cartões-resumo (KPIs)
   - Um gráfico de composição (maioridade atingida vs. por atingir)
   - Um gráfico de urgência (próximos 3 meses vs. superior a 3 meses)
   - O "Relógio da Maioridade" — um mostrador circular exclusivo que traduz
     a % de contas em risco imediato
   - Um gráfico de barras comparativo
   - Um gráfico de evolução (tendência) ao longo das semanas disponíveis no
     próprio ficheiro

## Como correr localmente

Requisitos: [Node.js](https://nodejs.org) 18 ou superior.

```bash
npm install
npm run dev
```

Depois abra [http://localhost:3000](http://localhost:3000) no navegador e
carregue o seu ficheiro `.xlsx`.

## Como gerar uma versão de produção

```bash
npm run build
npm start
```

## Publicar online (opcional)

O projecto está pronto para ser publicado em qualquer serviço que suporte
Next.js (ex: Vercel, Netlify, ou um servidor Node próprio). Basta ligar o
repositório e correr `npm run build`.

## Estrutura do projecto

```
app/
  layout.tsx        → layout raiz, tipografia (Google Fonts)
  page.tsx          → página principal (upload + dashboard)
  globals.css       → tokens de cor e estilos base
components/
  UploadZone.tsx    → zona de arrastar/soltar o ficheiro
  Dashboard.tsx      → cartões + gráficos
  KpiCard.tsx        → cartão individual de métrica
  MajorityClock.tsx  → o "Relógio da Maioridade" (elemento assinatura)
lib/
  parsePlano.ts      → toda a lógica de leitura/interpretação do Excel
```

## Nota sobre a marca

As cores usadas (vermelho Moza, tons de carvão e dourado) foram inspiradas na
identidade visual pública do Moza Banco. Por respeito à propriedade
intelectual, esta aplicação **não** reproduz o logótipo oficial do banco —
usa um monograma "M" tipográfico original nas cores da marca. Se tiver o
ficheiro do logótipo oficial, pode substituí-lo livremente em `app/page.tsx`.

## Ajustar o ficheiro-fonte

Se o modelo do Plano de Actividades mudar de estrutura (nomes de linhas,
disposição de colunas), ajuste as constantes em `lib/parsePlano.ts`
(variável `TARGETS`) — é aí que o texto de cada categoria é comparado com a
coluna A da folha "Mapa de acompanhamento".
