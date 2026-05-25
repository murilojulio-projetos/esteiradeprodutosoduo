/* =====================================================================
   ODuo · Esteira de Produtos · app.js
   - Renderiza o catálogo (window.ODUO_CATALOG)
   - Gerencia o carrinho (escolha de modalidade por item) e o drawer
   - Toda lógica de PDF mora em proposta.js — esta página só leva ao
     /proposta.html, não gera PDF.
   ===================================================================== */

(() => {
  const ODUO = window.ODUO;
  const { BRL, COUPON_PERCENT, COUPON_TARGET_ID, LABEL_BY_CADENCE } = ODUO;

  /** Plano-base manda na cadência global da proposta. */
  const PLANO_BASE_IDS = ["avanca", "destrava"];
  const isPlanoBase = (id) => PLANO_BASE_IDS.includes(id);

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Estado em memória do carrinho: { [itemId]: modalityId } */
  const cart = ODUO.loadCart();
  /** Modalidade atualmente exibida em cada card (não significa "no carrinho") */
  const cardModality = {};
  /** Cupom ativo (string em maiúsculas) ou null */
  let activeCoupon = ODUO.loadCoupon();
  /** Cadência global da proposta · mensal | trimestral | semestral */
  let activeCadence = ODUO.loadCadence();
  /** Aba ativa do cardápio: marketing | comercial */
  let activeTrack = "marketing";
  /** Se a renderização atual do catálogo deve animar os cards (fade-in). */
  let catalogAnimate = true;

  function defaultModality(item) {
    // Item pode forçar uma modalidade default (ex.: Estruturação Comercial
    // abre no parcelado — brasileiro lê parcela).
    if (item.defaultModalityId) {
      const forced = item.modalities.find((m) => m.id === item.defaultModalityId);
      if (forced) return forced.id;
    }
    // Demais cards abrem na modalidade mais cara (mensal/avista) pra ancorar
    // o preço alto. O desconto da trimestral/semestral vira benefício visível
    // quando o cliente troca a modalidade ou adiciona à proposta.
    const mensal = item.modalities.find((m) => m.id === "mensal");
    if (mensal) return mensal.id;
    const avista = item.modalities.find((m) => m.id === "avista");
    if (avista) return avista.id;
    return item.modalities[0].id;
  }

  /* Planos-base no carrinho que JÁ incluem `standaloneId` como entrega
     removível ainda não-removida — usado pra avisar de cobrança dupla. */
  function findBundledIn(standaloneId) {
    const result = [];
    Object.keys(cart).forEach((cartId) => {
      if (cartId === standaloneId) return;
      const found = ODUO.findItem(cartId);
      if (!found || !found.item.deliverables) return;
      const removable = found.item.deliverables.find(
        (d) => ODUO.isRemovableDeliverable(d) && d.removeId === standaloneId
      );
      if (!removable) return;
      const removedIds = ODUO.getRemovedIds(cartId, ODUO.loadCustomizations());
      if (!removedIds.includes(standaloneId)) {
        result.push({
          id: cartId,
          name: found.item.name,
          discount: removable.removeDiscount || 0,
        });
      }
    });
    return result;
  }

  // ------------------------- RENDER DO CATÁLOGO ----------------------

  /* Seções que renderizam como card horizontal grande (carro-chefe da trilha) */
  const HERO_SECTIONS = ["plano-base", "estruturacao"];

  function renderCatalog(opts = {}) {
    /* animate=false em re-renders no mesmo track (toggle de entrega, limpar
       carrinho) — senão todos os cards piscam o fade-in de novo. */
    const animate = opts.animate !== false;
    catalogAnimate = animate;
    const root = $("#catalogoRoot");
    const subnav = $("#catalogoSubnav");
    root.innerHTML = "";
    if (subnav) subnav.innerHTML = "";

    const sections = window.ODUO_CATALOG.filter(
      (s) => (s.track || "marketing") === activeTrack
    );

    sections.forEach((section) => {
      // Divisor "Criativos" entre plano-base e monetização direta (só marketing)
      if (section.section === "artes") {
        const divider = document.createElement("div");
        divider.className = "cat-divider cat-divider-growth";
        divider.innerHTML = `
          <div class="cat-divider-inner">
            <span class="cat-divider-kicker">Recomendado pra crescimento acelerado</span>
            <span class="cat-divider-title">Criativos</span>
            <span class="cat-divider-sub">Pacote de Artes, Vídeo Recorrente, SEO e Projetos pontuais — acompanham o plano-base no cartão.</span>
          </div>
        `;
        root.appendChild(divider);
      }
      // Divisor "Complemente o seu projeto" antes da seção de IA
      if (section.section === "ia") {
        const divider = document.createElement("div");
        divider.className = "cat-divider";
        divider.innerHTML = `
          <div class="cat-divider-inner">
            <span class="cat-divider-kicker">Agora que você tem a base</span>
            <span class="cat-divider-title">Complemente o seu projeto</span>
            <span class="cat-divider-sub">IAs avulsas e projetos pontuais conforme o seu momento.</span>
          </div>
        `;
        root.appendChild(divider);
      }

      const sec = document.createElement("section");
      sec.className = "cat-section";
      sec.id = `sec-${section.section}`;

      const isHero = HERO_SECTIONS.includes(section.section);
      const gridClass = isHero ? "cat-grid cat-grid-plans" : "cat-grid";

      sec.innerHTML = `
        <header class="cat-section-head">
          <span class="cat-section-kicker">${section.sectionKicker}</span>
          <h2>${section.sectionLabel}</h2>
          <p>${section.sectionDesc}</p>
        </header>
        ${section.section === "estruturacao" ? estruturacaoValueHtml() : ""}
        <div class="${gridClass}" id="grid-${section.section}"></div>
      `;
      root.appendChild(sec);

      const grid = $(`#grid-${section.section}`, sec);
      /* Items com `hidden: true` não vão no grid (são add-ons que entram
         no carrinho via toggle do card pai, ex.: gmb-acompanhamento). */
      section.items
        .filter((item) => !item.hidden)
        .forEach((item) => {
          cardModality[item.id] = cart[item.id] || defaultModality(item);
          grid.appendChild(renderCard(item, { horizontal: isHero }));
        });

      // Atalho na sub-nav (label curto, sem o sufixo "· Aquisição" etc.)
      if (subnav) {
        const a = document.createElement("a");
        a.href = `#sec-${section.section}`;
        a.textContent = section.sectionLabel.split(" · ")[0];
        subnav.appendChild(a);
      }
    });

    renderComplementBlock(root);
    setupStickyPrice();

    if (animate && window.ODUO_REVEAL) {
      window.ODUO_REVEAL.observe(root.querySelectorAll(".reveal:not(.is-visible)"));
    }
  }

  /* Barra sticky com o preço da Estruturação Comercial — aparece só na
     aba Comercial quando o card do programa sai da tela (rolou pra cima).
     Mantém o preço parcelado sempre visível durante o pitch. */
  let stickyObserver = null;

  function updateStickyBtn() {
    const bar = $("#stickyPrice");
    if (!bar) return;
    const btn = bar.querySelector(".sticky-price-btn");
    const inCart = !!cart["estruturacao-comercial"];
    btn.textContent = inCart ? "✓ Adicionado à proposta" : "Adicionar à proposta";
    btn.classList.toggle("is-added", inCart);
  }

  function setupStickyPrice() {
    if (stickyObserver) {
      stickyObserver.disconnect();
      stickyObserver = null;
    }
    let bar = $("#stickyPrice");

    if (activeTrack !== "comercial") {
      if (bar) bar.remove();
      return;
    }

    if (!bar) {
      /* Preços lidos do catálogo (fonte única) — nada hardcoded aqui. */
      const prog = ODUO.findItem("estruturacao-comercial")?.item;
      const avista = prog && prog.modalities.find((m) => m.id === "avista");
      const parc = prog && prog.modalities.find((m) => m.id === "parcelado");
      const parcMatch = parc && (parc.suffix || "").match(/×\s*(\d+)/);
      const nParc = parcMatch ? parcMatch[1] : "12";
      const linhaPreco = parc && avista
        ? `<b>${nParc}× de ${BRL.format(parc.price)}</b> · ou ${BRL.format(avista.price)} à vista <em class="sticky-price-off">31% off</em>`
        : "";
      bar = document.createElement("div");
      bar.id = "stickyPrice";
      bar.className = "sticky-price";
      bar.innerHTML = `
        <div class="sticky-price-inner">
          <div class="sticky-price-info">
            <strong>Estruturação Comercial</strong>
            <span>${linhaPreco}</span>
          </div>
          <button type="button" class="btn btn-primary sticky-price-btn">Adicionar à proposta</button>
        </div>
      `;
      document.body.appendChild(bar);
      bar.querySelector(".sticky-price-btn").addEventListener("click", () => {
        if (!cart["estruturacao-comercial"]) {
          cart["estruturacao-comercial"] = "parcelado";
          ODUO.persistCart(cart);
          renderCart();
          bumpCount();
          const card = document.querySelector('[data-item-id="estruturacao-comercial"]');
          if (card) {
            const found = ODUO.findItem("estruturacao-comercial");
            if (found) updateCardState(card, found.item);
          }
        }
        updateStickyBtn();
      });
    }

    updateStickyBtn();

    const target = $("#sec-estruturacao");
    if (!target) return;

    stickyObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const acima = entry.boundingClientRect.top < 0;
          bar.classList.toggle("is-visible", !entry.isIntersecting && acima);
        });
      },
      { threshold: 0 }
    );
    stickyObserver.observe(target);
  }

  /* As 5 frentes da Estruturação Comercial — conteúdo fiel ao one-pager
     V do PDF. `card` = resumo do card no método; `lead` + `incluso` =
     detalhamento que abre no modal (paridade com os pilares de Marketing). */
  const COMERCIAL_FRENTES = [
    {
      n: "01",
      key: "diagnostico",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
      title: "Diagnóstico Comercial Profundo",
      card: "A foto real do seu comercial — onde o orçamento trava e o cliente foge.",
      lead: "A foto real do seu comercial hoje. Antes de mudar qualquer coisa, a gente mede.",
      incluso: [
        "Análise da jornada do cliente, do primeiro contato ao fechamento.",
        "Mapeamento de tempos de resposta, taxa de conversão por etapa e pontos de fuga.",
        "Relatório com prioridades de ação, na ordem certa.",
      ],
    },
    {
      n: "02",
      key: "treinamento",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
      title: "Treinamento Sob Medida",
      card: "Sua equipe operando no padrão certo — scripts e processo pra usar no dia seguinte.",
      lead: "Sua equipe operando no padrão certo — treinada pra realidade da locação de equipamentos.",
      incluso: [
        "Workshops práticos com vendedores e atendentes.",
        "Padrões de qualificação de orçamento, follow-up e fechamento aplicados ao mercado de locação.",
        "Scripts e materiais de apoio prontos pra usar no dia seguinte.",
      ],
    },
    {
      n: "03",
      key: "acompanhamento",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
      title: "Acompanhamento de 90 Dias",
      card: "Consultor presente até virar rotina — revisão semanal de indicadores com o time.",
      lead: "Consultor presente até o processo virar rotina. Você não fica sozinho na implantação.",
      incluso: [
        "Rotina semanal de revisão de indicadores com o time.",
        "Ajuste fino do processo conforme os dados aparecem.",
        "Suporte na implantação — sem você se virar sozinho.",
      ],
    },
    {
      n: "04",
      key: "loctus",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
      title: "Loctus — Plataforma com IA de Atendimento",
      card: "A tecnologia que garante a execução — atende, qualifica e faz follow-up 24/7.",
      lead: "A tecnologia que garante a execução do processo. Não basta treinar — tem que rodar todo dia.",
      incluso: [
        "Atendimento ao contato dentro e fora do horário comercial.",
        "Qualificação automática do orçamento e distribuição pro vendedor certo.",
        "Métricas reais do funil em um painel só.",
        "Follow-up automático para orçamento que ficou parado.",
      ],
    },
    {
      n: "05",
      key: "monetizacao",
      icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/></svg>',
      title: "Processo de Monetização da Base",
      card: "O cliente que já alugou volta — renovação, recompra e LTV acompanhados.",
      lead: "O cliente que já alugou volta — quando você cuida dele. É onde mora o crescimento mais barato.",
      incluso: [
        "Rotina de aproximação antes do fim do aluguel — renovação na hora certa.",
        "Estratégia de recompra estruturada: a oferta certa pro cliente certo, no momento certo.",
        "Régua de relacionamento com cliente ativo e inativo.",
        "Métricas de LTV, taxa de recompra e churn acompanhadas semanalmente.",
      ],
    },
  ];

  function openFrenteModal(key) {
    const data = COMERCIAL_FRENTES.find((f) => f.key === key);
    const modal = $("#frenteModal");
    if (!data || !modal) return;
    $("#frenteModalKicker").textContent = `Frente ${data.n} · Estruturação Comercial`;
    $("#frenteModalTitle").textContent = data.title;
    $("#frenteModalLead").textContent = data.lead;
    $("#frenteModalContent").innerHTML = `
      <span class="frente-modal-incluso-head">O que está incluído nessa frente</span>
      <ul class="frente-modal-incluso">
        ${data.incluso
          .map((i) => `<li>${ODUO.escapeHtml(i)}</li>`)
          .join("")}
      </ul>
    `;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    ODUO.modalFocusIn(modal);
  }

  function closeFrenteModal() {
    const modal = $("#frenteModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    ODUO.modalFocusRestore();
  }

  /* Simulador de retorno da base parada — funil simples (% da base que
     chega em cada etapa) que mostra a receita escondida na carteira do
     cliente. Premissas ajustáveis; nada é promessa. */
  function roiCalculatorHtml() {
    return `
      <div class="roi-sim" id="roiSim">
        <div class="roi-sim-head">
          <span class="comercial-block-kicker">Simulador · o dinheiro parado na sua base</span>
          <h3>Quanto a base que já alugou de você pode render</h3>
          <p>Ajuste os números pra sua locadora e veja a receita parada na carteira.</p>
        </div>
        <div class="roi-sim-grid">
          <div class="roi-sim-inputs">
            <label class="roi-input">
              <span>Clientes na sua base <small>(que já alugaram)</small></span>
              <input type="number" id="roiBase" value="1000" min="0" step="50" inputmode="numeric" />
            </label>
            <label class="roi-input">
              <span>Ticket médio por locação</span>
              <span class="roi-money"><i>R$</i><input type="number" id="roiTicket" value="1000" min="0" step="100" inputmode="numeric" /></span>
            </label>
            <div class="roi-rate">
              <span class="roi-rate-label">Respondem ao contato <b id="roiRespVal">20%</b></span>
              <input type="range" id="roiResp" min="5" max="60" value="20" />
            </div>
            <div class="roi-rate">
              <span class="roi-rate-label">Pedem orçamento <b id="roiOrcVal">10%</b></span>
              <input type="range" id="roiOrc" min="2" max="40" value="10" />
            </div>
            <div class="roi-rate">
              <span class="roi-rate-label">Fecham locação <b id="roiFechVal">5%</b></span>
              <input type="range" id="roiFech" min="1" max="25" value="5" />
            </div>
          </div>
          <div class="roi-sim-output">
            <div class="roi-funnel">
              <div class="roi-funnel-step">
                <strong id="roiRespN">200</strong>
                <span>respondem</span>
              </div>
              <div class="roi-funnel-step">
                <strong id="roiOrcN">100</strong>
                <span>pedem orçamento</span>
              </div>
              <div class="roi-funnel-step roi-funnel-step-win">
                <strong id="roiFechN">50</strong>
                <span>fecham locação</span>
              </div>
            </div>
            <div class="roi-result">
              <span class="roi-result-label">Receita reativada estimada</span>
              <strong class="roi-result-value" id="roiRevenue">R$ 50.000</strong>
              <span class="roi-result-foot" id="roiPayback"></span>
            </div>
          </div>
        </div>
        <p class="roi-disclaimer">Estimativa de potencial com premissas que você ajusta — não é promessa de resultado.</p>
      </div>
    `;
  }

  function bindRoiCalculator(root) {
    const sim = $("#roiSim", root);
    if (!sim) return;
    const prog = ODUO.findItem("estruturacao-comercial")?.item;
    const progPrice =
      (prog && prog.modalities.find((m) => m.id === "avista")?.price) || 16997;

    const els = {
      base: $("#roiBase", sim),
      ticket: $("#roiTicket", sim),
      resp: $("#roiResp", sim),
      orc: $("#roiOrc", sim),
      fech: $("#roiFech", sim),
      respVal: $("#roiRespVal", sim),
      orcVal: $("#roiOrcVal", sim),
      fechVal: $("#roiFechVal", sim),
      respN: $("#roiRespN", sim),
      orcN: $("#roiOrcN", sim),
      fechN: $("#roiFechN", sim),
      revenue: $("#roiRevenue", sim),
      payback: $("#roiPayback", sim),
    };

    function recalc() {
      const base = Math.max(0, Number(els.base.value) || 0);
      const ticket = Math.max(0, Number(els.ticket.value) || 0);
      let resp = Number(els.resp.value) || 0;
      let orc = Number(els.orc.value) || 0;
      let fech = Number(els.fech.value) || 0;

      /* Mantém o funil coerente: ninguém pede orçamento sem responder,
         ninguém fecha sem pedir orçamento. Cada etapa ≤ a anterior. */
      if (orc > resp) {
        orc = resp;
        els.orc.value = orc;
      }
      if (fech > orc) {
        fech = orc;
        els.fech.value = fech;
      }

      const respN = Math.round(base * (resp / 100));
      const orcN = Math.round(base * (orc / 100));
      const fechN = Math.round(base * (fech / 100));
      const revenue = fechN * ticket;

      els.respVal.textContent = resp + "%";
      els.orcVal.textContent = orc + "%";
      els.fechVal.textContent = fech + "%";
      els.respN.textContent = respN.toLocaleString("pt-BR");
      els.orcN.textContent = orcN.toLocaleString("pt-BR");
      els.fechN.textContent = fechN.toLocaleString("pt-BR");
      els.revenue.textContent = BRL.format(revenue);

      if (revenue <= 0) {
        els.payback.textContent =
          "Ajuste o ticket e o tamanho da base pra ver o potencial.";
      } else {
        const roi = revenue / progPrice;
        const negocios = ticket > 0 ? Math.ceil(progPrice / ticket) : 0;
        els.payback.innerHTML =
          `Retorno de <b>${roi.toFixed(1)}×</b> sobre o investimento à vista no programa. ` +
          `Ele se paga com <b>${negocios}</b> ${negocios === 1 ? "locação fechada" : "locações fechadas"}.`;
      }
    }

    [els.base, els.ticket, els.resp, els.orc, els.fech].forEach((el) => {
      el.addEventListener("input", recalc);
    });
    recalc();
  }

  /* Painel "o que está incluído + quanto vale" acima do card de preço da
     Estruturação Comercial. Estratégia de venda: ANCORA no valor real
     (R$ 24.800 = soma dos serviços avulsos) e constrói o raciocínio das
     entregas — SEM revelar o preço de fechamento aqui. O preço real só
     aparece no card abaixo, depois que o cliente absorveu o valor. */
  function estruturacaoValueHtml() {
    const itens = [
      { nome: "Diagnóstico Comercial", desc: "A foto real do seu funil hoje", valor: 5500 },
      { nome: "Treinamento Sob Medida", desc: "Equipe no padrão certo da locação", valor: 8000 },
      { nome: "Implementação de CRM", desc: "Funil e base organizados num lugar só", valor: 7500 },
      { nome: "IA de Atendimento · Loctus", desc: "Atende e qualifica o orçamento 24/7", valor: 5000 },
      { nome: "Acompanhamento de 90 Dias", desc: "Consultor presente até virar rotina", valor: 10000 },
      { nome: "Processo de Recompra", desc: "A base que já alugou voltando a comprar", valor: 4000 },
    ];
    const soma = itens.reduce((s, i) => s + i.valor, 0); // R$ 40.000
    return `
      <div class="estr-value reveal${catalogAnimate ? "" : " is-visible"}">
        <div class="estr-value-list">
          <span class="estr-value-kicker">O que está incluído no programa</span>
          <ul>
            ${itens
              .map(
                (i) => `
              <li>
                <span class="estr-value-item">
                  <strong>${ODUO.escapeHtml(i.nome)}</strong>
                  <small>${ODUO.escapeHtml(i.desc)}</small>
                </span>
                <span class="estr-value-price">${BRL.format(i.valor)}</span>
              </li>`
              )
              .join("")}
          </ul>
        </div>
        <aside class="estr-value-anchor">
          <span class="estr-value-anchor-kicker">O valor que você recebe</span>
          <strong class="estr-value-anchor-price">${BRL.format(soma)}</strong>
          <span class="estr-value-anchor-sub">é o que custa montar cada uma dessas frentes separada.</span>
          <span class="estr-value-anchor-divider" aria-hidden="true"></span>
          <span class="estr-value-anchor-defer">No programa completo, tudo isso vem integrado — e o seu investimento é bem menor.</span>
          <span class="estr-value-anchor-note">Veja as condições de pagamento no card abaixo ↓</span>
        </aside>
      </div>
    `;
  }

  /* História do método comercial — gancho, 5 frentes (clicáveis), timeline
     90 dias, simulador de retorno, cases, qualificação e diagnóstico.
     Renderizada na seção Método quando a trilha Comercial está ativa
     (paridade com os pilares de Marketing). */
  function renderComercialStory(container) {
    container.innerHTML = "";
    const frentes = COMERCIAL_FRENTES;

    const timeline = [
      { week: "Semana 1–2", title: "Diagnóstico", desc: "Imersão na operação e relatório com plano de ação na ordem certa." },
      { week: "Semana 3–4", title: "Treinamento", desc: "Workshops com a equipe · padrões, qualificação e fechamento." },
      { week: "Semana 5–12", title: "Implementação + Monetização", desc: "Loctus em produção, rotina semanal e recompra rodando." },
    ];

    const block = document.createElement("div");
    block.className = "comercial-story";
    block.innerHTML = `
      <header class="comercial-hook">
        <span class="comercial-hook-kicker">Método ODuo · Comercial</span>
        <h2>O orçamento já entra todo dia.<br />O dinheiro escapa em dois pontos.</h2>
        <p>
          No lead que o time não fecha — e no cliente que alugou e sumiu. A
          Estruturação Comercial fecha os dois vazamentos.
        </p>
      </header>

      <div class="comercial-frentes-head">
        <span class="comercial-block-kicker">As 5 frentes do programa</span>
        <p>Da captação à monetização da base. Clique pra ver o que cada uma entrega.</p>
      </div>
      <div class="comercial-frentes">
        ${frentes
          .map(
            (f) => `
          <button type="button" class="frente" data-frente="${ODUO.escapeHtml(f.key)}" aria-label="Ver detalhes: ${ODUO.escapeHtml(f.title)}">
            <span class="frente-num">${f.n}</span>
            <span class="frente-icon">${f.icon}</span>
            <strong>${ODUO.escapeHtml(f.title)}</strong>
            <span class="frente-desc">${ODUO.escapeHtml(f.card)}</span>
            <span class="frente-cta">Ver o que inclui →</span>
          </button>`
          )
          .join("")}
      </div>

      <div class="comercial-timeline">
        <span class="comercial-block-kicker">Como funciona · 90 dias</span>
        <div class="timeline-track">
          ${timeline
            .map(
              (t) => `
            <div class="timeline-step">
              <span class="timeline-week">${ODUO.escapeHtml(t.week)}</span>
              <strong>${ODUO.escapeHtml(t.title)}</strong>
              <span>${ODUO.escapeHtml(t.desc)}</span>
            </div>`
            )
            .join("")}
        </div>
      </div>

      <div class="comercial-cases">
        <span class="comercial-block-kicker">Prova real · clientes ODuo</span>
        <div class="comercial-case-grid">
          <article class="comercial-case">
            <span class="cc-tag">CLM Locadora</span>
            <div class="cc-metric">
              <div class="cc-side">
                <span>Fechamento de orçamento</span>
                <strong>18%</strong>
              </div>
              <span class="cc-arrow" aria-hidden="true">→</span>
              <div class="cc-side cc-side-after">
                <span>Depois · 30 dias</span>
                <strong>36,5%</strong>
              </div>
            </div>
            <p>Mais de R$ 300 mil em novas locações no mesmo período.</p>
          </article>
          <article class="comercial-case">
            <span class="cc-tag">FL Locações</span>
            <div class="cc-metric">
              <div class="cc-side">
                <span>Venda no mês</span>
                <strong>R$ 50 mil</strong>
              </div>
              <span class="cc-arrow" aria-hidden="true">→</span>
              <div class="cc-side cc-side-after">
                <span>Um único mês</span>
                <strong>R$ 108 mil</strong>
              </div>
            </div>
            <p>Faturamento mais que dobrou em 30 dias. O salto veio do comercial.</p>
          </article>
        </div>
      </div>

      ${roiCalculatorHtml()}

      <div class="comercial-fit">
        <div class="comercial-fit-col comercial-fit-yes">
          <span class="comercial-fit-head">É pra você se</span>
          <ul>
            <li>Cada vendedor atende de um jeito diferente</li>
            <li>Tem base de clientes parada pra reativar</li>
            <li>Investe em marketing e não quer desperdiçar lead</li>
          </ul>
        </div>
        <div class="comercial-fit-col comercial-fit-no">
          <span class="comercial-fit-head">Não é pra você se</span>
          <ul>
            <li>Ainda não tem orçamento entrando — marketing vem antes</li>
            <li>Procura milagre em 30 dias sem mexer no processo</li>
          </ul>
        </div>
      </div>

      <div class="comercial-diagnostico">
        <div class="comercial-diagnostico-text">
          <strong>Tudo começa pelo Diagnóstico Comercial</strong>
          <span>45 min · online · sem custo · sem compromisso. Você sai com um plano de ação — mesmo que não feche o programa.</span>
        </div>
        <a class="btn btn-primary comercial-diagnostico-btn" href="#sec-estruturacao">Ver o programa ↓</a>
      </div>
    `;
    container.appendChild(block);

    block.querySelectorAll(".frente[data-frente]").forEach((btn) => {
      btn.addEventListener("click", () => openFrenteModal(btn.dataset.frente));
    });
    bindRoiCalculator(block);
  }

  /* Bloco de complementaridade no fim de cada trilha — convida pra outra aba */
  function renderComplementBlock(root) {
    const isMkt = activeTrack === "marketing";
    const other = isMkt ? "comercial" : "marketing";
    const block = document.createElement("div");
    block.className = "cat-complement";
    block.innerHTML = `
      <div class="cat-complement-inner">
        <span class="cat-complement-kicker">As duas frentes se completam</span>
        <h3>${
          isMkt
            ? "O Marketing traz o lead. O Comercial garante que ele vire locação."
            : "O Comercial estruturado precisa de lead entrando — é o que o Marketing faz."
        }</h3>
        <p>${
          isMkt
            ? "Não adianta encher o WhatsApp de orçamento se o time não fecha. Estruture o comercial e monetize a base que você já tem."
            : "Tráfego pago, landing e presença no Google: o combustível que mantém o funil comercial sempre cheio."
        }</p>
        <button type="button" class="btn btn-primary cat-complement-btn" data-switch-track="${other}">
          Ver a aba ${isMkt ? "Comercial" : "Marketing"} →
        </button>
      </div>
    `;
    root.appendChild(block);
    block
      .querySelector("[data-switch-track]")
      .addEventListener("click", () => setActiveTrack(other));
  }

  function setActiveTrack(track, opts = {}) {
    if (track === activeTrack && !opts.force) return;
    activeTrack = track;
    $$(".catalogo-tab").forEach((tab) => {
      const on = tab.dataset.track === track;
      tab.classList.toggle("is-active", on);
      tab.setAttribute("aria-selected", on ? "true" : "false");
    });

    /* Cases, Depoimentos e Ancoragem são marketing-only — escondem na
       trilha Comercial (conteúdo 100% tráfego pago / time de marketing). */
    ["cases", "depoimentos", "ancoragem"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.hidden = track !== "marketing";
    });

    /* Método é track-aware: marketing mostra os 3 pilares (estáticos),
       comercial mostra o método comercial renderizado (5 frentes etc.). */
    const mkt = $("#metodoMarketing");
    const com = $("#metodoComercial");
    if (mkt) mkt.hidden = track !== "marketing";
    if (com) {
      com.hidden = track !== "comercial";
      if (track === "comercial" && !com.children.length) {
        renderComercialStory(com);
      }
    }

    renderCatalog();

    if (!opts.silent) {
      document.querySelector(".track-band")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }

  function renderCard(item, opts = {}) {
    const card = document.createElement("article");
    card.className = catalogAnimate ? "card reveal" : "card reveal is-visible";
    if (item.protagonist) card.classList.add("card-hero");
    if (opts.horizontal) card.classList.add("card-horizontal");
    card.dataset.itemId = item.id;

    const badges = [];
    if (item.protagonist) badges.push(`<span class="badge badge-best">Carro-chefe</span>`);
    if (item.recommended) badges.push(`<span class="badge badge-rec">Recomendado</span>`);
    if (item.downsell) badges.push(`<span class="badge badge-down">Downsell</span>`);

    /* Progressive disclosure: mostra os 3 primeiros entregáveis +
       todos os REMOVÍVEIS (são o ponto de customização do plano).
       Resto fica atrás de um "+ N entregas ↓" expansível. */
    const customizations = ODUO.loadCustomizations();
    const removedNow = ODUO.getRemovedIds(item.id, customizations);
    const VISIBLE_COUNT = 3;
    /* `hideCardDeliverables`: o card não repete a lista de entregas — usado
       quando há um painel de valor dedicado logo acima (Estruturação
       Comercial). O carrinho/PDF seguem usando item.deliverables normal. */
    const deliverablesList = item.hideCardDeliverables ? [] : (item.deliverables || []);
    let hiddenCount = 0;

    const deliverablesItems = deliverablesList
      .map((d, i) => {
        const name = ODUO.deliverableName(d);
        const strike = /^sem\s/i.test(name) ? " is-strike" : "";
        const isRemovable = ODUO.isRemovableDeliverable(d);
        /* Removíveis sempre visíveis (são o valor da customização).
           Demais entram no "extra" depois dos 3 primeiros. */
        const isExtra = i >= VISIBLE_COUNT && !isRemovable;
        if (isExtra) hiddenCount += 1;
        const extraCls = isExtra ? " deliverable-extra" : "";

        if (isRemovable) {
          const isRemoved = removedNow.includes(d.removeId);
          const cls = `deliverable-removable${isRemoved ? " is-removed" : ""}${strike}${extraCls}`;
          const aria = isRemoved ? `Restaurar ${name}` : `Remover ${name}`;
          const warning = isRemoved && d.removeWarning
            ? `<span class="deliverable-warning">⚠ ${ODUO.escapeHtml(d.removeWarning)}</span>`
            : "";
          return `<li class="${cls}" data-deliverable-id="${ODUO.escapeHtml(d.removeId)}">
              <span class="deliverable-name">${ODUO.escapeHtml(name)}</span>
              <button
                type="button"
                class="deliverable-toggle"
                data-action="toggle-removal"
                data-item-id="${ODUO.escapeHtml(item.id)}"
                data-remove-id="${ODUO.escapeHtml(d.removeId)}"
                aria-label="${ODUO.escapeHtml(aria)}"
                title="${ODUO.escapeHtml(aria)} · −${BRL.format(d.removeDiscount || 0)}/mês"
              >${isRemoved ? "↶" : "×"}</button>
              ${warning}
            </li>`;
        }
        return `<li class="${(strike + extraCls).trim()}">${ODUO.escapeHtml(name)}</li>`;
      })
      .join("");

    const expandBtn = hiddenCount > 0
      ? `<button type="button" class="deliverables-expand" data-action="expand-deliverables" aria-expanded="false" data-extra="${hiddenCount}">
           + ${hiddenCount} ${hiddenCount === 1 ? "entrega" : "entregas"} ↓
         </button>`
      : "";

    const deliverables = deliverablesItems
      ? `<div class="deliverables-wrap">
           <ul class="deliverables">${deliverablesItems}</ul>
           ${expandBtn}
         </div>`
      : "";

    const groupLabel = item.group ? `<p class="card-group">${ODUO.escapeHtml(item.group)}</p>` : "";

    const setup = item.setup
      ? `<div class="setup-row">
           <div class="setup-row-top">
             <span class="setup-row-label">Setup único</span>
             <strong class="setup-row-value">${BRL.format(item.setup)}</strong>
           </div>
           <small class="setup-row-sub">3× sem juros no cartão · pago no início</small>
         </div>`
      : "";

    const commission = item.commission
      ? `<div class="commission">Comissão: ${ODUO.escapeHtml(item.commission)}</div>`
      : "";

    const note = item.note ? `<p class="note">${ODUO.escapeHtml(item.note)}</p>` : "";

    if (opts.horizontal) {
      card.innerHTML = `
        <div class="card-left">
          <div class="card-badges">${badges.join("")}</div>
          ${groupLabel}
          <h3 class="card-name">${ODUO.escapeHtml(item.name)}</h3>
          <p class="card-tagline">${ODUO.escapeHtml(item.tagline)}</p>
          ${deliverables}
        </div>
        <div class="card-right">
          <div class="modalities" data-role="modalities"></div>
          <div class="price-block">
            <span class="price" data-role="price"></span>
            <span class="suffix" data-role="suffix"></span>
          </div>
          <div class="savings-row" data-role="savings" hidden></div>
          ${setup}
          ${commission}
          ${note}
          <button type="button" class="add-btn" data-role="add"></button>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="card-badges">${badges.join("")}</div>
        ${groupLabel}
        <h3 class="card-name">${ODUO.escapeHtml(item.name)}</h3>
        <p class="card-tagline">${ODUO.escapeHtml(item.tagline)}</p>
        ${deliverables}
        <div class="modalities" data-role="modalities"></div>
        <div class="price-block">
          <span class="price" data-role="price"></span>
          <span class="suffix" data-role="suffix"></span>
        </div>
        <p class="pay" data-role="pay"></p>
        <div class="savings-row" data-role="savings" hidden></div>
        ${setup}
        ${commission}
        ${note}
        <button type="button" class="add-btn" data-role="add"></button>
      `;
    }

    // Modalidades
    const modWrap = $('[data-role="modalities"]', card);
    item.modalities.forEach((mod) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "modality";
      btn.dataset.modalityId = mod.id;
      const badge =
        mod.badge ? `<span class="modality-badge">${ODUO.escapeHtml(mod.badge)}</span>` : "";
      /* Modality vira pill compacta · label + badge (sem o subtítulo de pay,
         que já aparece embaixo do preço no `.pay`). */
      btn.innerHTML = `
        <span class="modality-label">${ODUO.escapeHtml(mod.customLabel || mod.label)}</span>
        ${badge}
      `;
      btn.addEventListener("click", () => {
        cardModality[item.id] = mod.id;
        if (cart[item.id]) {
          cart[item.id] = mod.id;
          // Se o cliente trocou a modalidade do plano-base, alinha a
          // cadência global da proposta (carrinho/proposta) pra mesma.
          if (isPlanoBase(item.id) && ODUO.CADENCES.includes(mod.id)) {
            setGlobalCadence(mod.id);
            return;
          }
          ODUO.persistCart(cart);
          renderCart();
        }
        updateCardState(card, item);
      });
      modWrap.appendChild(btn);
    });

    // Add to cart
    const addBtn = $('[data-role="add"]', card);
    addBtn.addEventListener("click", async () => {
      if (cart[item.id]) {
        delete cart[item.id];
      } else {
        /* Anti-cobrança-dupla: se este item avulso já vem incluso num
           plano-base no carrinho (entrega removível não-removida), avisa. */
        const bundledIn = findBundledIn(item.id);
        if (bundledIn.length) {
          const plan = bundledIn[0];
          const ok = await ODUO.confirmDialog({
            title: `Já incluso no ${plan.name}`,
            message:
              `${item.name} já vem no ${plan.name}. Adicionar como item separado ` +
              `cobra duas vezes pela mesma entrega — o ideal é remover do ${plan.name} ` +
              `(você ganha −${BRL.format(plan.discount)}/mês lá) e contratar aqui à parte.`,
            okLabel: "Adicionar mesmo assim",
            cancelLabel: "Cancelar",
          });
          if (!ok) return;
        }
        // Dependência (ex.: SEO precisa de Site Multipages).
        if (item.requires && !cart[item.requires.id]) {
          const dep = ODUO.findItem(item.requires.id)?.item;
          const depName = dep ? dep.name : item.requires.id;
          const ok = await ODUO.confirmDialog({
            title: `${item.name} precisa de ${depName}`,
            message: `${item.requires.reason || ""} Quer adicionar ${depName} junto?`,
            okLabel: `Adicionar os dois`,
            cancelLabel: "Cancelar",
          });
          if (!ok) return;
          // Adiciona o pré-requisito também. Pra projeto, usa "parcelado" default.
          const depItem = dep;
          if (depItem) {
            const depMod =
              depItem.type === "project"
                ? depItem.modalities.find((m) => m.id === "parcelado") ||
                  depItem.modalities[0]
                : depItem.modalities.find((m) => m.id === activeCadence) ||
                  depItem.modalities.find((m) => m.id === "mensal") ||
                  depItem.modalities[0];
            cart[item.requires.id] = depMod.id;
          }
        }
        cart[item.id] = cardModality[item.id];
        // Se adicionou o plano-base, alinha cadência global à modalidade dele.
        if (isPlanoBase(item.id) && ODUO.CADENCES.includes(cart[item.id])) {
          activeCadence = cart[item.id];
          ODUO.persistCadence(activeCadence);
          ODUO.applyCadence(cart, activeCadence);
        }
      }
      ODUO.persistCart(cart);
      updateCardState(card, item);
      renderCart();
      bumpCount();
    });

    /* Botão "+ N entregas ↓" expande/recolhe a lista cheia. */
    const expandButton = $(".deliverables-expand", card);
    if (expandButton) {
      expandButton.addEventListener("click", (e) => {
        e.preventDefault();
        const wrap = $(".deliverables-wrap", card);
        const isExpanded = wrap.classList.toggle("is-expanded");
        expandButton.setAttribute("aria-expanded", isExpanded ? "true" : "false");
        const n = Number(expandButton.dataset.extra) || 0;
        expandButton.innerHTML = isExpanded
          ? "− Recolher ↑"
          : `+ ${n} ${n === 1 ? "entrega" : "entregas"} ↓`;
      });
    }

    /* Toggles de remoção de entregáveis (Avança Custom).
       Click no × tira a entrega + baixa o preço · click no ↶ restaura. */
    $$(".deliverable-toggle", card).forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const itemId = btn.dataset.itemId;
        const removeId = btn.dataset.removeId;
        if (!itemId || !removeId) return;
        const custom = ODUO.loadCustomizations();
        ODUO.toggleRemoval(itemId, removeId, custom);
        ODUO.persistCustomizations(custom);
        /* Re-renderiza o catálogo todo: bate na lista de entregáveis +
           preço do card + carrinho. Simples e seguro. */
        renderCatalog({ animate: false });
        renderCart();
      });
    });

    /* Add-on opcional embutido no card (ex.: Acompanhamento mensal do GMB).
       Um clique adiciona/remove o item-filho (hidden no catálogo). */
    if (item.addsAddon) {
      const addon = ODUO.findItem(item.addsAddon)?.item;
      if (addon) {
        const addonMod = ODUO.modalityOf(addon, defaultModality(addon));
        const host = opts.horizontal ? $(".card-right", card) : card;
        const row = document.createElement("label");
        row.className = "card-addon";
        row.innerHTML = `
          <input type="checkbox" class="card-addon-check" data-addon-id="${ODUO.escapeHtml(addon.id)}" ${cart[addon.id] ? "checked" : ""} />
          <span class="card-addon-text">
            <strong>${ODUO.escapeHtml(addon.name)}</strong>
            <small>${ODUO.escapeHtml(addon.tagline)}</small>
          </span>
          <span class="card-addon-price">+ ${BRL.format(addonMod.price)}/mês</span>
        `;
        const check = row.querySelector(".card-addon-check");
        check.addEventListener("change", () => {
          if (check.checked) cart[addon.id] = defaultModality(addon);
          else delete cart[addon.id];
          ODUO.persistCart(cart);
          renderCart();
          bumpCount();
        });
        host.appendChild(row);
      }
    }

    updateCardState(card, item);
    return card;
  }

  function updateCardState(card, item) {
    /* Sincroniza o checkbox de add-on com o estado real do carrinho. */
    if (item.addsAddon) {
      const addonCheck = $(".card-addon-check", card);
      if (addonCheck) addonCheck.checked = !!cart[item.addsAddon];
    }
    const activeId = cardModality[item.id];
    const mod = ODUO.modalityOf(item, activeId);
    /* Aplica desconto das entregas removidas. Só Avança tem hoje, mas a
       lógica funciona pra qualquer item com deliverables removíveis. */
    const customizations = ODUO.loadCustomizations();
    const removedIds = ODUO.getRemovedIds(item.id, customizations);
    const removalDiscount = ODUO.computeRemovalDiscount(item, removedIds);
    const isCustom = removedIds.length > 0;

    $$(".modality", card).forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.modalityId === activeId);
    });

    const priceEl = $('[data-role="price"]', card);
    const suffixEl = $('[data-role="suffix"]', card);

    if (item.type === "performance") {
      priceEl.textContent = mod.customLabel || "Sob consulta";
      suffixEl.textContent = "";
    } else if (item.type === "project" && mod.id === "parcelado") {
      // Projeto parcelado: "12× R$ 1.997". Se o cliente removeu entregas,
      // recalcula a parcela com o desconto e mostra o valor original riscado.
      const parcelas = parseInt(String(mod.suffix || "").replace(/\D/g, ""), 10) || 6;
      if (isCustom && removalDiscount > 0) {
        const totalCustom = Math.max(0, mod.price * parcelas - removalDiscount);
        const parcelaNova = Math.round(totalCustom / parcelas);
        priceEl.innerHTML =
          `<span class="price-original">${parcelas}× ${BRL.format(mod.price)}</span>` +
          `<span class="price-effective"><span class="price-x">${parcelas}×</span> ${BRL.format(parcelaNova)}</span>`;
      } else {
        priceEl.innerHTML = `<span class="price-x">${parcelas}×</span> ${BRL.format(mod.price)}`;
      }
      suffixEl.textContent = "";
    } else if (isCustom && removalDiscount > 0) {
      /* Custom: mostra preço original riscado + novo preço grande */
      const effective = Math.max(0, mod.price - removalDiscount);
      priceEl.innerHTML = `
        <span class="price-original">${BRL.format(mod.price)}</span>
        <span class="price-effective">${BRL.format(effective)}</span>
      `;
      suffixEl.textContent = mod.suffix || "";
    } else {
      priceEl.textContent = BRL.format(mod.price);
      suffixEl.textContent = mod.suffix || "";
    }

    /* Linha de forma de pagamento embaixo do preço (ex.: "Cartão · 6× sem
       juros"). Performance não tem pay fixo. */
    const payEl = $('[data-role="pay"]', card);
    if (payEl) {
      payEl.textContent = item.type === "performance" ? "" : (mod.pay || "");
      payEl.hidden = !payEl.textContent;
    }

    /* Chip "Personalizado" no header do card quando o cliente removeu algo */
    const nameEl = $(".card-name", card);
    if (nameEl) {
      const existing = $(".card-custom-chip", card);
      if (isCustom) {
        const chipHtml = `<span class="card-custom-chip" title="Você removeu ${removedIds.length} entrega(s)">Personalizado · ${removedIds.length} removido${removedIds.length > 1 ? "s" : ""}</span>`;
        if (existing) existing.outerHTML = chipHtml;
        else nameEl.insertAdjacentHTML("afterend", chipHtml);
      } else if (existing) {
        existing.remove();
      }
    }

    // Card de economia: recorrentes → desconto vs mensal; projetos →
    // desconto do à vista vs parcelado (gatilho de venda do pagamento à vista).
    const savingsEl = $('[data-role="savings"]', card);
    if (savingsEl) {
      const mensalMod = item.modalities.find((m) => m.id === "mensal");
      const isRecurringLike = item.type === "recurring" || item.type === "hybrid";
      const parceladoMod = item.modalities.find((m) => m.id === "parcelado");
      const avistaMod = item.modalities.find((m) => m.id === "avista");
      if (
        isRecurringLike &&
        mensalMod &&
        mod.id !== "mensal" &&
        mod.price > 0 &&
        mensalMod.price > mod.price
      ) {
        /* Quando custom, o saving é entre o mensal-custom e o da modalidade
           custom, não entre mensal-cheio e modalidade-custom. Subtrai o discount dos 2. */
        const effectiveMensal = Math.max(0, mensalMod.price - removalDiscount);
        const effectiveMod = Math.max(0, mod.price - removalDiscount);
        const saveMonth = effectiveMensal - effectiveMod;
        const parcelas = mod.id === "trimestral" ? 3 : (mod.id === "semestral" ? 6 : 1);
        const saveAcum = saveMonth * parcelas;
        const periodo = mod.id === "trimestral" ? "em 3 meses" : "em 6 meses";
        savingsEl.hidden = false;
        savingsEl.innerHTML = `
          <span>Economia ${periodo}</span>
          <strong>−${ODUO.escapeHtml(BRL.format(saveAcum))}</strong>
        `;
        savingsEl.title = `${BRL.format(saveMonth)}/mês de desconto vs pagar mensal`;
      } else if (
        item.type === "project" &&
        avistaMod &&
        parceladoMod &&
        ODUO.computeProjectTotal(parceladoMod) > avistaMod.price
      ) {
        // Gatilho: quanto o cliente economiza pagando à vista
        const totalParcelado = ODUO.computeProjectTotal(parceladoMod);
        const economia = totalParcelado - avistaMod.price;
        const pct = Math.round((economia / totalParcelado) * 100);
        savingsEl.hidden = false;
        savingsEl.innerHTML =
          mod.id === "avista"
            ? `<span>✓ Você economiza pagando à vista</span><strong>−${ODUO.escapeHtml(BRL.format(economia))}</strong>`
            : `<span>À vista economiza ${pct}%</span><strong>−${ODUO.escapeHtml(BRL.format(economia))}</strong>`;
        savingsEl.title = `À vista ${BRL.format(avistaMod.price)} vs parcelado ${BRL.format(totalParcelado)} — ${pct}% off`;
      } else {
        savingsEl.hidden = true;
        savingsEl.innerHTML = "";
      }
    }

    const addBtn = $('[data-role="add"]', card);
    const inCart = !!cart[item.id];
    addBtn.classList.toggle("is-added", inCart);
    addBtn.textContent = inCart ? "✓ Adicionado à proposta" : "Adicionar à proposta";
  }

  // -------------------------- CARRINHO --------------------------------

  function renderCart() {
    const drawer = $("#cartDrawer");
    const groupsEl = $("#cartGroups");
    const totalsEl = $("#cartTotals");
    const countEl = $("#cartCount");
    const checkoutBtn = $("#checkoutBtn");

    const ids = Object.keys(cart);
    countEl.textContent = String(ids.length);
    drawer.classList.toggle("has-items", ids.length > 0);
    updateStickyBtn();

    // Botão "Limpar" só faz sentido com itens no carrinho.
    const clearBtn = $("#clearCartBtn");
    if (clearBtn) clearBtn.hidden = ids.length === 0;

    const emptyHint = $("#cartEmptyHint");
    if (emptyHint) {
      emptyHint.textContent =
        activeTrack === "comercial"
          ? "Comece pela Estruturação Comercial — o programa carro-chefe."
          : "Comece pelo Avança Locações — o carro-chefe da ODuo.";
    }
    if (checkoutBtn) {
      if (ids.length === 0) {
        checkoutBtn.setAttribute("aria-disabled", "true");
        checkoutBtn.classList.add("is-disabled");
        checkoutBtn.removeAttribute("href");
      } else {
        checkoutBtn.removeAttribute("aria-disabled");
        checkoutBtn.classList.remove("is-disabled");
        checkoutBtn.setAttribute("href", "proposta.html");
      }
    }

    groupsEl.innerHTML = "";

    const groups = ODUO.buildCartGroups(cart, activeCoupon, activeCadence);
    const hasRecurring = groups.mensal.items.length > 0;

    ["mensal", "setups", "projetos", "performance"].forEach((key) => {
      const g = groups[key];
      if (!g || g.items.length === 0) return;
      const block = document.createElement("div");
      block.className = "cart-group";
      block.innerHTML = `
        <header class="cart-group-head">
          <h4>${ODUO.escapeHtml(g.title)}</h4>
        </header>
      `;
      g.items.forEach((row) => {
        const item = document.createElement("div");
        item.className = "cart-item";
        if (row.followsBase) item.dataset.followsBase = "true";
        if (row.embedded) item.dataset.embedded = "true";
        const removeBtn = row.removable
          ? `<button type="button" class="cart-item-remove" data-remove="${row.id}" aria-label="Remover ${ODUO.escapeHtml(row.name)}">×</button>`
          : "";
        const couponPill = row.couponNote
          ? `<span class="cart-item-coupon">${ODUO.escapeHtml(row.couponNote)}</span>`
          : "";
        const baseStrike = row.basePriceText
          ? `<span class="cart-item-strike">${ODUO.escapeHtml(row.basePriceText)}</span>`
          : "";
        const hasDeliverables = Array.isArray(row.deliverables) && row.deliverables.length > 0;
        const deliverablesList = hasDeliverables
          ? `<ul class="cart-item-deliverables">
               ${row.deliverables
                 .map((d) => {
                   const strike = /^sem\s/i.test(d) ? " is-strike" : "";
                   return `<li class="${strike.trim()}">${ODUO.escapeHtml(d)}</li>`;
                 })
                 .join("")}
             </ul>`
          : "";
        item.innerHTML = `
          ${removeBtn}
          <div class="cart-item-main">
            <div class="cart-item-title">${ODUO.escapeHtml(row.name)}</div>
            <div class="cart-item-sub">${ODUO.escapeHtml(row.subtitle)}</div>
            ${couponPill}
            ${deliverablesList}
          </div>
          <div class="cart-item-price-block">
            ${baseStrike}
            <span class="cart-item-price">${ODUO.escapeHtml(row.priceText)}</span>
          </div>
        `;
        block.appendChild(item);
      });
      groupsEl.appendChild(block);
    });

    // -------- Totais ("fechando o ano" + investimento inicial) --------
    totalsEl.innerHTML = "";
    const investimentoInicial = groups.setups.total + groups.projetos.total;

    if (hasRecurring) {
      totalsEl.appendChild(renderCadenceSelector(groups.bundle));
      totalsEl.appendChild(renderBundleCard(groups.bundle));
    }
    // "Investimento inicial" só aparece quando os setups/projetos NÃO foram
    // embutidos na parcela do plano-base (caso de plano-base mensal ou sem plano-base).
    const showInvestimentoInicial = investimentoInicial > 0 && !groups.bundle.hasEmbedded;
    if (showInvestimentoInicial) {
      totalsEl.appendChild(
        totalCard(
          "Investimento inicial",
          BRL.format(investimentoInicial),
          "Setups e projetos · à vista ou parcelado no cartão."
        )
      );
    }
    if (groups.performance.items.length > 0) {
      totalsEl.appendChild(
        totalCard(
          "Performance",
          "Variável",
          "Cobrado por resultado · alinhado em reunião dedicada."
        )
      );
    }

    renderCoupon();

    $$("[data-remove]", groupsEl).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.remove;
        delete cart[id];
        ODUO.persistCart(cart);
        renderCart();
        const card = $(`.card[data-item-id="${id}"]`);
        if (card) {
          const found = ODUO.findItem(id);
          if (found) updateCardState(card, found.item);
        }
        /* Item removido pode ser um add-on (ex.: gmb-acompanhamento) que
           não tem card próprio — destrava o checkbox no card pai. */
        const addonCheck = $(`.card-addon-check[data-addon-id="${id}"]`);
        if (addonCheck) addonCheck.checked = false;
      });
    });

  }

  function totalCard(label, value, hint, highlight = false) {
    const div = document.createElement("div");
    div.className = "cart-total-card" + (highlight ? " is-highlight" : "");
    div.innerHTML = `
      <div class="cart-total-card-row">
        <span>${ODUO.escapeHtml(label)}</span>
        <strong>${ODUO.escapeHtml(value)}</strong>
      </div>
      <small>${ODUO.escapeHtml(hint)}</small>
    `;
    return div;
  }

  /** Trio de botões [Mensal · Trimestral · Semestral] que rege a proposta inteira. */
  function renderCadenceSelector(bundle) {
    const wrap = document.createElement("div");
    wrap.className = "cadence-selector";
    wrap.innerHTML = `
      <span class="cadence-selector-label">Forma de pagamento</span>
      <div class="cadence-selector-buttons" role="group" aria-label="Cadência da proposta">
        ${ODUO.CADENCES.map((c) => {
          const isActive = c === bundle.cadence;
          return `
            <button type="button"
              class="cadence-btn ${isActive ? "is-active" : ""}"
              data-cadence="${c}"
              aria-pressed="${isActive}">
              ${ODUO.escapeHtml(LABEL_BY_CADENCE[c])}
            </button>`;
        }).join("")}
      </div>
    `;
    $$(".cadence-btn", wrap).forEach((btn) => {
      btn.addEventListener("click", () => setGlobalCadence(btn.dataset.cadence));
    });
    return wrap;
  }

  /** Card de "fechando o ano" — substitui o antigo total "Todo mês". */
  function renderBundleCard(bundle) {
    const div = document.createElement("div");
    div.className = "cart-bundle-card is-cadence-" + bundle.cadence;

    const isTrimestral = bundle.cadence === "trimestral";
    const isMensal = bundle.cadence === "mensal";

    if (isMensal) {
      div.innerHTML = `
        <div class="cart-bundle-top">
          <span class="cart-bundle-kicker">${ODUO.escapeHtml(bundle.contractLabel)}</span>
          <strong class="cart-bundle-value">${ODUO.escapeHtml(
            BRL.format(bundle.parcelaPrice)
          )}<span>/mês</span></strong>
        </div>
      `;
    } else {
      const couponLine = bundle.couponDiscountPerMonth > 0
        ? `
          <div class="cart-bundle-coupon">
            <span>Cupom ${ODUO.escapeHtml(bundle.couponCode)} aplicado</span>
            <strong>−${ODUO.escapeHtml(BRL.format(bundle.couponDiscountPerMonth))}/mês</strong>
          </div>`
        : "";
      const savingsLabel = isTrimestral ? "Economia em 3 meses" : "Economia em 6 meses";
      const savings = bundle.savingsTotal > 0
        ? `
          <div class="cart-bundle-savings">
            <span>${savingsLabel}</span>
            <strong>−${ODUO.escapeHtml(BRL.format(bundle.savingsTotal))}</strong>
          </div>`
        : "";
      const embeddedNote = bundle.hasEmbedded
        ? `<small>Setups e projetos já estão embutidos nessa parcela.</small>`
        : "";
      div.innerHTML = `
        <div class="cart-bundle-top">
          <span class="cart-bundle-kicker">${ODUO.escapeHtml(bundle.contractLabel)}</span>
          <strong class="cart-bundle-value">${bundle.parcelas}× ${ODUO.escapeHtml(BRL.format(bundle.parcelaPrice))}</strong>
        </div>
        ${couponLine}
        ${savings}
        ${embeddedNote}
      `;
    }
    return div;
  }

  /** Persiste, sincroniza todos os itens do carrinho e re-renderiza. */
  function setGlobalCadence(cadence) {
    if (!ODUO.CADENCES.includes(cadence)) return;
    activeCadence = cadence;
    ODUO.persistCadence(cadence);
    ODUO.applyCadence(cart, cadence);
    ODUO.persistCart(cart);
    // Realinha cardModality dos itens no cart pra UI dos cards não desviar.
    Object.keys(cart).forEach((id) => {
      cardModality[id] = cart[id];
    });
    renderCart();
    $$(".card").forEach((card) => {
      const id = card.dataset.itemId;
      if (!id) return;
      const found = ODUO.findItem(id);
      if (found) updateCardState(card, found.item);
    });
  }

  function renderCoupon() {
    const wrap = $("#couponBlock");
    if (!wrap) return;
    if (activeCoupon) {
      const targetItem = ODUO.findItem(COUPON_TARGET_ID)?.item;
      const targetName = targetItem ? targetItem.name : "item protagonista";
      const inCart = !!cart[COUPON_TARGET_ID];
      wrap.innerHTML = `
        <div class="coupon-applied">
          <div>
            <span class="coupon-tag">Cupom ${ODUO.escapeHtml(activeCoupon)}</span>
            <small>${
              inCart
                ? `-${COUPON_PERCENT}% no ${ODUO.escapeHtml(targetName)}`
                : `O desconto entra quando o ${ODUO.escapeHtml(targetName)} estiver na proposta.`
            }</small>
          </div>
          <button type="button" id="couponRemove" class="coupon-remove" aria-label="Remover cupom">×</button>
        </div>
      `;
      $("#couponRemove").addEventListener("click", () => {
        activeCoupon = null;
        ODUO.persistCoupon(null);
        renderCart();
      });
    } else {
      wrap.innerHTML = `
        <form id="couponForm" class="coupon-form">
          <input
            type="text"
            id="couponInput"
            placeholder="Tem um cupom? Aplique aqui"
            autocomplete="off"
            spellcheck="false"
            maxlength="32"
          />
          <button type="submit" class="btn btn-primary btn-sm">Aplicar</button>
        </form>
      `;
      $("#couponForm").addEventListener("submit", (e) => {
        e.preventDefault();
        const code = $("#couponInput").value.trim().toUpperCase();
        if (!code) return;
        activeCoupon = code;
        ODUO.persistCoupon(activeCoupon);
        renderCart();
      });
    }
  }

  function bumpCount() {
    const el = $("#cartCount");
    el.animate(
      [
        { transform: "scale(1)" },
        { transform: "scale(1.25)" },
        { transform: "scale(1)" },
      ],
      { duration: 220, easing: "ease-out" }
    );
  }

  // -------------------------- DRAWER ----------------------------------

  function openCart() {
    $("#cartDrawer").classList.add("is-open");
    $("#cartOverlay").classList.add("is-open");
    $("#cartOverlay").hidden = false;
    $("#cartDrawer").setAttribute("aria-hidden", "false");
    $("#cartToggle").setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    setTimeout(() => $("#cartClose")?.focus(), 60);
  }

  function closeCart() {
    $("#cartDrawer").classList.remove("is-open");
    $("#cartOverlay").classList.remove("is-open");
    $("#cartDrawer").setAttribute("aria-hidden", "true");
    $("#cartToggle").setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    $("#cartToggle")?.focus();
    setTimeout(() => {
      $("#cartOverlay").hidden = true;
    }, 250);
  }

  // -------------------------- BOOT ------------------------------------

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.ODUO_CATALOG) {
      console.error("ODUO_CATALOG não foi carregado.");
      return;
    }
    if (!window.ODUO || typeof ODUO.buildCartGroups !== "function") {
      console.error("oduo-core.js não foi carregado antes de app.js.");
      return;
    }

    renderCatalog();
    renderCart();

    /* Abas Marketing / Comercial */
    $$(".catalogo-tab").forEach((tab) => {
      tab.addEventListener("click", () => setActiveTrack(tab.dataset.track));
    });

    /* Deep-link: oduo-esteira.vercel.app/#comercial abre direto na aba
       Comercial — o closer manda o link certo pro tipo de conversa. */
    if (location.hash === "#comercial") {
      setActiveTrack("comercial");
    }
    /* Mantém a aba em sincronia se o hash mudar depois (botão voltar,
       link interno). */
    window.addEventListener("hashchange", () => {
      if (location.hash === "#comercial") setActiveTrack("comercial");
      else if (location.hash === "#marketing") setActiveTrack("marketing");
    });

    $("#cartToggle").addEventListener("click", openCart);
    $("#cartClose").addEventListener("click", closeCart);
    $("#cartOverlay").addEventListener("click", closeCart);

    $("#clearCartBtn").addEventListener("click", async () => {
      if (Object.keys(cart).length === 0 && !activeCoupon) return;
      const ok = await ODUO.confirmDialog({
        title: "Limpar a proposta?",
        message: "Todos os itens adicionados serão removidos. Não dá pra desfazer.",
        okLabel: "Limpar tudo",
        cancelLabel: "Manter",
      });
      if (!ok) return;
      Object.keys(cart).forEach((k) => delete cart[k]);
      activeCoupon = null;
      activeCadence = "mensal";
      ODUO.persistCart(cart);
      ODUO.persistCoupon(null);
      ODUO.persistCadence("mensal");
      /* Zera também as personalizações (entregas removidas) — senão o
         card volta vazio mas ainda "Personalizado". */
      ODUO.persistCustomizations({});
      $$(".card").forEach((card) => {
        const id = card.dataset.itemId;
        if (!id) return;
        const found = ODUO.findItem(id);
        if (found) cardModality[id] = defaultModality(found.item);
      });
      renderCatalog({ animate: false });
      renderCart();
    });

    /* Modal das frentes do método comercial. */
    $("#frenteModalClose")?.addEventListener("click", closeFrenteModal);
    $("#frenteModal")?.addEventListener("click", (e) => {
      if (e.target.id === "frenteModal") closeFrenteModal();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#cartDrawer").classList.contains("is-open")) {
        closeCart();
      }
      if (e.key === "Escape" && !$("#frenteModal")?.hidden) {
        closeFrenteModal();
      }
    });
  });
})();
