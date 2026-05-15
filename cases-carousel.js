/* =====================================================================
   ODuo · Esteira de Produtos · cases-carousel.js
   Carousel "Cases de sucesso" + modal de case study.

   Filosofia do modal (V2):
   1. Voz do cliente é a abertura (quote ou vídeo), NÃO o número.
   2. Highlights = vitórias concretas extraídas do PDF (compraram X,
      bateram Y, conquistaram Z) — não abstrações.
   3. Número/percentual entra DEPOIS como evidência, não como hero.
   4. Ordem por case: video|quote → highlights → números → story → CTA.
   ===================================================================== */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const ICONS = {
    "trending-up":
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>',
    target:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/></svg>',
    clock:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    calendar:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    truck:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>',
    building:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21V8l9-5 9 5v13"/><path d="M9 21v-6h6v6"/><path d="M9 12h.01M15 12h.01"/></svg>',
    globe:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>',
    rocket:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"/><path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0"/><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/></svg>',
    star:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    plus:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
    users:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    swap:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>',
    spark:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v6M12 16v6M4.93 4.93l4.24 4.24M14.83 14.83l4.24 4.24M2 12h6M16 12h6M4.93 19.07l4.24-4.24M14.83 9.17l4.24-4.24"/></svg>',
  };

  const CASES = {
    clm: {
      categories: ["roas"],
      person: { name: "Cristiano", role: "Proprietário · CLM Locações", photo: "assets/cases/people/cristiano.jpg" },
      numbers: [
        { label: "Investimento em ads", value: "R$ 18.000" },
        { label: "Retorno em locações", value: "R$ 110.000" },
      ],
      quote: {
        text:
          "Investimos na ODuo e o resultado foi impressionante: mais de R$ 110.000,00 em locações fechadas. Além do retorno financeiro, tivemos clareza no processo, agilidade nas entregas e um atendimento que realmente entende do nosso mercado. Hoje temos previsibilidade e muito mais confiança no crescimento da nossa locadora.",
        cite: "Cristiano · Proprietário, CLM Locações",
      },
      highlights: [
        { icon: "chart", title: "ROAS de 6,1×", sub: "R$ 18k em ads vira R$ 110k em locações" },
        { icon: "target", title: "Previsibilidade", sub: "Sai do mês a mês incerto" },
        { icon: "users", title: "Atendimento que entende", sub: "Time fala a língua de locadora" },
      ],
    },
    alianca: {
      categories: ["roas"],
      person: { name: "Felipe Bochnia", role: "Proprietário · Aliança Betoneiras", photo: "assets/cases/people/felipe.jpg" },
      numbers: [
        { label: "Investimento em ads", value: "R$ 10.000" },
        { label: "Retorno em locações", value: "R$ 82.000" },
      ],
      story:
        "Quando a Aliança chegou na ODuo, nunca tinha investido em anúncios. Em mais de 2 anos de parceria, saiu de R$ 200 mil para mais de R$ 300 mil de faturamento mensal — investimento + execução correta vira crescimento.",
      quote: {
        text:
          "Investimos sem medo com a ODuo, esse mês e voltou mais de R$ 80.000,00 em locações. O time entende nosso mercado e nos trouxe resultados com clareza. Hoje temos segurança para investir porque sabemos que o retorno vem.",
        cite: "Felipe Bochnia · Proprietário, Aliança Betoneiras",
      },
      highlights: [
        { icon: "truck", title: "Compraram betoneiras novas", sub: "Pra atender a demanda crescente" },
        { icon: "building", title: "Obras com construtoras", sub: "Clientes B2B fixos em Curitiba" },
        { icon: "trending-up", title: "Investem mais todo mês", sub: "Confiança no retorno do método" },
      ],
      video: "https://www.instagram.com/p/DJHHtv0i2CQ/",
      videoMp4: "assets/videos/alianca.mp4",
    },
    rg: {
      categories: ["roas"],
      person: { name: "Rodrigo Gois", role: "Proprietário · RG Locações", photo: "assets/cases/people/rodrigo.jpg" },
      numbers: [
        { label: "Faturamento antes", value: "R$ 170.000" },
        { label: "Faturamento depois", value: "R$ 260.644" },
      ],
      highlights: [
        { icon: "trending-up", title: "+53% no faturamento", sub: "R$ 170k → R$ 260.644 em poucos meses" },
        { icon: "globe", title: "Topo do Google na região", sub: "Novo canal de aquisição constante" },
        { icon: "users", title: "Sai da indicação como única fonte", sub: "Cliente novo todo mês via tráfego pago" },
      ],
    },
    fl: {
      categories: ["demanda"],
      person: { name: "Fabiane", role: "Proprietária · FL Locações", photo: "assets/cases/people/fabiane.jpg" },
      numbers: [
        { label: "Travados em", value: "R$ 65.000" },
        { label: "Hoje em", value: "R$ 108.561" },
      ],
      quote: {
        text:
          "A ODuo não deu só uma mãozinha — deu a mão, o pé e metade do corpo pra transformar nosso resultado. Hoje, cerca de 70% dos clientes vêm pelo Google.",
        cite: "Fabiane · FL Locações",
      },
      highlights: [
        { icon: "trending-up", title: "Quebrou a estagnação", sub: "Travados em R$ 65k por meses · hoje em R$ 108k" },
        { icon: "search", title: "70% dos clientes vêm do Google", sub: "Aquisição dominada por tráfego pago" },
        { icon: "rocket", title: "Cresceu na crise da indústria", sub: "Mesmo com o setor em baixa" },
      ],
    },
    maven: {
      categories: ["demanda"],
      person: { name: "Roger", role: "Proprietário · Maven", photo: "assets/cases/people/roger.jpg" },
      heroStat: { value: "Dobrou", label: "Faturamento em ~90 dias com a ODuo" },
      story:
        "A Maven sentia dificuldade em atrair novos clientes de forma consistente. Em cerca de 90 dias adaptando a estratégia com a ODuo, o faturamento dobrou — saiu de menos da metade do que tem hoje. Pico de demanda a partir de julho/agosto.",
      highlights: [
        { icon: "spark", title: "Faturamento dobrou", sub: "Em ~90 dias com a ODuo" },
        { icon: "calendar", title: "Pico em julho/agosto", sub: "Demanda alta sustentada na temporada" },
        { icon: "target", title: "Aquisição consistente", sub: "Sai do 'difícil conseguir cliente novo'" },
      ],
    },
    esmanhoto: {
      categories: ["demanda"],
      person: { name: "Cristian", role: "Proprietário · Esmanhoto", photo: "assets/cases/people/cristian.jpg" },
      heroStat: { value: "+ demanda", label: "Mesmo orçamento · trocou de agência · resultado no 2º mês" },
      story:
        "Antes da ODuo, o Esmanhoto tinha dificuldade em mexer no site e adicionar equipamentos novos. Com o mesmo investimento da agência anterior, conseguia menos. Em 2 meses já percebeu a diferença na demanda; o site novo foi entregue em ~3 meses.",
      highlights: [
        { icon: "swap", title: "Trocou de agência", sub: "Mesmo investimento, resultado diferente" },
        { icon: "globe", title: "Site novo em ~3 meses", sub: "Equipamentos novos publicados rápido" },
        { icon: "clock", title: "Diferença já no 2º mês", sub: "Resultado visível antes do site novo ficar pronto" },
      ],
    },
    frourinhos: {
      categories: ["novo"],
      person: { name: "Bruno", role: "Proprietário · FR Ourinhos", photo: "assets/cases/people/bruno.jpg" },
      heroStat: { value: "< 4 meses", label: "Pra demanda consistente · locadora aberta junto com a ODuo" },
      story:
        "A FR Ourinhos abriu junto com o início da parceria — sem baseline pra comparar, só crescimento. A partir do 3º ao 4º mês a empresa engrenou, leads qualificados chegando consistentemente, e o Bruno aumentou o investimento mirando R$ 600 mil de faturamento no ano.",
      highlights: [
        { icon: "rocket", title: "Nasceu junto com a ODuo", sub: "Sem histórico pra comparar — só subida" },
        { icon: "clock", title: "Engrenou no 3º/4º mês", sub: "Leads bem qualificados chegando" },
        { icon: "target", title: "Meta: R$ 600 mil/ano", sub: "Bruno aumentou o investimento agora" },
      ],
    },
    fazenda: {
      categories: ["novo"],
      person: { name: "Silvio", role: "Proprietário · Fazenda", photo: "assets/cases/people/silvio.jpg" },
      heroStat: { value: "+ R$ 20k/mês", label: "Melhor mês da história · 6 meses de parceria" },
      story:
        "A Fazenda começou do zero com a ODuo há 6 meses, junto com a abertura da locadora. Em março bateu o melhor mês de faturamento da história da empresa — crescimento consistente desde o início.",
      quote: {
        text:
          "Se não fosse pela ODuo, não estaria no faturamento que estou hoje.",
        cite: "Silvio · Fazenda",
      },
      highlights: [
        { icon: "star", title: "Melhor mês da história", sub: "Março · maior faturamento da empresa" },
        { icon: "calendar", title: "Crescimento consistente", sub: "Desde o início, sem queda em 6 meses" },
        { icon: "plus", title: "+ R$ 20 mil/mês", sub: "Ganho relativo (autorizado pelo Silvio)" },
      ],
    },
    beloc: {
      categories: ["demanda"],
      person: { name: "Jerferson", role: "Proprietário · Beloc", photo: "assets/cases/people/jerferson.jpg" },
      heroStat: { value: "+ 52%", label: "Faturamento mensal em menos de 3 meses" },
      story:
        "A Beloc tinha oscilação de demanda e dificuldade de aparecer na internet. Entre o final do 2º e o início do 3º mês com a ODuo veio o primeiro salto. Em menos de 3 meses, o faturamento subiu ~52%.",
      highlights: [
        { icon: "trending-up", title: "+52% no faturamento", sub: "Em menos de 3 meses com a ODuo" },
        { icon: "clock", title: "Primeiro salto no fim do 2º mês", sub: "Resultado visível rápido" },
        { icon: "search", title: "Visibilidade na internet", sub: "Antes: oscilação · agora: demanda estável" },
      ],
    },
    rt: {
      categories: ["novo"],
      person: { name: "Lorena", role: "Proprietária · RT Locações", photo: "assets/cases/people/lorena.jpg" },
      heroStat: { value: "60 – 90 dias", label: "Do zero a fluxo de leads consistente" },
      story:
        "A RT começou do zero com a ODuo — sem histórico, sem demanda. Em 60 a 90 dias já tinha um fluxo constante de leads chegando todo mês. Janeiro foi o melhor mês.",
      highlights: [
        { icon: "rocket", title: "Do zero a fluxo constante", sub: "Locadora nova, sem baseline anterior" },
        { icon: "clock", title: "60 a 90 dias", sub: "Pra primeiros leads consistentes" },
        { icon: "star", title: "Janeiro foi o melhor mês", sub: "Crescimento sustentado" },
      ],
    },
    zdg: {
      categories: ["demanda"],
      person: { name: "Diogo", role: "Proprietário · ZDG Locações", photo: "assets/cases/people/diogo.jpg" },
      heroStat: { value: "+ 150% a + 200%", label: "Mais que dobrou o faturamento mensal" },
      story:
        "A ZDG tinha dificuldade em captar novos clientes. Com a ODuo, mais que dobrou o faturamento — e hoje a demanda de escoras está no maior nível da história da empresa.",
      highlights: [
        { icon: "trending-up", title: "Mais que dobrou o faturamento", sub: "Crescimento de +150% a +200%" },
        { icon: "search", title: "Captação destravada", sub: "Era a maior dor antes da ODuo" },
        { icon: "star", title: "Demanda recorde de escoras", sub: "Maior nível da história da empresa" },
      ],
    },
  };

  function extractNumbersFromCard(card) {
    const stats = $(".case-stats", card);
    if (!stats) return [];
    return $$("span", stats)
      .filter((s) => !s.classList.contains("arrow"))
      .map((s) => {
        const b = $("b", s);
        if (!b) return null;
        const value = b.textContent.trim();
        const label = s.textContent.replace(value, "").trim() || "Resultado";
        return { label, value };
      })
      .filter(Boolean);
  }

  function extractQuoteFromCard(card) {
    const bq = $("blockquote", card);
    if (!bq) return null;
    const cite = $("cite", bq);
    const citeText = cite ? cite.textContent.trim() : "";
    const clone = bq.cloneNode(true);
    $("cite", clone)?.remove();
    $(".case-card-cta", clone)?.remove();
    const text = clone.textContent.trim().replace(/\s+/g, " ");
    return { text, cite: citeText.replace(/^—\s*/, "") };
  }

  function parseMoney(s) {
    const clean = String(s)
      .replace(/R\$\s*/i, "")
      .replace(/\./g, "")
      .replace(/,/g, ".")
      .replace(/[^\d.-]/g, "");
    const n = parseFloat(clean);
    return Number.isFinite(n) ? n : 0;
  }

  function computeDelta(numbers, override) {
    if (override) return override;
    if (numbers.length < 2) return "";
    const v1 = parseMoney(numbers[0].value);
    const v2 = parseMoney(numbers[1].value);
    if (!v1 || !v2 || v1 <= 0) return "";
    const ratio = v2 / v1;
    if (ratio >= 3) return `${ratio.toFixed(1).replace(".", ",")}× retorno`;
    if (ratio > 1) return `+${Math.round((ratio - 1) * 100)}%`;
    return "";
  }

  function isParseableMoney(numbers) {
    if (numbers.length < 2) return false;
    return parseMoney(numbers[0].value) > 0 && parseMoney(numbers[1].value) > 0;
  }

  function ensureInstagramEmbed() {
    if (window.instgrm?.Embeds?.process) {
      window.instgrm.Embeds.process();
      return;
    }
    if (document.querySelector("script[data-ig-embed]")) return;
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://www.instagram.com/embed.js";
    s.setAttribute("data-ig-embed", "1");
    document.body.appendChild(s);
  }

  function initCarousel() {
    const carousel = $(".cases-carousel");
    if (!carousel) return;
    const track = $(".cases-track", carousel);
    const cards = $$(".case-card-rich", track);
    const prevBtn = $(".cases-nav-prev", carousel);
    const nextBtn = $(".cases-nav-next", carousel);
    const dotsRoot = $(".cases-dots", carousel);
    if (!track || cards.length === 0) return;

    cards.forEach((card) => {
      const bg = card.dataset.bg;
      if (!bg) return;
      const bgEl = $(".case-card-bg", card);
      if (bgEl) bgEl.style.backgroundImage = `url("${bg}")`;
    });

    if (dotsRoot) {
      dotsRoot.innerHTML = cards
        .map((_, i) => `<button type="button" role="tab" aria-label="Case ${i + 1}" data-index="${i}"></button>`)
        .join("");
    }
    const dots = dotsRoot ? $$("button", dotsRoot) : [];

    let currentIndex = 0;
    let autoplayTimer = null;
    const autoplayMs = Number(carousel.dataset.autoplay) || 0;

    function goTo(index, smooth = true) {
      const n = cards.length;
      currentIndex = ((index % n) + n) % n;
      const card = cards[currentIndex];
      if (!card) return;
      track.scrollTo({
        left: card.offsetLeft - track.offsetLeft,
        behavior: smooth ? "smooth" : "auto",
      });
      updateUI();
    }

    function updateUI() {
      dots.forEach((d, i) => d.classList.toggle("is-active", i === currentIndex));
    }

    function next() { goTo(currentIndex + 1); }
    function prev() { goTo(currentIndex - 1); }

    function startAutoplay() {
      if (!autoplayMs) return;
      stopAutoplay();
      autoplayTimer = window.setInterval(next, autoplayMs);
    }
    function stopAutoplay() {
      if (autoplayTimer) {
        window.clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
    }

    prevBtn?.addEventListener("click", () => { stopAutoplay(); prev(); });
    nextBtn?.addEventListener("click", () => { stopAutoplay(); next(); });
    dots.forEach((dot) => {
      dot.addEventListener("click", () => {
        stopAutoplay();
        goTo(Number(dot.dataset.index));
      });
    });

    carousel.addEventListener("mouseenter", stopAutoplay);
    carousel.addEventListener("mouseleave", startAutoplay);

    let scrollDebounce = null;
    track.addEventListener("scroll", () => {
      if (scrollDebounce) window.clearTimeout(scrollDebounce);
      scrollDebounce = window.setTimeout(() => {
        const x = track.scrollLeft;
        let nearest = 0;
        let nearestDist = Infinity;
        cards.forEach((card, i) => {
          const dist = Math.abs(card.offsetLeft - track.offsetLeft - x);
          if (dist < nearestDist) {
            nearestDist = dist;
            nearest = i;
          }
        });
        if (nearest !== currentIndex) {
          currentIndex = nearest;
          updateUI();
        }
      }, 120);
    });

    cards.forEach((card) => {
      card.addEventListener("click", () => openCaseModal(card));
    });

    /* Annotate each card with its category for CSS-based filtering */
    cards.forEach((card) => {
      const key = card.dataset.case;
      const cats = CASES[key]?.categories || [];
      if (cats.length) card.dataset.cat = cats.join(" ");
    });

    /* Filter chips */
    const filterChips = $$(".cases-filter");
    filterChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const filter = chip.dataset.filter;
        carousel.classList.forEach((c) => {
          if (c.startsWith("filter-")) carousel.classList.remove(c);
        });
        if (filter && filter !== "todos") carousel.classList.add("filter-" + filter);
        filterChips.forEach((c) => {
          c.classList.toggle("is-active", c === chip);
          c.setAttribute("aria-selected", c === chip ? "true" : "false");
        });
        stopAutoplay();
        rebuildDotsForVisible();
        track.scrollTo({ left: 0, behavior: "smooth" });
        currentIndex = 0;
      });
    });

    function rebuildDotsForVisible() {
      if (!dotsRoot) return;
      const visible = cards.filter(
        (c) => window.getComputedStyle(c).display !== "none"
      );
      dotsRoot.innerHTML = visible
        .map(
          (_, i) =>
            `<button type="button" role="tab" aria-label="Case ${i + 1}" data-index="${i}"></button>`
        )
        .join("");
      const newDots = $$("button", dotsRoot);
      newDots.forEach((dot) => {
        dot.addEventListener("click", () => {
          stopAutoplay();
          const i = Number(dot.dataset.index);
          const target = visible[i];
          if (!target) return;
          track.scrollTo({
            left: target.offsetLeft - track.offsetLeft,
            behavior: "smooth",
          });
          newDots.forEach((d) => d.classList.remove("is-active"));
          dot.classList.add("is-active");
        });
      });
      newDots[0]?.classList.add("is-active");
    }

    updateUI();
    startAutoplay();
  }

  /* ============ MODAL RENDER · V2 (voz-primeiro) ============ */
  function renderPersonAttribution(person, fallbackCite) {
    if (person && (person.name || person.photo)) {
      const photo = person.photo
        ? `<img class="case-person-avatar" src="${escapeHtml(person.photo)}" alt="${escapeHtml(person.name || "")}" />`
        : `<span class="case-person-avatar case-person-avatar-fallback" aria-hidden="true">${escapeHtml((person.name || "?").charAt(0))}</span>`;
      return `
        <div class="case-person-card">
          ${photo}
          <div class="case-person-meta">
            <strong>${escapeHtml(person.name || "")}</strong>
            ${person.role ? `<span>${escapeHtml(person.role)}</span>` : ""}
          </div>
        </div>
      `;
    }
    if (fallbackCite) {
      return `<span class="case-quote-hero-cite">— ${escapeHtml(fallbackCite)}</span>`;
    }
    return "";
  }

  function renderQuoteHero(quote, person) {
    return `
      <div class="case-quote-hero">
        <p class="case-quote-hero-text">${escapeHtml(quote.text)}</p>
        ${renderPersonAttribution(person, quote.cite)}
      </div>
    `;
  }

  function renderQuoteSecondary(quote, person) {
    const attribution = person && (person.name || person.photo)
      ? renderPersonAttribution(person, "")
      : (quote.cite ? `<cite>${escapeHtml(quote.cite)}</cite>` : "");
    return `
      <blockquote class="case-quote-secondary">
        ${escapeHtml(quote.text)}
        ${attribution}
      </blockquote>
    `;
  }

  function renderVideoHero(videoMp4, video) {
    if (videoMp4) {
      return `
        <div class="case-video-hero">
          <video
            class="case-modal-player"
            src="${escapeHtml(videoMp4)}"
            controls
            playsinline
            preload="metadata"
          ></video>
        </div>
      `;
    }
    if (video) {
      return `
        <div class="case-video-hero">
          <blockquote
            class="instagram-media"
            data-instgrm-captioned
            data-instgrm-permalink="${escapeHtml(video)}"
            data-instgrm-version="14"
            style="margin:0 auto;max-width:540px;width:100%"
          >
            <a href="${escapeHtml(video)}" target="_blank" rel="noopener">Ver no Instagram</a>
          </blockquote>
        </div>
      `;
    }
    return "";
  }

  function renderHighlights(highlights) {
    if (!highlights || !highlights.length) return "";
    return `
      <div class="case-highlights">
        ${highlights
          .map(
            (h) => `
          <div class="case-highlight">
            <span class="case-highlight-icon">${ICONS[h.icon] || ICONS.star}</span>
            <strong>${escapeHtml(h.title)}</strong>
            <span>${escapeHtml(h.sub)}</span>
          </div>`
          )
          .join("")}
      </div>
    `;
  }

  function renderBeforeAfter(numbers, delta) {
    return `
      <div class="case-before-after case-before-after-compact">
        <div class="case-ba-side case-ba-before">
          <span class="case-ba-label">${escapeHtml(numbers[0].label)}</span>
          <span class="case-ba-value">${escapeHtml(numbers[0].value)}</span>
        </div>
        <div class="case-ba-arrow" aria-hidden="true">
          <svg viewBox="0 0 60 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="6" y1="12" x2="50" y2="12"/>
            <polyline points="42 4 52 12 42 20"/>
          </svg>
          ${delta ? `<span class="case-ba-delta">${escapeHtml(delta)}</span>` : ""}
        </div>
        <div class="case-ba-side case-ba-after">
          <span class="case-ba-label">${escapeHtml(numbers[1].label)}</span>
          <span class="case-ba-value">${escapeHtml(numbers[1].value)}</span>
        </div>
      </div>
    `;
  }

  function renderHeroStat(stat) {
    return `
      <div class="case-hero-stat case-hero-stat-compact">
        <span class="case-hero-stat-value">${escapeHtml(stat.value)}</span>
        <span class="case-hero-stat-label">${escapeHtml(stat.label)}</span>
      </div>
    `;
  }

  function renderStory(story) {
    return `
      <div class="case-modal-section">
        <h4 class="case-modal-section-title">Por trás dos números</h4>
        <p>${escapeHtml(story)}</p>
      </div>
    `;
  }

  function renderCta() {
    return `
      <div class="case-modal-cta">
        <button type="button" class="btn btn-primary case-modal-cta-btn" data-cta="cardapio">
          Quero esse resultado pra minha locadora →
        </button>
        <p class="case-modal-cta-hint">Monte sua esteira no cardápio e veja o investimento estimado em poucos minutos.</p>
      </div>
    `;
  }

  function openCaseModal(card) {
    const modal = $("#caseModal");
    if (!modal) return;

    const key = card.dataset.case;
    const bg = card.dataset.bg || "";
    const tag = $(".case-tag", card)?.textContent?.trim() || "";
    const title = $("h3", card)?.textContent?.trim() || "";
    const logoSrc = $(".case-card-logo-rich", card)?.getAttribute("src") || "";
    const overrides = CASES[key] || {};

    const numbers = overrides.numbers && overrides.numbers.length
      ? overrides.numbers
      : extractNumbersFromCard(card);
    const quote = overrides.quote || extractQuoteFromCard(card);
    const story = overrides.story || "";
    const video = overrides.video || "";
    const videoMp4 = overrides.videoMp4 || "";
    const heroStat = overrides.heroStat || null;
    const highlights = overrides.highlights || [];
    const person = overrides.person || null;
    const delta = heroStat ? "" : computeDelta(numbers, overrides.delta);

    $("#caseModalBg").style.backgroundImage = bg ? `url("${bg}")` : "";
    $("#caseModalTag").textContent = tag;
    $("#caseModalTitle").textContent = title;

    const logoEl = $("#caseModalLogo");
    if (logoSrc) {
      logoEl.src = logoSrc;
      logoEl.alt = tag;
    } else {
      logoEl.removeAttribute("src");
      logoEl.alt = "";
    }

    const sections = [];
    const hasVideo = !!(videoMp4 || video);
    const hasQuote = !!(quote && quote.text);

    /* ----- 1) HERO da voz humana ----- */
    if (hasVideo) {
      sections.push(renderVideoHero(videoMp4, video));
      if (hasQuote) sections.push(renderQuoteSecondary(quote, person));
      else if (person) sections.push(renderPersonAttribution(person, ""));
    } else if (hasQuote) {
      sections.push(renderQuoteHero(quote, person));
    }

    /* ----- 1b) Sem voz humana mas com pessoa? Mostra o rosto. ----- */
    if (!hasVideo && !hasQuote && person && (person.name || person.photo)) {
      sections.push(renderPersonAttribution(person, ""));
    }

    /* ----- 2) Highlights (vitórias concretas) ----- */
    sections.push(renderHighlights(highlights));

    /* ----- 3) Números (evidência, não abertura) ----- */
    if (heroStat) {
      sections.push(renderHeroStat(heroStat));
    } else if (numbers.length >= 2 && isParseableMoney(numbers)) {
      sections.push(renderBeforeAfter(numbers, delta));
    }

    /* ----- 4) Narrativa ----- */
    if (story) sections.push(renderStory(story));

    /* ----- 5) CTA de conversão ----- */
    sections.push(renderCta());

    const content = $("#caseModalContent");
    content.innerHTML = sections.filter(Boolean).join("");

    content.querySelector('[data-cta="cardapio"]')?.addEventListener("click", () => {
      closeCaseModal();
      window.setTimeout(() => {
        document.getElementById("catalogo")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 120);
    });

    modal.hidden = false;
    document.body.style.overflow = "hidden";

    if (video && !videoMp4) ensureInstagramEmbed();
  }

  function closeCaseModal() {
    const modal = $("#caseModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    const v = $("#caseModalContent")?.querySelector("video");
    if (v) v.pause();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initCarousel();
    $("#caseModalClose")?.addEventListener("click", closeCaseModal);
    $("#caseModal")?.addEventListener("click", (e) => {
      if (e.target.id === "caseModal") closeCaseModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#caseModal")?.hidden) closeCaseModal();
    });
  });
})();
