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
- 3 modalidades nos recorrentes: mensal (cheio) · semestral · anual.
  - Avança/Destrava: −5% (sem) · −10% (anual).
  - Demais recorrentes: −10% (sem) · −15% (anual).
- Projetos: 10% off à vista **ou** 6× sem juros no cartão.
- IAs Loctus standalone: setup único R$ 5.000 (3× sem juros).
  Cliente Destrava existente adiciona IA **sem setup**.
- SDR ODuo: aviso prévio **60 dias** (o resto do catálogo é 30 dias).
- Hunter de RH e SDR fecham em **2ª reunião** com Isabelly (CRO).
- Cupom: hoje aplica `−10%` em cima do **Avança Locações** (item
  protagonista). Constantes: `COUPON_PERCENT` e `COUPON_TARGET_ID` em
  `oduo-core.js`.
- **Cadência global da proposta** (mensal · semestral · anual): a proposta
  inteira fecha numa mesma forma de pagamento. Trocar o seletor sincroniza
  todos os recorrentes; itens só-mensal (Pacote de Artes) acompanham o
  cartão do plano-base pelo mesmo preço mensal. Estado em
  `localStorage.oduo_cadence_v1`.

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
