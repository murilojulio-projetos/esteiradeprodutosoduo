/* =====================================================================
   ODuo · Esteira de Produtos · oduo-core.js
   Helpers compartilhados entre index (cardápio) e proposta (checkout).
   Carregue SEMPRE depois de product-data.js.
   ===================================================================== */

(() => {
  const STORAGE_KEY = "oduo_cart_v1";
  const COUPON_KEY = "oduo_coupon_v1";
  const CADENCE_KEY = "oduo_cadence_v1";
  /* Customizações por item: hoje só desconfigurar o Avança (tirar entregáveis
     removíveis pra baixar o preço). Formato:
       { "avanca": { removed: ["gmb", "relatorio-semanal"] } } */
  const CUSTOM_KEY = "oduo_customizations_v1";

  // Desconto adicional no item protagonista quando QUALQUER cupom estiver ativo.
  const COUPON_PERCENT = 5;
  const COUPON_TARGET_ID = "avanca";

  // Cadências válidas globalmente. O anual saiu do sistema — o closer negocia
  // anual direto com o cliente, fora da esteira. Restam mensal/trimestral/semestral.
  const CADENCES = ["mensal", "trimestral", "semestral"];
  const PARCELAS_BY_CADENCE = { mensal: 1, trimestral: 3, semestral: 6 };
  const LABEL_BY_CADENCE = {
    mensal: "Mensal",
    trimestral: "Trimestral",
    semestral: "Semestral",
  };

  // IDs do plano-base. Se algum deles está no carrinho com cadência
  // trimestral/semestral, os projetos/setups são embutidos na mesma parcela.
  const PLANO_BASE_IDS = ["avanca", "destrava"];

  const BRL = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

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

  function persistCart(cart) {
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

  function persistCoupon(coupon) {
    try {
      if (coupon) localStorage.setItem(COUPON_KEY, coupon);
      else localStorage.removeItem(COUPON_KEY);
    } catch {
      /* ignore */
    }
  }

  function loadCadence() {
    try {
      const raw = localStorage.getItem(CADENCE_KEY);
      if (CADENCES.includes(raw)) return raw;
    } catch {}
    return "mensal";
  }

  function persistCadence(cadence) {
    try {
      if (CADENCES.includes(cadence)) {
        localStorage.setItem(CADENCE_KEY, cadence);
      }
    } catch {
      /* ignore */
    }
  }

  /* ============ Customizações (desconfigurar plano-base) ============ */

  function loadCustomizations() {
    try {
      const raw = localStorage.getItem(CUSTOM_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return typeof parsed === "object" && parsed ? parsed : {};
    } catch {
      return {};
    }
  }

  function persistCustomizations(custom) {
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom || {}));
    } catch {
      /* ignore */
    }
  }

  /** Aceita string (CORE) ou objeto {name, removeId, ...} e devolve o nome. */
  function deliverableName(deliverable) {
    return typeof deliverable === "string"
      ? deliverable
      : (deliverable && deliverable.name) || "";
  }

  /** True se a entrega tem removeId definido (= é descartável pelo cliente). */
  function isRemovableDeliverable(deliverable) {
    return (
      typeof deliverable === "object" &&
      deliverable !== null &&
      typeof deliverable.removeId === "string"
    );
  }

  function getRemovedIds(itemId, customizations) {
    const c = (customizations || {})[itemId];
    return (c && Array.isArray(c.removed)) ? c.removed : [];
  }

  /** Soma o desconto mensal das entregas removidas. */
  function computeRemovalDiscount(item, removedIds) {
    if (!item || !item.deliverables || !removedIds || removedIds.length === 0) return 0;
    return item.deliverables.reduce((sum, d) => {
      if (isRemovableDeliverable(d) && removedIds.includes(d.removeId)) {
        return sum + (Number(d.removeDiscount) || 0);
      }
      return sum;
    }, 0);
  }

  /** Toggle in-place. Retorna o objeto mutado pra chainar com persist. */
  function toggleRemoval(itemId, removeId, customizations) {
    if (!customizations[itemId]) customizations[itemId] = { removed: [] };
    const removed = customizations[itemId].removed;
    const idx = removed.indexOf(removeId);
    if (idx >= 0) removed.splice(idx, 1);
    else removed.push(removeId);
    // Limpa o item se ficou vazio (mantém localStorage enxuto)
    if (removed.length === 0) delete customizations[itemId];
    return customizations;
  }

  function findItem(itemId) {
    if (!window.ODUO_CATALOG) return null;
    for (const section of window.ODUO_CATALOG) {
      for (const item of section.items) {
        if (item.id === itemId) return { item, section };
      }
    }
    return null;
  }

  function modalityOf(item, modalityId) {
    return item.modalities.find((m) => m.id === modalityId) || item.modalities[0];
  }

  /** Enriquece o texto da modalidade com a parcela explícita. */
  function payText(item, mod) {
    if (!mod) return "";
    if ((item.type === "recurring" || item.type === "hybrid") && mod.price > 0) {
      if (mod.id === "trimestral") return `3× de ${BRL.format(mod.price)} no cartão`;
      if (mod.id === "semestral") return `6× de ${BRL.format(mod.price)} no cartão`;
    }
    return mod.pay || "";
  }

  /** Total do projeto: para 'parcelado', some o valor de todas as parcelas
      lendo o número do suffix (" × 6", " × 12", etc.). */
  function computeProjectTotal(mod) {
    if (mod.id === "parcelado" && mod.suffix) {
      const m = mod.suffix.match(/×\s*(\d+)/);
      if (m) return mod.price * parseInt(m[1], 10);
    }
    return mod.price;
  }

  /** Desconto do cupom para um item específico. Recebe o cupom explicitamente. */
  function couponDiscountFor(itemId, basePrice, coupon) {
    if (!coupon) return 0;
    if (itemId !== COUPON_TARGET_ID) return 0;
    return Math.round(basePrice * (COUPON_PERCENT / 100));
  }

  /**
   * Sincroniza todos os itens recorrentes/híbridos do `cart` para a `cadence`
   * pedida. Itens que NÃO têm a modalidade pedida (ex.: Pacote de Artes só
   * vem em mensal) ficam inalterados — eles vão acompanhar o plano-base na
   * apresentação. Muta `cart` e retorna o mesmo objeto.
   */
  function applyCadence(cart, cadence) {
    if (!CADENCES.includes(cadence)) return cart;
    Object.keys(cart).forEach((id) => {
      const found = findItem(id);
      if (!found) return;
      const { item } = found;
      if (item.type !== "recurring" && item.type !== "hybrid") return;
      const target = item.modalities.find((m) => m.id === cadence);
      if (target) cart[id] = target.id;
    });
    return cart;
  }

  /**
   * Constrói os grupos do carrinho a partir de `cart`, `coupon` e a
   * `globalCadence` que rege a apresentação do bloco "fechando o ano".
   *
   * Retorna além dos 4 grupos um objeto `bundle` com a leitura B2B:
   *   - parcelas       → 1, 3 ou 6 conforme a cadência
   *   - parcelaPrice   → soma de (mensalidade final) de todos os recorrentes
   *   - totalContratado→ parcelaPrice × parcelas (o valor total do contrato)
   *   - paymentLabel   → "Boleto/Pix mensal" ou "6× no cartão"
   *
   * Itens que não têm a cadência pedida (Pacote de Artes etc.) entram no
   * cálculo do bundle pelo preço mensal, mas com nota "Acompanha o plano".
   */
  function buildCartGroups(cart, coupon, globalCadence, customizations) {
    const cadence = CADENCES.includes(globalCadence) ? globalCadence : "mensal";
    const parcelas = PARCELAS_BY_CADENCE[cadence];
    /* Customizações por item (entregas removidas pelo cliente).
       Lido do localStorage se não vier explicitamente. */
    const custom = customizations || loadCustomizations();

    // Detecta se o plano-base está no carrinho e qual a cadência DELE.
    // Se o plano-base tá em trimestral/semestral, projetos/setups são embutidos
    // na mesma parcela do cartão (1 conta só pro cliente).
    const planoBaseInCart = PLANO_BASE_IDS.find((id) => cart[id]);
    const planoBaseMod = planoBaseInCart ? cart[planoBaseInCart] : null;
    const shouldEmbed = planoBaseMod && planoBaseMod !== "mensal";

    const groups = {
      mensal: {
        title: "Mensalidade",
        sub:
          cadence === "mensal"
            ? "Você paga todo mês"
            : `${LABEL_BY_CADENCE[cadence]} · ${parcelas}× no cartão`,
        items: [],
        total: 0,
      },
      setups: {
        title: "Implantação",
        sub: "Setup único · cobrado no início",
        items: [],
        total: 0,
      },
      projetos: {
        title: "Projetos pontuais",
        sub: "Entrega única · à vista ou parcelado",
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

    // Total que o cliente pagaria se tudo fosse contratado em modalidade
    // mensal — usado para mostrar a economia da cadência atual.
    let mensalEquivalentTotal = 0;
    // Desconto total do cupom aplicado nesta cadência (soma os `discount`
    // de cada linha — hoje só o item protagonista, mas a soma é genérica).
    let couponDiscountTotal = 0;

    Object.keys(cart).forEach((id) => {
      const found = findItem(id);
      if (!found) return;
      const { item } = found;
      const mod = modalityOf(item, cart[id]);

      if (item.type === "recurring" || item.type === "hybrid") {
        const hasRequestedCadence = item.modalities.some((m) => m.id === cadence);
        const followsBase = cadence !== "mensal" && !hasRequestedCadence;

        /* Customizações: cliente removeu entregas removíveis → desconto fixo
           no preço da modalidade. Quando há remoções, o nome do plano também
           muda pra "Avança Custom" / "Custom" pra deixar claro que não é o
           pacote-padrão. */
        const removedIds = getRemovedIds(item.id, custom);
        const removalDiscount = computeRemovalDiscount(item, removedIds);
        const effectiveModPrice = Math.max(0, mod.price - removalDiscount);
        const customName = removedIds.length > 0 ? `${item.name} (Custom)` : null;

        const discount = couponDiscountFor(item.id, effectiveModPrice, coupon);
        const finalPrice = effectiveModPrice - discount;
        couponDiscountTotal += discount;

        // Para a economia: preço mensal de referência do item (se existir).
        // Cupom é só do item protagonista e só conta uma vez — aqui o mensal
        // de referência também desconta o cupom pra comparar "maçã com maçã".
        const mensalMod = item.modalities.find((m) => m.id === "mensal");
        const mensalRefBase = mensalMod ? mensalMod.price - removalDiscount : effectiveModPrice;
        const mensalRef = mensalMod
          ? mensalRefBase - couponDiscountFor(item.id, mensalRefBase, coupon)
          : finalPrice;
        mensalEquivalentTotal += mensalRef;
        const savingsPerMonth = Math.max(0, mensalRef - finalPrice);

        // Subtitle padronizado pra TODOS os items recurring/hybrid:
        // - Item com modalidade própria (trimestral/semestral/mensal) → usa a modalidade que ele tem
        // - Item só-mensal que segue plano-base (followsBase) → usa a cadência da proposta
        // Parcelas seguem a cadência efetiva, não a cadência global da proposta.
        const effectiveCadence = followsBase ? cadence : mod.id;
        const effectiveParcelas = PARCELAS_BY_CADENCE[effectiveCadence] || 1;
        const cadenceLabel = LABEL_BY_CADENCE[effectiveCadence] || "Mensal";
        const subtitle = effectiveCadence === "mensal"
          ? `${cadenceLabel} · boleto bancário ou Pix`
          : `${cadenceLabel} · ${effectiveParcelas}× no cartão de crédito sem juros`;

        /* Filtra entregas removidas pra exibição (cart drawer + PDF).
           Normaliza pra string[] pra consumidores não precisarem checar tipo. */
        const visibleDeliverables = item.deliverables
          ? item.deliverables
              .filter((d) => !(isRemovableDeliverable(d) && removedIds.includes(d.removeId)))
              .map(deliverableName)
          : null;

        groups.mensal.items.push({
          id: item.id,
          name: customName || item.name,
          originalName: item.name,
          isCustom: removedIds.length > 0,
          removedIds,
          removalDiscount,
          group: item.group || null,
          subtitle,
          basePrice: effectiveModPrice,
          finalPrice,
          discount,
          mensalRef,
          savingsPerMonth,
          priceText: BRL.format(finalPrice) + "/mês",
          basePriceText:
            discount > 0 || removalDiscount > 0
              ? BRL.format(mod.price) + "/mês"
              : null,
          couponNote:
            discount > 0
              ? `Cupom ${coupon} · -${BRL.format(discount)}/mês`
              : null,
          removalNote:
            removalDiscount > 0
              ? `Personalizado · -${BRL.format(removalDiscount)}/mês`
              : null,
          followsBase,
          deliverables: visibleDeliverables,
          removable: true,
        });
        groups.mensal.total += finalPrice;

        if (item.setup) {
          const setupParcela = Math.round(item.setup / 3);
          const setupEmbeddedPerMonth = shouldEmbed
            ? Math.round(item.setup / parcelas)
            : null;
          groups.setups.items.push({
            id: item.id + "__setup",
            parentId: item.id,
            name: item.name + " — setup",
            subtitle: shouldEmbed
              ? `Embutido · ${parcelas}× ${BRL.format(setupEmbeddedPerMonth)} no cartão de crédito sem juros`
              : `Pagamento único · 3× de ${BRL.format(setupParcela)} no cartão de crédito sem juros`,
            priceText: shouldEmbed
              ? BRL.format(setupEmbeddedPerMonth) + "/mês"
              : BRL.format(item.setup),
            value: item.setup,
            embedded: shouldEmbed,
            embeddedPerMonth: setupEmbeddedPerMonth,
            removable: false,
          });
          groups.setups.total += item.setup;
        }
      } else if (item.type === "project") {
        /* Customizações também valem pra project (ex.: remover a IA do
           Programa de Estruturação Comercial abate um valor fixo do total). */
        const removedIds = getRemovedIds(item.id, custom);
        const removalDiscount = computeRemovalDiscount(item, removedIds);
        const rawTotal = computeProjectTotal(mod);
        const total = Math.max(0, rawTotal - removalDiscount);
        const customName = removedIds.length > 0 ? `${item.name} (Custom)` : null;

        const parcelaMatch = (mod.suffix || "").match(/×\s*(\d+)/);
        const projectParcelas = parcelaMatch ? parseInt(parcelaMatch[1], 10) : 6;
        const projectEmbeddedPerMonth = shouldEmbed
          ? Math.round(total / parcelas)
          : null;
        // Parcela recalculada com o desconto aplicado
        const parcelaValor = Math.round(total / projectParcelas);
        let subtitle;
        if (shouldEmbed) {
          subtitle = `Embutido · ${parcelas}× ${BRL.format(projectEmbeddedPerMonth)} no cartão de crédito sem juros`;
        } else if (mod.id === "avista") {
          subtitle = `À vista · 10% off no Pix ou cartão de crédito`;
        } else if (mod.id === "parcelado") {
          subtitle = `Parcelado · ${projectParcelas}× de ${BRL.format(parcelaValor)} no cartão de crédito sem juros`;
        } else {
          subtitle = mod.pay || mod.label;
        }

        const visibleDeliverables = item.deliverables
          ? item.deliverables
              .filter((d) => !(isRemovableDeliverable(d) && removedIds.includes(d.removeId)))
              .map(deliverableName)
          : null;

        groups.projetos.items.push({
          id: item.id,
          name: customName || item.name,
          originalName: item.name,
          isCustom: removedIds.length > 0,
          removedIds,
          removalDiscount,
          removalNote:
            removalDiscount > 0
              ? `Personalizado · -${BRL.format(removalDiscount)}`
              : null,
          basePriceText: removalDiscount > 0 ? BRL.format(rawTotal) : null,
          group: item.group || null,
          subtitle,
          priceText: shouldEmbed
            ? BRL.format(projectEmbeddedPerMonth) + "/mês"
            : BRL.format(total),
          value: total,
          modId: mod.id,
          projectParcelas,
          embedded: shouldEmbed,
          embeddedPerMonth: projectEmbeddedPerMonth,
          deliverables: visibleDeliverables,
          removable: true,
        });
        groups.projetos.total += total;
      } else if (item.type === "performance") {
        groups.performance.items.push({
          id: item.id,
          name: item.name,
          group: item.group || null,
          subtitle: mod.customLabel
            ? `${mod.customLabel} · ${mod.pay}`
            : mod.pay || "Variável conforme contratação",
          priceText: "Variável",
          removable: true,
        });
      }
    });

    // Embute setups+projetos na mesma parcela do plano-base (quando o
    // plano-base é trimestral/semestral). Caso contrário, ficam no fluxo
    // antigo de "Entrega Única".
    const embeddedTotal = shouldEmbed
      ? groups.setups.total + groups.projetos.total
      : 0;
    const embeddedPerMonth = shouldEmbed
      ? Math.round(embeddedTotal / parcelas)
      : 0;

    const parcelaPrice = groups.mensal.total + embeddedPerMonth;
    const totalContratado = parcelaPrice * parcelas;
    const totalMensalEquivalente = mensalEquivalentTotal * parcelas;
    const savingsPerMonth = Math.max(0, mensalEquivalentTotal - (parcelaPrice - embeddedPerMonth));
    const savingsTotal = savingsPerMonth * parcelas;
    const bundle = {
      cadence,
      cadenceLabel: LABEL_BY_CADENCE[cadence],
      parcelas,
      parcelaPrice,
      totalContratado,
      mensalEquivalentPerMonth: mensalEquivalentTotal,
      totalMensalEquivalente,
      savingsPerMonth,
      savingsTotal,
      couponCode: coupon || null,
      couponDiscountPerMonth: couponDiscountTotal,
      couponDiscountTotal: couponDiscountTotal * parcelas,
      hasEmbedded: shouldEmbed && embeddedTotal > 0,
      embeddedTotal,
      embeddedPerMonth,
      planoBaseInCart: planoBaseInCart || null,
      paymentLabel:
        cadence === "mensal"
          ? "Boleto ou Pix · sem fidelidade"
          : `${parcelas}× no cartão de crédito · sem juros · período fechado`,
      contractLabel:
        cadence === "trimestral"
          ? "Fechando 3 meses"
          : cadence === "semestral"
          ? "Fechando 6 meses"
          : "Mensalidade",
    };

    return { ...groups, bundle };
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function slug(s) {
    return (
      String(s)
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 40) || "lead"
    );
  }

  function ymd(d) {
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  /* ===================================================================
     Acessibilidade de modais — foco preso dentro do modal aberto.
     - modalFocusIn(el):  guarda o foco atual e move o foco pra dentro.
     - modalFocusRestore(): devolve o foco pro elemento que abriu.
     - O "trap" de Tab é global e automático: qualquer `.modal` visível
       prende o Tab — os modais só precisam chamar focusIn/Restore.
     =================================================================== */
  let _modalLastFocus = null;
  const FOCUSABLE =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function visibleFocusables(root) {
    return Array.from(root.querySelectorAll(FOCUSABLE)).filter(
      (el) => el.offsetParent !== null || el === document.activeElement
    );
  }

  function modalFocusIn(modalEl) {
    if (!modalEl) return;
    _modalLastFocus = document.activeElement;
    const card = modalEl.querySelector(".modal-card") || modalEl;
    if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "-1");
    const first = visibleFocusables(modalEl)[0];
    (first || card).focus();
  }

  function modalFocusRestore() {
    const el = _modalLastFocus;
    _modalLastFocus = null;
    if (el && typeof el.focus === "function") {
      try { el.focus(); } catch (e) { /* elemento saiu do DOM */ }
    }
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;
    const modal = document.querySelector(".modal:not([hidden])");
    if (!modal) return;
    const f = visibleFocusables(modal);
    if (!f.length) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    } else if (!modal.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    }
  });

  /* Diálogo de confirmação estilizado — substitui o confirm() nativo do
     browser (popup cinza do SO que destoa e assusta no meio do pitch).
     Retorna uma Promise<boolean>. */
  function confirmDialog(opts) {
    const o = opts || {};
    return new Promise((resolve) => {
      const overlay = document.createElement("div");
      overlay.className = "modal confirm-modal";
      overlay.innerHTML =
        '<div class="modal-card confirm-card" role="alertdialog" aria-modal="true">' +
        `<h3>${escapeHtml(o.title || "Confirmar")}</h3>` +
        `<p>${escapeHtml(o.message || "")}</p>` +
        '<div class="confirm-actions">' +
        `<button type="button" class="btn btn-ghost" data-act="cancel">${escapeHtml(o.cancelLabel || "Cancelar")}</button>` +
        `<button type="button" class="btn btn-primary" data-act="ok">${escapeHtml(o.okLabel || "Confirmar")}</button>` +
        "</div></div>";
      const prevFocus = document.activeElement;
      document.body.appendChild(overlay);
      document.body.style.overflow = "hidden";
      function close(result) {
        overlay.remove();
        document.body.style.overflow = "";
        if (prevFocus && typeof prevFocus.focus === "function") {
          try { prevFocus.focus(); } catch (e) { /* saiu do DOM */ }
        }
        resolve(result);
      }
      overlay.querySelector('[data-act="ok"]').addEventListener("click", () => close(true));
      overlay.querySelector('[data-act="cancel"]').addEventListener("click", () => close(false));
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) close(false);
      });
      overlay.addEventListener("keydown", (e) => {
        if (e.key === "Escape") close(false);
      });
      overlay.querySelector('[data-act="ok"]').focus();
    });
  }

  window.ODUO = {
    STORAGE_KEY,
    COUPON_KEY,
    CADENCE_KEY,
    CUSTOM_KEY,
    COUPON_PERCENT,
    COUPON_TARGET_ID,
    CADENCES,
    PARCELAS_BY_CADENCE,
    LABEL_BY_CADENCE,
    BRL,
    loadCart,
    persistCart,
    loadCoupon,
    persistCoupon,
    loadCadence,
    persistCadence,
    applyCadence,
    loadCustomizations,
    persistCustomizations,
    deliverableName,
    isRemovableDeliverable,
    getRemovedIds,
    computeRemovalDiscount,
    toggleRemoval,
    findItem,
    modalityOf,
    payText,
    computeProjectTotal,
    couponDiscountFor,
    buildCartGroups,
    escapeHtml,
    slug,
    ymd,
    modalFocusIn,
    modalFocusRestore,
    confirmDialog,
  };
})();
