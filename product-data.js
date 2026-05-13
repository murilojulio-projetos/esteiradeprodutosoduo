// ODuo · Cardápio de Upsells V2.11 — dados estruturados para o front
// Modalidades:
//   recurring   → MRR (mensal padrão, semestral -10%/-5%, anual -15%/-10%)
//   project     → entrega única (à vista 10% off OU 6× sem juros)
//   hybrid      → fixo + variável (SDR)
//   performance → 100% variável (Hunter)

window.ODUO_CATALOG = [
  // ====================================================================
  // A · PLANO-BASE
  // ====================================================================
  {
    section: "plano-base",
    sectionLabel: "Plano-base · Aquisição",
    sectionKicker: "A · MRR Core",
    sectionDesc:
      "A base de tudo. Comece pelo Avança — Destrava só entra como downsell se o cliente recusar.",
    items: [
      {
        id: "avanca",
        name: "Avança Locações",
        tagline: "O carro-chefe da ODuo. Tráfego + IAs + landing + GMN + relatório.",
        protagonist: true,
        type: "recurring",
        deliverables: [
          "Loctus IA de Atendimento (WhatsApp 24/7)",
          "Loctus IA de Reativação (monetização da base)",
          "Tráfego pago profissional",
          "Landing page otimizada",
          "Google Meu Negócio",
          "Relatório semanal com benchmark",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 3297, suffix: "/mês", pay: "Boleto ou Pix mensal", discount: 0 },
          { id: "semestral", label: "Semestral", price: 3132, suffix: "/mês", pay: "Cartão em 6×", discount: 5, badge: "−5%" },
          { id: "anual", label: "Anual", price: 2967, suffix: "/mês", pay: "Cartão em 12×", discount: 10, badge: "−10%", best: true },
        ],
        note: "Sem fidelidade mínima · aviso prévio de 30 dias.",
      },
      {
        id: "destrava",
        name: "Destrava Loc",
        tagline: "Downsell sem as IAs Loctus. Só se o cliente recusar o Avança.",
        downsell: true,
        type: "recurring",
        deliverables: [
          "Tráfego pago profissional",
          "Landing page otimizada",
          "Google Meu Negócio",
          "Relatório semanal com benchmark",
          "Sem Loctus IA de Atendimento",
          "Sem Loctus IA de Reativação",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 2297, suffix: "/mês", pay: "Boleto ou Pix mensal", discount: 0 },
          { id: "semestral", label: "Semestral", price: 2182, suffix: "/mês", pay: "Cartão em 6×", discount: 5, badge: "−5%" },
          { id: "anual", label: "Anual", price: 2067, suffix: "/mês", pay: "Cartão em 12×", discount: 10, badge: "−10%" },
        ],
      },
    ],
  },

  // ====================================================================
  // B · MONETIZAÇÃO DIRETA — Pacote de Artes
  // ====================================================================
  {
    section: "artes",
    sectionLabel: "Pacote de Artes",
    sectionKicker: "B · Monetização direta · somado ao plano-base",
    sectionDesc:
      "Movimente as redes da sua locadora. Pagamento acompanha o boleto ou o cartão anual do plano-base.",
    items: [
      {
        id: "artes-essencial",
        group: "Pacote de Artes",
        name: "Essencial",
        tagline: "4 publicações no mês",
        type: "recurring",
        addon: true,
        modalities: [{ id: "mensal", label: "Mensal", price: 500, suffix: "/mês", pay: "Acompanha o plano-base (boleto ou cartão)", discount: 0 }],
      },
      {
        id: "artes-profissional",
        group: "Pacote de Artes",
        name: "Profissional",
        tagline: "8 publicações no mês",
        recommended: true,
        type: "recurring",
        addon: true,
        modalities: [{ id: "mensal", label: "Mensal", price: 750, suffix: "/mês", pay: "Acompanha o plano-base (boleto ou cartão)", discount: 0 }],
      },
      {
        id: "artes-completo",
        group: "Pacote de Artes",
        name: "Completo",
        tagline: "12 publicações no mês",
        type: "recurring",
        addon: true,
        modalities: [{ id: "mensal", label: "Mensal", price: 1000, suffix: "/mês", pay: "Acompanha o plano-base (boleto ou cartão)", discount: 0 }],
      },
    ],
  },

  // ====================================================================
  // C · MONETIZAÇÃO DIRETA — Pacote de Vídeo Recorrente
  // ====================================================================
  {
    section: "video",
    sectionLabel: "Pacote de Vídeo Recorrente",
    sectionKicker: "Monetização direta",
    sectionDesc:
      "Vídeos curtos pra escalar autoridade nas redes. Pode acompanhar o plano anual no cartão.",
    items: [
      {
        id: "video-4",
        group: "Pacote de Vídeo Recorrente",
        name: "4 Reels/mês",
        tagline: "Vídeos curtos até 60s, edição profissional",
        type: "recurring",
        addon: true,
        modalities: [
          { id: "mensal", label: "Mensal", price: 800, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "semestral", label: "Semestral", price: 720, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%" },
          { id: "anual", label: "Anual", price: 680, suffix: "/mês", pay: "Cartão em 12×", discount: 15, badge: "−15%", best: true },
        ],
      },
      {
        id: "video-8",
        group: "Pacote de Vídeo Recorrente",
        name: "8 Reels/mês",
        tagline: "Vídeos curtos até 60s, edição profissional",
        recommended: true,
        type: "recurring",
        addon: true,
        modalities: [
          { id: "mensal", label: "Mensal", price: 1500, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "semestral", label: "Semestral", price: 1350, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%" },
          { id: "anual", label: "Anual", price: 1275, suffix: "/mês", pay: "Cartão em 12×", discount: 15, badge: "−15%", best: true },
        ],
      },
    ],
  },

  // ====================================================================
  // D · MONETIZAÇÃO DIRETA — Pacote SEO
  // ====================================================================
  {
    section: "seo",
    sectionLabel: "Pacote SEO",
    sectionKicker: "Monetização direta",
    sectionDesc:
      "Otimização orgânica contínua pra Google. Sem prazo final. Pode acompanhar o plano anual no cartão.",
    items: [
      {
        id: "seo",
        name: "Pacote SEO",
        tagline: "SEO técnico, conteúdo e backlinks. Otimização orgânica para Google.",
        type: "recurring",
        modalities: [
          { id: "mensal", label: "Mensal", price: 1250, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "semestral", label: "Semestral", price: 1125, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%" },
          { id: "anual", label: "Anual", price: 1062, suffix: "/mês", pay: "Cartão em 12×", discount: 15, badge: "−15%", best: true },
        ],
      },
    ],
  },

  // ====================================================================
  // C · IA LOCTUS AVULSAS
  // ====================================================================
  {
    section: "ia",
    sectionLabel: "Inteligência Artificial · Loctus",
    sectionKicker: "C · Standalone ou Upsell de Destrava",
    sectionDesc:
      "Setup único de R$ 5.000 cobre catálogo, fluxos WhatsApp Business e 60 dias de ajuste fino. Cliente Destrava existente: sem setup.",
    items: [
      {
        id: "ia-atendimento",
        name: "Loctus IA de Atendimento",
        tagline: "WhatsApp 24/7. Atende e qualifica leads enquanto seu vendedor dorme.",
        type: "recurring",
        setup: 5000,
        setupNote: "Setup único · 3× sem juros no cartão",
        modalities: [
          { id: "mensal", label: "Mensal", price: 1000, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "semestral", label: "Semestral", price: 900, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%" },
          { id: "anual", label: "Anual", price: 850, suffix: "/mês", pay: "Cartão em 12×", discount: 15, badge: "−15%", best: true },
        ],
      },
      {
        id: "ia-reativacao",
        name: "Loctus IA de Reativação",
        tagline: "Lembra do cliente antes do concorrente lembrar. Onde mora o lucro real.",
        type: "recurring",
        setup: 5000,
        setupNote: "Setup único · 3× sem juros no cartão",
        modalities: [
          { id: "mensal", label: "Mensal", price: 1000, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "semestral", label: "Semestral", price: 900, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%" },
          { id: "anual", label: "Anual", price: 850, suffix: "/mês", pay: "Cartão em 12×", discount: 15, badge: "−15%", best: true },
        ],
      },
      {
        id: "ia-combo",
        name: "Combo · as duas IAs",
        tagline: "Atendimento + Reativação. Setup único, mesmo valor.",
        recommended: true,
        type: "recurring",
        setup: 5000,
        setupNote: "Setup único · 3× sem juros no cartão",
        modalities: [
          { id: "mensal", label: "Mensal", price: 2000, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "semestral", label: "Semestral", price: 1800, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%" },
          { id: "anual", label: "Anual", price: 1700, suffix: "/mês", pay: "Cartão em 12×", discount: 15, badge: "−15%", best: true },
        ],
      },
    ],
  },

  // ====================================================================
  // D · PROJETOS PONTUAIS
  // ====================================================================
  {
    section: "projetos",
    sectionLabel: "Projetos Pontuais",
    sectionKicker: "D · Começo, meio e fim",
    sectionDesc: "Entregas únicas. 10% off à vista ou 6× sem juros no cartão.",
    items: [
      {
        id: "site",
        name: "Site Multipages",
        tagline: "Profissional, otimizado para tráfego pago. Até 100 equipamentos. No ar em 30–45 dias.",
        type: "project",
        modalities: [
          { id: "avista", label: "À vista", price: 4500, suffix: "", pay: "Cartão ou Pix · 10% off", discount: 10, best: true },
          { id: "parcelado", label: "Parcelado", price: 833, suffix: " × 6", pay: "Cartão · 6× sem juros · total R$ 5.000", discount: 0 },
        ],
      },
      {
        id: "branding",
        name: "Branding Completo",
        tagline: "Logo, paleta, tipografia, manual, papelaria e identidade digital. 30–45 dias.",
        type: "project",
        modalities: [
          { id: "avista", label: "À vista", price: 6750, suffix: "", pay: "Cartão ou Pix · 10% off", discount: 10, best: true },
          { id: "parcelado", label: "Parcelado", price: 1250, suffix: " × 6", pay: "Cartão · 6× sem juros · total R$ 7.500", discount: 0 },
        ],
      },
      {
        id: "video-inst",
        name: "Vídeo Institucional",
        tagline: "1 vídeo de 1–2 minutos. Para site, apresentações, lançamentos.",
        type: "project",
        modalities: [
          { id: "avista", label: "À vista", price: 2250, suffix: "", pay: "Cartão ou Pix · 10% off", discount: 10, best: true },
          { id: "parcelado", label: "Parcelado", price: 417, suffix: " × 6", pay: "Cartão · 6× sem juros · total R$ 2.500", discount: 0 },
        ],
      },
      {
        id: "video-premium",
        name: "Vídeo Premium",
        tagline: "1 vídeo de 3–5 minutos, gravação no cliente.",
        type: "project",
        modalities: [
          { id: "avista", label: "À vista", price: 4500, suffix: "", pay: "Cartão ou Pix · 10% off", discount: 10, best: true },
          { id: "parcelado", label: "Parcelado", price: 833, suffix: " × 6", pay: "Cartão · 6× sem juros · total R$ 5.000", discount: 0 },
        ],
      },
    ],
  },

  // ====================================================================
  // E · TREINAMENTO COMERCIAL
  // ====================================================================
  {
    section: "treinamento",
    sectionLabel: "Treinamento Comercial",
    sectionKicker: "E · 3 níveis · Projeto",
    sectionDesc:
      "Quando o cliente reclama de baixa conversão. Cliente oculto + diagnóstico + acompanhamento.",
    items: [
      {
        id: "diag-express",
        name: "Diagnóstico Express",
        tagline: "Diagnóstico geral + reunião de descoberta + treinamento geral.",
        type: "project",
        modalities: [
          { id: "avista", label: "À vista", price: 4500, suffix: "", pay: "10% off · total R$ 4.500", discount: 10, best: true },
          { id: "parcelado", label: "Parcelado", price: 833, suffix: " × 6", pay: "6× sem juros · total R$ 5.000", discount: 0 },
        ],
      },
      {
        id: "acomp-90",
        name: "Acompanhamento 90 dias",
        tagline: "Diagnóstico + raio-X + coach técnico + 90 dias de acompanhamento.",
        recommended: true,
        type: "project",
        modalities: [
          { id: "avista", label: "À vista", price: 9000, suffix: "", pay: "10% off · total R$ 9.000", discount: 10, best: true },
          { id: "parcelado", label: "Parcelado", price: 1667, suffix: " × 6", pay: "6× sem juros · total R$ 10.000", discount: 0 },
        ],
      },
      {
        id: "acomp-6m",
        name: "Acompanhamento 6 meses",
        tagline: "Premium. Reunião individual com cada membro + análise contínua.",
        type: "project",
        modalities: [
          { id: "avista", label: "À vista", price: 16200, suffix: "", pay: "10% off · total R$ 16.200", discount: 10, best: true },
          { id: "parcelado", label: "Parcelado", price: 3000, suffix: " × 6", pay: "6× sem juros · total R$ 18.000", discount: 0 },
        ],
      },
    ],
  },

  // ====================================================================
  // G · COMERCIAL (PERFORMANCE)
  // ====================================================================
  {
    section: "comercial",
    sectionLabel: "Produtos Comerciais",
    sectionKicker: "G · Performance",
    sectionDesc:
      "SDR e Hunter são apresentados aqui, mas fecham em 2ª reunião com Isabelly (CRO).",
    items: [
      {
        id: "sdr",
        name: "SDR ODuo",
        tagline:
          "SDR alocado prospecta sua base + mercado. 30h/mês, meta 12–20 reuniões qualificadas.",
        type: "hybrid",
        setup: 2000,
        setupNote: "Setup único · treinamento do SDR no seu negócio",
        commission: "10% sobre a 1ª locação fechada via lead do SDR",
        secondMeeting: true,
        modalities: [
          { id: "mensal", label: "Mensal", price: 3000, suffix: "/mês fixo", pay: "Boleto/Pix mensal", discount: 0 },
          { id: "semestral", label: "Semestral", price: 2700, suffix: "/mês fixo", pay: "Cartão em 6×", discount: 10, badge: "−10%" },
          { id: "anual", label: "Anual", price: 2550, suffix: "/mês fixo", pay: "Cartão em 12×", discount: 15, badge: "−15%", best: true },
        ],
        note: "Aviso prévio 60 dias. SDR compartilhado entre até 3 clientes.",
      },
      {
        id: "hunter",
        name: "Hunter de RH",
        tagline:
          "Recrutamento de vendedor, atendente, gerente comercial. 100% do 1º salário do contratado.",
        type: "performance",
        secondMeeting: true,
        modalities: [
          {
            id: "perf",
            label: "Performance",
            price: 0,
            suffix: "",
            pay: "Entrada + saldo no fechamento da vaga · cartão ou 2× boleto",
            discount: 0,
            customLabel: "100% do 1º salário",
          },
        ],
        note: "Investimento variável conforme o cargo. Apresentar em 2ª reunião.",
      },
    ],
  },
];
