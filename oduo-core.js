/* =====================================================================
   ODuo · Esteira de Produtos · oduo-core.js
   Helpers compartilhados entre index (cardápio) e proposta (checkout).
   Carregue SEMPRE depois de product-data.js.
   ===================================================================== */

(() => {
  const STORAGE_KEY = "oduo_cart_v1";
  const COUPON_KEY = "oduo_coupon_v1";
  const CADENCE_KEY = "oduo_cadence_v1";

  // Desconto adicional no item protagonista quando QUALQUER cupom estiver ativo.
  const COUPON_PERCENT = 5;
  const COUPON_TARGET_ID = "avanca";

  // Cadências válidas globalmente. Quem manda na soma anual é esta lista.
  const CADENCES = ["mensal", "semestral", "anual"];
  const PARCELAS_BY_CADENCE = { mensal: 1, semestral: 6, anual: 12 };
  const LABEL_BY_CADENCE = {
    mensal: "Mensal",
    semestral: "Semestral",
    anual: "Anual",
  };

  // IDs do plano-base. Se algum deles está no carrinho com cadência
  // anual/semestral, os projetos/setups são embutidos na mesma parcela.
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
      if (mod.id === "semestral") return `6× de ${BRL.format(mod.price)} no cartão`;
      if (mod.id === "anual") return `12× de ${BRL.format(mod.price)} no cartão`;
    }
    return mod.pay || "";
  }

  /** Total do projeto: para 'parcelado', some o valor das 6 parcelas. */
  function computeProjectTotal(mod) {
    if (mod.id === "parcelado" && mod.suffix && mod.suffix.includes("× 6")) {
      return mod.price * 6;
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
   *   - parcelas       → 1, 6 ou 12 conforme a cadência
   *   - parcelaPrice   → soma de (mensalidade final) de todos os recorrentes
   *   - totalContratado→ parcelaPrice × parcelas (o valor total do contrato)
   *   - paymentLabel   → "Boleto/Pix mensal" ou "12× no cartão"
   *
   * Itens que não têm a cadência pedida (Pacote de Artes etc.) entram no
   * cálculo do bundle pelo preço mensal, mas com nota "Acompanha o plano".
   */
  function buildCartGroups(cart, coupon, globalCadence) {
    const cadence = CADENCES.includes(globalCadence) ? globalCadence : "mensal";
    const parcelas = PARCELAS_BY_CADENCE[cadence];

    // Detecta se o plano-base está no carrinho e qual a cadência DELE.
    // Se o plano-base tá em anual/semestral, projetos/setups são embutidos
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
            : `Fechando 1 ano · ${parcelas}× no cartão`,
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

        const discount = couponDiscountFor(item.id, mod.price, coupon);
        const finalPrice = mod.price - discount;
        couponDiscountTotal += discount;

        // Para a economia: preço mensal de referência do item (se existir).
        // Cupom é só do item protagonista e só conta uma vez — aqui o mensal
        // de referência também desconta o cupom pra comparar "maçã com maçã".
        const mensalMod = item.modalities.find((m) => m.id === "mensal");
        const mensalRef = mensalMod ? mensalMod.price - couponDiscountFor(item.id, mensalMod.price, coupon) : finalPrice;
        mensalEquivalentTotal += mensalRef;
        const savingsPerMonth = Math.max(0, mensalRef - finalPrice);

        // Subtitle padronizado pra TODOS os items recurring/hybrid:
        // - Item com modalidade própria (anual/semestral/mensal) → usa a modalidade que ele tem
        // - Item só-mensal que segue plano-base (followsBase) → usa a cadência da proposta
        // Parcelas seguem a cadência efetiva, não a cadência global da proposta.
        const effectiveCadence = followsBase ? cadence : mod.id;
        const effectiveParcelas = PARCELAS_BY_CADENCE[effectiveCadence] || 1;
        const cadenceLabel = effectiveCadence === "anual"
          ? "Anual"
          : effectiveCadence === "semestral"
          ? "Semestral"
          : "Mensal";
        const subtitle = effectiveCadence === "mensal"
          ? `${cadenceLabel} · boleto ou Pix`
          : `${cadenceLabel} · ${effectiveParcelas}× no cartão`;

        groups.mensal.items.push({
          id: item.id,
          name: item.name,
          subtitle,
          basePrice: mod.price,
          finalPrice,
          discount,
          mensalRef,
          savingsPerMonth,
          priceText: BRL.format(finalPrice) + "/mês",
          basePriceText: discount > 0 ? BRL.format(mod.price) + "/mês" : null,
          couponNote:
            discount > 0
              ? `Cupom ${coupon} · -${BRL.format(discount)}/mês`
              : null,
          followsBase,
          deliverables: item.deliverables || null,
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
              ? `Embutido · ${parcelas}× ${BRL.format(setupEmbeddedPerMonth)} no cartão`
              : `Pagamento único · 3× de ${BRL.format(setupParcela)} sem juros`,
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
        const total = computeProjectTotal(mod);
        const projectEmbeddedPerMonth = shouldEmbed
          ? Math.round(total / parcelas)
          : null;
        let subtitle;
        if (shouldEmbed) {
          subtitle = `Embutido · ${parcelas}× ${BRL.format(projectEmbeddedPerMonth)} no cartão`;
        } else if (mod.id === "avista") {
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
          priceText: shouldEmbed
            ? BRL.format(projectEmbeddedPerMonth) + "/mês"
            : BRL.format(total),
          value: total,
          embedded: shouldEmbed,
          embeddedPerMonth: projectEmbeddedPerMonth,
          deliverables: item.deliverables || null,
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

    // Embute setups+projetos na mesma parcela do plano-base (quando o
    // plano-base é anual/semestral). Caso contrário, ficam no fluxo
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
          : `${parcelas}× no cartão · sem juros`,
      contractLabel:
        cadence === "anual"
          ? "Fechando 1 ano"
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

  window.ODUO = {
    STORAGE_KEY,
    COUPON_KEY,
    CADENCE_KEY,
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
    findItem,
    modalityOf,
    payText,
    computeProjectTotal,
    couponDiscountFor,
    buildCartGroups,
    escapeHtml,
    slug,
    ymd,
  };
})();
