/* =====================================================================
   ODuo · Esteira de Produtos · oduo-core.js
   Helpers compartilhados entre index (cardápio) e proposta (checkout).
   Carregue SEMPRE depois de product-data.js.
   ===================================================================== */

(() => {
  const STORAGE_KEY = "oduo_cart_v1";
  const COUPON_KEY = "oduo_coupon_v1";

  // Desconto adicional no item protagonista quando QUALQUER cupom estiver ativo.
  const COUPON_PERCENT = 10;
  const COUPON_TARGET_ID = "avanca";

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
   * Constrói os 4 grupos do carrinho a partir de `cart` + `coupon`.
   * Mesma estrutura usada pelo drawer e pela página de proposta.
   */
  function buildCartGroups(cart, coupon) {
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
        const discount = couponDiscountFor(item.id, mod.price, coupon);
        const finalPrice = mod.price - discount;
        groups.mensal.items.push({
          id: item.id,
          name: item.name,
          subtitle,
          basePrice: mod.price,
          finalPrice,
          discount,
          priceText: BRL.format(finalPrice) + "/mês",
          basePriceText: discount > 0 ? BRL.format(mod.price) + "/mês" : null,
          couponNote:
            discount > 0
              ? `Cupom ${coupon} · -${BRL.format(discount)}/mês`
              : null,
          removable: true,
        });
        groups.mensal.total += finalPrice;

        if (item.setup) {
          const parcela = Math.round(item.setup / 3);
          groups.setups.items.push({
            id: item.id + "__setup",
            parentId: item.id,
            name: item.name + " — setup",
            subtitle: `Pagamento único · 3× de ${BRL.format(parcela)} sem juros`,
            priceText: BRL.format(item.setup),
            value: item.setup,
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
          value: total,
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
    COUPON_PERCENT,
    COUPON_TARGET_ID,
    BRL,
    loadCart,
    persistCart,
    loadCoupon,
    persistCoupon,
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
