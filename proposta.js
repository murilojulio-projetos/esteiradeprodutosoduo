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
    renderTotais(groups);
    renderCoupon(groups);

    $("#propostaPdfBtn").disabled = false;
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

        const removeBtn = row.removable
          ? `<button type="button" class="proposta-item-remove" data-remove="${row.id}" aria-label="Remover ${ODUO.escapeHtml(row.name)}">×</button>`
          : "";
        const baseStrike = row.basePriceText
          ? `<span class="proposta-item-strike">${ODUO.escapeHtml(row.basePriceText)}</span>`
          : "";
        const hasDeliverables = Array.isArray(row.deliverables) && row.deliverables.length > 0;
        const deliverablesToggle = hasDeliverables
          ? `<button type="button" class="proposta-item-toggle" data-toggle-deliverables aria-expanded="false">
               <span>Ver entregáveis</span>
               <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M4 6l4 4 4-4"/></svg>
             </button>`
          : "";
        const deliverablesList = hasDeliverables
          ? `<ul class="proposta-item-deliverables" hidden>
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
            ${deliverablesToggle}
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

    // Accordion dos entregáveis
    $$("[data-toggle-deliverables]", root).forEach((btn) => {
      btn.addEventListener("click", () => {
        const list = btn.parentElement.querySelector(".proposta-item-deliverables");
        if (!list) return;
        const expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", String(!expanded));
        list.hidden = expanded;
        btn.querySelector("span").textContent = expanded ? "Ver entregáveis" : "Ocultar";
      });
    });
  }

  function renderTotais(groups) {
    const wrap = $("#propostaTotais");
    wrap.innerHTML = "";

    const inicial = groups.setups.total + groups.projetos.total;
    const hasRecurring = groups.mensal.items.length > 0;

    if (hasRecurring) {
      wrap.appendChild(renderCadenceSelector(groups.bundle));
      wrap.appendChild(renderBundleCard(groups.bundle));
    }

    if (inicial > 0) {
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
      const savings = bundle.savingsTotal > 0
        ? `
          <div class="proposta-bundle-savings">
            <span>Economia no ${isAnual ? "anual" : "semestral"}</span>
            <strong>−${ODUO.escapeHtml(BRL.format(bundle.savingsTotal))}</strong>
          </div>`
        : "";
      div.innerHTML = `
        <div class="proposta-total-top">
          <span>${ODUO.escapeHtml(bundle.contractLabel)}</span>
          <strong>${bundle.parcelas}× ${ODUO.escapeHtml(BRL.format(bundle.parcelaPrice))}</strong>
        </div>
        <div class="proposta-bundle-total">
          <span>Total contratado</span>
          <strong>${ODUO.escapeHtml(BRL.format(bundle.totalContratado))}</strong>
        </div>
        ${savings}
      `;
    }
    return div;
  }

  function installmentOptions(total) {
    const opts = [];
    opts.push(`<option value="1">À vista — ${BRL.format(total)}</option>`);
    for (let n = 2; n <= 12; n++) {
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

  function openLeadModal() {
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
      const sub = [lead.contato, lead.cidade].filter(Boolean).join("  ·  ");
      if (sub) doc.text(sub, margin + 16, y + 58);
      y += 90;
    }

    // Itens
    const groups = ODUO.buildCartGroups(cart, activeCoupon, activeCadence);
    const mensalTitleByCadence = {
      mensal: "Mensalidade · pago todo mês",
      semestral: "Mensalidade · 6× no cartão",
      anual: "Mensalidade · 12× no cartão",
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
        doc.setFont("helvetica", "bold");
        doc.setFontSize(11);
        doc.setTextColor(7, 32, 74);
        doc.text(row.name, margin, y);
        doc.text(row.priceText, pageW - margin, y, { align: "right" });
        y += 14;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.5);
        doc.setTextColor(80, 100, 140);
        const sub = row.subtitle + (row.couponNote ? " · " + row.couponNote : "");
        const lines = doc.splitTextToSize(sub, pageW - margin * 2 - 100);
        doc.text(lines, margin, y);
        y += lines.length * 12 + 8;
      }
      y += 4;
    }

    // Totais
    const inicial = groups.setups.total + groups.projetos.total;
    const bundle = groups.bundle;
    const totalLines = [];
    if (bundle.parcelaPrice > 0) {
      if (bundle.cadence === "mensal") {
        totalLines.push([
          "Mensalidade (boleto/Pix)",
          BRL.format(bundle.parcelaPrice) + "/mês",
        ]);
      } else {
        totalLines.push([
          bundle.contractLabel,
          `${bundle.parcelas}× ${BRL.format(bundle.parcelaPrice)} no cartão`,
        ]);
        totalLines.push([
          "Total contratado",
          BRL.format(bundle.totalContratado),
        ]);
      }
    }
    if (inicial > 0) {
      let label = "Investimento inicial";
      let value;
      if (installments > 1) {
        const parcela = Math.ceil(inicial / installments);
        value = `${installments}× de ${BRL.format(parcela)} (${BRL.format(inicial)})`;
      } else {
        value = `${BRL.format(inicial)} à vista`;
      }
      totalLines.push([label, value]);
    }
    if (groups.performance.items.length > 0)
      totalLines.push(["Performance", "Variável conforme contratação"]);

    const boxH = 36 + totalLines.length * 16;
    y = ensureSpace(doc, y, boxH + 8, pageH, margin);
    doc.setFillColor(7, 32, 74);
    doc.roundedRect(margin, y, pageW - margin * 2, boxH, 10, 10, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(244, 246, 252);
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
    y += boxH + 14;

    if (activeCoupon) {
      y = ensureSpace(doc, y, 60, pageH, margin);
      doc.setFillColor(233, 248, 241);
      doc.roundedRect(margin, y, pageW - margin * 2, 44, 8, 8, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(31, 138, 91);
      doc.text(`Cupom ${activeCoupon} aplicado`, margin + 14, y + 18);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(60, 90, 70);
      doc.text(
        `-${ODUO.COUPON_PERCENT}% no Plano Avança Locações já refletidos no valor mensal acima.`,
        margin + 14,
        y + 34
      );
      y += 56;
    }

    if (lead.observacoes) {
      y = ensureSpace(doc, y, 100, pageH, margin);
      doc.setFillColor(253, 242, 225);
      const obsLines = doc.splitTextToSize(lead.observacoes, pageW - margin * 2 - 32);
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

    // Condições padrão
    y = ensureSpace(doc, y, 80, pageH, margin);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(120, 130, 160);
    const conditions = [
      "Sem fidelidade mínima nos planos recorrentes (aviso prévio de 30 dias, salvo SDR que possui 60 dias).",
      "Projetos pontuais: 10% off à vista ou parcelado em até 12× sem juros no cartão.",
      "Hunter de RH e SDR fecham em 2ª reunião com a CRO Isabelly.",
    ];
    conditions.forEach((line) => {
      const lines = doc.splitTextToSize("• " + line, pageW - margin * 2);
      doc.text(lines, margin, y);
      y += lines.length * 11 + 2;
    });

    const footY = pageH - 30;
    doc.setDrawColor(220, 228, 240);
    doc.line(margin, footY - 10, pageW - margin, footY - 10);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(150, 160, 190);
    doc.text("ODuo · Cardápio de Upsells V2.11", margin, footY);
    doc.text("oduo.com.br", pageW - margin, footY, { align: "right" });

    const fileName = `proposta-oduo-${ODUO.slug(lead.empresa || "lead")}-${ODUO.ymd(hoje)}.pdf`;
    doc.save(fileName);
  }

  // -------------------------- BOOT -------------------------------------

  document.addEventListener("DOMContentLoaded", () => {
    if (!window.ODUO_CATALOG) {
      console.error("ODUO_CATALOG não foi carregado.");
      return;
    }
    render();

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
        validadeDias: parseInt($("#leadValidade").value, 10) || 0,
      };
      closeLeadModal();
      generatePdf(lead);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#leadModal").hidden) closeLeadModal();
    });
  });
})();
