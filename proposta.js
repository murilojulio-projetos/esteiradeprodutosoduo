/* =====================================================================
   ODuo · Esteira de Produtos · proposta.js
   Página dedicada de checkout. Lê o carrinho do localStorage, renderiza
   os grupos, oferece dropdown de parcelamento no investimento inicial e
   gera o PDF da proposta.
   ===================================================================== */

(() => {
  const ODUO = window.ODUO;
  const BRL = ODUO.BRL;

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /** Estado local */
  let cart = ODUO.loadCart();
  let activeCoupon = ODUO.loadCoupon();
  let activeCadence = ODUO.loadCadence();
  let installments = parseInt(localStorage.getItem("oduo_installments_v1"), 10) || 1;

  // -------------------------- RENDER -----------------------------------

  function render() {
    const ids = Object.keys(cart);
    if (ids.length === 0) {
      $(".proposta-grid").hidden = true;
      $("#propostaEmpty").hidden = false;
      return;
    }
    $("#propostaEmpty").hidden = true;

    const groups = ODUO.buildCartGroups(cart, activeCoupon, activeCadence);
    renderItens(groups);
    renderUpsell();
    renderTotais(groups);
    renderCoupon(groups);

    $("#propostaPdfBtn").disabled = false;
  }

  /** Bloco "Turbine seu projeto" — upsell inteligente baseado em tiers.
   *  Para cada grupo, recomenda só o próximo tier acima do que o cliente
   *  já tem (ou o tier "recommended" se não tem nada). */
  const UPSELL_TIERS = {
    artes: ["artes-essencial", "artes-profissional", "artes-completo"],
    video: ["video-4", "video-8"],
    seo: ["seo"],
    site: ["site"],
  };
  /** ID do tier recomendado por default em cada grupo (quando o cliente
   *  não tem nada do grupo no carrinho). Bate com a flag `recommended`
   *  do product-data.js. */
  const UPSELL_DEFAULT = {
    artes: "artes-profissional",
    video: "video-8",
    seo: "seo",
    site: "site",
  };

  function getNextUpsellId(groupKey) {
    const tiers = UPSELL_TIERS[groupKey];
    // Qual tier mais alto o cliente já tem no carrinho?
    let highestIdx = -1;
    tiers.forEach((id, idx) => {
      if (cart[id] && idx > highestIdx) highestIdx = idx;
    });
    if (highestIdx === -1) return UPSELL_DEFAULT[groupKey]; // nada no grupo
    if (highestIdx === tiers.length - 1) return null; // já tem o topo
    return tiers[highestIdx + 1];
  }

  function renderUpsell() {
    // Render do upsell DEPOIS dos items, dentro da coluna esquerda.
    // appendChild no #propostaItens — renderItens roda antes (limpa e popula)
    // e renderUpsell anexa logo após. Em telas largas, fica antes da sticky
    // bar direita continuar sticky em "Baixar proposta em PDF".
    const root = $("#propostaItens");
    if (!root) return;
    const candidates = Object.keys(UPSELL_TIERS)
      .map((groupKey) => {
        const id = getNextUpsellId(groupKey);
        return id ? { groupKey, id } : null;
      })
      .filter(Boolean)
      .map(({ groupKey, id }) => {
        const found = ODUO.findItem(id);
        return found ? { groupKey, item: found.item } : null;
      })
      .filter(Boolean)
      .map(({ item }) => item);

    if (candidates.length === 0) return;

    const block = document.createElement("article");
    block.className = "proposta-upsell";

    const cardsHtml = candidates
      .map((item) => {
        // Detecta se é UPGRADE (cliente já tem tier menor do mesmo grupo).
        const groupKey = Object.keys(UPSELL_TIERS).find((k) =>
          UPSELL_TIERS[k].includes(item.id)
        );
        const lowerTier = groupKey
          ? UPSELL_TIERS[groupKey].find((id) => id !== item.id && cart[id])
          : null;
        const lowerTierItem = lowerTier
          ? ODUO.findItem(lowerTier)?.item
          : null;
        const kicker = lowerTierItem
          ? `<span class="proposta-upsell-card-kicker is-upgrade">Upgrade do ${ODUO.escapeHtml(lowerTierItem.name)}</span>`
          : item.group
          ? `<span class="proposta-upsell-card-kicker">${ODUO.escapeHtml(item.group)}</span>`
          : item.type === "project"
          ? `<span class="proposta-upsell-card-kicker">Projeto · entrega única</span>`
          : "";
        const btnLabel = lowerTierItem
          ? `Trocar pra ${ODUO.escapeHtml(item.name)}`
          : "+ Adicionar";

        // Preço · pra projeto mostra o valor cheio (entrega única);
        // pra recorrente, a mensalidade ("R$ X/mês"). Quando o cliente
        // fechar plano anual, o projeto entra embutido na parcela.
        let priceHtml;
        if (item.type === "project") {
          const parc = item.modalities.find((m) => m.id === "parcelado");
          if (parc) {
            const total = parc.price * 6;
            priceHtml = ODUO.escapeHtml(BRL.format(total));
          } else {
            priceHtml = ODUO.escapeHtml(BRL.format(item.modalities[0].price));
          }
        } else {
          const mod =
            item.modalities.find((m) => m.id === activeCadence) ||
            item.modalities.find((m) => m.id === "mensal") ||
            item.modalities[0];
          priceHtml = `${ODUO.escapeHtml(BRL.format(mod.price))}<small>/mês</small>`;
        }

        // Benefício do upgrade: usa upgradeBenefit se houver, senão tagline.
        const benefit = item.upgradeBenefit || item.tagline;

        return `
          <div class="proposta-upsell-card">
            ${kicker}
            <div class="proposta-upsell-card-name-row">
              <strong class="proposta-upsell-card-name">${ODUO.escapeHtml(item.name)}</strong>
              <span class="proposta-upsell-card-price">${priceHtml}</span>
            </div>
            <span class="proposta-upsell-card-tagline">${ODUO.escapeHtml(benefit)}</span>
            <button type="button" class="proposta-upsell-card-add" data-add-upsell="${item.id}">
              ${btnLabel}
            </button>
          </div>
        `;
      })
      .join("");

    block.innerHTML = `
      <header class="proposta-upsell-head">
        <span class="proposta-upsell-kicker">Recomendado pra crescimento acelerado</span>
        <h3>Turbine o seu projeto</h3>
        <p>Pacotes que monetizam direto a sua base. Acompanham o plano anual no cartão.</p>
      </header>
      <div class="proposta-upsell-grid">
        ${cardsHtml}
      </div>
    `;
    root.appendChild(block);

    $$("[data-add-upsell]", block).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.addUpsell;
        const found = ODUO.findItem(id);
        if (!found) return;
        const item0 = found.item;
        // Dependência (ex.: SEO precisa de Site Multipages).
        if (item0.requires && !cart[item0.requires.id]) {
          const dep = ODUO.findItem(item0.requires.id)?.item;
          const depName = dep ? dep.name : item0.requires.id;
          const ok = confirm(
            `${item0.requires.reason || ""}\n\nAdicionar ${depName} junto com ${item0.name}?`
          );
          if (!ok) return;
          if (dep) {
            const depMod =
              dep.type === "project"
                ? dep.modalities.find((m) => m.id === "parcelado") || dep.modalities[0]
                : dep.modalities.find((m) => m.id === activeCadence) ||
                  dep.modalities.find((m) => m.id === "mensal") ||
                  dep.modalities[0];
            cart[item0.requires.id] = depMod.id;
          }
        }
        // Upgrade: se o cliente já tem um tier menor do mesmo grupo,
        // remove esse tier antes de adicionar o novo. Substitui em vez
        // de acumular dois níveis do mesmo grupo.
        const groupKey = Object.keys(UPSELL_TIERS).find((k) =>
          UPSELL_TIERS[k].includes(id)
        );
        if (groupKey) {
          UPSELL_TIERS[groupKey].forEach((tierId) => {
            if (tierId !== id && cart[tierId]) delete cart[tierId];
          });
        }
        // Adiciona ao cart:
        // · recurring/hybrid: usa a cadência global (ou mensal de fallback)
        // · project: usa "parcelado" (6× sem juros) — vai pra Entrega Única
        //   ou pra parcela embutida quando há plano-base anual.
        const item = found.item;
        let targetMod;
        if (item.type === "project") {
          targetMod =
            item.modalities.find((m) => m.id === "parcelado") ||
            item.modalities[0];
        } else {
          targetMod =
            item.modalities.find((m) => m.id === activeCadence) ||
            item.modalities.find((m) => m.id === "mensal") ||
            item.modalities[0];
        }
        cart[id] = targetMod.id;
        ODUO.persistCart(cart);
        render();
      });
    });
  }

  /** Re-aplica a cadência global e re-renderiza tudo. */
  function setGlobalCadence(cadence) {
    if (!ODUO.CADENCES.includes(cadence)) return;
    activeCadence = cadence;
    ODUO.persistCadence(cadence);
    ODUO.applyCadence(cart, cadence);
    ODUO.persistCart(cart);
    render();
  }

  function renderItens(groups) {
    const root = $("#propostaItens");
    root.innerHTML = "";

    const order = ["mensal", "setups", "projetos", "performance"];
    order.forEach((key) => {
      const g = groups[key];
      if (!g.items.length) return;

      const block = document.createElement("article");
      block.className = "proposta-group";
      block.innerHTML = `
        <header class="proposta-group-head">
          <h3>${ODUO.escapeHtml(g.title)}</h3>
        </header>
      `;

      g.items.forEach((row) => {
        const item = document.createElement("div");
        item.className = "proposta-item";
        if (row.followsBase) item.dataset.followsBase = "true";
        if (row.embedded) item.dataset.embedded = "true";

        const removeBtn = row.removable
          ? `<button type="button" class="proposta-item-remove" data-remove="${row.id}" aria-label="Remover ${ODUO.escapeHtml(row.name)}">×</button>`
          : "";
        const couponPill = row.couponNote
          ? `<span class="proposta-item-coupon">${ODUO.escapeHtml(row.couponNote)}</span>`
          : "";
        const baseStrike = row.basePriceText
          ? `<span class="proposta-item-strike">${ODUO.escapeHtml(row.basePriceText)}</span>`
          : "";
        const hasDeliverables = Array.isArray(row.deliverables) && row.deliverables.length > 0;
        const deliverablesList = hasDeliverables
          ? `<ul class="proposta-item-deliverables">
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
          <div class="proposta-item-main">
            <div class="proposta-item-title">${ODUO.escapeHtml(row.name)}</div>
            <div class="proposta-item-sub">${ODUO.escapeHtml(row.subtitle)}</div>
            ${couponPill}
            ${deliverablesList}
          </div>
          <div class="proposta-item-price-block">
            ${baseStrike}
            <span class="proposta-item-price">${ODUO.escapeHtml(row.priceText)}</span>
          </div>
        `;
        block.appendChild(item);
      });
      root.appendChild(block);
    });

    // Bind remove
    $$(".proposta-item-remove", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.remove;
        delete cart[id];
        ODUO.persistCart(cart);
        render();
      });
    });

  }

  function renderTotais(groups) {
    const wrap = $("#propostaTotais");
    wrap.innerHTML = "";

    const inicial = groups.setups.total + groups.projetos.total;
    const hasRecurring = groups.mensal.items.length > 0;
    const showInicial = inicial > 0 && !groups.bundle.hasEmbedded;

    if (hasRecurring) {
      wrap.appendChild(renderCadenceSelector(groups.bundle));
      wrap.appendChild(renderBundleCard(groups.bundle));
    }

    if (showInicial) {
      const card = totalCard({
        kicker: "Investimento inicial",
        value: BRL.format(inicial),
        hint: "Setups e projetos. Escolha abaixo como prefere pagar.",
      });

      // Bloco de forma de pagamento
      const pay = document.createElement("div");
      pay.className = "proposta-pay";
      pay.innerHTML = `
        <div class="proposta-pay-row">
          <label for="installments">Forma de pagamento</label>
          <select id="installments" class="proposta-installments">
            ${installmentOptions(inicial)}
          </select>
        </div>
        <div class="proposta-pay-result" id="propostaPayResult"></div>
      `;
      card.appendChild(pay);
      wrap.appendChild(card);

      const sel = pay.querySelector("#installments");
      sel.value = String(installments);
      const updateResult = () => {
        installments = parseInt(sel.value, 10) || 1;
        localStorage.setItem("oduo_installments_v1", installments);
        $("#propostaPayResult").innerHTML = installmentResultHtml(
          inicial,
          installments
        );
      };
      sel.addEventListener("change", updateResult);
      updateResult();
    }

    if (groups.performance.items.length > 0) {
      wrap.appendChild(
        totalCard({
          kicker: "Performance",
          value: "Variável",
          hint: "Cobrado por resultado · alinhado em reunião dedicada.",
        })
      );
    }
  }

  function totalCard({ kicker, value, hint, highlight }) {
    const div = document.createElement("div");
    div.className = "proposta-total-card" + (highlight ? " is-highlight" : "");
    div.innerHTML = `
      <div class="proposta-total-top">
        <span>${ODUO.escapeHtml(kicker)}</span>
        <strong>${ODUO.escapeHtml(value)}</strong>
      </div>
      <small>${ODUO.escapeHtml(hint)}</small>
    `;
    return div;
  }

  function renderCadenceSelector(bundle) {
    const wrap = document.createElement("div");
    wrap.className = "cadence-selector cadence-selector-proposta";
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
              ${ODUO.escapeHtml(ODUO.LABEL_BY_CADENCE[c])}
            </button>`;
        }).join("")}
      </div>
      <small class="cadence-selector-hint">Sincroniza toda a proposta na mesma forma de pagamento.</small>
    `;
    $$(".cadence-btn", wrap).forEach((btn) => {
      btn.addEventListener("click", () => setGlobalCadence(btn.dataset.cadence));
    });
    return wrap;
  }

  function renderBundleCard(bundle) {
    const div = document.createElement("div");
    div.className =
      "proposta-total-card proposta-bundle-card is-cadence-" + bundle.cadence;

    const isAnual = bundle.cadence === "anual";

    if (bundle.cadence === "mensal") {
      div.innerHTML = `
        <div class="proposta-total-top">
          <span>${ODUO.escapeHtml(bundle.contractLabel)}</span>
          <strong>${ODUO.escapeHtml(BRL.format(bundle.parcelaPrice))}/mês</strong>
        </div>
      `;
    } else {
      const couponLine = bundle.couponDiscountPerMonth > 0
        ? `
          <div class="proposta-bundle-coupon">
            <span>Cupom ${ODUO.escapeHtml(bundle.couponCode)} aplicado</span>
            <strong>−${ODUO.escapeHtml(BRL.format(bundle.couponDiscountPerMonth))}/mês</strong>
          </div>`
        : "";
      const savingsLabel = isAnual ? "Economia no ano" : "Economia em 6 meses";
      const savings = bundle.savingsTotal > 0
        ? `
          <div class="proposta-bundle-savings">
            <span>${savingsLabel}</span>
            <strong>−${ODUO.escapeHtml(BRL.format(bundle.savingsTotal))}</strong>
          </div>`
        : "";
      const embeddedNote = bundle.hasEmbedded
        ? `<small>Setups e projetos já estão embutidos nessa parcela.</small>`
        : "";
      div.innerHTML = `
        <div class="proposta-total-top">
          <span>${ODUO.escapeHtml(bundle.contractLabel)}</span>
          <strong>${bundle.parcelas}× ${ODUO.escapeHtml(BRL.format(bundle.parcelaPrice))}</strong>
        </div>
        ${couponLine}
        ${savings}
        ${embeddedNote}
      `;
    }
    return div;
  }

  function installmentOptions(total) {
    const opts = [];
    opts.push(`<option value="1">À vista — ${BRL.format(total)} (10% off)</option>`);
    for (let n = 2; n <= 6; n++) {
      const parcela = Math.ceil(total / n);
      opts.push(
        `<option value="${n}">${n}× de ${BRL.format(parcela)} sem juros</option>`
      );
    }
    return opts.join("");
  }

  function installmentResultHtml(total, n) {
    if (n <= 1) {
      return `
        <span class="proposta-pay-label">Total à vista</span>
        <span class="proposta-pay-value">${BRL.format(total)}</span>
        <span class="proposta-pay-hint">Pix ou cartão · sem juros</span>
      `;
    }
    const parcela = Math.ceil(total / n);
    return `
      <span class="proposta-pay-label">${n}× sem juros de</span>
      <span class="proposta-pay-value">${BRL.format(parcela)}/mês</span>
      <span class="proposta-pay-hint">Total: ${BRL.format(total)}</span>
    `;
  }

  function renderCoupon(groups) {
    const wrap = $("#propostaCouponBlock");
    if (activeCoupon) {
      const targetItem = ODUO.findItem(ODUO.COUPON_TARGET_ID)?.item;
      const targetName = targetItem ? targetItem.name : "item protagonista";
      const inCart = !!cart[ODUO.COUPON_TARGET_ID];
      wrap.innerHTML = `
        <div class="proposta-coupon-applied">
          <div>
            <span class="coupon-tag">Cupom ${ODUO.escapeHtml(activeCoupon)}</span>
            <small>${
              inCart
                ? `-${ODUO.COUPON_PERCENT}% no ${ODUO.escapeHtml(targetName)}`
                : `O desconto entra quando o ${ODUO.escapeHtml(targetName)} estiver na proposta.`
            }</small>
          </div>
          <button type="button" id="couponRemove" class="coupon-remove" aria-label="Remover cupom">×</button>
        </div>
      `;
      $("#couponRemove").addEventListener("click", () => {
        activeCoupon = null;
        ODUO.persistCoupon(null);
        render();
      });
    } else {
      wrap.innerHTML = `
        <form id="couponForm" class="proposta-coupon-form">
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
        render();
      });
    }
  }

  // -------------------------- PDF --------------------------------------

  const LEAD_STORAGE_KEY = "oduo:lead-v1";
  const LEAD_FIELDS = [
    "empresa",
    "contato",
    "cidade",
    "observacoes",
    "cnpj",
    "endereco",
    "email",
    "repNome",
    "repCpf",
    "repFone",
  ];

  function loadLead() {
    try {
      const raw = localStorage.getItem(LEAD_STORAGE_KEY);
      if (!raw) return {};
      const data = JSON.parse(raw);
      return data && typeof data === "object" ? data : {};
    } catch {
      return {};
    }
  }

  function saveLead(lead) {
    try {
      const filtered = {};
      LEAD_FIELDS.forEach((k) => {
        if (typeof lead[k] === "string" && lead[k].trim().length > 0) {
          filtered[k] = lead[k].trim();
        }
      });
      localStorage.setItem(LEAD_STORAGE_KEY, JSON.stringify(filtered));
    } catch {
      /* ignore */
    }
  }

  // Máscaras leves: aplicam formatação visual conforme o usuário digita,
  // sem bloquear paste de string já formatada. Preservam só dígitos.
  function maskDigits(value, pattern) {
    const digits = String(value || "").replace(/\D/g, "");
    let out = "";
    let i = 0;
    for (const ch of pattern) {
      if (i >= digits.length) break;
      if (ch === "#") {
        out += digits[i++];
      } else {
        out += ch;
      }
    }
    return out;
  }

  const MASKS = {
    leadCnpj: "##.###.###/####-##",
    leadRepCpf: "###.###.###-##",
    leadRepFone: "(##) #####-####",
  };

  function bindMasks() {
    Object.entries(MASKS).forEach(([id, pattern]) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener("input", () => {
        const masked = maskDigits(el.value, pattern);
        if (masked !== el.value) el.value = masked;
      });
    });
  }

  function hydrateLeadForm() {
    const stored = loadLead();
    const set = (id, v) => {
      const el = document.getElementById(id);
      if (el && typeof v === "string") el.value = v;
    };
    set("leadEmpresa", stored.empresa);
    set("leadContato", stored.contato);
    set("leadCidade", stored.cidade);
    set("leadObs", stored.observacoes);
    set("leadCnpj", stored.cnpj);
    set("leadEndereco", stored.endereco);
    set("leadEmail", stored.email);
    set("leadRepNome", stored.repNome);
    set("leadRepCpf", stored.repCpf);
    set("leadRepFone", stored.repFone);
  }

  function openLeadModal() {
    hydrateLeadForm();
    $("#leadModal").hidden = false;
    setTimeout(() => $("#leadEmpresa")?.focus(), 50);
  }

  function closeLeadModal() {
    $("#leadModal").hidden = true;
  }

  function ensureSpace(doc, y, needed, pageH, margin) {
    if (y + needed > pageH - margin) {
      doc.addPage();
      return margin;
    }
    return y;
  }

  // jsPDF helvetica é WinAnsi (CP1252) — caracteres fora desse range viram lixo.
  // Mapeia os símbolos Unicode que a UI usa pros equivalentes Latin-1 antes de
  // mandar pro PDF. Sem isso, "−R$ 148" vira `"R$ 148` e "12× R$ 5.556" pode
  // sair com o último dígito cortado.
  function ascii(s) {
    return String(s == null ? "" : s)
      .replace(/→/g, "->")
      .replace(/←/g, "<-")
      .replace(/↑/g, "^")
      .replace(/↓/g, "v")
      .replace(/✓/g, "v")
      .replace(/✗/g, "x")
      .replace(/✕/g, "x")
      .replace(/−/g, "-")
      .replace(/–/g, "-")
      .replace(/[‘’]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/…/g, "...")
      .replace(/ /g, " ");
  }

  function patchDocText(doc) {
    const origText = doc.text.bind(doc);
    doc.text = function (text, ...args) {
      const safe = Array.isArray(text) ? text.map(ascii) : ascii(text);
      return origText(safe, ...args);
    };
    const origSplit = doc.splitTextToSize.bind(doc);
    doc.splitTextToSize = function (text, ...args) {
      return origSplit(ascii(text), ...args);
    };
  }

  function generatePdf(lead = {}) {
    if (!window.jspdf) {
      alert("jsPDF ainda não carregou. Tente novamente em alguns segundos.");
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    patchDocText(doc);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 40;
    let y = 0;

    // Cabeçalho banner
    doc.setFillColor(4, 19, 42);
    doc.rect(0, 0, pageW, 130, "F");
    doc.setDrawColor(49, 122, 224);
    doc.circle(margin + 18, 40, 12, "S");
    doc.setDrawColor(240, 138, 58);
    doc.circle(margin + 32, 40, 12, "S");
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
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(180, 195, 230);
    doc.text(`Emitida em ${hoje.toLocaleDateString("pt-BR")}`, pageW - margin, 105, {
      align: "right",
    });

    if (lead.validadeDias && lead.validadeDias > 0) {
      const v = new Date(hoje);
      v.setDate(v.getDate() + lead.validadeDias);
      doc.setTextColor(240, 138, 58);
      doc.setFont("helvetica", "bold");
      doc.text(`Válida até ${v.toLocaleDateString("pt-BR")}`, pageW - margin, 119, {
        align: "right",
      });
    }

    y = 160;

    // Filtra campos curtos (ex.: usuário digitou "a" só pra pular o validador)
    // pra não vazar lixo no PDF.
    const meaningful = (s, min = 2) => typeof s === "string" && s.trim().length >= min;
    const empresa = meaningful(lead.empresa) ? lead.empresa.trim() : "";
    const contato = meaningful(lead.contato) ? lead.contato.trim() : "";
    const cidade = meaningful(lead.cidade, 3) ? lead.cidade.trim() : "";
    const cnpj = meaningful(lead.cnpj, 4) ? lead.cnpj.trim() : "";

    if (empresa || contato || cidade || cnpj) {
      const hasIdLine = !!cnpj;
      const boxH = hasIdLine ? 84 : 70;
      doc.setFillColor(244, 246, 252);
      doc.roundedRect(margin, y, pageW - margin * 2, boxH, 8, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(7, 32, 74);
      doc.text("PROPOSTA PARA", margin + 16, y + 22);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.text(empresa || "Locadora a confirmar", margin + 16, y + 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(80, 100, 140);
      const sub = [contato, cidade].filter(Boolean).join("  ·  ");
      if (sub) doc.text(sub, margin + 16, y + 58);
      if (cnpj) {
        doc.setTextColor(120, 135, 170);
        doc.setFontSize(9);
        doc.text(`CNPJ ${cnpj}`, margin + 16, y + (sub ? 72 : 58));
      }
      y += boxH + 20;
    }

    // Itens
    const groups = ODUO.buildCartGroups(cart, activeCoupon, activeCadence);
    const mensalTitleByCadence = {
      mensal: "Mensalidade · boleto bancário ou Pix",
      semestral: "Mensalidade · 6× no cartão de crédito sem juros",
      anual: "Mensalidade · 12× no cartão de crédito sem juros",
    };
    const grpDefs = [
      { key: "mensal", title: mensalTitleByCadence[groups.bundle.cadence] || mensalTitleByCadence.mensal },
      { key: "setups", title: "Implantação · pagamento único de setup" },
      { key: "projetos", title: "Projetos pontuais · entrega única" },
      { key: "performance", title: "Performance · variável" },
    ];

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(7, 32, 74);
    doc.text("Itens da proposta", margin, y);
    y += 16;

    for (const g of grpDefs) {
      const grp = groups[g.key];
      if (!grp || grp.items.length === 0) continue;

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
        // Item embutido na parcela mensal: troca o preço/subtítulo pra deixar
        // claro que está dentro da mensalidade e não é cobrança extra.
        let priceText = row.priceText;
        let sub = row.subtitle + (row.couponNote ? " · " + row.couponNote : "");
        if (row.embedded && row.value) {
          priceText = "Embutido na parcela do cartão";
          sub = `Valor cheio ${BRL.format(row.value)} · diluído em ${groups.bundle.parcelas}× ${BRL.format(row.embeddedPerMonth)} no cartão de crédito sem juros · sem cobrança à parte`;
        }
        // Nome composto com o grupo quando o item pertence a um pacote
        // (ex.: "Pacote de Artes · Completo" em vez de só "Completo").
        const displayName = row.group ? `${row.group} · ${row.name}` : row.name;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(7, 32, 74);
        doc.text(displayName, margin, y);
        doc.text(priceText, pageW - margin, y, { align: "right" });
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(80, 100, 140);
        const lines = doc.splitTextToSize(sub, pageW - margin * 2 - 100);
        doc.text(lines, margin, y);
        y += lines.length * 12 + 8;
      }
      y += 4;
    }

    // Resumo em 3 blocos claros: RECORRENTE / ENTREGA ÚNICA / PERFORMANCE
    const inicial = groups.setups.total + groups.projetos.total;
    const bundle = groups.bundle;
    const sections = [];

    if (bundle.parcelaPrice > 0) {
      // "Recorrente" só faz sentido em mensal (boleto/Pix mês a mês). Em
      // semestral/anual o cliente pré-paga no cartão em parcelas — é
      // PERÍODO FECHADO. Título reflete isso pra não dar margem a confusão
      // sobre fidelidade ou cancelamento.
      const title =
        bundle.cadence === "anual"
          ? "CONTRATO ANUAL · 12× NO CARTÃO DE CRÉDITO"
          : bundle.cadence === "semestral"
          ? "CONTRATO SEMESTRAL · 6× NO CARTÃO DE CRÉDITO"
          : "ASSINATURA MENSAL · BOLETO OU PIX";
      const lines = [];
      if (bundle.cadence === "mensal") {
        lines.push([
          "Parcela mensal",
          `${BRL.format(bundle.parcelaPrice)}/mês`,
        ]);
        lines.push([
          "Forma de pagamento",
          "Boleto bancário ou Pix · cobrança mensal",
        ]);
      } else {
        lines.push([
          "Parcela mensal",
          `${bundle.parcelas}× ${BRL.format(bundle.parcelaPrice)} · sem juros`,
        ]);
        lines.push([
          "Forma de pagamento",
          `Cartão de crédito · ${bundle.parcelas} parcelas iguais sem juros`,
        ]);
      }
      if (bundle.hasEmbedded) {
        lines.push([
          "Setups e projetos",
          `Embutidos na parcela do cartão · +${BRL.format(bundle.embeddedPerMonth)}/mês`,
        ]);
      }
      if (bundle.couponDiscountTotal > 0) {
        lines.push([
          `Cupom ${bundle.couponCode} (já aplicado)`,
          `desconto de ${BRL.format(bundle.couponDiscountPerMonth)}/mês`,
        ]);
      }
      if (bundle.savingsTotal > 0) {
        const periodo = bundle.cadence === "anual" ? "no ano" : "em 6 meses";
        lines.push([
          `Economia ${periodo}`,
          BRL.format(bundle.savingsTotal),
        ]);
      }
      sections.push({ title, lines });
    }

    if (inicial > 0 && !bundle.hasEmbedded) {
      const lines = [];
      if (installments > 1) {
        const parcela = Math.ceil(inicial / installments);
        lines.push([
          "Parcela",
          `${installments}× ${BRL.format(parcela)} no cartão de crédito · sem juros`,
        ]);
        lines.push(["Total", BRL.format(inicial)]);
      } else {
        lines.push([
          "Forma de pagamento",
          `${BRL.format(inicial)} à vista no Pix ou cartão de crédito`,
        ]);
      }
      sections.push({
        title: "ENTREGA ÚNICA · SETUPS + PROJETOS",
        lines,
      });
    }

    if (groups.performance.items.length > 0) {
      sections.push({
        title: "PERFORMANCE",
        lines: [
          ["Cobrança", "Variável conforme contratação"],
          ["Definição", "Em reunião dedicada"],
        ],
      });
    }

    // Render do box azul-marinho com seções
    const sectionH = (s) => 22 + s.lines.length * 14 + 10;
    const boxH = 32 + sections.reduce((acc, s) => acc + sectionH(s), 0);
    y = ensureSpace(doc, y, boxH + 8, pageH, margin);
    doc.setFillColor(7, 32, 74);
    doc.roundedRect(margin, y, pageW - margin * 2, boxH, 10, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(244, 246, 252);
    doc.text("RESUMO DA PROPOSTA", margin + 16, y + 22);

    let sy = y + 42;
    sections.forEach((section, idx) => {
      // Divider sutil acima a partir da 2ª seção
      if (idx > 0) {
        doc.setDrawColor(60, 80, 130);
        doc.line(margin + 16, sy - 6, pageW - margin - 16, sy - 6);
      }
      // Título da seção em laranja
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(240, 138, 58);
      doc.text(section.title, margin + 16, sy);
      sy += 14;
      // Linhas da seção
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      section.lines.forEach(([k, v]) => {
        doc.setTextColor(180, 195, 230);
        doc.text(k, margin + 16, sy);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(244, 246, 252);
        doc.text(v, pageW - margin - 16, sy, { align: "right" });
        doc.setFont("helvetica", "normal");
        sy += 14;
      });
      sy += 4;
    });
    y += boxH + 14;

    const obsText = meaningful(lead.observacoes, 3) ? lead.observacoes.trim() : "";
    if (obsText) {
      y = ensureSpace(doc, y, 100, pageH, margin);
      doc.setFillColor(253, 242, 225);
      const obsLines = doc.splitTextToSize(obsText, pageW - margin * 2 - 32);
      const obsH = 36 + obsLines.length * 13;
      doc.roundedRect(margin, y, pageW - margin * 2, obsH, 10, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(227, 111, 26);
      doc.text("OBSERVAÇÕES DESTA PROPOSTA", margin + 16, y + 20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(50, 60, 90);
      doc.text(obsLines, margin + 16, y + 36);
      y += obsH + 16;
    }

    // Condições — só aparecem quando o produto correspondente está no carrinho.
    // Proposta oficial não pode listar termos genéricos que não se aplicam.
    const cartIdsForConditions = Object.keys(cart);
    const hasRecurring = groups.mensal.items.length > 0;
    const hasSDR = cartIdsForConditions.includes("sdr");
    const hasHunter = cartIdsForConditions.includes("hunter");
    // Projeto pontual conta só se NÃO estiver embutido na parcela mensal —
    // se embutido, o cliente paga via cartão recorrente, não em projeto à
    // parte. Logo a condição "10% off à vista / 6× sem juros" não se aplica.
    const hasStandaloneProject = groups.projetos.items.some((r) => !r.embedded);

    // Condições de rescisão precisam ser EXATAS pra cadência contratada:
    //   - mensal (boleto/Pix recorrente): cliente paga mês a mês, pode
    //     cancelar com aviso de 30 dias. Aí sim "sem fidelidade".
    //   - semestral/anual (parcelado no cartão): o cliente PRÉ-AUTORIZOU
    //     todas as parcelas no cartão na contratação. Não tem como cancelar
    //     no meio e receber de volta — é período fechado. O que existe é
    //     a NÃO-RENOVAÇÃO após o término do período.
    const conditions = [];
    if (hasRecurring) {
      if (activeCadence === "mensal") {
        const avisoSDR = hasSDR ? " O SDR ODuo segue a regra geral de 30 dias enquanto mensal." : "";
        conditions.push(
          `Plano mensal (boleto/Pix recorrente): sem fidelidade mínima, cancelamento com aviso prévio de 30 dias.${avisoSDR}`
        );
      } else if (activeCadence === "semestral") {
        conditions.push(
          "Contrato semestral: período fechado de 6 meses pago em 6 parcelas pré-autorizadas no cartão de crédito. As parcelas são contratadas no fechamento e não há cancelamento antecipado. Ao término do período, o contrato se encerra; renovação somente mediante novo acordo entre as PARTES."
        );
      } else if (activeCadence === "anual") {
        conditions.push(
          "Contrato anual: período fechado de 12 meses pago em 12 parcelas pré-autorizadas no cartão de crédito. As parcelas são contratadas no fechamento e não há cancelamento antecipado. Ao término do período, o contrato se encerra; renovação somente mediante novo acordo entre as PARTES."
        );
      }
    }
    if (hasStandaloneProject) {
      conditions.push(
        "Projetos pontuais (entrega única): 10% off à vista no Pix ou cartão, ou parcelado em até 6× sem juros no cartão de crédito. Cobrança única no fechamento, sem cancelamento ou devolução após o pagamento (salvo descumprimento pela CONTRATADA)."
      );
    }
    if (hasHunter) {
      conditions.push(
        "Hunter de RH: garantia de reposição em 60 dias se o candidato não der certo."
      );
    }
    if (hasSDR && activeCadence === "mensal") {
      // SDR só ganha menção específica no mensal — no semestral/anual o
      // cliente já está preso ao período fechado independente do SDR.
      conditions.push(
        "SDR ODuo: variável de 10% sobre a 1ª locação fechada via lead trazido pelo SDR — apurada mensalmente. Aviso prévio de cancelamento: 60 dias."
      );
    } else if (hasSDR) {
      conditions.push(
        "SDR ODuo: variável de 10% sobre a 1ª locação fechada via lead trazido pelo SDR — apurada mensalmente."
      );
    }

    if (conditions.length > 0) {
      y = ensureSpace(doc, y, conditions.length * 22 + 12, pageH, margin);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(120, 130, 160);
      conditions.forEach((line) => {
        const lines = doc.splitTextToSize("• " + line, pageW - margin * 2);
        doc.text(lines, margin, y);
        y += lines.length * 11 + 2;
      });
    }

    const footY = pageH - 30;
    doc.setDrawColor(220, 228, 240);
    doc.line(margin, footY - 10, pageW - margin, footY - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 160, 190);
    doc.text("ODuo · Cardápio de Upsells V2.11", margin, footY);
    doc.text("oduo.com.br", pageW - margin, footY, { align: "right" });

    // Anexa o contrato logo após a proposta — mesmo arquivo PDF.
    appendContract(doc, lead, groups, hoje);

    const fileName = `proposta-e-contrato-oduo-${ODUO.slug(lead.empresa || "lead")}-${ODUO.ymd(hoje)}.pdf`;
    doc.save(fileName);
  }

  // =====================================================================
  // CONTRATO · gerado no mesmo PDF, depois da proposta
  // Texto fiel ao "Contrato de Serviços Digitais ODuo" — campos variáveis
  // puxam do form de lead (CNPJ, endereço, rep legal etc.) e do cart
  // (projeto contratado, valor, duração, entregáveis).
  // =====================================================================
  const CONTRATADA_DATA = {
    razao: "ODUO ASSESSORIA LTDA",
    cnpj: "48.501.609/0001-70",
    endereco: "R. Gustavo Ambrust, 36 - Nova Campinas - SP, 13092-106, Campinas/SP",
    email: "administrativo@oduo.com.br",
    reps: [
      { nome: "Murilo José Júlio", cpf: "482.341.428-44" },
      { nome: "Lucas Ferrari Pereira", cpf: "490.220.378-27" },
    ],
    cidadeForo: "Campinas",
  };

  function deriveContractData(lead, groups, cadence, cartIds, hoje) {
    // Projeto contratado: detecta avanca/destrava no cart pra marcar o checkbox.
    // O catálogo só tem esses 2 planos-base; "Start Loc", "Turbo" etc. do
    // template antigo do contrato NÃO existem mais e foram removidos.
    let planoBase = null;
    if (cartIds.includes("avanca")) planoBase = "Avança Locações";
    else if (cartIds.includes("destrava")) planoBase = "Destrava";
    const hasPlanoBase = !!planoBase;

    // Tipo de contrato — define qual lógica/cláusula se aplica:
    //   - "recorrente-mensal" → boleto/Pix mês a mês, sem fidelidade
    //   - "periodo-fechado"   → semestral/anual no cartão, parcelas pré-autorizadas
    //   - "projeto-pontual"   → sem plano-base, só projetos de entrega única
    let contractType;
    if (hasPlanoBase) {
      contractType = cadence === "mensal" ? "recorrente-mensal" : "periodo-fechado";
    } else if (groups.projetos.items.length > 0 || groups.setups.items.length > 0) {
      contractType = "projeto-pontual";
    } else {
      contractType = "recorrente-mensal"; // fallback raro (ex.: só performance)
    }

    // Duração: deriva da cadência global (só faz sentido pra plano-base)
    const duracaoMeses = hasPlanoBase
      ? (cadence === "anual" ? 12 : cadence === "semestral" ? 6 : null)
      : null;
    const recorrente = contractType === "recorrente-mensal";

    // Datas de início e fim
    const inicio = new Date(hoje);
    let fim = null;
    if (duracaoMeses) {
      fim = new Date(inicio);
      fim.setMonth(fim.getMonth() + duracaoMeses);
    } else if (contractType === "projeto-pontual") {
      // Projeto pontual: prazo de entrega ~30-45 dias
      fim = new Date(inicio);
      fim.setDate(fim.getDate() + 45);
    }

    // Valor: bundle parcela × parcelas + setups/projetos não-embutidos
    const bundle = groups.bundle;
    const valorRecorrenteTotal =
      bundle.parcelaPrice * (bundle.parcelas || 1);
    const inicialNaoEmbutido = bundle.hasEmbedded
      ? 0
      : groups.setups.total + groups.projetos.total;
    const valorTotal = valorRecorrenteTotal + inicialNaoEmbutido;

    // Entregáveis: agrega de todos os itens do cart (com deliverables)
    const entregaveis = [];
    const allRows = [
      ...groups.mensal.items,
      ...groups.setups.items,
      ...groups.projetos.items,
      ...groups.performance.items,
    ];
    allRows.forEach((row) => {
      const name = row.group ? `${row.group} · ${row.name}` : row.name;
      if (row.deliverables && row.deliverables.length > 0) {
        entregaveis.push({ header: name, items: row.deliverables });
      } else {
        entregaveis.push({ header: name, items: [row.subtitle].filter(Boolean) });
      }
    });

    return {
      planoBase,
      hasPlanoBase,
      contractType,
      duracaoMeses,
      recorrente,
      cadence,
      inicio,
      fim,
      valorTotal,
      valorRecorrenteTotal,
      inicialNaoEmbutido,
      bundle,
      entregaveis,
    };
  }

  function fmtDate(d) {
    if (!(d instanceof Date)) return "";
    return d.toLocaleDateString("pt-BR");
  }

  function appendContract(doc, lead, groups, hoje) {
    const cartIds = Object.keys(cart);
    if (cartIds.length === 0) return;

    const data = deriveContractData(lead, groups, activeCadence, cartIds, hoje);
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 48;
    const contentW = pageW - margin * 2;

    // Helpers locais — controlam quebra de página, escrita de parágrafos,
    // títulos e tabelas com layout consistente.
    const state = { y: 0 };

    function newPage(initialY = margin) {
      doc.addPage();
      state.y = initialY;
      drawPageFooter();
    }

    // Rodapé discreto em cada página do contrato: identificação + paginação.
    // Substituiu o watermark "ODUO" gigante (que vazava setFontSize(80) pro
    // resto da renderização e quebrava o tableRow após pagebreak).
    function drawPageFooter() {
      const prev = {
        font: doc.getFont(),
        size: doc.getFontSize(),
      };
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(150, 160, 190);
      doc.text(
        "Contrato de Serviços Digitais · ODuo Assessoria LTDA · CNPJ 48.501.609/0001-70",
        margin,
        pageH - 24
      );
      doc.text(
        `Página ${doc.getNumberOfPages()}`,
        pageW - margin,
        pageH - 24,
        { align: "right" }
      );
      // Restaura estado pra não vazar pro próximo render
      doc.setFont(prev.font.fontName, prev.font.fontStyle);
      doc.setFontSize(prev.size);
      doc.setTextColor(50, 60, 90);
    }

    function need(h) {
      if (state.y + h > pageH - margin) newPage();
    }

    function heading(text, size = 13) {
      need(size + 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size);
      doc.setTextColor(7, 32, 74);
      doc.text(text, margin, state.y);
      state.y += size + 6;
    }

    function para(text, opts = {}) {
      const size = opts.size || 10;
      const lineH = opts.lineH || 13;
      const indent = opts.indent || 0;
      const bold = opts.bold || false;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(50, 60, 90);
      const lines = doc.splitTextToSize(text, contentW - indent);
      need(lines.length * lineH + 6);
      doc.text(lines, margin + indent, state.y);
      state.y += lines.length * lineH + 4;
    }

    // Texto justificado usando o engine nativo do jsPDF (align: 'justify').
    // A implementação anterior fazia greedy fill + posicionamento manual
    // word-by-word, mas tinha um bug de cálculo de gap que fazia palavras
    // largas em caixa alta (CONTRATADA, CONTRATANTE) ficarem coladas na
    // palavra seguinte. O engine nativo distribui o espaço de forma
    // consistente entre todas as junções.
    function justified(text, opts = {}) {
      const size = opts.size || 10;
      const lineH = opts.lineH || 13.5;
      const indent = opts.indent || 0;
      const bold = opts.bold || false;
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.setFontSize(size);
      doc.setTextColor(50, 60, 90);
      // Ajusta o lineHeightFactor pra que jsPDF use o mesmo lineH que
      // estamos calculando manualmente — evita gaps inconsistentes entre
      // linhas dentro do mesmo parágrafo.
      doc.setLineHeightFactor(lineH / size);
      const maxW = contentW - indent;
      const lines = doc.splitTextToSize(text, maxW);
      need(lines.length * lineH + 6);
      // align:'justify' justifica todas as linhas EXCETO a última (padrão
      // tipográfico). maxWidth precisa ser passado pro jsPDF saber até onde
      // distribuir o espaço.
      doc.text(lines, margin + indent, state.y, {
        align: "justify",
        maxWidth: maxW,
      });
      state.y += lines.length * lineH;
      state.y += opts.trailSpacing != null ? opts.trailSpacing : 4;
      // Restaura o factor padrão pra não vazar pra outras renderizações.
      doc.setLineHeightFactor(1.15);
    }

    // Heading de cláusula: caixa alta, com número romano + título em laranja,
    // seguido de linha decorativa fina embaixo.
    // need(80) garante que o heading + ~2-3 linhas de conteúdo cabem na
    // mesma página, evitando órfão (heading sozinho no rodapé).
    function clausulaHeading(romano, titulo) {
      state.y += 14;
      need(80);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      // Parte 1: "CLÁUSULA ROMANO" em laranja
      doc.setTextColor(247, 127, 0);
      const part1 = `CLÁUSULA ${romano.toUpperCase()}`;
      doc.text(part1, margin, state.y);
      const part1W = doc.getTextWidth(part1);
      // Gap explícito de 2 espaços pra não grudar visualmente com o em-dash
      const gapW = doc.getTextWidth("  ");
      // Parte 2: "— TÍTULO" em azul escuro
      doc.setTextColor(7, 32, 74);
      doc.text(`— ${titulo.toUpperCase()}`, margin + part1W + gapW, state.y);
      state.y += 6;
      doc.setDrawColor(247, 127, 0);
      doc.setLineWidth(0.8);
      doc.line(margin, state.y, margin + 60, state.y);
      doc.setLineWidth(0.4);
      doc.setDrawColor(220, 228, 240);
      doc.line(margin + 62, state.y, pageW - margin, state.y);
      state.y += 12;
    }

    // Sub-cláusula numerada (ex.: "1.1.", "2.2.1.").  A profundidade dita:
    //   - indent: nível 2 (1.1) → 0pt, nível 3+ (2.2.1) → 18pt
    //   - spacing após o parágrafo: nível 3+ fica mais "colado" ao pai
    //     (3pt em vez de 6pt), reforçando a hierarquia visual
    function subClausula(numero, texto) {
      const depth = numero.split(".").filter(Boolean).length;
      const indent = depth >= 3 ? 18 : 0;
      const trailSpacing = depth >= 3 ? -2 : 2;
      justified(`${numero} ${texto}`, {
        size: 10,
        lineH: 13.5,
        indent,
        trailSpacing,
      });
    }

    function tableRow(label, value, opts = {}) {
      const labelW = opts.labelW || 160;
      const valueW = contentW - labelW;
      const fontSize = 10;
      const lineH = 13;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      doc.setTextColor(7, 32, 74);
      const labelLines = doc.splitTextToSize(label, labelW - 12);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(50, 60, 90);
      const valueLines = doc.splitTextToSize(value, valueW - 12);
      const rowH = Math.max(labelLines.length, valueLines.length) * lineH + 14;
      need(rowH);
      // Re-set font/size DEPOIS do need() — newPage() pode ter chamado
      // helpers que alteraram o estado da fonte do doc.
      doc.setFontSize(fontSize);
      // Bordas
      doc.setDrawColor(200, 212, 232);
      doc.rect(margin, state.y, labelW, rowH, "S");
      doc.rect(margin + labelW, state.y, valueW, rowH, "S");
      // Texto
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fontSize);
      doc.setTextColor(7, 32, 74);
      doc.text(labelLines, margin + 6, state.y + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(fontSize);
      doc.setTextColor(50, 60, 90);
      doc.text(valueLines, margin + labelW + 6, state.y + 14);
      state.y += rowH;
    }

    function tableHeader(text) {
      const h = 22;
      need(h);
      doc.setFillColor(7, 32, 74);
      doc.rect(margin, state.y, contentW, h, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(244, 246, 252);
      doc.text(text, pageW / 2, state.y + 15, { align: "center" });
      state.y += h;
    }

    // ----------------------------------------------------------------
    // Página inicial do contrato
    // ----------------------------------------------------------------
    newPage();

    // Faixa fininha laranja no topo pra separar visualmente da proposta.
    doc.setFillColor(247, 127, 0);
    doc.rect(0, 0, pageW, 4, "F");

    // Espaço respirar abaixo da faixa antes do título.
    state.y += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(7, 32, 74);
    doc.text("CONTRATO DE SERVIÇOS DIGITAIS", pageW / 2, state.y, {
      align: "center",
    });
    // 16pt de fonte precisa de pelo menos ~22pt antes do próximo baseline
    // pra não sobrepor descender com ascender da próxima linha.
    state.y += 24;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 135, 170);
    doc.text(
      "Prestação de serviços de marketing digital · ODuo Assessoria LTDA",
      pageW / 2,
      state.y,
      { align: "center" }
    );
    state.y += 32;

    // CONTRATANTE
    const blank = "____________________";
    const contratanteText =
      `CONTRATANTE: ${lead.empresa || blank}, pessoa jurídica de direito privado, ` +
      `inscrita no CNPJ sob nº ${lead.cnpj || blank}, com sede na ` +
      `${lead.endereco || blank}, Brasil, e com endereço de e-mail ` +
      `${lead.email || blank}, neste ato representada por seu representante legal, ` +
      `${lead.repNome || blank}, brasileiro(a), maior, inscrito(a) no CPF sob o nº ` +
      `${lead.repCpf || blank}, número do celular do representante legal financeiro: ` +
      `${lead.repFone || blank}, abaixo assinado, doravante designado CONTRATANTE, ` +
      `PARTE ou conjuntamente, PARTES;`;
    para(contratanteText);

    // CONTRATADA (fixa)
    const repsText = CONTRATADA_DATA.reps
      .map((r) => `${r.nome}, brasileiro(a), maior, inscrito(a) no CPF sob nº ${r.cpf}`)
      .join(" e ");
    const contratadaText =
      `CONTRATADA: ${CONTRATADA_DATA.razao}, pessoa jurídica de direito privado, ` +
      `inscrita no CNPJ sob nº ${CONTRATADA_DATA.cnpj}, com sede na ` +
      `${CONTRATADA_DATA.endereco}, Brasil, e com endereço de e-mail ` +
      `${CONTRATADA_DATA.email}, neste ato representada por seus representantes legais, ` +
      `${repsText}, abaixo assinado, doravante designado CONTRATADA, PARTE ou ` +
      `conjuntamente, PARTES;`;
    para(contratadaText);

    para(
      "As PARTES, acima identificadas, têm entre si justo e acordado celebrar o presente " +
      "CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE MARKETING DIGITAL, que reger-se-á mediante as " +
      "cláusulas e condições que seguem:"
    );

    state.y += 14;
    tableHeader("QUADRO RESUMO");

    // (I) Projeto contratado — só os 2 planos-base reais do catálogo.
    // Em contrato de projeto pontual (sem plano-base), descreve o escopo
    // textualmente em vez de marcar checkbox.
    let projetoText;
    if (data.contractType === "projeto-pontual") {
      const nomes = groups.projetos.items
        .concat(groups.setups.items)
        .map((r) => (r.group ? `${r.group} · ${r.name}` : r.name));
      projetoText = `Projeto pontual de entrega única: ${nomes.join("; ")}. Detalhamento no item (VI).`;
    } else if (data.planoBase === "Avança Locações") {
      projetoText = "[X] Avança Locações    [ ] Destrava";
    } else if (data.planoBase === "Destrava") {
      projetoText = "[ ] Avança Locações    [X] Destrava";
    } else {
      projetoText = "[ ] Avança Locações    [ ] Destrava";
    }
    tableRow("(I) Projeto Contratado", projetoText);

    // (II) Valor e forma de pagamento
    const bundle = data.bundle;
    let valorText = `Valor total: ${BRL.format(data.valorTotal)}.\n`;
    if (data.contractType === "projeto-pontual") {
      valorText +=
        "Pagamento à vista (Pix ou cartão) com 10% de desconto, " +
        "ou parcelado em até 6× sem juros no cartão de crédito.";
    } else if (data.cadence === "mensal") {
      valorText +=
        `Pagamento mensal de ${BRL.format(bundle.parcelaPrice)}/mês via ` +
        "boleto bancário ou Pix, recorrente enquanto durar a prestação dos serviços.";
    } else {
      valorText +=
        `Parcelado em ${bundle.parcelas}× de ${BRL.format(bundle.parcelaPrice)} ` +
        "sem juros no cartão de crédito.";
    }
    if (data.inicialNaoEmbutido > 0 && data.contractType !== "projeto-pontual") {
      valorText +=
        `\nEntrega única (setups e projetos): ${BRL.format(data.inicialNaoEmbutido)} ` +
        "à vista no Pix/cartão (10% off) ou em até 6× sem juros no cartão.";
    }
    tableRow("(II) Valor e Forma de Pagamento", valorText);

    // (III) Método de pagamento
    let metodoText;
    if (data.contractType === "projeto-pontual") {
      metodoText = "Pix ou cartão de crédito à vista (10% off), ou cartão de crédito em até 6× sem juros.";
    } else if (data.cadence === "mensal") {
      metodoText = "Boleto bancário ou Pix com vencimento mensal (recorrente).";
    } else {
      metodoText = "Cartão de crédito com parcelamento sem juros, conforme item (II).";
    }
    tableRow("(III) Método de Pagamento", metodoText);

    // (IV) Duração
    let duracaoText;
    if (data.contractType === "projeto-pontual") {
      duracaoText = "Projeto pontual com entrega única em até 30–45 dias após briefing aprovado pela CONTRATANTE.";
    } else if (data.recorrente) {
      duracaoText = "Vigência por tempo indeterminado · cobrança mensal recorrente · cancelamento com aviso prévio de 30 dias.";
    } else {
      duracaoText = `${data.duracaoMeses} meses · período fechado · pago em ${data.bundle.parcelas} parcelas pré-autorizadas no cartão.`;
    }
    tableRow("(IV) Duração do Projeto", duracaoText);

    // (V) Início e fim
    let inicioFimText;
    if (data.contractType === "projeto-pontual") {
      inicioFimText = `Início: ${fmtDate(data.inicio)}.    Entrega prevista: até ${fmtDate(data.fim)} (45 dias após briefing aprovado).`;
    } else if (data.recorrente) {
      inicioFimText = `Início: ${fmtDate(data.inicio)}. Recorrente — sem data de término fixa.`;
    } else {
      inicioFimText = `Início: ${fmtDate(data.inicio)}.    Final: ${fmtDate(data.fim)}.`;
    }
    tableRow("(V) Início e Fim do Projeto", inicioFimText);

    // (VI) Entregáveis — placeholder na tabela; detalhamento fora pra não
    // quebrar paginação (cell content variável e potencialmente longo).
    tableRow(
      "(VI) Entregáveis",
      "Conforme detalhamento na seção \"Entregáveis do Projeto\" logo abaixo."
    );

    // (VII) Rescisão — adaptado ao tipo de contrato:
    //   - projeto-pontual: cobrança única, sem cancelamento após pagamento
    //   - recorrente-mensal: aviso 30 dias
    //   - periodo-fechado: parcelas pré-autorizadas, sem cancelamento antecipado
    const sdrNoCart = cartIds.includes("sdr");
    let rescisaoText;
    if (data.contractType === "projeto-pontual") {
      rescisaoText =
        "Projeto pontual de entrega única, com cobrança única no fechamento. " +
        "Após confirmação do pagamento, não cabe cancelamento ou devolução, " +
        "ressalvada a hipótese de descumprimento das obrigações pela CONTRATADA.";
    } else if (data.recorrente) {
      rescisaoText =
        "Plano mensal (boleto/Pix recorrente): sem fidelidade mínima. " +
        "Cancelamento mediante notificação prévia de 30 (trinta) dias.";
    } else {
      rescisaoText =
        `Contrato de período fechado de ${data.duracaoMeses} meses (item V), ` +
        `pago em ${data.bundle.parcelas} parcelas pré-autorizadas no cartão de crédito. ` +
        "Não há cancelamento antecipado das parcelas já contratadas. " +
        "Ao término do período, o contrato se encerra automaticamente; " +
        "eventual renovação somente mediante novo acordo entre as PARTES por escrito.";
    }
    if (sdrNoCart && data.recorrente) {
      rescisaoText += " Para o SDR ODuo, no plano mensal, o aviso prévio é de 60 (sessenta) dias.";
    }
    tableRow("(VII) Condições de Rescisão", rescisaoText);

    // (VIII) Comunicações — separa CANAL OPERACIONAL (WhatsApp) de
    // NOTIFICAÇÕES FORMAIS (e-mail), e identifica claramente qual e-mail
    // pertence a quem, em vez de listar tudo em sequência.
    tableRow(
      "(VIII) Comunicações",
      "Canal operacional do dia a dia: grupo de WhatsApp criado entre as PARTES na reunião de abertura do projeto.\n" +
        "Notificações formais (cobrança, rescisão, descumprimento): por e-mail.\n" +
        `E-mail da CONTRATADA (ODuo): ${CONTRATADA_DATA.email}.\n` +
        `E-mail da CONTRATANTE: ${lead.email || blank}.`
    );

    state.y += 18;

    // ------------------------- ENTREGÁVEIS DO PROJETO -------------------
    // Renderiza fora da tabela (paginação natural, sem quebrar células).
    // Pré-calcula a altura de cada grupo e força newPage() antes do grupo
    // inteiro quando não couber — evita header "• X" ficar numa página e
    // os itens órfãos sem contexto na seguinte. Garante também que o
    // heading da seção tenha pelo menos 1 grupo ao seu lado, evitando
    // viúva no fim da página.
    const ITEM_LINE_H = 13;
    const HEADER_H = 16;
    const GROUP_TRAIL = 8;

    function computeGroupHeight(g) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      let h = HEADER_H;
      g.items.forEach((it) => {
        const lines = doc.splitTextToSize(`– ${it}`, contentW - 22);
        h += lines.length * ITEM_LINE_H + 2;
      });
      return h + GROUP_TRAIL;
    }

    // Garante que o heading + primeiro grupo entrem juntos
    const firstGroupH = data.entregaveis[0]
      ? computeGroupHeight(data.entregaveis[0])
      : 60;
    if (state.y + 24 + firstGroupH > pageH - margin) {
      newPage();
    }
    heading("Entregáveis do Projeto · referência ao item (VI)", 12);

    // setLineHeightFactor pra match com nosso ITEM_LINE_H (10pt × 1.3 = 13)
    doc.setLineHeightFactor(ITEM_LINE_H / 10);

    data.entregaveis.forEach((g) => {
      const groupH = computeGroupHeight(g);
      // Se o grupo INTEIRO não couber na página atual, vai pra próxima
      if (state.y + groupH > pageH - margin) {
        newPage();
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(7, 32, 74);
      doc.text(`• ${g.header}`, margin, state.y);
      state.y += HEADER_H;
      g.items.forEach((it) => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(50, 60, 90);
        const itemLines = doc.splitTextToSize(`– ${it}`, contentW - 22);
        doc.text(itemLines, margin + 16, state.y);
        state.y += itemLines.length * ITEM_LINE_H + 2;
      });
      state.y += GROUP_TRAIL;
    });
    doc.setLineHeightFactor(1.15);
    state.y += 8;

    // ----------------------------------------------------------------
    // CLÁUSULAS
    // ----------------------------------------------------------------
    const clausulas = [
      {
        romano: "Primeira",
        titulo: "Do Objeto",
        items: [
          "1.1. O presente Contrato tem por objeto a prestação de serviços de marketing digital pela CONTRATADA, conforme especificado no Quadro Resumo, que integra este Contrato para todos os fins. Os serviços serão executados com base nas melhores práticas do mercado, sem garantia de resultados específicos, que dependem de variáveis externas alheias ao controle da CONTRATADA (como algoritmos de busca, concorrência e comportamento do mercado). A execução dos serviços está condicionada ao fornecimento tempestivo pelo CONTRATANTE de materiais e informações solicitados, nos prazos definidos neste Contrato.",
        ],
      },
      {
        romano: "Segunda",
        titulo: "Do Valor e Condições de Pagamento",
        items: [
          "2.1. O valor do Projeto é o descrito no item (II) do Quadro Resumo e será pago pelo CONTRATANTE à CONTRATADA nas condições previstas nos itens (III) e (IV) do Quadro Resumo.",
          "2.2. Em caso de atraso no pagamento por parte do CONTRATANTE, incidirá multa de 2% (dois por cento) sobre o valor total em atraso, conforme dispõe o artigo 52, § 1º, do Código de Defesa do Consumidor (CDC). Adicionalmente, serão cobrados juros de mora de 1% (um por cento) ao mês, calculados a partir do dia subsequente ao vencimento até a data da efetiva quitação do débito.",
          "2.2.1. A multa e os juros serão aplicados após 5 dias corridos de atraso, contados do vencimento.",
          "2.2.2. Se o pagamento não for efetuado em até 30 (trinta) dias após o vencimento, a CONTRATADA poderá, a seu critério, solicitar a inclusão do nome e CPF/CNPJ do CONTRATANTE nos órgãos de proteção ao crédito.",
          "2.2.3. Além disso, o CONTRATANTE arcará com todos os custos relacionados à cobrança, sejam eles judiciais ou extrajudiciais, incluindo honorários advocatícios equivalentes a 20% (vinte por cento) sobre o valor total do débito.",
          "2.3. O investimento em mídia para campanhas publicitárias será realizado diretamente pelo CONTRATANTE, por meio de pagamento feito à própria plataforma. O volume e a frequência desse investimento influenciam diretamente na performance das campanhas e, consequentemente, nos resultados obtidos. A CONTRATADA não se responsabiliza por eventuais limitações de alcance, geração de leads ou vendas.",
        ],
      },
      {
        romano: "Terceira",
        titulo: "Do Direito e Obrigação das Partes",
        items: [
          "3.1. Direitos e Obrigações da CONTRATADA:",
          "3.1.1. Prestação de Serviços: A CONTRATADA compromete-se a fornecer ao CONTRATANTE os serviços de Marketing Digital, conforme descrito neste contrato, incluindo a criação e otimização de Landing Pages para SEO, gestão de tráfego pago, otimização contínua do Google Meu Negócio, reuniões com o time de Customer Success (CS).",
          "3.1.2. Excelência e Esforço: A CONTRATADA se compromete a prestar os serviços com diligência profissional, utilizando técnicas atualizadas de marketing digital, sem garantia de resultados específicos, que dependem de variáveis externas.",
          "3.1.3. Confidencialidade: A CONTRATADA manterá a confidencialidade de todas as informações comerciais e estratégias compartilhadas pelo CONTRATANTE durante o período do contrato.",
          "3.2. Direitos e Obrigações do CONTRATANTE:",
          "3.2.1. Participação Ativa: O CONTRATANTE deverá fornecer fotos dos equipamentos, informações da empresa (horários, diferenciais) e aprovar briefings em até 5 dias úteis após solicitação, sob pena de atraso na execução dos serviços sem responsabilidade da CONTRATADA.",
          "3.2.2. Uso das Informações: A participação nas reuniões é recomendada, mas sua ausência não exime o CONTRATANTE das obrigações contratuais.",
          "3.2.3. Implementação das Estratégias: O CONTRATANTE será responsável por implementar as estratégias e técnicas recomendadas pela CONTRATADA, adaptando-as às suas necessidades e objetivos específicos.",
          "3.2.4. Compartilhamento de Dados: O CONTRATANTE concorda em compartilhar informações e dados relevantes sobre suas estratégias, vendas e marketing, a fim de permitir à CONTRATADA fornecer orientações mais precisas e personalizadas.",
          "3.2.5. Resultados: O CONTRATANTE será o único responsável pelos resultados obtidos a partir da implementação das estratégias e técnicas fornecidas pela CONTRATADA.",
          "3.2.6. Comportamento Adequado: O CONTRATANTE compromete-se a manter um comportamento adequado durante todo o período do contrato, respeitando a CONTRATADA e seus colaboradores em todas as interações, garantindo pontualidade e comunicação aberta.",
        ],
      },
      {
        romano: "Quarta",
        titulo: "Da Vigência, Rescisão, Penalidades e Renovação",
        items: [
          "4.1. O presente Contrato terá a duração especificada no item (IV) do Quadro Resumo, com início na data indicada no item (V), sendo obrigatória a execução integral de seus termos pelas PARTES até o término do período contratado.",
          "4.2. A CONTRATADA pode encerrar este Contrato, nas seguintes hipóteses, mediante notificação prévia ao CONTRATANTE:",
          "4.2.1. Inadimplemento: Em caso de descumprimento grave e recorrente das obrigações do CONTRATANTE, caso a situação não seja regularizada no prazo de 15 (quinze) dias, a partir da notificação.",
          "4.2.2. Prejuízo à imagem: Por qualquer conduta do CONTRATANTE que afete a reputação comercial da CONTRATADA.",
          "4.2.3. Eventos de força maior: Se a continuidade dos serviços for impossível por motivo de força maior ou caso fortuito.",
          (() => {
            if (data.contractType === "projeto-pontual") {
              return "4.2.4. Tratando-se de contrato de projeto pontual com entrega única, a cobrança é realizada em parcela única no fechamento e não cabe cancelamento ou devolução após a confirmação do pagamento, ressalvada a hipótese de descumprimento das obrigações pela CONTRATADA.";
            }
            if (data.recorrente) {
              return "4.2.4. Tratando-se de contrato mensal pago via boleto/Pix recorrente, qualquer das PARTES poderá realizar a rescisão mediante notificação prévia de 30 (trinta) dias, sem prazo mínimo de permanência.";
            }
            return `4.2.4. Tratando-se de contrato de período fechado de ${data.duracaoMeses} (${data.duracaoMeses === 12 ? "doze" : "seis"}) meses, conforme item (V) do Quadro Resumo, pago em ${data.bundle.parcelas} (${data.bundle.parcelas === 12 ? "doze" : "seis"}) parcelas pré-autorizadas no cartão de crédito, não cabe cancelamento antecipado das parcelas já contratadas. Ao término do período firmado, o Contrato se encerra automaticamente, independentemente de notificação.`;
          })(),
          "4.3. A inadimplência do CONTRATANTE não suspende suas obrigações contratuais. Após 10 (dez) dias de atraso no pagamento, a CONTRATADA estará autorizada a suspender os serviços e a iniciar a cobrança do débito, judicial ou extrajudicialmente.",
          "4.3.1. Todos os custos decorrentes da cobrança, incluindo custas e honorários advocatícios, serão arcados pelo CONTRATANTE, conforme detalhado na Cláusula Segunda deste instrumento.",
          (() => {
            if (data.contractType === "projeto-pontual") {
              return "4.4. O presente Contrato vigora pelo prazo necessário à execução e entrega do projeto contratado, encerrando-se automaticamente após a aceitação final pela CONTRATANTE. Não há renovação automática nem prestação continuada após a entrega.";
            }
            if (data.recorrente) {
              return "4.4. O presente Contrato terá vigência por tempo indeterminado, continuando ativo a cada mês enquanto não houver notificação de cancelamento por qualquer das PARTES, conforme item 4.2.4. Em caso de encerramento, todas as campanhas ativas de tráfego pago serão removidas.";
            }
            return `4.4. O presente Contrato NÃO possui renovação automática. Ao término do período inicial de ${data.duracaoMeses} (${data.duracaoMeses === 12 ? "doze" : "seis"}) meses, o Contrato se encerra de pleno direito, independentemente de notificação. Eventual continuidade da prestação dos serviços dependerá da celebração de novo instrumento contratual entre as PARTES, por escrito. Em caso de encerramento, todas as campanhas ativas de tráfego pago serão removidas.`;
          })(),
          "4.5. Em caso de encerramento de contrato, a CONTRATANTE receberá os acessos por todos os ativos criados pela CONTRATADA, e todas as campanhas ativas de tráfego pago e IA de Qualificação serão removidas.",
        ],
      },
      {
        romano: "Quinta",
        titulo: "Da Confidencialidade",
        items: [
          "5.1. Confidencialidade de Informações. Exceto se:",
          "5.1.1. Necessário para fazer valer qualquer direito decorrente deste Contrato ou dos outros Documentos da Operação;",
          "5.1.2. Ou de outra forma acordado pelas Partes, cada uma das Partes deste Contrato deverá, a partir da assinatura deste Contrato e pelo prazo de 02 (dois) anos contados do término ou resolução do Contrato, (a) manter confidencial toda e qualquer informação, escrita ou verbal, e documentação relacionada a este Contrato, aos entregáveis de Marketing Digital, Tráfego Pago no Google Ads, Google Meu Negócio, Reuniões com Time de CS; (b) não revelar tal Informação Confidencial a qualquer terceiro.",
          "5.1.3. Esta obrigação de confidencialidade não se aplica a qualquer informação ou documentação que: (I) seja de domínio público no momento da divulgação; (II) seja publicada ou de outra forma disponibilizada ao público em geral, sem qualquer violação deste acordo por qualquer das Partes; (III) seja recebida pela Parte de um terceiro, desde que este não esteja em descumprimento de qualquer obrigação de confidencialidade relacionada; ou (IV) seja divulgada por qualquer uma das Partes quando tal divulgação for exigida por disposição de lei aplicável.",
        ],
      },
      {
        romano: "Sexta",
        titulo: "Das Disposições Gerais",
        items: [
          "6.1. COMUNICAÇÕES: Durante a vigência do presente CONTRATO, salvo disposição contrária, todas as comunicações de natureza operacional e comercial deverão ser realizadas por escrito e enviadas para o endereço eletrônico (e-mail) de uso comum e indicado no preâmbulo deste instrumento, ou para o grupo de WhatsApp formado na reunião de abertura.",
          "6.1.1. Eventuais notificações sobre descumprimento de obrigações contratuais das PARTES deverão ser realizadas por e-mail para os endereços eletrônicos indicados no preâmbulo deste CONTRATO.",
          "6.1.2. Caso uma das PARTES altere o endereço de contato, deverá de imediato comunicar tais alterações à outra parte. Até que seja feita esta comunicação, serão válidos e eficazes os avisos, solicitações, comunicações, notificações e interpelações enviadas para os contatos dispostos no presente instrumento.",
          "6.2. PROIBIÇÃO DE CESSÃO/TRANSFERÊNCIA DE DIREITOS E OBRIGAÇÕES: É expressamente proibido a CONTRATANTE ceder ou transferir, no todo ou em parte, a que título for, os direitos resultantes do presente instrumento sem a prévia anuência da CONTRATADA.",
          "6.3. MERA LIBERALIDADE: A eventual tolerância por parte da CONTRATADA quanto ao descumprimento por parte da CONTRATANTE de qualquer cláusula ou condição deste contrato, será considerada mera liberalidade não constituindo modificação ou novação do presente instrumento.",
          "6.4. ACORDO INTEGRAL E SEPARABILIDADE: Este Contrato constitui o acordo integral entre as partes com referência ao objeto tratado e substitui todos os acordos, entendimentos e representações prévias, sejam eles escritos ou orais. Caso qualquer disposição deste Contrato seja considerada inválida ou inexequível, as demais disposições permanecerão em pleno vigor e efeito.",
          "6.5. TERMO ADITIVO: Qualquer modificação, desistência ou aceitação em relação aos direitos e obrigações oriundos do presente CONTRATO somente será considerada válida se for também celebrada por escrito através de aditivo contratual e assinada por todas as PARTES.",
          "6.6. ALTERAÇÕES E NOVAS DEMANDAS NO ESCOPO: Qualquer nova demanda, alteração ou acréscimo aos serviços originalmente definidos no escopo deste contrato, seja por iniciativa da CONTRATANTE ou da CONTRATADA, deverá ser formalizada por escrito.",
          "6.6.1. As alterações de escopo que impliquem em aumento do volume de trabalho, custos adicionais ou extensão do prazo de entrega, serão tratadas mediante a celebração de um Termo Aditivo Contratual.",
          "6.6.2. O Termo Aditivo Contratual deverá detalhar, no mínimo: (a) a descrição das novas demandas ou alterações no escopo dos serviços; (b) o impacto no cronograma de entrega, com a redefinição de novos prazos, se aplicável; (c) o valor da cobrança extra, se houver, com a respectiva forma de pagamento; (d) as demais condições aplicáveis às novas demandas.",
          "6.6.3. A CONTRATADA não terá a obrigação de iniciar os serviços decorrentes das novas demandas ou alterações de escopo antes da formalização e assinatura do Termo Aditivo Contratual por ambas as Partes.",
          "6.7. TÍTULO EXECUTIVO EXTRAJUDICIAL: O presente CONTRATO tem natureza de título executivo extrajudicial, nos termos do artigo 784 do Código de Processo Civil (CPC), vinculando as PARTES e seus sucessores, sendo exigível para cobrança judicial sem a necessidade de processo de conhecimento prévio.",
          "6.8. DA PROPRIEDADE INTELECTUAL: A CONTRATADA mantém a propriedade intelectual sobre os materiais, métodos e know-how utilizados na execução dos serviços.",
          "6.8.1. Sobre os materiais específicos criados para o CONTRATANTE (além dos entregáveis no item VI, tais como Google Meu Negócio, Site ou LP e/ou Google Ads), a CONTRATADA cede a ele uma licença de uso não exclusiva, irrevogável e intransferível, válida somente para os objetivos deste contrato e condicionada ao pagamento integral. Qualquer uso que fuja desse escopo exigirá um novo acordo entre as partes.",
          "6.9. LEI GERAL DE PROTEÇÃO DE DADOS: A CONTRATADA se obriga a tratar os dados pessoais do CONTRATANTE com a máxima segurança e de acordo com a Lei Geral de Proteção de Dados (LGPD), em especial os princípios de finalidade, adequação, transparência, livre acesso, segurança, prevenção e não discriminação.",
          "6.10. As PARTES declaram que leram antecipadamente o CONTRATO e concordam com todos os seus termos e condições.",
        ],
      },
      {
        romano: "Sétima",
        titulo: "Do Foro",
        items: [
          `7.1. Para dirimir quaisquer questões resultantes do presente contrato, fica eleito o Foro da Comarca de ${CONTRATADA_DATA.cidadeForo}, com exclusão de qualquer outro, por mais privilegiado que seja.`,
          "7.2. E para que surta seus jurídicos e legais efeitos, as partes assinam o presente instrumento eletronicamente pela plataforma Clicksign (https://www.clicksign.com), dispensando-se as testemunhas, na forma da Medida Provisória 2.200 de 2001, artigo 12, § 2º, obrigando-se por si, seus herdeiros e/ou sucessores, ao fiel cumprimento de todas as suas cláusulas e condições.",
        ],
      },
    ];

    state.y += 12;
    // Render das cláusulas com hierarquia: heading uppercase + sub-itens
    // numerados (1.1, 2.2.1) com parsing inline e indent automático.
    clausulas.forEach((c) => {
      clausulaHeading(c.romano, c.titulo);
      c.items.forEach((item) => {
        const m = String(item).match(/^(\d+(?:\.\d+)*\.)\s+([\s\S]+)$/);
        if (m) {
          subClausula(m[1], m[2]);
        } else {
          justified(item, { size: 10, lineH: 13.5 });
        }
      });
      state.y += 8;
    });

    // ----------------------------------------------------------------
    // Página de Assinaturas (sempre em página própria pra ficar limpo)
    // ----------------------------------------------------------------
    newPage();

    // Cabeçalho da página de assinaturas
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(7, 32, 74);
    doc.text("ASSINATURAS DAS PARTES", margin, state.y);
    state.y += 6;
    doc.setDrawColor(247, 127, 0);
    doc.setLineWidth(0.8);
    doc.line(margin, state.y, margin + 60, state.y);
    state.y += 24;

    // Declaração final
    justified(
      "As PARTES, ao apor suas assinaturas eletrônicas abaixo, declaram ter " +
      "lido, compreendido e aceito integralmente todos os termos e condições " +
      "do presente Contrato de Prestação de Serviços de Marketing Digital, " +
      "obrigando-se a cumpri-lo em sua totalidade.",
      { size: 10.5, lineH: 14 }
    );
    state.y += 24;

    // Local e data
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(50, 60, 90);
    doc.text(
      `${CONTRATADA_DATA.cidadeForo}, ${fmtDate(hoje)}.`,
      margin,
      state.y
    );
    state.y += 60;

    // Linhas de assinatura — colunas mais largas, mais espaço pra rubricar
    const colGap = 40;
    const colW = (contentW - colGap) / 2;
    const lineY = state.y;
    doc.setDrawColor(80, 100, 140);
    doc.setLineWidth(0.7);
    doc.line(margin, lineY, margin + colW, lineY);
    doc.line(margin + colW + colGap, lineY, margin + colW * 2 + colGap, lineY);

    // Headers de coluna
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(247, 127, 0);
    doc.text("CONTRATANTE", margin, lineY + 16);
    doc.text("CONTRATADA", margin + colW + colGap, lineY + 16);

    // Dados das partes — bold no rótulo, normal no valor.
    // labelW é SEMPRE medido com a fonte bold (que é a fonte do rótulo)
    // pra não desalinhar quando o valor é renderizado em normal.
    const rowH = 15;
    let infoY = lineY + 32;
    function infoLine(x, label, value, y) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(7, 32, 74);
      doc.text(label, x, y);
      const labelW = doc.getTextWidth(label + " ");
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 100, 140);
      doc.text(value, x + labelW, y);
    }

    // CONTRATANTE — 5 linhas
    infoLine(margin, "Razão social:", lead.empresa || blank, infoY);
    infoLine(margin, "CNPJ:", lead.cnpj || blank, infoY + rowH);
    infoLine(margin, "Representante:", lead.repNome || blank, infoY + rowH * 2);
    infoLine(margin, "CPF:", lead.repCpf || blank, infoY + rowH * 3);
    infoLine(margin, "E-mail:", lead.email || blank, infoY + rowH * 4);

    // CONTRATADA — 5 linhas (simetria com CONTRATANTE).
    // Cada representante ocupa uma linha própria, com CPF inline,
    // evitando wrap manual e alinhamento errado.
    const x2 = margin + colW + colGap;
    infoLine(x2, "Razão social:", CONTRATADA_DATA.razao, infoY);
    infoLine(x2, "CNPJ:", CONTRATADA_DATA.cnpj, infoY + rowH);
    infoLine(
      x2,
      "Representante 1:",
      `${CONTRATADA_DATA.reps[0].nome} · CPF ${CONTRATADA_DATA.reps[0].cpf}`,
      infoY + rowH * 2
    );
    infoLine(
      x2,
      "Representante 2:",
      `${CONTRATADA_DATA.reps[1].nome} · CPF ${CONTRATADA_DATA.reps[1].cpf}`,
      infoY + rowH * 3
    );
    infoLine(x2, "E-mail:", CONTRATADA_DATA.email, infoY + rowH * 4);

    // Nota sobre Clicksign
    state.y = infoY + rowH * 5 + 40;
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(150, 160, 190);
    const noteLines = doc.splitTextToSize(
      "Documento assinado eletronicamente via plataforma Clicksign " +
      "(https://www.clicksign.com), com validade jurídica nos termos da " +
      "Medida Provisória 2.200 de 2001, artigo 12, § 2º.",
      contentW
    );
    doc.text(noteLines, margin, state.y);
  }

  // -------------------------- BOOT -------------------------------------

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.ODUO_CATALOG) {
      console.error("ODUO_CATALOG não foi carregado.");
      return;
    }
    render();
    bindMasks();

    $("#propostaPdfBtn").addEventListener("click", () => {
      if (Object.keys(cart).length === 0) return;
      openLeadModal();
    });
    $("#leadCancel").addEventListener("click", closeLeadModal);
    $("#leadSkip").addEventListener("click", () => {
      closeLeadModal();
      generatePdf({ validadeDias: 7 });
    });
    $("#leadForm").addEventListener("submit", (e) => {
      e.preventDefault();
      const lead = {
        empresa: $("#leadEmpresa").value.trim(),
        contato: $("#leadContato").value.trim(),
        cidade: $("#leadCidade").value.trim(),
        observacoes: $("#leadObs").value.trim(),
        cnpj: $("#leadCnpj").value.trim(),
        endereco: $("#leadEndereco").value.trim(),
        email: $("#leadEmail").value.trim(),
        repNome: $("#leadRepNome").value.trim(),
        repCpf: $("#leadRepCpf").value.trim(),
        repFone: $("#leadRepFone").value.trim(),
        validadeDias: parseInt($("#leadValidade").value, 10) || 0,
      };
      saveLead(lead);
      closeLeadModal();
      generatePdf(lead);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#leadModal").hidden) closeLeadModal();
    });
  });
})();
