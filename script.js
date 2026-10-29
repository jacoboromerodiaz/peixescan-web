const root = document.documentElement;
const overlay = document.getElementById("intro-overlay");
let bubbleTimer;

function createCatalogOrbit() {
  const art = document.querySelector(".hero-art");
  const cards = [...art.querySelectorAll(".catalog-card")];
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const states = cards.map((card, index) => ({
    card,
    index,
    phase: -Math.PI / 2 + index * Math.PI * 2 / cards.length,
    rotation: Number.parseFloat(getComputedStyle(card).getPropertyValue("--card-rotation")) || 0,
    x: 0,
    y: 0,
    manual: false,
    dragging: false,
  }));
  let started = false;
  let startedAt = 0;
  let frameId;
  let topCard;
  const orbitSpeed = 0.035;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));

  function paint(now) {
    const elapsed = Math.max(0, now - startedAt);
    const width = art.clientWidth;
    const height = art.clientHeight;
    const artRect = art.getBoundingClientRect();
    const centerX = artRect.left + width / 2;
    const centerY = artRect.top + height / 2;
    const headerBottom = document.querySelector(".site-header").getBoundingClientRect().bottom;
    const copyBottom = document.querySelector(".hero-copy").getBoundingClientRect().bottom;
    const topBoundary = copyBottom <= centerY ? Math.max(headerBottom, copyBottom + 20) : headerBottom;
    const footerTop = document.querySelector(".site-footer").getBoundingClientRect().top;
    for (const state of states) {
      const cardWidth = state.card.offsetWidth;
      const cardHeight = state.card.offsetHeight;
      let scale = 1;
      if (!state.manual) {
        const progress = clamp((elapsed - state.index * 140) / 2800, 0, 1);
        const spread = state.revealed ? 1 : 1 - (1 - progress) ** 3;
        const angle = state.phase + (motionPreference.matches ? 0 : elapsed / 1000 * orbitSpeed);
        const radiusX = Math.max(0, Math.min(width / 2 - cardWidth * 0.15, centerX - cardWidth / 2 - 8, window.innerWidth - centerX - cardWidth / 2 - 8));
        const radiusY = Math.max(0, Math.min((height - cardHeight) / 2 + 24, centerY - topBoundary - cardHeight / 2 - 8, footerTop - centerY - cardHeight / 2 - 8));
        const orbitX = width / 2 + Math.cos(angle) * radiusX * spread - cardWidth / 2;
        const bob = motionPreference.matches ? 0 : Math.sin(elapsed / 2600 + state.phase) * 3;
        const orbitY = height / 2 + Math.sin(angle) * radiusY * spread - cardHeight / 2 + bob;
        if (state.entry) {
          const revealScale = Math.max(1, Math.min(1.5, (window.innerWidth - 20) / cardWidth, (window.innerHeight - 20) / cardHeight));
          const visibleX = clamp(state.entry.x, cardWidth * revealScale / 2 + 10, window.innerWidth - cardWidth * revealScale / 2 - 10);
          const visibleY = clamp(state.entry.y, cardHeight * revealScale / 2 + 10, window.innerHeight - cardHeight * revealScale / 2 - 10);
          const age = now - state.entry.startedAt;
          const amount = state.entry.still ? 0 : clamp((age - 1200) / 1450, 0, 1);
          const eased = amount * amount * (3 - 2 * amount);
          const fromX = visibleX - artRect.left - cardWidth / 2;
          const fromY = visibleY - artRect.top - cardHeight / 2;
          state.x = fromX + (orbitX - fromX) * eased;
          state.y = fromY + (orbitY - fromY) * eased - Math.sin(amount * Math.PI) * 25;
          const appearance = state.entry.still ? 1 : clamp(age / 200, 0, 1);
          scale = (1 + (revealScale - 1) * (1 - eased)) * (0.9 + 0.1 * appearance);
          state.card.style.opacity = String(appearance);
          if (amount === 1) {
            state.entry = null;
            state.card.classList.remove("is-entering");
            state.card.style.removeProperty("opacity");
          }
        } else if (state.returning) {
          const amount = clamp((now - state.returning.startedAt - 200) / 2400, 0, 1);
          const eased = amount * amount * (3 - 2 * amount);
          state.x = state.returning.x + (orbitX - state.returning.x) * eased;
          state.y = state.returning.y + (orbitY - state.returning.y) * eased;
          if (amount === 1) state.returning = null;
        } else {
          state.x = orbitX;
          state.y = orbitY;
        }
      } else if (!state.dragging) {
        const time = motionPreference.matches ? 0 : (now - state.placedAt) / 1000;
        state.x = state.anchorX + Math.sin(time * 0.8) * 2;
        state.y = state.anchorY + Math.sin(time * 0.65) * 3;
      }
      state.card.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rotation}deg) scale(${scale})`;
    }
  }

  function tick(now) {
    paint(now);
    if (!motionPreference.matches) frameId = window.requestAnimationFrame(tick);
  }

  function placeWithinViewport(state, x, y) {
    const artRect = art.getBoundingClientRect();
    state.anchorX = clamp(x, 6 - artRect.left, window.innerWidth - artRect.left - state.card.offsetWidth - 6);
    state.anchorY = clamp(y, 6 - artRect.top, window.innerHeight - artRect.top - state.card.offsetHeight - 6);
    state.x = state.anchorX;
    state.y = state.anchorY;
    state.placedAt = performance.now();
    paint(state.placedAt);
  }

  function returnToOrbit(state) {
    window.clearTimeout(state.returnTimer);
    const now = performance.now();
    const width = art.clientWidth;
    const height = art.clientHeight;
    const radiusX = Math.max(1, width / 2 - state.card.offsetWidth * 0.15);
    const radiusY = Math.max(1, (height - state.card.offsetHeight) / 2 + 24);
    const dx = (state.x + state.card.offsetWidth / 2 - width / 2) / radiusX;
    const dy = (state.y + state.card.offsetHeight / 2 - height / 2) / radiusY;
    const elapsed = Math.max(0, now - startedAt) / 1000;
    const currentAngle = state.phase + (motionPreference.matches ? 0 : elapsed * orbitSpeed);
    const angle = Math.hypot(dx, dy) < 0.05 ? currentAngle : Math.atan2(dy, dx);
    state.phase = angle - (motionPreference.matches ? 0 : elapsed * orbitSpeed);
    state.manual = false;
    state.returning = motionPreference.matches ? null : { x: state.x, y: state.y, startedAt: now };
    paint(now);
  }

  function bindCard(state) {
    const card = state.card;
    function bringToFront() {
      if (topCard === card) return;
      if (topCard) topCard.classList.remove("is-top");
      card.classList.add("is-top");
      topCard = card;
    }
    card.addEventListener("focus", () => {
      if (started && !state.entry) bringToFront();
    });
    card.addEventListener("dragstart", (event) => event.preventDefault());
    card.addEventListener("pointerdown", (event) => {
      if (!started || state.entry || (event.pointerType === "mouse" && event.button !== 0)) return;
      event.preventDefault();
      bringToFront();
      window.clearTimeout(state.returnTimer);
      state.beforePress = { manual: state.manual, returning: state.returning };
      state.returning = null;
      const artRect = art.getBoundingClientRect();
      state.manual = true;
      state.dragging = true;
      state.moved = false;
      state.pressX = event.clientX;
      state.pressY = event.clientY;
      state.pointerId = event.pointerId;
      state.offsetX = event.clientX - artRect.left - state.x;
      state.offsetY = event.clientY - artRect.top - state.y;
      card.setPointerCapture(event.pointerId);
      if (document.activeElement === card) card.blur();
    });
    card.addEventListener("pointermove", (event) => {
      if (!state.dragging || event.pointerId !== state.pointerId) return;
      if (!state.moved && Math.hypot(event.clientX - state.pressX, event.clientY - state.pressY) < 4) return;
      if (!state.moved) {
        state.moved = true;
        card.classList.add("is-dragging");
      }
      const artRect = art.getBoundingClientRect();
      placeWithinViewport(state, event.clientX - artRect.left - state.offsetX, event.clientY - artRect.top - state.offsetY);
    });
    function endDrag(event) {
      if (!state.dragging || event.pointerId !== state.pointerId) return;
      state.dragging = false;
      state.anchorX = state.x;
      state.anchorY = state.y;
      state.placedAt = performance.now();
      card.classList.remove("is-dragging");
      if (state.moved) {
        returnToOrbit(state);
      } else {
        state.manual = state.beforePress.manual;
        state.returning = state.beforePress.returning;
        if (state.manual) state.returnTimer = window.setTimeout(() => returnToOrbit(state), 700);
        paint(performance.now());
      }
    }
    card.addEventListener("pointerup", endDrag);
    card.addEventListener("pointercancel", endDrag);
    card.addEventListener("lostpointercapture", endDrag);
    card.addEventListener("keydown", (event) => {
      const steps = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
      const step = steps[event.key];
      if (!started || state.entry || !step) return;
      event.preventDefault();
      window.clearTimeout(state.returnTimer);
      state.returning = null;
      state.manual = true;
      state.dragging = false;
      const distance = event.shiftKey ? 40 : 15;
      placeWithinViewport(state, state.x + step[0] * distance, state.y + step[1] * distance);
      state.returnTimer = window.setTimeout(() => returnToOrbit(state), 700);
    });
  }
  states.forEach(bindCard);

  motionPreference.addEventListener("change", () => {
    if (!started) return;
    window.cancelAnimationFrame(frameId);
    if (motionPreference.matches) {
      for (const state of states) {
        state.returning = null;
        if (!state.entry) continue;
        window.clearTimeout(state.entry.timer);
        state.entry = null;
        state.card.classList.remove("is-entering");
        state.card.style.removeProperty("opacity");
      }
    }
    paint(performance.now());
    if (!motionPreference.matches) frameId = window.requestAnimationFrame(tick);
  });
  window.addEventListener("resize", () => {
    if (started && motionPreference.matches) paint(performance.now());
  });
  window.addEventListener("peixescan-language-change", () => {
    if (started && motionPreference.matches) paint(performance.now());
  });

  return {
    start(immediate = false) {
      if (started) return;
      started = true;
      art.classList.add("orbit-ready");
      startedAt = performance.now() - (immediate || motionPreference.matches ? 4000 : 0);
      paint(performance.now());
      if (!motionPreference.matches) frameId = window.requestAnimationFrame(tick);
    },
    reveal(species, point) {
      if (!started) this.start(true);
      const copy = translations[document.documentElement.lang] || translations.es;
      const existingIndex = states.findIndex((state) => state.card.dataset.species === String(species.number) || (typeof species.number === "number" && state.card.querySelector(".catalog-card-number")?.textContent === `#${species.number}`));
      if (existingIndex >= 0) {
        const [existing] = states.splice(existingIndex, 1);
        window.clearTimeout(existing.returnTimer);
        existing.card.remove();
      }
      const card = document.createElement("div");
      card.className = "catalog-card catalog-card--revealed is-entering";
      card.dataset.species = String(species.number);
      card.setAttribute("role", "button");
      card.tabIndex = 0;
      card.dataset.i18nAria = species.ariaKey;
      card.setAttribute("aria-label", copy[species.ariaKey]);
      const rotation = states.length % 2 ? -6 : 6;
      card.style.setProperty("--card-rotation", `${rotation}deg`);

      const number = document.createElement("span");
      number.className = "catalog-card-number";
      number.textContent = `#${species.number}`;
      const image = document.createElement("img");
      image.className = "catalog-card-fish";
      image.src = species.image;
      image.alt = "";
      const name = document.createElement("span");
      name.className = "catalog-card-name";
      name.dataset.i18n = species.nameKey;
      name.textContent = copy[species.nameKey];
      const category = document.createElement("img");
      category.className = "catalog-card-category";
      category.src = "./assets/catalog/fish-icon.webp";
      category.alt = "";
      if (typeof species.number === "number") card.append(number);
      card.append(image, name, category);
      art.appendChild(card);

      const artRect = art.getBoundingClientRect();
      const elapsed = Math.max(0, performance.now() - startedAt) / 1000;
      const phase = Math.atan2(point.y - (artRect.top + art.clientHeight / 2), point.x - (artRect.left + art.clientWidth / 2)) - (motionPreference.matches ? 0 : elapsed * orbitSpeed);
      const state = { card, index: states.length, phase, rotation, x: 0, y: 0, manual: false, dragging: false, revealed: true };
      states.push(state);
      bindCard(state);
      const entry = { x: point.x, y: point.y, startedAt: performance.now(), still: motionPreference.matches };
      state.entry = entry;
      paint(performance.now());
      if (entry.still) entry.timer = window.setTimeout(() => {
        if (state.entry !== entry) return;
        state.entry = null;
        card.classList.remove("is-entering");
        card.style.removeProperty("opacity");
        paint(performance.now());
      }, 1200);
      document.getElementById("fish-announcement").textContent = copy.fishCaught.replace("{species}", copy[species.nameKey]);
    },
  };
}

