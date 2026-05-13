/* =====================================================================
   ODuo · Esteira de Produtos · pilares.js
   Modal visual dos 3 pilares (Aquisição · Filtro · Monetização).
   Grade de features com ícones grandes + título curto + 1 linha.
   Imagem vale mais que mil palavras.
   ===================================================================== */

(() => {
  /* Ícones inline SVG estilo Lucide. Cada um é uma string que vai dentro
     do .pilar-feature-icon. */
  const ICONS = {
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    site:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M7 6.5h.01"/><path d="M11 6.5h.01"/></svg>',
    target:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
    pin:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>',
    chart:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m7 14 4-4 3 3 6-7"/></svg>',
    chat:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>',
    bolt:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8Z"/></svg>',
    filter:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></svg>',
    handshake:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5 5 0 0 1 7.06 0l1.06 1.06"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    gift:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 12v10H4V12"/><path d="M2 7h20v5H2z"/><path d="M12 22V7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>',
  };

  const PILARES = {
    aquisicao: {
      kicker: "Pilar 1 · Aquisição",
      title: "Como a ODuo traz lead pra sua locadora",
      lead:
        "Anúncios geo-segmentados no Google e Meta para pessoas da sua região " +
        "pesquisando exatamente pelas suas locações.",
      features: [
        { icon: "bolt", title: "IA + dados de +500 locadoras", desc: "Cruzamos os termos que sua cidade busca com a base de 500+ locadoras atendidas. Acerto em cheio nas palavras-chave.", highlight: true },
        { icon: "site", title: "Landing page profissional", desc: "Otimizada pra converter tráfego pago em lead qualificado." },
        { icon: "target", title: "Tráfego pago profissional", desc: "Google Ads + Meta Ads geo-segmentados na sua região." },
        { icon: "pin", title: "Google Meu Negócio", desc: "Aparece nas buscas locais antes do concorrente." },
        { icon: "chart", title: "Relatório semanal", desc: "Investimento, leads, custo por lead e benchmark de mercado." },
      ],
      cases: [
        { name: "CLM Locações", metric: "R$ 18 mil → R$ 310 mil em locações fechadas" },
        { name: "Aliança Betoneiras", metric: "R$ 10 mil em ads → R$ 92 mil de retorno no mês" },
      ],
    },
    filtro: {
      kicker: "Pilar 2 · Filtro Inteligente",
      title: "Loctus IA atende 24/7 e só passa lead quente",
      lead:
        "Sua IA atendendo no WhatsApp dia e noite. Filtra o curioso do " +
        "comprador, qualifica e agenda direto com o seu vendedor.",
      features: [
        { icon: "bolt", title: "IA treinada com +500 locadoras", desc: "Scripts de qualificação refinados com benchmark do setor.", highlight: true },
        { icon: "chat", title: "WhatsApp 24/7", desc: "Mesmo número que seus clientes já conhecem, atendendo dia e noite." },
        { icon: "filter", title: "Qualificação automática", desc: "Valida orçamento, prazo e região antes de passar pro vendedor." },
        { icon: "handshake", title: "Handoff pro vendedor", desc: "Lead quente chega com o contexto inteiro da conversa." },
      ],
      cases: [
        { name: "Locadora B2B no Sul", metric: "+20% na taxa de conversão respondendo mais rápido" },
        { name: "RG Locações", metric: "R$ 170 mil → R$ 260.644 com leads qualificados" },
      ],
    },
    monetizacao: {
      kicker: "Pilar 3 · Monetização",
      title: "Lembra do cliente antes do concorrente lembrar",
      lead:
        "Sua base de clientes é seu maior ativo. A Loctus reativa " +
        "automaticamente quem já alugou de você — é onde mora o lucro real.",
      features: [
        { icon: "bolt", title: "Padrões de recompra de +500 locadoras", desc: "IA cruza o histórico da sua base com benchmark do setor pra prever quem volta a alugar e quando.", highlight: true },
        { icon: "users", title: "Análise da sua base", desc: "Identifica quem já alugou, quanto tempo faz e qual a chance de retorno." },
        { icon: "clock", title: "Cadência inteligente", desc: "Lembrete no momento certo de cada recompra." },
        { icon: "gift", title: "Ofertas personalizadas", desc: "Cupom de retorno e oferta sazonal automática." },
        { icon: "chart", title: "Mensuração do impacto", desc: "Quanto da receita veio de cliente recorrente." },
      ],
      cases: [
        { name: "Locadora de Equipamentos · MG", metric: "+20% no faturamento vendendo pra base própria" },
        { name: "FL Locações", metric: "R$ 65 mil → R$ 108 mil reativando clientes parados" },
      ],
    },
  };

  const $ = (sel, root = document) => root.querySelector(sel);

  function renderModal(key) {
    const data = PILARES[key];
    if (!data) return;
    $("#pilarModalKicker").textContent = data.kicker;
    $("#pilarModalTitle").textContent = data.title;
    $("#pilarModalLead").textContent = data.lead;
    $("#pilarModalContent").innerHTML = `
      <div class="pilar-features">
        ${data.features
          .map(
            (f) => `
          <div class="pilar-feature${f.highlight ? " pilar-feature-moat" : ""}">
            ${f.highlight ? '<span class="pilar-feature-flag">MOAT ODuo</span>' : ""}
            <div class="pilar-feature-icon">${ICONS[f.icon] || ""}</div>
            <strong>${escapeHtml(f.title)}</strong>
            <span>${escapeHtml(f.desc)}</span>
          </div>`
          )
          .join("")}
      </div>
      <div class="pilar-modal-cases">
        <span class="pilar-modal-cases-head">Cases relacionados</span>
        ${data.cases
          .map(
            (c) => `
          <div class="pilar-modal-case">
            <strong>${escapeHtml(c.name)}</strong>
            <span>${escapeHtml(c.metric)}</span>
          </div>`
          )
          .join("")}
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openModal(key) {
    renderModal(key);
    const modal = $("#pilarModal");
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    const modal = $("#pilarModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".pilar[data-pilar]").forEach((btn) => {
      btn.addEventListener("click", () => openModal(btn.dataset.pilar));
    });
    $("#pilarModalClose")?.addEventListener("click", closeModal);
    $("#pilarModal")?.addEventListener("click", (e) => {
      if (e.target.id === "pilarModal") closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#pilarModal")?.hidden) closeModal();
    });
  });
})();
