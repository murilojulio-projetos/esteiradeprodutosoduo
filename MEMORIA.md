# Memória do projeto · ODuo Esteira de Produtos

Arquivo vivo. Toda sessão de trabalho atualiza aqui: decisões, pendências,
contexto que **não dá pra deduzir lendo o código** e o que foi feito por último.

## Stack
- Site estático: HTML + CSS + JS puro (sem build, sem framework).
- jsPDF via CDN para gerar o PDF da proposta no client.
- Deploy: Vercel (link automático com a branch `main`).
- Persistência local: `localStorage` (carrinho, cupom, forma de pagamento).

## URLs
- Produção: https://oduo-esteira.vercel.app/
- Repositório: https://github.com/murilojulio-projetos/esteiradeprodutosoduo
- Spec fonte: **Cardápio de Upsells V2.11** (PDF, fora do repo)

## Arquivos
| Arquivo            | Papel                                                    |
| ------------------ | -------------------------------------------------------- |
| `index.html`       | Landing + cardápio                                       |
| `proposta.html`    | Checkout dedicado · gera PDF                             |
| `product-data.js`  | Catálogo (`window.ODUO_CATALOG`)                         |
| `oduo-core.js`     | Helpers compartilhados (cart, cupom, grupos do carrinho) |
| `app.js`           | Render do catálogo + drawer do carrinho na index         |
| `proposta.js`      | Render do checkout + geração de PDF                      |
| `style.css`        | CSS único                                                |
| `assets/`          | Logo + imagem de clientes                                |

## Regras de produto (V2.11)
- **Avança Locações** é o carro-chefe. **Destrava Loc** só entra como downsell
  quando o cliente recusa o Avança.
- **Cadência por botões: mensal · trimestral · semestral** — modelo ATUAL
  (2026-05-25, parte 3: o Murilo mandou "voltar pro antigo"). Anual fora.
  - Descontos padrão dos recorrentes: **trimestral −5% · semestral −10%**.
  - **Avança com preços "redondos"** (gatilho, def. pelo Murilo): mensal 3.297,
    trimestral **2.997** (−9%), semestral **2.797** (−15%).
  - **Destrava e todos os demais** seguem o padrão **−5% / −10%**. (Tentei pôr
    preço redondo no Destrava também (1.997/1.797 = −13%/−22%) mas o Murilo achou
    desconto alto demais e mandou voltar pro −5/−10.)
  - Seletor: trio de botões [Mensal · Trimestral · Semestral] no carrinho e na
    proposta; cards do catálogo voltaram a ter os toggles de modalidade.
    Estado em `localStorage.oduo_cadence_v1`.
  - **Histórico desta sessão** (não repetir): anual saiu → uniformizou 5/10 →
    virou slider/campo de "Duração do projeto" (curva acelerada −18%, depois
    linear 1%/12%) → **revertido tudo** pro modelo de cadência a pedido do Murilo.
    O slider/campo de duração e o CSS `.duration-*` ficaram ÓRfãos no código
    (não são mais usados; limpar quando der).
- Projetos: 10% off à vista **ou** 6× sem juros no cartão.
- IAs Loctus standalone: setup único R$ 5.000 (3× sem juros).
  Cliente Destrava existente adiciona IA **sem setup**.
- SDR ODuo: aviso prévio **60 dias** (o resto do catálogo é 30 dias).
- Hunter de RH e SDR fecham em **2ª reunião** com Isabelly (CRO).
- Cupom: hoje aplica `−5%` em cima do **Avança Locações** (item
  protagonista). Constantes: `COUPON_PERCENT = 5` e `COUPON_TARGET_ID`
  em `oduo-core.js`. Foi 10% antes; reduzido em 2026-05-13.
- **Cadência global da proposta**: o seletor rege a proposta inteira (todos os
  recorrentes). Sincroniza todos via `applyCadence`. Estado em
  `localStorage.oduo_cadence_v1`. `ODUO.loadCadence/persistCadence/CADENCES/PARCELAS_BY_CADENCE`.
- **Embed de setups + projetos na parcela do plano-base**: quando há
  Avança ou Destrava no carrinho em **trimestral/semestral**,
  os setups e projetos pontuais são **embutidos** na mesma parcela do
  cartão (preço total ÷ 3 ou ÷ 6 somado à mensalidade). O cliente vê
  "UMA conta só". Quando o plano-base é mensal ou não há plano-base,
  setups/projetos ficam separados em "Entrega Única" (regra antiga).
  Constante `PLANO_BASE_IDS = ["avanca", "destrava"]` em `oduo-core.js`.
