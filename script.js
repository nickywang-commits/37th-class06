document.addEventListener("DOMContentLoaded", () => {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const closeBtn = document.querySelector(".close");
  const leftArrow = document.querySelector(".arrow.left");
  const rightArrow = document.querySelector(".arrow.right");

  let currentGroup = [];
  let currentIndex = 0;

  // Find images inside each gallery and any images marked zoomable
  const galleryImages = document.querySelectorAll(".gallery img");
  galleryImages.forEach(img => {
    img.addEventListener("click", (ev) => {
      const gallery = img.closest(".gallery");
      if (!gallery) return;
      currentGroup = Array.from(gallery.querySelectorAll("img"));
      currentIndex = currentGroup.indexOf(img);
      showLightbox(img.src);
    });
  });

  // Calculate dot position to vertically center with the thumbnail image
  function updateTimelineDots() {
    document.querySelectorAll('.event').forEach(evt => {
      const img = evt.querySelector('.gallery img');
      if (!img) return;
      // if image not loaded yet, wait for load
      const setPos = () => {
        const eventRect = evt.getBoundingClientRect();
        const imgRect = img.getBoundingClientRect();
        const top = imgRect.top - eventRect.top + (imgRect.height / 2);
        evt.style.setProperty('--dot-top', top + 'px');
      };
      if (img.complete) setPos(); else img.addEventListener('load', setPos);
    });
  }

  // run on DOM ready, window load and resize to keep alignment
  updateTimelineDots();
  window.addEventListener('load', updateTimelineDots);
  window.addEventListener('resize', updateTimelineDots);


  function showLightbox(src) {
    if (!lightbox || !lightboxImg) return;
    // add 'open' class and show
    lightbox.classList.add('open');
    lightbox.style.display = "flex";
    lightboxImg.src = src;
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    if (!lightbox) return;
    lightbox.classList.remove('open');
    lightbox.style.display = "none";
    document.body.style.overflow = "";
  }

  function showNext() {
    if (!currentGroup || currentGroup.length === 0) return;
    currentIndex = (currentIndex + 1) % currentGroup.length;
    lightboxImg.src = currentGroup[currentIndex].src;
  }

  function showPrev() {
    if (!currentGroup || currentGroup.length === 0) return;
    currentIndex = (currentIndex - 1 + currentGroup.length) % currentGroup.length;
    lightboxImg.src = currentGroup[currentIndex].src;
  }

  if (closeBtn) closeBtn.addEventListener("click", closeLightbox);
  if (rightArrow) rightArrow.addEventListener("click", showNext);
  if (leftArrow) leftArrow.addEventListener("click", showPrev);

  if (lightbox) {
    lightbox.addEventListener("click", (e) => {
      if (e.target === lightbox) closeLightbox();
    });
  }

  document.addEventListener("keydown", (e) => {
    if (!lightbox) return;
    if (lightbox.style.display === "flex") {
      if (e.key === "Escape") closeLightbox();
      if (e.key === "ArrowRight") showNext();
      if (e.key === "ArrowLeft") showPrev();
    }
  });
});
