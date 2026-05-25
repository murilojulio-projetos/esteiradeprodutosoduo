/* =====================================================================
   ODuo · roas-calculator.js  ·  Versão simples

   3 perguntas → 1 número grande de receita projetada + ROAS curto +
   payback do plano. Constantes do "mundo ODuo" (CPL, conversão,
   recompra) ficam escondidas no JS — cliente não precisa entender, só
   ver o resultado.
   ===================================================================== */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);

  const openBtn = $("roasOpenBtn");
  const modal = $("roasModal");
  const closeBtn = $("roasClose");
  const form = $("roasForm");
  const out = $("roasResult");

  if (!openBtn || !modal || !form || !out) return;

  // Constantes "ODuo padrão" — refletem o que a operação entrega na média.
  // Ajustar aqui se o discurso comercial mudar.
  const CPL_ODUO = 40;     // R$ por lead qualificado
  const CONV = 0.08;       // 8% lead → venda
  const RECOMPRA_ANO = 2;  // locações extras por cliente após a primeira venda
  const PLANO_MES = 3997;  // mensalidade média pra cálculo de payback

  const brl0 = (n) =>
    "R$ " +
    (Number.isFinite(n) ? Math.round(n) : 0).toLocaleString("pt-BR");

  function calcular() {
    const ads = Math.max(Number($("roasAds")?.value) || 0, 0);
    const ticket = Math.max(Number($("roasTicket")?.value) || 0, 0);
    const anos = Math.max(Number($("roasAnos")?.value) || 1, 1);

    // Funil de aquisição mensal
    const leadsMes = ads / CPL_ODUO;
    const vendasMes = leadsMes * CONV;
    const receitaPrimeiraVendaMes = vendasMes * ticket;

    // LTV por cliente: primeira venda + recompras durante a retenção
    const ltv = ticket * (1 + RECOMPRA_ANO * anos);

    // Receita total no período: clientes captados em N anos × LTV
    const clientesPeriodo = vendasMes * 12 * anos;
    const receitaTotal = clientesPeriodo * ltv;

    // ROAS = receita total / investimento total (ads no mesmo período)
    const investimentoTotal = ads * 12 * anos;
    const roas = investimentoTotal > 0 ? receitaTotal / investimentoTotal : 0;

    // Payback do plano em meses: mensalidade / receita extra/mês
    const paybackMeses =
      receitaPrimeiraVendaMes > 0 ? PLANO_MES / receitaPrimeiraVendaMes : 0;

    return { receitaTotal, roas, anos, paybackMeses };
  }

  function paybackTexto(meses) {
    if (!Number.isFinite(meses) || meses <= 0) return "—";
    if (meses < 1) {
      const dias = Math.max(Math.round(meses * 30), 1);
      return `${dias} dia${dias === 1 ? "" : "s"}`;
    }
    return `${meses.toFixed(1).replace(".0", "")} meses`;
  }

  function render() {
    const r = calcular();
    out.innerHTML = `
      <span class="roas-result-eyebrow">Sua receita projetada</span>
      <strong class="roas-result-big">${brl0(r.receitaTotal)}</strong>
      <span class="roas-result-sub">em ${r.anos} ano${r.anos === 1 ? "" : "s"}</span>
      <div class="roas-result-row">
        <span class="roas-pill"><b>${r.roas.toFixed(1)}x</b> de ROAS</span>
        <span class="roas-pill roas-pill-soft">Plano se paga em <b>${paybackTexto(r.paybackMeses)}</b></span>
      </div>
      <p class="roas-result-foot">
        Inclui primeira venda + recompras do cliente ao longo do tempo.
      </p>
    `;
  }

  /* abrir/fechar */
  let lastFocus = null;
  function abrir() {
    lastFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    render();
    setTimeout(() => $("roasAds")?.focus(), 80);
  }
  function fechar() {
    modal.hidden = true;
    document.body.style.overflow = "";
    if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
  }

  openBtn.addEventListener("click", abrir);
  closeBtn?.addEventListener("click", fechar);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) fechar();
  });
  document.addEventListener("keydown", (e) => {
    if (!modal.hidden && e.key === "Escape") fechar();
  });
  form.addEventListener("input", render);
  form.addEventListener("change", render);
})();