- **Performance** (Hunter, SDR) NUNCA entra na parcela — fica em bloco
  próprio "Performance · Variável".
- **Total contratado** (soma anual) NÃO aparece mais no bundle card nem
  no resumo do PDF. Brasileiro pensa em parcela. Cupom e economia
  também aparecem por mês (não anualizado).

## Decisões de implementação
- Cardápio abre sempre na modalidade **mensal** pra ancorar preço cheio antes
  de mostrar o desconto da anual.
- Card do plano-base renderiza **horizontal** (full-width); demais são cards
  verticais em grid.
- Setup nasce junto da mensalidade no carrinho — não é removível separadamente,
  some quando a mensalidade-pai é removida.
- PDF é gerado 100% client-side (sem backend).
- `app.js` carrega depois de `product-data.js` + `oduo-core.js` na index.
  Na proposta o trio é `product-data.js` → `oduo-core.js` → `proposta.js`.

## Conhecidas a olho nu (sem prioridade definida)
- (atualizar conforme surgirem)

## Pendências / próximos passos
- **Configurar `N8N_PLANILHA_WEBHOOK_URL`** (Vercel + `.env` local) com a URL
  de produção do nó Webhook do n8n (workflow `QRBCgWHx6gMmKBuV` em
  nod.byduo.com.br). Sem ela, o webhook do Clicksign segue funcionando, só não
  grava na planilha (loga "N8N_PLANILHA_WEBHOOK_URL ausente"). Ver sessão
  2026-05-21 abaixo.
- **Rotacionar credenciais expostas na sessão de 2026-05-13** (todas as 11
  chaves do `.env` foram digitadas em chat e devem ser tratadas como
  comprometidas). Prioridade: Asaas → Supabase → GitHub PAT → Claude → Slack
  → Meta x2 → Google → n8n → HCTI. Detalhe no histórico abaixo.

## Variáveis de ambiente
- `.env` (local, gitignored) guarda os valores reais. Nunca commitar.
- `.env.example` (commitado) lista os nomes das variáveis sem valores.
- Variáveis em uso: Meta (2 apps: Murilo + ODuo), Anthropic, HCTI, Slack,
  GitHub PAT, Google, Asaas (produção), n8n, Supabase.

## Histórico de sessões

### 2026-05-25 (parte 2 · slider de duração substitui as cadências fixas)
- **Virada de modelo** (pedido do Murilo, "vamos criar algo melhor"): os botões
  de cadência (mensal/trimestral/semestral) saíram. Agora é um **slider de
  duração de 1 a 12 meses** com o preço caindo ao vivo conforme aumenta o
  compromisso. Marcos visuais em 3/6/12 (trimestre/semestre/ano).
- **Curva de desconto acelerada**: 1 mês = 0% (âncora, boleto/Pix), 2–6 = 1%/mês,
  7–12 = 2%/mês → −18% em 12 meses. Vale pra todos os recorrentes. Definida em
  `durationDiscount(m)` no `oduo-core.js`.
- **Pagamento**: 1 mês → assinatura mensal (UNDEFINED, boleto/Pix); 2+ → N× no
  cartão (CREDIT_CARD, installmentCount = meses), período fechado.
- Arquivos:
  - `oduo-core.js`: novo modelo (MONTHS_MIN/MAX, DEFAULT_MONTHS,
    DURATION_MILESTONES, clampMonths, durationDiscount, durationLabel,
    loadDuration/persistDuration, normalizeRecurring). `buildCartGroups` reescrita
    pra receber `durationMonths` e aplicar o desconto a todos os recorrentes.
    Removidos CADENCES/PARCELAS_BY_CADENCE/LABEL_BY_CADENCE/applyCadence.
  - `proposta.js` + `app.js`: `renderDurationSlider` (slider arrastável + campo
    digitável + marcos) no lugar do seletor; `setGlobalMonths`; PDF, contrato e
    bundle cards refletem meses/N×. Catálogo (app.js) não mostra mais toggles de
    modalidade nos recorrentes (só projetos avista/parcelado).
  - `api/cobranca/criar.js` + webhook: parcelas = `p.meses` (1 = assinatura, 2+ =
    N× cartão). `montarResumoProposta` manda `meses`; webhook loga `meses` na planilha.
  - `style.css`: bloco `.duration-slider` (range custom + ticks + campo).