const catalogOrbit = createCatalogOrbit();
const seaScene = createSeaScene(catalogOrbit);
window.addEventListener("intro-fallback", () => { catalogOrbit.start(true); seaScene.start(); });

function finishIntro() {
  window.clearTimeout(window.introFallbackTimer);
  window.clearInterval(bubbleTimer);
  root.classList.remove("intro-pending", "intro-revealing");
  overlay.remove();
  catalogOrbit.start(true);
  seaScene.start();
}

async function playIntro() {
  if (!root.classList.contains("intro-pending")) {
    overlay.remove();
    catalogOrbit.start(true);
    seaScene.start();
    return;
  }

  try {
    const fishPosition = document.getElementById("intro-fish-position");
    const fish = document.getElementById("intro-fish");
    const tail = document.getElementById("intro-fish-tail");
    const bubbles = document.getElementById("intro-bubbles");
    const frame = document.getElementById("intro-viewfinder");
    const flash = document.getElementById("intro-flash");
    const icon = document.querySelector(".app-icon");
    const pause = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

    await Promise.race([document.fonts.ready, pause(350)]);
    const iconBounds = icon.getBoundingClientRect();
    const iconOnScreen = iconBounds.top >= 0 && iconBounds.bottom <= window.innerHeight;
    const captureX = window.innerWidth / 2;
    const captureY = window.innerHeight / 2;
    const targetX = iconOnScreen ? iconBounds.left + iconBounds.width / 2 : captureX;
    const targetY = iconOnScreen ? iconBounds.top + iconBounds.height / 2 : captureY;
    const frameSize = icon.clientWidth;
    const fishWidth = frameSize * 500 / 640;
    const fishHeight = frameSize * 285 / 640;
    const fishOffsetX = frameSize * 10 / 640;
    const fishOffsetY = frameSize * 2.5 / 640;
    const initialScale = Math.max(1.55, Math.min(1.9, 230 / fishWidth));
    const captureFishX = captureX - fishWidth / 2 + fishOffsetX;
    const captureFishY = captureY - fishHeight / 2 + fishOffsetY;

    fishPosition.style.width = `${fishWidth}px`;
    fishPosition.style.height = `${fishHeight}px`;
    frame.style.width = `${frameSize}px`;
    frame.style.height = `${frameSize}px`;
    frame.style.left = `${captureX - frameSize / 2}px`;
    frame.style.top = `${captureY - frameSize / 2}px`;

    const swimming = fish.animate(
      [
        { transform: "translateY(-1px) rotate(-.8deg)" },
        { transform: "translateY(1px) rotate(.8deg)" },
        { transform: "translateY(-1px) rotate(-.8deg)" },
      ],
      { duration: 680, iterations: Infinity, easing: "ease-in-out" },
    );
    const tailSwimming = tail.animate(
      [
        { transform: "rotate(-2deg) scaleX(1)" },
        { transform: "rotate(2deg) scaleX(.7)" },
        { transform: "rotate(-2deg) scaleX(1)" },
      ],
      { duration: 420, iterations: Infinity, easing: "ease-in-out" },
    );

    const points = [
      { x: window.innerWidth + fishWidth * 0.7, y: window.innerHeight * 0.12 },
      { x: window.innerWidth * 0.92, y: window.innerHeight * 0.08 },
      { x: window.innerWidth * 0.72, y: window.innerHeight * 0.5 },
      { x: captureX, y: captureY },
    ];
    const pathFrames = Array.from({ length: 51 }, (_, index) => {
      const progress = index / 50;
      const t = Math.pow(progress, 1.55);
      const inverse = 1 - t;
      const x = inverse ** 3 * points[0].x + 3 * inverse ** 2 * t * points[1].x + 3 * inverse * t ** 2 * points[2].x + t ** 3 * points[3].x;
      const y = inverse ** 3 * points[0].y + 3 * inverse ** 2 * t * points[1].y + 3 * inverse * t ** 2 * points[2].y + t ** 3 * points[3].y;
      const dx = 3 * inverse ** 2 * (points[1].x - points[0].x) + 6 * inverse * t * (points[2].x - points[1].x) + 3 * t ** 2 * (points[3].x - points[2].x);
      const dy = 3 * inverse ** 2 * (points[1].y - points[0].y) + 6 * inverse * t * (points[2].y - points[1].y) + 3 * t ** 2 * (points[3].y - points[2].y);
      const angle = -Math.min(12, Math.max(0, Math.atan2(dy, -dx) * 180 / Math.PI)) * (1 - t);
      const scale = initialScale - (initialScale - 1) * t;
      return {
        transform: `translate3d(${x - fishWidth / 2 + fishOffsetX}px, ${y - fishHeight / 2 + fishOffsetY}px, 0) rotate(${angle}deg) scale(${scale})`,
        opacity: Math.min(progress * 8, 1),
        offset: progress,
      };
    });

    bubbleTimer = window.setInterval(() => {
      const bounds = fishPosition.getBoundingClientRect();
      if (bounds.left >= window.innerWidth || bounds.right <= 0) return;
      const bubble = document.createElement("span");
      const size = 6 + Math.random() * 9;
      bubble.className = "intro-bubble";
      bubble.style.width = `${size}px`;
      bubble.style.height = `${size}px`;
      bubble.style.left = `${bounds.right - bounds.width * 0.1}px`;
      bubble.style.top = `${bounds.top + bounds.height * (0.42 + Math.random() * 0.2)}px`;
      bubbles.appendChild(bubble);
      bubble.animate(
        [
          { opacity: 0, transform: "translate3d(0, 0, 0) scale(.6)" },
          { opacity: 0.85, offset: 0.2 },
          { opacity: 0, transform: `translate3d(${10 + Math.random() * 24}px, ${-65 - Math.random() * 35}px, 0) scale(1.1)` },
        ],
        { duration: 1400 + Math.random() * 400, easing: "ease-out" },
      ).onfinish = () => bubble.remove();
    }, 170);

    await fishPosition.animate(
      pathFrames,
      { duration: 1300, easing: "linear", fill: "forwards" },
    ).finished;

    window.clearInterval(bubbleTimer);
    swimming.cancel();
    tailSwimming.cancel();
    frame.animate(
      [{ opacity: 0 }, { opacity: 1 }],
      { duration: 230, easing: "ease-out", fill: "forwards" },
    );
    await pause(180);
    const photo = flash.animate(
      [{ opacity: 0 }, { opacity: 0.75, offset: 0.2 }, { opacity: 0 }],
      { duration: 260, easing: "ease-out" },
    );
    await photo.finished;
    await pause(180);

    const shiftX = targetX - captureX;
    const shiftY = targetY - captureY;
    await Promise.all([
      fishPosition.animate(
        [
          { transform: `translate3d(${captureFishX}px, ${captureFishY}px, 0)` },
          { transform: `translate3d(${captureFishX + shiftX}px, ${captureFishY + shiftY}px, 0)` },
        ],
        { duration: 500, easing: "cubic-bezier(.22, .7, .25, 1)", fill: "forwards" },
      ).finished,
      frame.animate(
        [
          { transform: "translate3d(0, 0, 0) scale(1)" },
          { transform: `translate3d(${shiftX}px, ${shiftY}px, 0) scale(1)` },
        ],
        { duration: 500, easing: "cubic-bezier(.22, .7, .25, 1)", fill: "forwards" },
      ).finished,
    ]);

    root.classList.add("intro-revealing");
    catalogOrbit.start();
    document.querySelectorAll(".site-header, .hero-copy, .site-footer").forEach((element) => {
      element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 500, delay: 150, fill: "both", easing: "ease-out" });
    });
    document.querySelectorAll(".catalog-card").forEach((element, index) => {
      element.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 450, delay: 300 + index * 100, fill: "both", easing: "ease-out" });
    });
    await overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: "forwards", easing: "ease-out" }).finished;
    finishIntro();
  } catch (error) {
    finishIntro();
    console.error("No se pudo reproducir la entrada:", error);
  }
}

playIntro();
