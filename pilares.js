/* =====================================================================
   ODuo · Esteira de Produtos · pilares.js
   Modal expandido dos 3 pilares (Aquisição · Filtro · Monetização).
   Quando o cliente clica num pilar do método, abre um modal com:
   - O processo passo-a-passo
   - Cases relacionados ao pilar (números concretos)
   ===================================================================== */

(() => {
  const PILARES = {
    aquisicao: {
      kicker: "Pilar 1 · Aquisição",
      title: "Como a ODuo traz lead pra sua locadora",
      lead:
        "Anúncios geo-segmentados no Google e Meta para pessoas da sua região " +
        "pesquisando exatamente pelas suas locações.",
      steps: [
        {
          title: "1 · Estudo da região e do catálogo",
          text:
            "Mapeamos as palavras-chave que sua cidade busca (escora, betoneira, " +
            "andaime, etc) e validamos seu catálogo de equipamentos.",
        },
        {
          title: "2 · Landing page profissional otimizada",
          text:
            "Site multipages no ar em 30 dias com cada equipamento como página " +
            "individual — pronto pra ranquear no Google e converter tráfego pago.",
        },
        {
          title: "3 · Campanhas de tráfego pago",
          text:
            "Google Ads (Search + Display) e Meta Ads com criativos próprios. " +
            "Geo-segmentação fina pra atender o raio que sua locadora cobre.",
        },
        {
          title: "4 · Google Meu Negócio otimizado",
          text:
            "Ficha do GMN configurada pra aparecer nas buscas locais — quem " +
            "procura locadora perto de mim encontra você primeiro.",
        },
        {
          title: "5 · Relatório semanal com benchmark",
          text:
            "Você vê todas as semanas onde está o investimento, quantos leads " +
            "chegaram, custo por lead e comparação com a média do mercado.",
        },
      ],
      cases: [
        { name: "CLM Locações", metric: "R$ 18 mil → R$ 310 mil em locações fechadas" },
        { name: "Aliança Betoneiras", metric: "R$ 10 mil em ads → R$ 92 mil de retorno no mês" },
      ],
    },
    filtro: {
      kicker: "Pilar 2 · Filtro Inteligente",
      title: "Loctus IA atende seus leads 24/7 e só passa os quentes",
      lead:
        "Sua IA atendendo no WhatsApp dia e noite. Filtra o curioso do " +
        "comprador, qualifica e agenda direto com o seu vendedor.",
      steps: [
        {
          title: "1 · Treinamento da IA com seu catálogo",
          text:
            "60 dias de ajuste fino pra IA conhecer seu mix, regras de locação, " +
            "calçamento, valores, prazos e regiões atendidas.",
        },
        {
          title: "2 · WhatsApp Business integrado",
          text:
            "Loctus assume seu WhatsApp Business e responde no mesmo número que " +
            "seus clientes já conhecem. Atende 24/7, sem fila.",
        },
        {
          title: "3 · Qualificação automática",
          text:
            "A IA descobre o que o lead precisa, valida orçamento, prazo e " +
            "região. Lead frio recebe info; lead quente vai direto pro vendedor.",
        },
        {
          title: "4 · Handoff pro vendedor",
          text:
            "Quando o lead tá pronto pra fechar, a IA passa o contexto inteiro " +
            "da conversa pro vendedor humano — sem retrabalho.",
        },
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
      steps: [
        {
          title: "1 · Análise da base",
          text:
            "Importamos todos os clientes históricos da sua locadora. A IA " +
            "identifica padrões de recompra (sazonalidade, ticket médio, " +
            "frequência).",
        },
        {
          title: "2 · Cadência inteligente de reativação",
          text:
            "Mensagens automáticas no momento certo: cliente que aluga betoneira " +
            "a cada 6 meses recebe lembrete no 5º. Quem alugou andaime no inverno " +
            "passado recebe oferta no início do inverno seguinte.",
        },
        {
          title: "3 · Ofertas personalizadas",
          text:
            "Cupom de retorno, condição especial pra cliente fiel, lançamento de " +
            "equipamento novo na linha que ele costuma alugar.",
        },
        {
          title: "4 · Mensuração do impacto",
          text:
            "Você vê quanto da receita do mês veio de cliente recorrente vs novo. " +
            "Métrica que separa locadora amadora de locadora profissional.",
        },
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
      <ol class="pilar-modal-steps">
        ${data.steps
          .map(
            (s) => `
          <li>
            <strong>${escapeHtml(s.title)}</strong>
            <span>${escapeHtml(s.text)}</span>
          </li>`
          )
          .join("")}
      </ol>
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
