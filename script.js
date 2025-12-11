document.addEventListener("DOMContentLoaded", () => {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const closeBtn = document.querySelector(".close");
  const leftArrow = document.querySelector(".arrow.left");
  const rightArrow = document.querySelector(".arrow.right");

  // Theme toggle: init from localStorage or system preference, allow toggling
  const themeToggleBtn = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme');
  const applyTheme = (theme) => {
    if (theme === 'dark') document.documentElement.classList.add('dark-theme'); else document.documentElement.classList.remove('dark-theme');
    if (themeToggleBtn) {
      themeToggleBtn.textContent = document.documentElement.classList.contains('dark-theme') ? '☀️' : '🌙';
      themeToggleBtn.setAttribute('aria-pressed', document.documentElement.classList.contains('dark-theme'));
    }
  };
  // initial: if user saved preference, use it; else respect prefers-color-scheme
  if (savedTheme) applyTheme(savedTheme);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) applyTheme('dark');

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark-theme');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
      applyTheme(isDark ? 'dark' : 'light');
    });
  }

  let currentGroup = [];
  let currentIndex = 0;

  // Find images inside each gallery and any images marked zoomable or pdf thumbs
  const galleryImages = document.querySelectorAll('.gallery img, img.zoomable, .pdf-thumb, [data-pdf]');
  const lightboxIframe = document.getElementById('lightbox-iframe');
  const pdfViewer = document.getElementById('pdf-viewer');
  const pdfCanvas = document.getElementById('pdf-canvas');
  const pdfPrev = document.getElementById('pdf-prev');
  const pdfNext = document.getElementById('pdf-next');
  const pageNumEl = document.getElementById('page_num');
  const pageCountEl = document.getElementById('page_count');

 let pdfjsLib = null;
  let pdfDoc = null;
  let pdfPageNum = 1;
  let pdfPageRendering = false;
  let pdfPageNumPending = null;
  let pdfScale = 1.2;
  const pdfCanvasCtx = pdfCanvas ? pdfCanvas.getContext('2d') : null;

  galleryImages.forEach(node => {
    node.addEventListener('click', (ev) => {
      const pdfSrc = node.dataset ? node.dataset.pdf : null;
      if (pdfSrc) {
        showLightboxPDF(pdfSrc);
        return;
      }

      const img = node.tagName === 'IMG' ? node : node.querySelector && node.querySelector('img');
      if (!img) return;
      const gallery = img.closest('.gallery');
      if (gallery) {
        currentGroup = Array.from(gallery.querySelectorAll('img'));
        currentIndex = currentGroup.indexOf(img);
      } else {
        currentGroup = [img];
        currentIndex = 0;
      }
      showLightbox(img.src);
    });
  });

  function updateTimelineDots() {
    document.querySelectorAll('.event').forEach(evt => {
      const img = evt.querySelector('.gallery img');
      if (!img) return;
      const setPos = () => {
        const eventRect = evt.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        const top = imgRect.top - eventRect.top + (imgRect.height / 2);
        evt.style.setProperty('--dot-top', top + 'px');
      };
      if (img.complete) setPos(); else img.addEventListener('load', setPos);
    });
  }

  updateTimelineDots();
  window.addEventListener('load', updateTimelineDots);
  window.addEventListener('resize', updateTimelineDots);

  function showLightbox(src) {
    if (!lightbox || !lightboxImg) return;
    if (lightboxIframe) { lightboxIframe.style.display = 'none'; lightboxIframe.src = ''; }
    if (pdfViewer) pdfViewer.style.display = 'none';
    if (pdfDoc) { try { pdfDoc.destroy(); } catch (e){} pdfDoc = null; pdfPageNum = 1; pageNumEl && (pageNumEl.textContent = '1'); pageCountEl && (pageCountEl.textContent = '0'); }

    lightbox.classList.add('open');
    lightbox.style.display = 'flex';
    lightboxImg.style.display = 'block';
    lightboxImg.src = src;
    document.body.style.overflow = 'hidden';
  }

  async function showLightboxPDF(pdfUrl) {
    if (!lightbox || !pdfViewer) return;
    if (lightboxImg) lightboxImg.style.display = 'none';
    if (lightboxIframe) { lightboxIframe.style.display = 'none'; lightboxIframe.src = ''; }

    lightbox.classList.add('open');
    lightbox.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    try {
        if (!pdfjsLib) {
        pdfjsLib = await import('./pdfjs-5.4.394-dist/build/pdf.mjs');
        if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = './pdfjs-5.4.394-dist/build/pdf.worker.mjs';
        }
      }
    } catch (err) {
      console.error('Failed to load pdf.js module', err);
      return;
    }

    pdfViewer.style.display = 'block';

    if (pdfDoc) { try { pdfDoc.destroy(); } catch (e) {} pdfDoc = null; }

    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    loadingTask.promise.then(function(pdf) {
      pdfDoc = pdf;
      pdfPageNum = 1;
      pageCountEl && (pageCountEl.textContent = pdfDoc.numPages);
      renderPdfPage(pdfPageNum);
    }).catch(function(err){
      console.error('Error loading PDF', err);
    });
  }

  function renderPdfPage(num) {
    if (!pdfDoc || !pdfCanvasCtx) return;
    pdfPageRendering = true;
    pdfDoc.getPage(num).then(function(page) {
      const viewport = page.getViewport({ scale: pdfScale });
      pdfCanvas.height = viewport.height;
      pdfCanvas.width = viewport.width;
      const renderContext = { canvasContext: pdfCanvasCtx, viewport: viewport };
      const renderTask = page.render(renderContext);
      renderTask.promise.then(function() {
        pdfPageRendering = false;
        pageNumEl && (pageNumEl.textContent = num);
        if (pdfPageNumPending !== null) { renderPdfPage(pdfPageNumPending); pdfPageNumPending = null; }
      });
    });
  }

  function queuePdfRender(num) { if (pdfPageRendering) pdfPageNumPending = num; else renderPdfPage(num); }
  function onPdfPrev() { if (!pdfDoc) return; if (pdfPageNum <= 1) return; pdfPageNum--; queuePdfRender(pdfPageNum); }
  function onPdfNext() { if (!pdfDoc) return; if (pdfPageNum >= pdfDoc.numPages) return; pdfPageNum++; queuePdfRender(pdfPageNum); }

  if (pdfPrev) pdfPrev.addEventListener('click', onPdfPrev);
  if (pdfNext) pdfNext.addEventListener('click', onPdfNext);

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    if (lightboxImg) lightboxImg.style.display = 'none';
    if (lightboxIframe) { lightboxIframe.style.display = 'none'; lightboxIframe.src = ''; }
    if (pdfViewer) pdfViewer.style.display = 'none';
    if (pdfDoc) { try { pdfDoc.destroy(); } catch (e) {} pdfDoc = null; pdfPageNum = 1; pageNumEl && (pageNumEl.textContent = '1'); pageCountEl && (pageCountEl.textContent = '0'); }
    lightbox.style.display = 'none';
    document.body.style.overflow = '';
  }

  function showNext() {
    if (pdfDoc && pdfViewer && pdfViewer.style.display !== 'none') { onPdfNext(); return; }
    if (!currentGroup || currentGroup.length === 0) return;
    currentIndex = (currentIndex + 1) % currentGroup.length;
    lightboxImg.src = currentGroup[currentIndex].src;
  }

  function showPrev() {
    if (pdfDoc && pdfViewer && pdfViewer.style.display !== 'none') { onPdfPrev(); return; }
    if (!currentGroup || currentGroup.length === 0) return;
    currentIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length;
    lightboxImg.src = currentGroup[currentIndex].src;
  }

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (rightArrow) rightArrow.addEventListener('click', showNext);
  if (leftArrow) leftArrow.addEventListener('click', showPrev);

  if (lightbox) { lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); }); }

  document.addEventListener('keydown', (e) => {
    if (!lightbox) return;
    if (lightbox.style.display === 'flex') {
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'ArrowLeft') showPrev();
    }
  });

  // If the page was opened with a hash (fragment), smooth-scroll to that element
  // but offset by the fixed nav height so the heading isn't hidden.
  (function handleInitialHash(){
    const hash = location.hash;
    if (!hash) return;
    // run after a short delay to allow styles/layout to settle
    setTimeout(()=>{
      const target = document.querySelector(hash);
      if (!target) return;
      const nav = document.querySelector('nav');
      const navHeight = nav ? nav.getBoundingClientRect().height : 64;
      const top = window.scrollY + target.getBoundingClientRect().top - navHeight - 8; // small gap
      window.scrollTo({ top, behavior: 'smooth' });
    }, 100);
  })();
});

// Go to top button functionality (pure JS)
(() => {
  const goTop = document.querySelector('.goTop');
  if (!goTop) return;
  const update = () => { if (window.scrollY > 200) goTop.classList.remove('hide'); else goTop.classList.add('hide'); };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('load', update);
  update();
  goTop.addEventListener('click', (e) => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
})();
