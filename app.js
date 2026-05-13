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

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /** Estado em memória do carrinho: { [itemId]: modalityId } */
  const cart = ODUO.loadCart();
  /** Modalidade atualmente exibida em cada card (não significa "no carrinho") */
  const cardModality = {};
  /** Cupom ativo (string em maiúsculas) ou null */
  let activeCoupon = ODUO.loadCoupon();
  /** Cadência global da proposta · mensal | semestral | anual */
  let activeCadence = ODUO.loadCadence();

  function defaultModality(item) {
    // Respeita a cadência global se o item tiver — assim a UI já abre alinhada
    // com o que vai ser cobrado quando o cliente adicionar à proposta.
    const inCadence = item.modalities.find((m) => m.id === activeCadence);
    if (inCadence) return inCadence.id;
    const mensal = item.modalities.find((m) => m.id === "mensal");
    if (mensal) return mensal.id;
    const avista = item.modalities.find((m) => m.id === "avista");
    if (avista) return avista.id;
    return item.modalities[0].id;
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
        return `<li class="${strike.trim()}">${ODUO.escapeHtml(d)}</li>`;
      })
      .join("");
    const deliverables = deliverablesItems
      ? `<div class="deliverables-wrap">
           <span class="deliverables-title">O que está incluído</span>
           <ul class="deliverables">${deliverablesItems}</ul>
         </div>`
      : "";

    const groupLabel = item.group ? `<p class="card-group">${ODUO.escapeHtml(item.group)}</p>` : "";

    const setup = item.setup
      ? `<div class="setup-row">
           <span>Setup único</span>
           <span>${BRL.format(item.setup)}</span>
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
      btn.innerHTML = `
        <span class="modality-left">
          <span class="modality-label">${ODUO.escapeHtml(mod.customLabel || mod.label)}</span>
          <span class="modality-pay">${ODUO.escapeHtml(ODUO.payText(item, mod))}</span>
        </span>
        ${badge}
      `;
      btn.addEventListener("click", () => {
        cardModality[item.id] = mod.id;
        if (cart[item.id]) {
          cart[item.id] = mod.id;
          ODUO.persistCart(cart);
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
      ODUO.persistCart(cart);
      updateCardState(card, item);
      renderCart();
      bumpCount();
    });

    updateCardState(card, item);
    return card;
  }

  function updateCardState(card, item) {
    const activeId = cardModality[item.id];
    const mod = ODUO.modalityOf(item, activeId);

    $$(".modality", card).forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.modalityId === activeId);
    });

    const priceEl = $('[data-role="price"]', card);
    const suffixEl = $('[data-role="suffix"]', card);

    if (item.type === "performance") {
      priceEl.textContent = mod.customLabel || "Sob consulta";
      suffixEl.textContent = "";
    } else {
      priceEl.textContent = BRL.format(mod.price);
      suffixEl.textContent = mod.suffix || "";
    }

    // "Economiza R$ X/mês" quando a modalidade selecionada bate desconto
    // contra o preço mensal de referência. Só faz sentido em recorrentes/híbridos.
    const savingsEl = $('[data-role="savings"]', card);
    if (savingsEl) {
      const mensalMod = item.modalities.find((m) => m.id === "mensal");
      const isRecurringLike = item.type === "recurring" || item.type === "hybrid";
      if (
        isRecurringLike &&
        mensalMod &&
        mod.id !== "mensal" &&
        mod.price > 0 &&
        mensalMod.price > mod.price
      ) {
        const saveMonth = mensalMod.price - mod.price;
        const saveYear = saveMonth * 12;
        savingsEl.hidden = false;
        savingsEl.innerHTML = `
          <span>Economia ${ODUO.escapeHtml(LABEL_BY_CADENCE[mod.id] || mod.label)}</span>
          <strong>−${ODUO.escapeHtml(BRL.format(saveMonth))}/mês</strong>
        `;
        savingsEl.title = `Economia anual: ${BRL.format(saveYear)}`;
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
        const deliverablesToggle = hasDeliverables
          ? `<button type="button" class="cart-item-toggle" data-toggle-deliverables aria-expanded="false">
               <span>Ver entregáveis</span>
               <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 6l4 4 4-4"/></svg>
             </button>`
          : "";
        const deliverablesList = hasDeliverables
          ? `<ul class="cart-item-deliverables" hidden>
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
            ${deliverablesToggle}
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
    if (investimentoInicial > 0) {
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
      });
    });

    // Accordion dos entregáveis dentro do item do carrinho
    $$("[data-toggle-deliverables]", groupsEl).forEach((btn) => {
      btn.addEventListener("click", () => {
        const list = btn.parentElement.querySelector(".cart-item-deliverables");
        if (!list) return;
        const expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
        list.hidden = expanded;
        btn.querySelector("span").textContent = expanded ? "Ver entregáveis" : "Ocultar";
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

  /** Trio de botões [Mensal · Semestral · Anual] que rege a proposta inteira. */
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

    const isAnual = bundle.cadence === "anual";
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
      const couponLine = bundle.couponDiscountTotal > 0
        ? `
          <div class="cart-bundle-coupon">
            <span>Cupom ${ODUO.escapeHtml(bundle.couponCode)} aplicado</span>
            <strong>−${ODUO.escapeHtml(BRL.format(bundle.couponDiscountTotal))}</strong>
          </div>`
        : "";
      const savings = bundle.savingsTotal > 0
        ? `
          <div class="cart-bundle-savings">
            <span>Economia no ${isAnual ? "anual" : "semestral"}</span>
            <strong>−${ODUO.escapeHtml(BRL.format(bundle.savingsTotal))}</strong>
          </div>`
        : "";
      div.innerHTML = `
        <div class="cart-bundle-top">
          <span class="cart-bundle-kicker">${ODUO.escapeHtml(bundle.contractLabel)}</span>
          <strong class="cart-bundle-value">${bundle.parcelas}× ${ODUO.escapeHtml(BRL.format(bundle.parcelaPrice))}</strong>
        </div>
        <div class="cart-bundle-total-row">
          <span>Total contratado</span>
          <strong>${ODUO.escapeHtml(BRL.format(bundle.totalContratado))}</strong>
        </div>
        ${couponLine}
        ${savings}
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
  }

  function closeCart() {
    $("#cartDrawer").classList.remove("is-open");
    $("#cartOverlay").classList.remove("is-open");
    $("#cartDrawer").setAttribute("aria-hidden", "true");
    $("#cartToggle").setAttribute("aria-expanded", "false");
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

    $("#cartToggle").addEventListener("click", openCart);
    $("#cartClose").addEventListener("click", closeCart);
    $("#cartOverlay").addEventListener("click", closeCart);

    $("#clearCartBtn").addEventListener("click", () => {
      if (Object.keys(cart).length === 0 && !activeCoupon) return;
      if (!confirm("Limpar todos os itens da proposta?")) return;
      Object.keys(cart).forEach((k) => delete cart[k]);
      activeCoupon = null;
      activeCadence = "mensal";
      ODUO.persistCart(cart);
      ODUO.persistCoupon(null);
      ODUO.persistCadence("mensal");
      renderCart();
      $$(".card").forEach((card) => {
        const id = card.dataset.itemId;
        if (!id) return;
        const found = ODUO.findItem(id);
        if (found) {
          cardModality[id] = defaultModality(found.item);
          updateCardState(card, found.item);
        }
      });
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && $("#cartDrawer").classList.contains("is-open")) {
        closeCart();
      }
    });
  });
})();
