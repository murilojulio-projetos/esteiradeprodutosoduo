/* =====================================================================
   ODuo · Esteira de Produtos · scroll-reveal.js
   IntersectionObserver vanilla pra revelar elementos conforme entram
   na viewport. Adiciona `.is-visible` ao primeiro cruzamento; uma vez
   revelado, o elemento fica permanente (não anima ao re-scroll).

   Expõe `window.ODUO_REVEAL.observe(el | NodeList)` pra que conteúdo
   renderizado por JS depois do parse (ex.: cards do catálogo) também
   seja animado.
   ===================================================================== */

(() => {
  const reducedMotion =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const noObserver = !("IntersectionObserver" in window);

  let io = null;
  if (!reducedMotion && !noObserver) {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -8% 0px",
      }
    );
  }

  function observe(target) {
    if (!target) return;
    const list =
      target instanceof Element ? [target] : Array.from(target);
    list.forEach((el) => {
      if (!el || el.classList.contains("is-visible")) return;
      if (io) io.observe(el);
      else el.classList.add("is-visible");
    });
  }

  window.ODUO_REVEAL = { observe };

  observe(document.querySelectorAll(".reveal"));
})();
