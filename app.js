/* =====================================================================
   ODuo · Esteira de Produtos · app.js
   - Renderiza o catálogo (window.ODUO_CATALOG)
   - Gerencia o carrinho (escolha de modalidade por item)
   - Gera o PDF da proposta com jsPDF
   ===================================================================== */

(() => {
  const STORAGE_KEY = "oduo_cart_v1";
  const COUPON_KEY = "oduo_coupon_v1";

  // Desconto adicional aplicado ao item protagonista (Avança Locações)
  // quando QUALQUER cupom estiver ativo. Ajuste aqui quando definirem o %.
  const COUPON_PERCENT = 10;
  const COUPON_TARGET_ID = "avanca";

  const BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  // Exposto para a página /proposta.html reaproveitar a mesma lógica
  window.ODUO = {
    STORAGE_KEY,
    COUPON_KEY,
    COUPON_PERCENT,
    COUPON_TARGET_ID,
    BRL,
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Estado em memória do carrinho: { [itemId]: modalityId } */
  const cart = loadCart();
  /** Modalidade atualmente exibida em cada card (não significa "no carrinho") */
  const cardModality = {};
  /** Cupom ativo (string em maiúsculas) ou null */
  let activeCoupon = loadCoupon();

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  }

  function persistCart() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }

  function loadCoupon() {
    try {
      const raw = localStorage.getItem(COUPON_KEY);
      return raw && raw.trim() ? raw.trim().toUpperCase() : null;
    } catch {
      return null;
    }
  }

  function persistCoupon() {
    try {
      if (activeCoupon) localStorage.setItem(COUPON_KEY, activeCoupon);
      else localStorage.removeItem(COUPON_KEY);
    } catch {
      /* ignore */
    }
  }

  /** Quanto o cupom desconta do preço base do item protagonista (Avança), em R$/mês */
  function couponDiscountFor(itemId, basePrice) {
    if (!activeCoupon) return 0;
    if (itemId !== COUPON_TARGET_ID) return 0;
    return Math.round(basePrice * (COUPON_PERCENT / 100));
  }

  function findItem(itemId) {
    for (const section of window.ODUO_CATALOG) {
      for (const item of section.items) {
        if (item.id === itemId) return { item, section };
      }
    }
    return null;
  }

  function defaultModality(item) {
    // Sempre abre na modalidade mensal para ancorar o preço cheio;
    // o cliente vê o desconto migrando para semestral/anual.
    const mensal = item.modalities.find((m) => m.id === "mensal");
    if (mensal) return mensal.id;
    const avista = item.modalities.find((m) => m.id === "avista");
    if (avista) return avista.id;
    return item.modalities[0].id;
  }

  function modalityOf(item, modalityId) {
    return item.modalities.find((m) => m.id === modalityId) || item.modalities[0];
  }

  /**
   * Enriquece o texto da modalidade com a parcela explícita.
   * Ex.: Semestral recorrente R$ 3.132/mês -> "6× de R$ 3.132 no cartão"
   *      Anual recorrente R$ 2.967/mês -> "12× de R$ 2.967 no cartão"
   *      Projeto parcelado já vem com "× 6" e total no pay original.
   */
  function payText(item, mod) {
    if (!mod) return "";
    if ((item.type === "recurring" || item.type === "hybrid") && mod.price > 0) {
      if (mod.id === "semestral") {
        return `6× de ${BRL.format(mod.price)} no cartão`;
      }
      if (mod.id === "anual") {
        return `12× de ${BRL.format(mod.price)} no cartão`;
      }
    }
    return mod.pay || "";
  }

  // ------------------------- RENDER DO CATÁLOGO ----------------------

  function renderCatalog() {
    const root = $("#catalogoRoot");
    root.innerHTML = "";

    window.ODUO_CATALOG.forEach((section, idx) => {
      // Divisor "Complemente seu projeto" entre o plano-base e o restante
      if (section.section !== "plano-base" && idx === 1) {
        const divider = document.createElement("div");
        divider.className = "cat-divider";
        divider.innerHTML = `
          <div class="cat-divider-inner">
            <span class="cat-divider-kicker">Agora que você tem a base</span>
            <span class="cat-divider-title">Complemente o seu projeto</span>
            <span class="cat-divider-sub">Adicione criativos, IAs, projetos pontuais e treinamentos comerciais conforme o seu momento.</span>
          </div>
        `;
        root.appendChild(divider);
      }

      const sec = document.createElement("section");
      sec.className = "cat-section";
      sec.id = `sec-${section.section}`;

      const gridClass =
        section.section === "plano-base" ? "cat-grid cat-grid-plans" : "cat-grid";

      sec.innerHTML = `
        <header class="cat-section-head">
          <span class="cat-section-kicker">${section.sectionKicker}</span>
          <h2>${section.sectionLabel}</h2>
          <p>${section.sectionDesc}</p>
        </header>
        <div class="${gridClass}" id="grid-${section.section}"></div>
      `;
      root.appendChild(sec);

      const grid = $(`#grid-${section.section}`, sec);
      const isPlansSection = section.section === "plano-base";
      section.items.forEach((item) => {
        cardModality[item.id] = cart[item.id] || defaultModality(item);
        grid.appendChild(renderCard(item, { horizontal: isPlansSection }));
      });
    });
  }

  function renderCard(item, opts = {}) {
    const card = document.createElement("article");
    card.className = "card";
    if (item.protagonist) card.classList.add("card-hero");
    if (opts.horizontal) card.classList.add("card-horizontal");
    card.dataset.itemId = item.id;

    const badges = [];
    if (item.protagonist) badges.push(`<span class="badge badge-best">Carro-chefe</span>`);
    if (item.recommended) badges.push(`<span class="badge badge-rec">Recomendado</span>`);
    if (item.downsell) badges.push(`<span class="badge badge-down">Downsell</span>`);
    if (item.secondMeeting) badges.push(`<span class="badge badge-second">Fecha em 2ª reunião</span>`);

    const deliverablesItems = (item.deliverables || [])
      .map((d) => {
        const strike = /^sem\s/i.test(d) ? " is-strike" : "";
        return `<li class="${strike.trim()}">${escapeHtml(d)}</li>`;
      })
      .join("");
    const deliverables = deliverablesItems
      ? `<div class="deliverables-wrap">
           <span class="deliverables-title">O que está incluído</span>
           <ul class="deliverables">${deliverablesItems}</ul>
         </div>`
      : "";

    const groupLabel = item.group ? `<p class="card-group">${escapeHtml(item.group)}</p>` : "";

    const setup = item.setup
      ? `<div class="setup-row">
           <span>Setup único</span>
           <span>${BRL.format(item.setup)}</span>
         </div>`
      : "";

    const commission = item.commission
      ? `<div class="commission">Comissão: ${escapeHtml(item.commission)}</div>`
      : "";

    const note = item.note ? `<p class="note">${escapeHtml(item.note)}</p>` : "";

    if (opts.horizontal) {
      card.innerHTML = `
        <div class="card-left">
          <div class="card-badges">${badges.join("")}</div>
          ${groupLabel}
          <h3 class="card-name">${escapeHtml(item.name)}</h3>
          <p class="card-tagline">${escapeHtml(item.tagline)}</p>
          ${deliverables}
        </div>
        <div class="card-right">
          <div class="modalities" data-role="modalities"></div>
          <div class="price-block">
            <span class="price" data-role="price"></span>
            <span class="suffix" data-role="suffix"></span>
          </div>
          <p class="pay" data-role="pay"></p>
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
        <h3 class="card-name">${escapeHtml(item.name)}</h3>
        <p class="card-tagline">${escapeHtml(item.tagline)}</p>
        ${deliverables}
        <div class="modalities" data-role="modalities"></div>
        <div class="price-block">
          <span class="price" data-role="price"></span>
          <span class="suffix" data-role="suffix"></span>
        </div>
        <p class="pay" data-role="pay"></p>
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
        mod.badge ? `<span class="modality-badge">${escapeHtml(mod.badge)}</span>` : "";
      btn.innerHTML = `
        <span class="modality-left">
          <span class="modality-label">${escapeHtml(mod.customLabel || mod.label)}</span>
          <span class="modality-pay">${escapeHtml(payText(item, mod))}</span>
        </span>
        ${badge}
      `;
      btn.addEventListener("click", () => {
        cardModality[item.id] = mod.id;
        if (cart[item.id]) {
          cart[item.id] = mod.id;
          persistCart();
          renderCart();
        }
        updateCardState(card, item);
      });
      modWrap.appendChild(btn);
    });

    // Add to cart
    const addBtn = $('[data-role="add"]', card);
    addBtn.addEventListener("click", () => {
      if (cart[item.id]) {
        delete cart[item.id];
      } else {
        cart[item.id] = cardModality[item.id];
      }
      persistCart();
      updateCardState(card, item);
      renderCart();
      bumpCount();
    });

    updateCardState(card, item);
    return card;
  }

  function updateCardState(card, item) {
    const activeId = cardModality[item.id];
    const mod = modalityOf(item, activeId);

    $$(".modality", card).forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.modalityId === activeId);
    });

    const priceEl = $('[data-role="price"]', card);
    const suffixEl = $('[data-role="suffix"]', card);
    const payEl = $('[data-role="pay"]', card);

    if (item.type === "performance") {
      priceEl.textContent = mod.customLabel || "Sob consulta";
      suffixEl.textContent = "";
    } else {
      priceEl.textContent = BRL.format(mod.price);
      suffixEl.textContent = mod.suffix || "";
    }
    payEl.textContent = payText(item, mod);

    const addBtn = $('[data-role="add"]', card);
    const inCart = !!cart[item.id];
    addBtn.classList.toggle("is-added", inCart);
    addBtn.textContent = inCart ? "✓ Adicionado à proposta" : "Adicionar à proposta";
  }

  // -------------------------- CARRINHO --------------------------------

  /**
   * Constrói os 4 grupos do carrinho. Cada item já chega com:
   *  - subtitle  → modalidade + forma de pagamento (parcela explícita)
   *  - priceText → R$ formatado a exibir na linha
   *  - removable → se aparece botão "remover" (setups nascem junto da mensalidade)
   *  - couponNote / discountedPrice → quando o cupom abate o item
   */
  function buildCartGroups() {
    const groups = {
      mensal: {
        title: "Mensalidade",
        sub: "Você paga todo mês",
        items: [],
        total: 0,
      },
      setups: {
        title: "Implantação",
        sub: "Pagamento único de setup, no início do contrato",
        items: [],
        total: 0,
      },
      projetos: {
        title: "Projetos pontuais",
        sub: "Entrega única — à vista ou parcelado",
        items: [],
        total: 0,
      },
      performance: {
        title: "Performance",
        sub: "Variável, conforme contratação",
        items: [],
        total: 0,
      },
    };

    Object.keys(cart).forEach((id) => {
      const found = findItem(id);
      if (!found) return;
      const { item } = found;
      const mod = modalityOf(item, cart[id]);

      if (item.type === "recurring" || item.type === "hybrid") {
        const baseLabel = mod.customLabel || mod.label;
        const subtitle = `${baseLabel} · ${payText(item, mod)}`;
        const discount = couponDiscountFor(item.id, mod.price);
        const finalPrice = mod.price - discount;
        groups.mensal.items.push({
          id: item.id,
          name: item.name,
          subtitle,
          priceText: BRL.format(finalPrice) + "/mês",
          basePriceText: discount > 0 ? BRL.format(mod.price) + "/mês" : null,
          couponNote:
            discount > 0
              ? `Cupom ${activeCoupon} · -${BRL.format(discount)}/mês`
              : null,
          removable: true,
        });
        groups.mensal.total += finalPrice;

        if (item.setup) {
          const parcela = Math.round(item.setup / 3);
          groups.setups.items.push({
            id: item.id + "__setup",
            name: item.name + " — setup",
            subtitle: `Pagamento único · 3× de ${BRL.format(parcela)} sem juros`,
            priceText: BRL.format(item.setup),
            removable: false,
          });
          groups.setups.total += item.setup;
        }
      } else if (item.type === "project") {
        const total = computeProjectTotal(mod);
        let subtitle;
        if (mod.id === "avista") {
          subtitle = `À vista · 10% off no Pix ou cartão`;
        } else if (mod.id === "parcelado") {
          subtitle = `Parcelado · 6× de ${BRL.format(mod.price)} sem juros`;
        } else {
          subtitle = mod.pay || mod.label;
        }
        groups.projetos.items.push({
          id: item.id,
          name: item.name,
          subtitle,
          priceText: BRL.format(total),
          removable: true,
        });
        groups.projetos.total += total;
      } else if (item.type === "performance") {
        groups.performance.items.push({
          id: item.id,
          name: item.name,
          subtitle: mod.customLabel
            ? `${mod.customLabel} · ${mod.pay}`
            : mod.pay || "Variável conforme contratação",
          priceText: "Variável",
          removable: true,
        });
      }
    });

    return groups;
  }

  function renderCart() {
    const drawer = $("#cartDrawer");
    const groupsEl = $("#cartGroups");
    const totalsEl = $("#cartTotals");
    const countEl = $("#cartCount");
    const checkoutBtn = $("#checkoutBtn");

    const ids = Object.keys(cart);
    countEl.textContent = String(ids.length);
    drawer.classList.toggle("has-items", ids.length > 0);
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

    const groups = buildCartGroups();

    Object.values(groups).forEach((g) => {
      if (g.items.length === 0) return;
      const block = document.createElement("div");
      block.className = "cart-group";
      block.innerHTML = `
        <header class="cart-group-head">
          <h4>${escapeHtml(g.title)}</h4>
          <span>${escapeHtml(g.sub)}</span>
        </header>
      `;
      g.items.forEach((row) => {
        const item = document.createElement("div");
        item.className = "cart-item";
        const removeBtn = row.removable
          ? `<button type="button" class="cart-item-remove" data-remove="${row.id}">remover</button>`
          : "";
        const couponTag = row.couponNote
          ? `<span class="cart-item-coupon">${escapeHtml(row.couponNote)}</span>`
          : "";
        const baseStrike = row.basePriceText
          ? `<span class="cart-item-strike">${escapeHtml(row.basePriceText)}</span>`
          : "";
        item.innerHTML = `
          <div class="cart-item-main">
            <div class="cart-item-title">${escapeHtml(row.name)}</div>
            <div class="cart-item-sub">${escapeHtml(row.subtitle)}</div>
            ${couponTag}
            ${removeBtn}
          </div>
          <div class="cart-item-price-block">
            ${baseStrike}
            <span class="cart-item-price">${escapeHtml(row.priceText)}</span>
          </div>
        `;
        block.appendChild(item);
      });
      groupsEl.appendChild(block);
    });

    // -------- Totais (formato "agora vs todo mês") --------
    totalsEl.innerHTML = "";
    const investimentoInicial = groups.setups.total + groups.projetos.total;

    if (investimentoInicial > 0) {
      totalsEl.appendChild(
        totalCard(
          "Investimento inicial",
          BRL.format(investimentoInicial),
          "Pago no início — setups e projetos. Pode ser à vista ou parcelado conforme cada item."
        )
      );
    }
    if (groups.mensal.total > 0) {
      totalsEl.appendChild(
        totalCard(
          "Todo mês",
          BRL.format(groups.mensal.total) + "/mês",
          "Mensalidade recorrente. Sem fidelidade — aviso prévio de 30 dias (60 dias no SDR).",
          true
        )
      );
    }
    if (groups.performance.items.length > 0) {
      totalsEl.appendChild(
        totalCard(
          "Performance",
          "Variável",
          "Cobrado por resultado da contratação. Os valores são alinhados em uma reunião dedicada."
        )
      );
    }

    // Estado do cupom (input + tag)
    renderCoupon();

    // Remover handlers
    $$("[data-remove]", groupsEl).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.remove;
        delete cart[id];
        persistCart();
        renderCart();
        const card = $(`.card[data-item-id="${id}"]`);
        if (card) {
          const found = findItem(id);
          if (found) updateCardState(card, found.item);
        }
      });
    });
  }

  function totalCard(label, value, hint, highlight = false) {
    const div = document.createElement("div");
    div.className = "cart-total-card" + (highlight ? " is-highlight" : "");
    div.innerHTML = `
      <div class="cart-total-card-row">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </div>
      <small>${escapeHtml(hint)}</small>
    `;
    return div;
  }

  function renderCoupon() {
    const wrap = $("#couponBlock");
    if (!wrap) return;
    if (activeCoupon) {
      const targetItem = findItem(COUPON_TARGET_ID)?.item;
      const targetName = targetItem ? targetItem.name : "item protagonista";
      const inCart = !!cart[COUPON_TARGET_ID];
      wrap.innerHTML = `
        <div class="coupon-applied">
          <div>
            <span class="coupon-tag">Cupom ${escapeHtml(activeCoupon)}</span>
            <small>${
              inCart
                ? `-${COUPON_PERCENT}% no ${escapeHtml(targetName)}`
                : `O desconto entra quando o ${escapeHtml(targetName)} estiver na proposta.`
            }</small>
          </div>
          <button type="button" id="couponRemove" class="coupon-remove" aria-label="Remover cupom">×</button>
        </div>
      `;
      $("#couponRemove").addEventListener("click", () => {
        activeCoupon = null;
        persistCoupon();
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
        persistCoupon();
        renderCart();
      });
    }
  }

  function computeProjectTotal(mod) {
    // Itens 'project' têm 'avista' (preço com 10% off) e 'parcelado' (price × 6).
    if (mod.id === "parcelado" && mod.suffix && mod.suffix.includes("× 6")) {
      return mod.price * 6;
    }
    return mod.price;
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
  }

  function closeCart() {
    $("#cartDrawer").classList.remove("is-open");
    $("#cartOverlay").classList.remove("is-open");
    $("#cartDrawer").setAttribute("aria-hidden", "true");
    $("#cartToggle").setAttribute("aria-expanded", "false");
    // ocultar overlay depois da transição
    setTimeout(() => {
      $("#cartOverlay").hidden = true;
    }, 250);
  }

  // -------------------------- PDF -------------------------------------

  function openLeadModal() {
    $("#leadModal").hidden = false;
    setTimeout(() => $("#leadEmpresa")?.focus(), 50);
  }

  function closeLeadModal() {
    $("#leadModal").hidden = true;
  }

  function generatePdf(lead = {}) {
    if (!window.jspdf) {
      alert("jsPDF ainda não carregou. Tente novamente em alguns segundos.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = 0;

    // === Cabeçalho banner ===
    doc.setFillColor(4, 19, 42); // --ink-900
    doc.rect(0, 0, pageW, 130, "F");
    doc.setFillColor(49, 122, 224);
    doc.circle(margin + 18, 40, 12, "S"); // anel 1
    doc.setDrawColor(240, 138, 58);
    doc.circle(margin + 32, 40, 12, "S"); // anel 2
    doc.setTextColor(244, 246, 252);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("ODuo", margin + 56, 46);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(180, 195, 230);
    doc.text(
      "A maior assessoria de Marketing para Locadoras da América Latina",
      margin + 56,
      62
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(244, 246, 252);
    doc.text("Proposta comercial", margin, 105);

    const hoje = new Date();
    const dataStr = hoje.toLocaleDateString("pt-BR");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(180, 195, 230);
    doc.text(`Emitida em ${dataStr}`, pageW - margin, 105, { align: "right" });

    if (lead.validadeDias && lead.validadeDias > 0) {
      const validade = new Date(hoje);
      validade.setDate(validade.getDate() + lead.validadeDias);
      const valStr = validade.toLocaleDateString("pt-BR");
      doc.setTextColor(240, 138, 58);
      doc.setFont("helvetica", "bold");
      doc.text(`Válida até ${valStr}`, pageW - margin, 119, { align: "right" });
    }

    y = 160;

    // === Dados do cliente ===
    if (lead.empresa || lead.contato || lead.cidade) {
      doc.setFillColor(244, 246, 252);
      doc.roundedRect(margin, y, pageW - margin * 2, 70, 8, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(7, 32, 74);
      doc.text("PROPOSTA PARA", margin + 16, y + 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(lead.empresa || "—", margin + 16, y + 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80, 100, 140);
      const subline = [lead.contato, lead.cidade].filter(Boolean).join("  ·  ");
      if (subline) doc.text(subline, margin + 16, y + 58);
      y += 90;
    }

    // === Resumo dos itens ===
    const summary = buildSummary();

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(7, 32, 74);
    doc.text("Itens da proposta", margin, y);
    y += 16;

    const groups = [
      { key: "mensal", title: "Mensalidade · pago todo mês" },
      { key: "setups", title: "Implantação · pagamento único de setup" },
      { key: "projetos", title: "Projetos pontuais · entrega única" },
      { key: "performance", title: "Performance · variável" },
    ];

    for (const g of groups) {
      const grp = summary.groups[g.key];
      if (!grp || grp.items.length === 0) continue;

      // título do grupo
      y = ensureSpace(doc, y, 60, pageH, margin);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(49, 122, 224);
      doc.text(g.title.toUpperCase(), margin, y);
      y += 6;
      doc.setDrawColor(220, 228, 240);
      doc.line(margin, y, pageW - margin, y);
      y += 14;

      for (const row of grp.items) {
        y = ensureSpace(doc, y, 56, pageH, margin);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(7, 32, 74);
        doc.text(row.title, margin, y);

        const priceText = row.priceText;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(7, 32, 74);
        doc.text(priceText, pageW - margin, y, { align: "right" });
        y += 14;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(80, 100, 140);
        const subLines = doc.splitTextToSize(row.sub, pageW - margin * 2 - 100);
        doc.text(subLines, margin, y);
        y += subLines.length * 12 + 8;
      }
      y += 4;
    }

    // === Totais ===
    const totalLines = [];
    if (summary.totals.investimentoInicial > 0)
      totalLines.push([
        "Investimento inicial (setups + projetos)",
        BRL.format(summary.totals.investimentoInicial),
      ]);
    if (summary.totals.mensal > 0)
      totalLines.push([
        "Todo mês (mensalidade)",
        BRL.format(summary.totals.mensal) + "/mês",
      ]);
    if (summary.hasPerformance)
      totalLines.push(["Performance", "Variável conforme contratação"]);

    const totalsBoxH = 36 + totalLines.length * 16;
    y = ensureSpace(doc, y, totalsBoxH + 8, pageH, margin);
    doc.setFillColor(7, 32, 74);
    doc.roundedRect(margin, y, pageW - margin * 2, totalsBoxH, 10, 10, "F");
    doc.setTextColor(244, 246, 252);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("RESUMO DA PROPOSTA", margin + 16, y + 22);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    let ty = y + 42;
    totalLines.forEach(([k, v]) => {
      doc.setTextColor(180, 195, 230);
      doc.text(k, margin + 16, ty);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(244, 246, 252);
      doc.text(v, pageW - margin - 16, ty, { align: "right" });
      doc.setFont("helvetica", "normal");
      ty += 16;
    });

    y += totalsBoxH + 14;

    // === Cupom aplicado ===
    if (summary.coupon) {
      y = ensureSpace(doc, y, 60, pageH, margin);
      doc.setFillColor(233, 248, 241);
      doc.roundedRect(margin, y, pageW - margin * 2, 44, 8, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(31, 138, 91);
      doc.text(`Cupom ${summary.coupon} aplicado`, margin + 14, y + 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 90, 70);
      doc.text(
        `-${summary.couponPercent}% no Plano Avança Locações já refletidos no valor mensal acima.`,
        margin + 14,
        y + 34
      );
      y += 56;
    }

    // === Observações da call (entram no PDF do cliente) ===
    if (lead.observacoes) {
      y = ensureSpace(doc, y, 100, pageH, margin);
      doc.setFillColor(253, 242, 225); // laranja claro
      const obsLines = doc.splitTextToSize(lead.observacoes, pageW - margin * 2 - 32);
      const boxH = 36 + obsLines.length * 13;
      doc.roundedRect(margin, y, pageW - margin * 2, boxH, 10, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(227, 111, 26);
      doc.text("OBSERVAÇÕES DESTA PROPOSTA", margin + 16, y + 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 60, 90);
      doc.text(obsLines, margin + 16, y + 36);
      y += boxH + 16;
    }

    // === Rodapé condições padrão ===
    y = ensureSpace(doc, y, 80, pageH, margin);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 130, 160);
    const obs = [
      "Sem fidelidade mínima nos planos recorrentes (aviso prévio de 30 dias, salvo SDR que possui 60 dias).",
      "Projetos pontuais: 10% off à vista ou 6× sem juros no cartão.",
      "Hunter de RH e SDR fecham em 2ª reunião com a CRO Isabelly.",
    ];
    obs.forEach((line) => {
      const lines = doc.splitTextToSize("• " + line, pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 11 + 2;
    });

    // === Rodapé final ===
    const footY = pageH - 30;
    doc.setDrawColor(220, 228, 240);
    doc.line(margin, footY - 10, pageW - margin, footY - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 160, 190);
    doc.text("ODuo · Cardápio de Upsells V2.11", margin, footY);
    doc.text(
      "oduo.com.br",
      pageW - margin,
      footY,
      { align: "right" }
    );

    const fileName = `proposta-oduo-${slug(lead.empresa || "lead")}-${ymd(hoje)}.pdf`;
    doc.save(fileName);
  }

  function ensureSpace(doc, y, needed, pageH, margin) {
    if (y + needed > pageH - margin) {
      doc.addPage();
      return margin;
    }
    return y;
  }

  /** Constrói o resumo do PDF a partir dos mesmos grupos usados na UI. */
  function buildSummary() {
    const groups = buildCartGroups();
    const summary = {
      groups: {
        mensal: {
          title: "Mensalidade · pago todo mês",
          items: groups.mensal.items.map((r) => ({
            title: r.name,
            sub: r.subtitle + (r.couponNote ? " · " + r.couponNote : ""),
            priceText: r.priceText,
          })),
        },
        setups: {
          title: "Implantação · pagamento único de setup",
          items: groups.setups.items.map((r) => ({
            title: r.name,
            sub: r.subtitle,
            priceText: r.priceText,
          })),
        },
        projetos: {
          title: "Projetos pontuais · entrega única",
          items: groups.projetos.items.map((r) => ({
            title: r.name,
            sub: r.subtitle,
            priceText: r.priceText,
          })),
        },
        performance: {
          title: "Performance · variável",
          items: groups.performance.items.map((r) => ({
            title: r.name,
            sub: r.subtitle,
            priceText: r.priceText,
          })),
        },
      },
      totals: {
        mensal: groups.mensal.total,
        setups: groups.setups.total,
        projetos: groups.projetos.total,
        investimentoInicial: groups.setups.total + groups.projetos.total,
      },
      hasPerformance: groups.performance.items.length > 0,
      coupon: activeCoupon,
      couponPercent: COUPON_PERCENT,
    };
    return summary;
  }

  // -------------------------- HELPERS ---------------------------------

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slug(s) {
    return String(s)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "lead";
  }

  function ymd(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // -------------------------- BOOT ------------------------------------

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.ODUO_CATALOG) {
      console.error("ODUO_CATALOG não foi carregado.");
      return;
    }

    renderCatalog();
    renderCart();

    $("#cartToggle").addEventListener("click", openCart);
    $("#cartClose").addEventListener("click", closeCart);
    $("#cartOverlay").addEventListener("click", closeCart);

    $("#clearCartBtn").addEventListener("click", () => {
      if (Object.keys(cart).length === 0 && !activeCoupon) return;
      if (!confirm("Limpar todos os itens da proposta?")) return;
      Object.keys(cart).forEach((k) => delete cart[k]);
      activeCoupon = null;
      persistCart();
      persistCoupon();
      renderCart();
      $$(".card").forEach((card) => {
        const id = card.dataset.itemId;
        if (!id) return;
        const found = findItem(id);
        if (found) updateCardState(card, found.item);
      });
    });

    // Fechar com ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#cartDrawer").classList.contains("is-open")) {
        closeCart();
      }
    });
  });
})();
