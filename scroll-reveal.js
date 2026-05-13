/* =====================================================================
   ODuo · Esteira de Produtos · scroll-reveal.js
   IntersectionObserver vanilla pra revelar elementos conforme entram
   na viewport. Adiciona `.is-visible` ao primeiro cruzamento; uma vez
   revelado, o elemento fica permanente (não anima ao re-scroll).
   ===================================================================== */

(() => {
  const els = document.querySelectorAll(".reveal");
  if (els.length === 0) return;

  // Respeita prefers-reduced-motion: mostra tudo direto, sem animação.
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  // Fallback pra browsers sem IntersectionObserver (raro hoje).
  if (!("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const io = new IntersectionObserver(
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

  els.forEach((el) => io.observe(el));
})();