- **Validação**: node --check em tudo + smoke test (20 asserts) cobrindo a curva
  e o bundle (ex.: Avança 6m = 6×3099 = 18.594; 12m = 12×2703 = 32.436; cupom).
- **Pendências/limpeza**: modalidades trimestral/semestral em `product-data.js`
  são dado morto (core ignora) — remover quando der; CSS `.cadence-selector`
  ficou órfão. Webhook do n8n (`N8N_PLANILHA_WEBHOOK_URL`) segue pendente.
- **NÃO foi pra Vercel** — tudo local, aguardando aprovação do Murilo.

### 2026-05-25 (cadências: anual saiu, trimestral entrou)
- **Mudança de produto** (pedido do Murilo): a cadência deixou de ser
  `mensal · semestral · anual` e passou a ser `mensal · trimestral · semestral`.
  O **anual saiu do sistema** — o closer negocia anual direto com o cliente,
  fora da esteira. O **semestral** virou o destaque (`best`) no lugar do anual.
- **Descontos** (decisão final do Murilo na mesma sessão): **uniforme** pra
  todos os recorrentes — trimestral −5% (3× no cartão), semestral −10% (6×).
  A 1ª versão tinha −3%/−5% no plano-base; o Murilo achou baixo e mandou
  igualar tudo a 5%/10%. Preço = `floor(mensal × (1 − desconto/100))`.
  Ex.: Avança 3297 → tri 3132 / sem 2967; Destrava 2297 → tri 2182 / sem 2067.
- Arquivos tocados:
  - `oduo-core.js`: `CADENCES`, `PARCELAS_BY_CADENCE` (tri=3, sem=6),
    `LABEL_BY_CADENCE`, `payText`, `cadenceLabel` (agora usa LABEL_BY_CADENCE),
    `contractLabel` ("Fechando 3 meses").
  - `product-data.js`: as 15 modalidades `anual` viraram `trimestral` (preço
    recalculado), reordenadas pra [mensal, trimestral, semestral], e o `best`
    migrou do anual pro semestral (exceto Destrava, que nunca teve best).
    Feito via script pontual `_transform_cadence.cjs` (já apagado).
  - `proposta.js` / `app.js`: seletor de cadência, labels do PDF, cláusulas
    de contrato (texto trimestral: 3 meses / 3 parcelas), economia "em 3 meses".
  - `api/cobranca/criar.js` + `api/webhooks/clicksign.js`: `PARCELAS`
    `{mensal:1, trimestral:3, semestral:6}` e fallback `|| 6`.
  - `index.html`: textos da âncora e do "como funciona".
- **Validação**: `node --check` em todos os JS + smoke test com shim de
  browser conferindo bundle nas 3 cadências (ex.: Avança trimestral = 3×3198 =
  9.594; semestral = 6×3132 = 18.792; economia trimestral = 297). Tudo passou.
- Sem mais nenhuma comparação `=== "anual"` no código (verificado por grep).

### 2026-05-21 (planilha de controle via n8n)
- **Nova integração**: quando o contrato é ASSINADO (webhook Clicksign,
  evento `auto_close`/`close`/`document_closed`), o backend dispara uma linha
  pra uma planilha de controle no Google Sheets via webhook do n8n.
- Arquivo: `api/webhooks/clicksign.js`. Helpers novos `enviarParaPlanilha`
  (POST no `N8N_PLANILHA_WEBHOOK_URL`) e `montarLinhaPlanilha` (achata
  contrato+cobrança numa linha pt-BR). Falha no n8n NÃO derruba o webhook.
- **Captura do link de pagamento** (antes descartado): pra `subscription`
  mensal faz `GET subscriptions/{id}/payments?limit=1` e pega `invoiceUrl`;
  pra `payment` (plano anual/semestral ou investimento inicial) usa o
  `invoiceUrl` da própria resposta. Link primário = inicial → senão mensal.
- **Regra de gate** (def. pelo Murilo): a linha entra quando há assinatura OU
  pagamento — "um dos dois, pra não encher". Como o gatilho é o webhook de
  assinatura, todo contrato que chega já está assinado → sempre registra.
  Contrato assinado SEM cobrança entra com `link_pagamento` em branco.
