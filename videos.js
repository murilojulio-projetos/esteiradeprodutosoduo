/* =====================================================================
   ODuo · Esteira de Produtos · videos.js
   Seção "Depoimentos em vídeo": grid de cards → modal com <video> local.
   Se o card tem data-mp4, usa o arquivo local (rápido, sem IG).
   Se só tem data-video, faz fallback pro embed do Instagram.
   ===================================================================== */

(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function escapeAttr(s) {
    return String(s).replace(/"/g, "&quot;");
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

  /* Aplica a foto do reel como background da .video-card-shape — só
     se a imagem carregar. Falha mantém o gradiente do CSS. */
  function tryApplyThumb(card) {
    const thumb = card.dataset.thumb;
    if (!thumb) return;
    const shape = $(".video-card-shape", card);
    if (!shape) return;
    const img = new Image();
    img.onload = () => {
      shape.style.backgroundImage =
        `linear-gradient(180deg, rgba(7,32,74,0.15) 0%, rgba(7,32,74,0.05) 35%, rgba(7,32,74,0.4) 100%), url("${thumb}")`;
      shape.style.backgroundSize = "cover";
      shape.style.backgroundPosition = "center";
      shape.classList.add("has-thumb");
    };
    img.src = thumb;
  }

  function openVideoModal({ mp4, ig, thumb, label }) {
    const modal = $("#videoModal");
    if (!modal) return;
    const labelEl = $("#videoModalLabel");
    if (labelEl) labelEl.textContent = label || "";

    const content = $("#videoModalContent");
    if (mp4) {
      const poster = thumb ? ` poster="${escapeAttr(thumb)}"` : "";
      content.innerHTML = `
        <video
          class="video-modal-player"
          src="${escapeAttr(mp4)}"
          controls
          autoplay
          playsinline
          preload="metadata"${poster}
        ></video>
      `;
      const v = content.querySelector("video");
      // Try to autoplay with sound; fallback to muted if blocked.
      if (v) {
        v.play().catch(() => {
          v.muted = true;
          v.play().catch(() => {});
        });
      }
    } else if (ig) {
      const safeUrl = escapeAttr(ig);
      content.innerHTML = `
        <blockquote
          class="instagram-media"
          data-instgrm-captioned
          data-instgrm-permalink="${safeUrl}"
          data-instgrm-version="14"
          style="margin:0 auto;max-width:540px;width:100%"
        >
          <a href="${safeUrl}" target="_blank" rel="noopener">Ver no Instagram</a>
        </blockquote>
      `;
      ensureInstagramEmbed();
    }

    modal.hidden = false;
    document.body.style.overflow = "hidden";
    if (window.ODUO) ODUO.modalFocusIn(modal);
  }

  function closeVideoModal() {
    const modal = $("#videoModal");
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = "";
    if (window.ODUO) ODUO.modalFocusRestore();
    const content = $("#videoModalContent");
    if (content) {
      const v = content.querySelector("video");
      if (v) v.pause();
      content.innerHTML = "";
    }
  }

  document.addEventListener("DOMContentLoaded", () => {
    $$(".video-card").forEach((card) => {
      tryApplyThumb(card);
      card.addEventListener("click", () => {
        openVideoModal({
          mp4: card.dataset.mp4 || "",
          ig: card.dataset.video || "",
          thumb: card.dataset.thumb || "",
          label: card.dataset.label || "",
        });
      });
    });

    $("#videoModalClose")?.addEventListener("click", closeVideoModal);
    $("#videoModal")?.addEventListener("click", (e) => {
      if (e.target.id === "videoModal") closeVideoModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !$("#videoModal")?.hidden) closeVideoModal();
    });
  });
})();
