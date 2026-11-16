/* Автокарусель: пять готовых баннеров. */
(() => {
  const carousel = document.getElementById('heroCarousel');
  if (!carousel) return;
  const slides = [...carousel.querySelectorAll('[data-hero-slide]')];
  const dots = [...carousel.querySelectorAll('[data-hero-dot]')];
  const next = document.getElementById('heroNext');
  const previous = document.getElementById('heroPrevious');
  const intervalMs = 5500;
  let selected = 0;
  let timer = null;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let pointerOver = false;
  let focusInside = false;

  function selectSlide(index) {
    if (!slides[index]) return;
    selected = index;
    slides.forEach((slide, i) => {
      const visible = i === selected;
      slide.classList.toggle('is-active', visible);
      slide.setAttribute('aria-hidden', String(!visible));
      slide.inert = !visible;
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('is-active', i === selected);
      if (i === selected) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
  }
  function stopTimer() { if (timer !== null) { clearInterval(timer); timer = null; } }
  function shouldRotate() { return !document.hidden && !pointerOver && !focusInside && !reducedMotion.matches && slides.length > 1; }
  function updateTimer() {
    stopTimer();
    if (shouldRotate()) timer = window.setInterval(() => selectSlide((selected + 1) % slides.length), intervalMs);
  }
  function change(index) { selectSlide((index + slides.length) % slides.length); updateTimer(); }
  next.addEventListener('click', () => change(selected + 1));
  previous.addEventListener('click', () => change(selected - 1));
  dots.forEach(dot => dot.addEventListener('click', () => {
    if (!dot.disabled) change(Number(dot.dataset.heroDot));
  }));
  carousel.addEventListener('mouseenter', () => { pointerOver = true; updateTimer(); });
  carousel.addEventListener('mouseleave', () => { pointerOver = false; updateTimer(); });
  carousel.addEventListener('focusin', () => { focusInside = true; updateTimer(); });
  carousel.addEventListener('focusout', event => {
    if (!carousel.contains(event.relatedTarget)) { focusInside = false; updateTimer(); }
  });
  document.addEventListener('visibilitychange', updateTimer);
  if (typeof reducedMotion.addEventListener === 'function') reducedMotion.addEventListener('change', updateTimer);
  selectSlide(0);
  updateTimer();
})();