- **Idempotência reforçada**: `processarCobranca` agora pula se status já é
  `assinado` OU `cobranca_criada` (antes só `cobranca_criada`) — evita linha
  duplicada quando o Clicksign reenvia o evento.
- **Payload enviado ao n8n** (vira colunas no Sheets): `evento`, `data`,
  `empresa`, `responsavel`, `email`, `cnpj`, `telefone`, `cidade`, `cadencia`,
  `valor_mensal`, `valor_inicial`, `parcelas_inicial`, `link_pagamento`,
  `status`, `asaas_customer_id`, `asaas_cobranca_id`, `document_key`,
  `ambiente`.
- **Pendente do lado do n8n** (workflow `QRBCgWHx6gMmKBuV`): nó Webhook (POST)
  → nó Google Sheets (Append/Update) mapeando os campos acima. A URL de
  produção do Webhook vai na env `N8N_PLANILHA_WEBHOOK_URL`.
- Caminho "pagar sem contrato" (cobrança direta paga via Asaas, sem Clicksign)
  ainda NÃO grava na planilha — exigiria um webhook Asaas (`api/webhooks/asaas.js`)
  no evento `PAYMENT_RECEIVED/CONFIRMED`. Fica como follow-up.

### 2026-05-13 (parte 11 · header "Criativos" + projetos pra cima)
- Divider que aparece antes da seção `artes` no cardápio mudou de
  "Turbine o seu projeto" para **"Criativos"** (kicker "Recomendado pra
  crescimento acelerado") — agrupa visualmente Artes + Vídeo + SEO +
  Projetos sob o mesmo guarda-chuva.
- `projetos` (Site, Branding, Vídeo Inst/Premium) subiu no
  `product-data.js`: agora vem **logo após `seo` e antes de `ia`**.
  Os kickers alfabéticos foram realinhados (E=Projetos, F=IA,
  G=Treinamento, H=Comercial).
- Ordem final do catálogo:
  `plano-base → artes → video → seo → projetos → ia → treinamento → comercial`.
- O divider "Complemente o seu projeto" continua antes da `ia`, marcando
  a quebra entre Core (plano + monetização direta + projetos) e
  Complementos (IA, treinamento, performance).
- Na proposta o "Turbine o seu projeto" (upsell inteligente) continua
  com o mesmo nome — ali ele é uma chamada de upgrade, não um header
  de catálogo.

### 2026-05-13 (parte 10 · embed + upsell inteligente + parcela acima de tudo)
- **Regra nova · embed de setups+projetos na parcela do plano-base**:
  cliente com Avança/Destrava em anual/semestral → todos os setups
  e projetos no carrinho viram parcela junto da mensalidade. Total ÷ 12
  (ou ÷ 6) somado à parcelaPrice. UMA conta só. Quando plano-base é
  mensal ou não há plano-base, setups/projetos ficam separados como
  antes ("Entrega Única").
- `oduo-core.js`: nova constante `PLANO_BASE_IDS`. `buildCartGroups`
  detecta `shouldEmbed`, marca cada item de setup/projeto com
  `row.embedded` + `row.embeddedPerMonth`, e ajusta o bundle com
  `hasEmbedded`, `embeddedTotal`, `embeddedPerMonth`.
- **Total contratado some** do bundle card (drawer + proposta) e do
  resumo do PDF. Cupom e economia agora aparecem **por mês**
  (−R$ 148/mês em vez de −R$ 1.776/ano).
- **Investimento inicial** só aparece quando NÃO está embedded.
- **Upsell inteligente no "Turbine seu projeto"**:
  - `UPSELL_TIERS` define grupos com ordem: artes (essencial < profissional
    < completo), video (4 < 8), seo.
  - `getNextUpsellId(group)` retorna o próximo tier acima do que o
    cliente tem. Se não tem nada do grupo, retorna o default
    recommended. Se tem o topo, retorna null.
  - Quando o card é upgrade (cliente tem tier menor), o kicker mostra
    "Upgrade do Essencial" em laranja, e o botão vira "Trocar pra X".
    Click remove o tier menor antes de adicionar o novo (substitui).

### 2026-05-13 (parte 9 · validade curta + resumo do PDF reformatado)
- Modal de geração de PDF agora aceita validade de **1 dia** e **3 dias**
  além das anteriores (7/15/30 dias / Sem prazo). Padrão continua 7 dias.
- **Resumo da proposta no PDF reescrito** em 3 seções claras com header
  laranja:
  - `RECORRENTE · 12 MESES NO CARTÃO` (ou semestral ou mensal) com
    `Parcela mensal`, `Total em X meses`, `Cupom aplicado` (se houver) e
    `Economia vs mensal` (se houver)
  - `ENTREGA ÚNICA · SETUPS + PROJETOS` com `Parcela`, `Total` (ou "à
    vista")
  - `PERFORMANCE` com `Cobrança` (Variável) e `Definição` (Em reunião)
- Cupom virou uma linha dentro da seção RECORRENTE — sumiu o box verde
  duplicado que aparecia abaixo do resumo no PDF antigo.

### 2026-05-13 (parte 8 · reordenação + "Turbine seu projeto")
- **Catálogo reorganizado**: a antiga seção única "Criativos" (Artes + Vídeo)
  virou três seções separadas, agora chamadas conjuntamente de
  **Monetização Direta** e posicionadas logo após o plano-base:
  - `artes` · Pacote de Artes (Essencial · Profissional · Completo)
  - `video` · Pacote de Vídeo Recorrente (4 Reels · 8 Reels)
  - `seo` · Pacote SEO (puxado pra cá; a antiga `assinaturas` saiu)
- **Headlines mais fortes**: cada uma agora tem header dedicado, ficando
  visualmente separadas. Ordem do `ODUO_CATALOG`:
  `plano-base → artes → video → seo → ia → projetos → treinamento → comercial`.
- **Dois divisores no catálogo agora**:
  - Antes da seção `artes`: "Recomendado pra crescimento acelerado ·
    Turbine o seu projeto" (acento azul).
  - Antes da seção `ia`: o antigo "Complemente o seu projeto" (acento laranja).
- Pacote de Artes (mensal-only) ganhou texto explícito no `pay`:
  "Acompanha o plano-base (boleto ou cartão)" — evidencia que ele segue a
  cadência anual quando o plano-base é anual.
- **Feature nova na proposta** · bloco "Turbine o seu projeto":
  - Aparece no fim da coluna esquerda do `/proposta.html`.
  - Lista mini-cards horizontais dos 6 itens recomendados (Artes ×3,
    Vídeo ×2, SEO) que ainda NÃO estão no carrinho.
  - Cada card: badge "Pacote de Artes" · nome · tagline · preço grande ·
    botão `+ Adicionar`.
  - Click no `+` adiciona ao cart usando a cadência global atual (ou
    fallback pra mensal se o item não tiver a cadência pedida).
  - Card linkado azul-marinho (paleta consistente com o bundle).

### 2026-05-13 (parte 7 · cupom 5% e evidente)
- `COUPON_PERCENT` mudou de **10 → 5** em `oduo-core.js`. Cliente reduziu
  o valor e quis o cupom mais evidente na UI.
- Pill verde do cupom restaurada no item (drawer + proposta): chip
  "Cupom X · −R$ Y/mês" abaixo do subtitle do item protagonista, no item
  afetado. Pill foi removida na parte 5 (clean-up) e voltou agora porque
  evidência > minimalismo neste caso.
- Bundle card ganhou linha verde **"Cupom X aplicado · −R$ Y"** entre o
  "Total contratado" e a "Economia no anual". `Y` é o desconto somado
  por todas as parcelas da cadência (ex.: 12 × R$ 148 = R$ 1.776).
- Core agora expõe `bundle.couponCode`, `couponDiscountPerMonth` e
  `couponDiscountTotal`.

### 2026-05-13 (parte 6 · simplifica resumo + entregáveis visíveis)
- Page head do `/proposta.html` reduzido pra um único título centralizado:
  "Revise e baixe o PDF". O parágrafo descritivo saiu.
- Subtitle dos items recorrentes ficou enxuto: apenas a modalidade
  (ex.: "Anual · 12× no cartão") ou "Acompanha o plano" pros mensal-only.
  Sai o `payText` longo que duplicava info do preço.
- Subtitle dos headers dos grupos no drawer (igual ao checkout) também
  saiu — "MENSALIDADE" só, sem "Fechando 1 ano · 12× no cartão" abaixo.
- Bundle card teve o rodapé `<small>` removido — info redundante.
- Hint do cadence selector removido. Os 3 botões + feedback visual já
  comunicam, sem precisar do texto explicativo.
- Checkout grade: max-width 1240 → 1080, gap 32 → 28, padding dos
  cards 24/28 → 20/24. Mais centralizado, menos espaço vazio.
- **Entregáveis no resumo** — feature nova: cada item recorrente/projeto
  que tem `deliverables` no `product-data.js` ganha um pill "Ver
  entregáveis" abaixo do subtitle. Click expande lista com bullets verde
  (e cinza riscado pros "Sem ..."). Funciona no drawer e no
  `/proposta.html`. Não polui por default — só abre se o cliente quiser.

### 2026-05-13 (parte 5 · clean-up + paleta clara)
- **3 bugs visuais corrigidos**:
  - `.savings-row[hidden]` aparecia como faixa vazia (display:flex
    sobrescrevia o atributo `hidden`) — adicionado
    `[hidden] { display: none !important }` no escopo.
  - `.card-hero .modality-pay` ficava invisível (cor escura em fundo
    escuro). Override pra `rgba(244, 246, 252, 0.72)`.
  - O `.pay` text duplicava a info da modalidade ativa — removido do
    template do card, junto com a referência em `updateCardState`.
- **Repaginação do bundle card** seguindo a direção "claro com detalhes
  azul":
  - Fundo branco com borda azul (`blue-400` no semestral, `blue-500` no
    anual). Em anual/semestral, gradiente sutil azul-claro como wash.
  - Kicker em azul-marinho. Número grande em ink-900. Total contratado
    com borda fina por cima.
  - Card de economia interno: fundo `rgba(49, 122, 224, 0.1)` com
    `dashed` azul. Valor da economia em `blue-500`.
- **Savings inline (card do catálogo)** mudou de verde pra azul também,
  pra unificar a paleta de "destaque positivo".
- **Clean-up adicional pra "mais clean, mais fácil de entender"**:
  - Removido o subtitle dos headers dos grupos no checkout
    ("MENSALIDADE" sem "Fechando 1 ano · 12× no cartão" embaixo) —
    bundle card lateral já comunica.
  - Removida a `.cart-item-coupon` / `.proposta-item-coupon` tag inline
    nos items — o strike + novo preço já mostra o desconto, e o card
    "Cupom aplicado" lateral mostra o contexto.
  - Botão "Remover" / "remover" textual virou `×` circular discreto no
    canto direito de cada item (proposta + drawer). Menos vertical, mais
    affordance de UI universal.
  - Hint do cadence selector encurtado pra uma linha:
    "Sincroniza toda a proposta na mesma forma de pagamento."

### 2026-05-13 (parte 4 · legibilidade + economia visível)
- **Bug fix**: `app.js` iterava `Object.values(groups)` que agora inclui
  `bundle` (sem `.items`). Throw silencioso quebrava DOMContentLoaded e o
  cart toggle nunca pegava listener. Trocado por iteração explícita
  `["mensal", "setups", "projetos", "performance"]`.
- **Tipografia**: subi 8 fontes pequenas que estavam difíceis de ler — cart
  item sub (13.5 → 14.5), cart total card row (11.5 → 13), cart bundle
  kicker (11.5 → 13), cadence selector hint (11.5 → 13), cart-foot-note
  (12 → 13.5), modality-pay (13.5 → 14.5), note (12.5 → 14), bundle value
  (22 → 30, pra dar peso ao número-chave), bundle total row (16 → 19).
- **Textos enxutos**: cadence hint, hints dos total cards, label do
  payment bundle. Tira o que era ruído.
- **Economia visível**:
  - `oduo-core.js`: cada item recorrente ganha `mensalRef` e
    `savingsPerMonth`. O `bundle` ganha `savingsPerMonth` e `savingsTotal`
    (× parcelas).
  - Card do catálogo: aparece linha verde "Economia Anual · −R$ 330/mês"
    embaixo do preço quando o cliente seleciona uma modalidade não-mensal.
    Some quando volta pro mensal.
  - Bundle card (drawer + proposta): aparece bloco "Você economiza no anual
    · −R$ 3.960" entre o total contratado e o rodapé. Pula quando a
    economia é 0.

### 2026-05-13 (parte 3 · cadência global)
- **Nova feature**: seletor de cadência global no carrinho lateral e no
  `/proposta.html`. Resolve a fricção de "Avança anual no cartão + Artes
  no boleto mensal" — a proposta toda passa a fechar numa única forma de
  pagamento.
- Em `oduo-core.js`:
  - Adicionados `CADENCE_KEY`, `loadCadence`, `persistCadence`,
    `applyCadence(cart, cadence)`, constantes `CADENCES`,
    `PARCELAS_BY_CADENCE`, `LABEL_BY_CADENCE`.
  - `buildCartGroups(cart, coupon, cadence)` agora retorna também um
    objeto `bundle` com `parcelas`, `parcelaPrice`, `totalContratado`,
    `paymentLabel`, `contractLabel`.
  - Itens sem a cadência pedida (Pacote de Artes só-mensal) entram com
    `followsBase: true` e subtitle "Acompanha o plano · 12× de R$ X no
    cartão". Preço mensal preservado.
- Em `app.js` e `proposta.js`:
  - Novo trio de botões `[ Mensal · Semestral · Anual ]` no topo dos
    totais. Click sincroniza todo o carrinho e re-renderiza.
  - Card "Todo mês" antigo virou bundle gigante: "Fechando 1 ano com a
    ODuo · 12× R$ X · Total R$ Y". Em mensal volta ao formato
    "R$ X/mês · Boleto ou Pix".
  - PDF de proposta agora reflete a cadência: título do grupo
    Mensalidade mostra "6× no cartão" ou "12× no cartão"; bloco
    de totais inclui "Total contratado".
  - `defaultModality` dos cards do catálogo respeita a cadência global
    — abre sincronizado com o que o cliente já escolheu.
- CSS: `.cadence-selector` (pill com 3 botões) + `.cart-bundle-card`
  com gradiente laranja quando anual, azul quando semestral, preto
  quando mensal. Variante para a página de proposta também.

### 2026-05-13 (continuação)
- **Limpeza de `app.js`**: removidas ~546 linhas (1.035 → 489, −53%).
  - Função `generatePdf` (e satélites `buildSummary`, `ensureSpace`,
    `openLeadModal`, `closeLeadModal`) eliminadas — eram dead code; PDF
    real sai de `proposta.js`.
  - `buildCartGroups` deixou de existir em duplicata; `app.js` consome o
    do `oduo-core.js` via `ODUO.buildCartGroups(cart, activeCoupon)`.
  - Helpers duplicados (`findItem`, `modalityOf`, `payText`,
    `computeProjectTotal`, `escapeHtml`, `couponDiscountFor`, `loadCart`,
    `persistCart`, `loadCoupon`, `persistCoupon`, `slug`, `ymd`,
    constantes) também consumidos do `ODUO`. Fonte única em
    `oduo-core.js`.
  - Removida a sobrescrição de `window.ODUO` que o `app.js` fazia no topo.
  - Inconsistência de texto "6× vs 12×" some sozinha — só sobrou o
    gerador de PDF do `proposta.js`.
  - Sanidade: brackets/braces/parens balanceados; arquivos servem HTTP 200
    em server local. Verificação no browser fica com o cliente.

### 2026-05-13
- Repositório git inicializado e publicado em
  github.com/murilojulio-projetos/esteiradeprodutosoduo (branch `main`).
- Commit inicial `90422d8`: V2.11 completa, 10 arquivos, ~5.080 linhas.
- `gh` CLI instalado direto em `~/.local/bin/gh` (binário oficial, sem
  Homebrew). PATH atualizado em `~/.zshrc`.
- Autenticação no GitHub via `gh auth login --web` (conta
  `murilojulio-projetos`).
- Criado este `MEMORIA.md`.
- Claude Code CLI v2.1.140 instalado em `~/.local/bin/claude` (instalador
  oficial). Plugin Superpowers ainda **não** instalado — extensão do VSCode
  não tem `/plugin`; precisa rodar `claude` no terminal.
- `.gitignore` ampliado pra cobrir `.env`, `.env.*`, `apis.*.md`, `*.local.md`.
  Criado `.env` local (gitignored) com 11 credenciais e `.env.example` como
  template. Commit `67413bf` no GitHub só com o template — o `.env` real
  fica fora do repo.
- **Atenção:** as 11 credenciais foram coladas em chat e devem ser
  consideradas comprometidas. Rotação pendente (ver "Pendências").
