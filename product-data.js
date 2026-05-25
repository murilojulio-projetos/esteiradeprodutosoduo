// ODuo · Cardápio de Upsells V2.11 — dados estruturados para o front
// Modalidades:
//   recurring   → MRR (só preço mensal; desconto vem da DURAÇÃO global, 1%/mês)
//   project     → entrega única (à vista 10% off OU 6× sem juros)
//   hybrid      → fixo + variável (SDR)
//   performance → 100% variável (Hunter)

window.ODUO_CATALOG = [
  // ====================================================================
  // A · PLANO-BASE
  // ====================================================================
  {
    section: "plano-base",
    track: "marketing",
    sectionLabel: "Plano-base · Aquisição",
    sectionKicker: "Planos-base",
    sectionDesc:
      "A base de tudo: tráfego pago, IAs de atendimento e tudo que sua locadora precisa pra crescer. Escolha o plano que faz sentido no seu momento.",
    items: [
      {
        id: "avanca",
        name: "Avança Locações",
        tagline: "O carro-chefe da ODuo. Tráfego + IAs + landing + GMN + relatório.",
        protagonist: true,
        type: "recurring",
        /* Deliverables aceita 2 formatos:
           - string  → CORE, não removível (faz parte da essência do Avança)
           - objeto  → REMOVÍVEL com {name, removeId, removeDiscount, removeWarning}
           Quando o cliente remove pelo menos 1, o plano vira "Avança Custom"
           e o preço diminui pelo soma dos removeDiscount. Lógica em oduo-core.js
           (loadCustomizations / computeRemovalDiscount). */
        deliverables: [
          "Tráfego pago profissional",
          "Loctus IA de Atendimento (WhatsApp 24/7)",
          "Landing page otimizada",
          {
            name: "Loctus IA de Reativação (monetização da base)",
            removeId: "ia-reativacao",
            removeDiscount: 500,
            removeWarning: "Sem reativar clientes parados da sua base de forma automática.",
          },
          {
            name: "Google Meu Negócio",
            removeId: "gmb",
            removeDiscount: 200,
            removeWarning: "Só se você já tem GMB ativo, otimizado e gerenciado.",
          },
          "Relatório semanal com benchmark",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 3297, suffix: "/mês", pay: "Boleto ou Pix mensal", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 2997, suffix: "/mês", pay: "Cartão em 3×", discount: 9, badge: "−9%" },
          { id: "semestral", label: "Semestral", price: 2797, suffix: "/mês", pay: "Cartão em 6×", discount: 15, badge: "−15%", best: true },
        ],
        note: "Sem fidelidade mínima · aviso prévio de 30 dias.",
      },
      {
        id: "destrava",
        name: "Destrava Loc",
        tagline: "Tráfego pago, landing page e presença no Google. O essencial pra atrair clientes.",
        type: "recurring",
        deliverables: [
          "Tráfego pago profissional",
          "Landing page otimizada",
          {
            name: "Google Meu Negócio",
            removeId: "gmb",
            removeDiscount: 200,
            removeWarning: "Só se você já tem GMB ativo, otimizado e gerenciado.",
          },
          "Relatório semanal com benchmark",
          "Sem Loctus IA de Atendimento",
          "Sem Loctus IA de Reativação",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 2297, suffix: "/mês", pay: "Boleto ou Pix mensal", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 2182, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 2067, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%" },
        ],
      },
    ],
  },

  // ====================================================================
  // B · MONETIZAÇÃO DIRETA — Pacote de Artes
  // ====================================================================
  {
    section: "artes",
    track: "marketing",
    sectionLabel: "Pacote de Artes",
    sectionKicker: "Somado ao plano-base",
    sectionDesc:
      "Movimente as redes da sua locadora. Pagamento acompanha o boleto ou o cartão do plano-base.",
    items: [
      {
        id: "artes-essencial",
        group: "Pacote de Artes",
        name: "Essencial",
        tagline: "4 publicações no mês",
        type: "recurring",
        addon: true,
        deliverables: [
          "4 publicações no mês",
          "Design profissional alinhado à marca",
          "Calendário editorial mensal",
          "Roteiros e copy customizados",
          "Relatório de performance",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 500, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 475, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 450, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
      },
      {
        id: "artes-profissional",
        group: "Pacote de Artes",
        name: "Profissional",
        tagline: "8 publicações no mês",
        upgradeBenefit: "Dobra a frequência de posts e mantém a marca ativa nas redes.",
        recommended: true,
        type: "recurring",
        addon: true,
        deliverables: [
          "8 publicações no mês · 2 por semana",
          "Design profissional alinhado à marca",
          "Calendário editorial mensal",
          "Roteiros e copy customizados",
          "Stories complementares",
          "Relatório de performance",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 750, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 712, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 675, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
      },
      {
        id: "artes-completo",
        group: "Pacote de Artes",
        name: "Completo",
        tagline: "12 publicações no mês",
        upgradeBenefit: "3 posts por semana · presença máxima no Instagram.",
        type: "recurring",
        addon: true,
        deliverables: [
          "12 publicações no mês · 3 por semana",
          "Design profissional alinhado à marca",
          "Calendário editorial mensal",
          "Roteiros e copy customizados",
          "Stories complementares + boxes de destaques",
          "Engajamento ativo (curtidas e comentários)",
          "Relatório de performance",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 1000, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 950, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 900, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
      },
    ],
  },

  // ====================================================================
  // C · MONETIZAÇÃO DIRETA — Pacote de Vídeo Recorrente
  // ====================================================================
  {
    section: "video",
    track: "marketing",
    sectionLabel: "Pacote de Vídeo Recorrente",
    sectionKicker: "Monetização direta",
    sectionDesc:
      "Vídeos curtos pra escalar autoridade nas redes. Pode acompanhar o plano-base no cartão.",
    items: [
      {
        id: "video-4",
        group: "Pacote de Vídeo Recorrente",
        name: "4 Reels/mês",
        tagline: "Vídeos curtos até 60s, edição profissional",
        type: "recurring",
        addon: true,
        deliverables: [
          "4 reels no mês · 1 por semana",
          "Edição profissional · vídeos até 60s",
          "Roteiro + captions otimizadas",
          "Trilha sonora e cortes alinhados a tendências",
          "Otimização para Instagram, TikTok e YouTube Shorts",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 800, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 760, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 720, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
      },
      {
        id: "video-8",
        group: "Pacote de Vídeo Recorrente",
        name: "8 Reels/mês",
        tagline: "Vídeos curtos até 60s, edição profissional",
        upgradeBenefit: "Dobra os reels no mês · 2 por semana pra surfar tendências.",
        recommended: true,
        type: "recurring",
        addon: true,
        deliverables: [
          "8 reels no mês · 2 por semana",
          "Edição profissional · vídeos até 60s",
          "Roteiro + captions otimizadas",
          "Trilha sonora e cortes alinhados a tendências",
          "Otimização para Instagram, TikTok e YouTube Shorts",
          "Frequência ideal pra surfar viralização",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 1500, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 1425, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 1350, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
      },
    ],
  },

  // ====================================================================
  // D · MONETIZAÇÃO DIRETA — Pacote SEO + Site
  // ====================================================================
  {
    section: "seo",
    track: "marketing",
    sectionLabel: "Site, Landing Page e SEO",
    sectionKicker: "Presença digital · tráfego pago e orgânico",
    sectionDesc:
      "Site multipages ou landing page otimizados pra tráfego pago — com manutenção mensal opcional — e SEO técnico contínuo pra ranquear no Google.",
    items: [
      {
        id: "site",
        name: "Site Multipages",
        tagline: "Profissional, otimizado para tráfego pago. Até 100 equipamentos. No ar em 30 dias.",
        upgradeBenefit: "Site profissional otimizado pra converter tráfego pago e SEO. Até 100 equipamentos · no ar em 30 dias.",
        type: "project",
        addsAddon: "site-manutencao",
        deliverables: [
          "Site profissional otimizado pra tráfego pago e conversão",
          "Cadastro de até 100 equipamentos com página individual",
          "Estrutura preparada pra SEO (pré-requisito do Pacote SEO)",
          "Briefing aprovado → no ar em 30 dias",
          "Suporte técnico do time ODuo pós-publicação",
        ],
        modalities: [
          { id: "avista", label: "À vista", price: 4500, suffix: "", pay: "Cartão ou Pix · 10% off", discount: 10, best: true },
          { id: "parcelado", label: "Parcelado", price: 833, suffix: " × 6", pay: "Cartão · 6× sem juros · total R$ 5.000", discount: 0 },
        ],
      },
      {
        id: "site-manutencao",
        hidden: true,
        name: "Manutenção mensal do Site",
        tagline: "Ajustes, novos equipamentos e suporte técnico todo mês — sem pagar por hora.",
        type: "recurring",
        deliverables: [
          "Ajustes e pequenas melhorias no site todo mês",
          "Atualização de equipamentos, fotos e textos no catálogo",
          "Monitoramento de funcionamento e correções de bugs",
          "Backup e atualizações de segurança",
          "Suporte técnico prioritário do time ODuo (sem cobrança por hora)",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 297, suffix: "/mês", pay: "Boleto ou Pix mensal", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 282, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 267, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
        note: "Aviso prévio 30 dias.",
      },
      {
        id: "lp",
        name: "Landing Page",
        tagline: "Uma página única de alta conversão, focada em tráfego pago. No ar em ~15 dias.",
        upgradeBenefit: "Landing page única focada em converter tráfego pago. No ar em ~15 dias.",
        type: "project",
        addsAddon: "lp-manutencao",
        deliverables: [
          "Landing page única otimizada pra conversão",
          "Estrutura focada em tráfego pago (Google e Meta)",
          "Formulário e botão de WhatsApp integrados",
          "Layout responsivo (celular e desktop)",
          "Briefing aprovado → no ar em ~15 dias",
          "Suporte técnico do time ODuo pós-publicação",
        ],
        modalities: [
          { id: "avista", label: "À vista", price: 2000, suffix: "", pay: "Cartão ou Pix · à vista", discount: 0, best: true },
          { id: "parcelado", label: "Parcelado", price: 417, suffix: " × 6", pay: "Cartão · 6× sem juros · total R$ 2.500", discount: 0 },
        ],
      },
      {
        id: "lp-manutencao",
        hidden: true,
        name: "Manutenção mensal da Landing Page",
        tagline: "Ajustes, atualizações e suporte técnico da sua LP todo mês.",
        type: "recurring",
        deliverables: [
          "Ajustes e melhorias na landing page todo mês",
          "Atualização de ofertas, textos e imagens",
          "Monitoramento de funcionamento e correções de bugs",
          "Backup e atualizações de segurança",
          "Suporte técnico prioritário do time ODuo",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 297, suffix: "/mês", pay: "Boleto ou Pix mensal", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 282, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 267, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
        note: "Aviso prévio 30 dias.",
      },
      {
        id: "seo",
        name: "Pacote SEO",
        tagline: "Seu site nas primeiras orgânicas do Google. SEO técnico, conteúdo e backlinks contínuos.",
        upgradeBenefit: "Seu site aparece nas primeiras orgânicas do Google.",
        requires: { id: "site", reason: "O SEO só funciona com Site Multipages (não roda em landing page)." },
        type: "recurring",
        deliverables: [
          "SEO técnico contínuo · auditoria + correções",
          "Produção de conteúdo otimizado pra Google",
          "Construção de backlinks de qualidade",
          "Otimização das páginas de equipamentos",
          "Acompanhamento do ranking nas palavras-chave",
          "Relatório mensal de posições e tráfego",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 1250, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 1187, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 1125, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
      },
    ],
  },

  // ====================================================================
  // E · GOOGLE MEU NEGÓCIO — card único com toggle "+ Acompanhamento"
  // ====================================================================
  {
    section: "gmb",
    track: "marketing",
    sectionLabel: "Google Meu Negócio",
    sectionKicker: "Presença local · busca no Google Maps",
    sectionDesc:
      "Apareça no topo das buscas locais antes do concorrente. Implementação sob demanda · acompanhamento mensal opcional pra delegar a manutenção.",
    items: [
      {
        id: "gmb",
        name: "Google Meu Negócio",
        tagline:
          "Configuração completa + manual pra você gerenciar. Adicione o acompanhamento mensal se quiser delegar a manutenção.",
        type: "project",
        addsAddon: "gmb-acompanhamento",
        deliverables: [
          "Configuração completa do perfil GMB",
          "Otimização de endereço, telefone, horários e categorias",
          "Inserção de até 30 fotos profissionais do galpão e equipamentos",
          "Conexão com Google Maps e área de cobertura",
          "Manual de melhores práticas (publicações, respostas, fotos)",
          "Ativo e otimizado em até 10 dias úteis",
        ],
        modalities: [
          { id: "avista", label: "À vista", price: 1350, suffix: "", pay: "Cartão ou Pix · 10% off", discount: 10, best: true },
          { id: "parcelado", label: "Parcelado", price: 250, suffix: " × 6", pay: "Cartão · 6× sem juros · total R$ 1.500", discount: 0 },
        ],
      },
      {
        id: "gmb-acompanhamento",
        hidden: true,
        name: "Acompanhamento mensal · GMB",
        tagline: "Publicações semanais, respostas a avaliações e otimização contínua.",
        type: "recurring",
        deliverables: [
          "Publicações semanais com fotos e novidades",
          "Resposta a avaliações de clientes",
          "Otimização contínua pra busca local (palavras-chave + atributos)",
          "Inserção de novos equipamentos ao longo do mês",
          "Relatório mensal de visualizações, cliques e ligações",
          "Suporte do time ODuo no WhatsApp",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 397, suffix: "/mês", pay: "Boleto ou Pix mensal", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 377, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 357, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
        note: "Aviso prévio 30 dias.",
      },
    ],
  },

  // ====================================================================
  // E · PROJETOS PONTUAIS (Site mora na section SEO + Site)
  // ====================================================================
  {
    section: "projetos",
    track: "marketing",
    sectionLabel: "Branding e Vídeo",
    sectionKicker: "Começo, meio e fim",
    sectionDesc: "Entregas únicas. 10% off à vista ou 6× sem juros no cartão.",
    items: [
      {
        id: "branding",
        name: "Branding Completo",
        tagline: "Logo, paleta, tipografia, manual, papelaria e identidade digital. 30–45 dias.",
        type: "project",
        deliverables: [
          "Logo + variações (principal, simplificada, monocromática)",
          "Paleta de cores e tipografia oficial",
          "Manual de marca (regras de uso e aplicação)",
          "Papelaria (cartão, assinatura de e-mail, padrão de orçamento)",
          "Identidade digital (avatares, capas de rede social)",
          "Entrega em 30–45 dias após briefing aprovado",
        ],
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
        deliverables: [
          "1 vídeo institucional de 1–2 minutos",
          "Roteiro + edição profissional",
          "Pronto pra site, apresentações e lançamentos",
        ],
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
        deliverables: [
          "1 vídeo premium de 3–5 minutos",
          "Gravação presencial no cliente (equipamento profissional)",
          "Roteiro, direção e edição profissional",
          "Pra cases de sucesso, lançamentos e apresentações comerciais",
        ],
        modalities: [
          { id: "avista", label: "À vista", price: 4500, suffix: "", pay: "Cartão ou Pix · 10% off", discount: 10, best: true },
          { id: "parcelado", label: "Parcelado", price: 833, suffix: " × 6", pay: "Cartão · 6× sem juros · total R$ 5.000", discount: 0 },
        ],
      },
    ],
  },

  // ====================================================================
  // F · IA LOCTUS AVULSAS
  // ====================================================================
  {
    section: "ia",
    track: "marketing",
    sectionLabel: "Inteligência Artificial · Loctus",
    sectionKicker: "Inteligência artificial",
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
        deliverables: [
          "Loctus IA atendendo no WhatsApp 24/7",
          "Qualificação automática (orçamento, prazo, região)",
          "Handoff pro vendedor com contexto da conversa",
          "Setup: configuração técnica + catálogo + fluxos WhatsApp Business",
          "Onboarding com Lucas Pereira + 60 dias de ajuste fino",
          "Cliente Destrava existente: sem setup (mesma infra)",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 1000, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 950, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 900, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
      },
      {
        id: "ia-reativacao",
        name: "Loctus IA de Reativação",
        tagline: "Lembra do cliente antes do concorrente lembrar. Onde mora o lucro real.",
        type: "recurring",
        setup: 5000,
        setupNote: "Setup único · 3× sem juros no cartão",
        deliverables: [
          "IA analisa sua base e identifica padrões de recompra",
          "Cadência inteligente: lembrete no momento certo de cada cliente",
          "Ofertas personalizadas (cupom de retorno, sazonal)",
          "Setup: integração com sua base + catálogo + WhatsApp Business",
          "Onboarding com Lucas Pereira + 60 dias de ajuste fino",
          "Cliente Destrava existente: sem setup (mesma infra)",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 1000, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 950, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 900, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
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
        deliverables: [
          "Loctus IA de Atendimento (WhatsApp 24/7) — qualificação automática",
          "Loctus IA de Reativação — análise da base + cadência inteligente",
          "Setup único cobre AS DUAS IAs (mesma infra · economia de 50%)",
          "Onboarding com Lucas Pereira + 60 dias de ajuste fino",
          "Cliente Destrava existente: sem setup",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 2000, suffix: "/mês", pay: "Boleto/Pix", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 1900, suffix: "/mês", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 1800, suffix: "/mês", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
      },
    ],
  },

  // ====================================================================
  // ESTRUTURAÇÃO COMERCIAL — carro-chefe da aba Comercial
  // ====================================================================
  {
    section: "estruturacao",
    track: "comercial",
    sectionLabel: "Estruturação Comercial",
    sectionKicker: "Programa · 90 dias",
    sectionDesc:
      "Organiza seu comercial ponta a ponta — do orçamento que entra ao cliente que volta.",
    items: [
      {
        id: "estruturacao-comercial",
        name: "Programa Estruturação Comercial",
        protagonist: true,
        tagline:
          "Cinco frentes pra estruturar seu comercial — da captação à recompra.",
        type: "project",
        defaultModalityId: "parcelado",
        deliverables: [
          "Diagnóstico Comercial Profundo — a foto real do seu comercial hoje",
          "Treinamento Sob Medida — sua equipe operando no padrão certo",
          "Acompanhamento de 90 dias — consultor presente até virar rotina",
          {
            name: "Loctus · Plataforma com IA de Atendimento 24/7",
            removeId: "loctus-ia",
            removeDiscount: 5000,
            removeWarning: "Sem a IA Loctus atendendo e qualificando o orçamento 24/7.",
          },
          "Processo de Monetização da Base — renovação, recompra e LTV",
          "Implementação de CRM",
        ],
        modalities: [
          { id: "avista", label: "À vista", price: 16997, suffix: "", pay: "Cartão ou Pix · economia vs serviços avulsos", discount: 0, best: true },
          { id: "parcelado", label: "Parcelado", price: 1997, suffix: " × 12", pay: "Cartão · 12× sem juros · total R$ 23.964", discount: 0 },
        ],
        note: "Começa pelo Diagnóstico Comercial gratuito.",
      },
    ],
  },

  // ====================================================================
  // G · TREINAMENTO COMERCIAL
  // ====================================================================
  {
    section: "treinamento",
    track: "comercial",
    sectionLabel: "Treinamento Comercial",
    sectionKicker: "Treinamento · 3 níveis",
    sectionDesc:
      "Quando o cliente reclama de baixa conversão. Cliente oculto + diagnóstico + acompanhamento.",
    items: [
      {
        id: "diag-express",
        name: "Diagnóstico Express",
        tagline: "Diagnóstico geral + reunião de descoberta + treinamento geral.",
        type: "project",
        deliverables: [
          "Diagnóstico geral da área comercial",
          "Reunião de descoberta com o time",
          "Treinamento geral",
        ],
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
        deliverables: [
          "Diagnóstico geral da área comercial",
          "Reunião de descoberta com o time",
          "Treinamento geral",
          "Acompanhamento raio-X",
          "Coach técnico geral",
          "Acompanhamento por 90 dias",
        ],
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
        deliverables: [
          "Diagnóstico geral da área comercial",
          "Reunião de descoberta com o time",
          "Reunião individual com cada membro + coach técnico",
          "Treinamento geral",
          "Acompanhamento raio-X",
          "Análise contínua de evolução",
          "Acompanhamento por 6 meses",
        ],
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
    track: "comercial",
    sectionLabel: "Produtos Comerciais",
    sectionKicker: "Performance",
    sectionDesc:
      "SDR humano + recrutamento de time comercial pra escalar a operação.",
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
        deliverables: [
          "SDR humano alocado prospectando sua base + mercado",
          "30h/mês dedicadas · meta de 12 a 20 reuniões qualificadas/mês",
          "Setup: treinamento no seu negócio (catálogo, ICP, scripts, CRM)",
          "Suporte de gestor + ferramentas inclusos no fixo",
          "Variável: 10% sobre a 1ª locação fechada via lead do SDR",
          "SDR compartilhado entre até 3 clientes (exclusivo via Isabelly)",
          "Aviso prévio 60 dias (não 30 como o plano-base)",
        ],
        modalities: [
          { id: "mensal", label: "Mensal", price: 3000, suffix: "/mês fixo", pay: "Boleto/Pix mensal", discount: 0 },
          { id: "trimestral", label: "Trimestral", price: 2850, suffix: "/mês fixo", pay: "Cartão em 3×", discount: 5, badge: "−5%" },
          { id: "semestral", label: "Semestral", price: 2700, suffix: "/mês fixo", pay: "Cartão em 6×", discount: 10, badge: "−10%", best: true },
        ],
        note: "Aviso prévio 60 dias. SDR compartilhado entre até 3 clientes.",
      },
      {
        id: "hunter",
        name: "Hunter de RH",
        tagline:
          "Recrutamento de vendedor, atendente, gerente comercial. 2 primeiros salários do contratado.",
        type: "performance",
        deliverables: [
          "Recrutamento especializado (vendedor, atendente, gerente comercial)",
          "Triagem e entrevistas técnicas com candidatos",
          "Apresentação dos finalistas pra você decidir",
          "Garantia de reposição: se o candidato não der certo em 60 dias após a contratação, repomos sem custo",
          "Pagamento: entrada no início + saldo no fechamento da vaga",
          "Cartão (entrada + saldo) ou 2× boleto bancário",
        ],
        modalities: [
          {
            id: "perf",
            label: "Performance",
            price: 0,
            suffix: "",
            pay: "Entrada + saldo no fechamento da vaga · cartão ou 2× boleto",
            discount: 0,
            customLabel: "2 primeiros salários",
          },
        ],
        note: "Investimento variável conforme o cargo do contratado.",
      },
    ],
  },
];
