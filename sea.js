function createSeaScene(orbit) {
  const sea = document.getElementById("sea-layer");
  const harpoons = document.getElementById("harpoon-layer");
  const accessibleButton = document.getElementById("fish-accessible");
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const svgNamespace = "http://www.w3.org/2000/svg";
  const species = [
    { number: 25, image: "./assets/catalog/maragota.webp", nameKey: "speciesMaragota", ariaKey: "cardMaragota" },
    { number: 17, image: "./assets/catalog/sargo-breado.webp", nameKey: "speciesSargoBreado", ariaKey: "cardSargoBreado" },
    { number: 14, image: "./assets/catalog/denton.webp", nameKey: "speciesDenton", ariaKey: "cardDenton" },
  ];
  const extraSpecies = [
    ["sparus_aurata", "Dorada", "Gilthead seabream", "Dourada"],
    ["sardina_pilchardus", "Sardina", "Sardine", "Sardiña"],
    ["scomber_scombrus", "Caballa", "Mackerel", "Caballa"],
    ["trachurus_trachurus", "Jurel", "Horse mackerel", "Xurelo"],
    ["mullus_surmuletus", "Salmonete", "Surmullet", "Salmonete"],
    ["spondyliosoma_cantharus", "Chopa", "Black seabream", "Chopa"],
    ["coris_julis", "Doncella", "Rainbow wrasse", "Doncella"],
    ["pagellus_bogaraveo", "Besugo", "Blackspot seabream", "Ollomol"],
    ["pollachius_pollachius", "Abadejo", "Pollack", "Abadexo"],
    ["scorpaena_scrofa", "Cabracho", "Red scorpionfish", "Cabracho"],
    ["seriola_dumerili", "Serviola", "Greater amberjack", "Serviola"],
    ["chelidonichthys_lucerna", "Rubio", "Tub gurnard", "Escacho"],
  ];
  for (const [id, es, en, gl] of extraSpecies) {
    const nameKey = `species_${id}`;
    const ariaKey = `card_${id}`;
    const names = { es, en, gl };
    for (const language of ["es", "en", "gl"]) {
      translations[language][nameKey] = names[language];
      translations[language][ariaKey] = translations[language].cardSpecies.replace("{species}", names[language]);
    }
    species.push({ number: id, image: `./assets/catalog/${id}.webp`, nameKey, ariaKey });
  }
  for (const specimen of species) {
    const image = new Image();
    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        context.drawImage(image, 0, 0);
        specimen.mask = { width: canvas.width, height: canvas.height, pixels: context.getImageData(0, 0, canvas.width, canvas.height).data };
      } catch (_) {
        specimen.mask = null;
      }
    };
    image.src = specimen.image;
  }
  const fish = [];
  const caught = new Set();
  const shots = [];
  let started = false;
  let frameId;
  let previousFrame = 0;
  let pointerStart;

  function makeFish(specimen, lane, fraction, direction) {
    if (fish.some((swimmer) => swimmer.specimen.number === specimen.number)) return null;
    const element = document.createElement("div");
    const shape = document.createElement("span");
    element.className = "sea-fish";
    element.dataset.species = String(specimen.number);
    shape.className = "sea-fish-shape";
    shape.style.setProperty("--fish-image", `url("${specimen.image}")`);
    element.appendChild(shape);
    sea.appendChild(element);
    const swimmer = {
      element, shape, specimen, lane, direction,
      x: window.innerWidth * fraction,
      y: window.innerHeight * lane,
      phase: lane * 9,
      speed: 15 + lane * 12,
    };
    fish.push(swimmer);
    return swimmer;
  }

  function drawFish(swimmer, now, delta) {
    const width = swimmer.element.offsetWidth;
    const height = swimmer.element.offsetHeight;
    if (!motionPreference.matches) swimmer.x += swimmer.direction * swimmer.speed * delta;
    swimmer.y = window.innerHeight * swimmer.lane + (motionPreference.matches ? 0 : Math.sin(now / 2400 + swimmer.phase) * 11);
    if (swimmer.x < -width / 2) {
      swimmer.x = window.innerWidth + width / 2;
    } else if (swimmer.x > window.innerWidth + width / 2) {
      swimmer.x = -width / 2;
    }
    swimmer.element.style.transform = `translate3d(${swimmer.x - width / 2}px, ${swimmer.y - height / 2}px, 0)`;
    swimmer.shape.style.transform = `scaleX(${swimmer.direction > 0 ? -1 : 1})`;
  }

  function hitsFish(swimmer, x, y) {
    const mask = swimmer.specimen.mask;
    if (!mask) return false;
    const width = swimmer.element.offsetWidth;
    const height = swimmer.element.offsetHeight;
    let localX = x - (swimmer.x - width / 2);
    const localY = y - (swimmer.y - height / 2);
    if (swimmer.direction > 0) localX = width - localX;
    const scale = Math.min(width / mask.width, height / mask.height);
    const imageX = Math.floor((localX - (width - mask.width * scale) / 2) / scale);
    const imageY = Math.floor((localY - (height - mask.height * scale) / 2) / scale);
    if (imageX < 0 || imageX >= mask.width || imageY < 0 || imageY >= mask.height) return false;
    return mask.pixels[(imageY * mask.width + imageX) * 4 + 3] > 32;
  }

  function fishAt(x, y) {
    for (let index = fish.length - 1; index >= 0; index--) {
      if (hitsFish(fish[index], x, y)) return fish[index];
    }
    return null;
  }

  function nearestFish(x, y) {
    let best;
    let bestDistance = Infinity;
    for (const swimmer of fish) {
      if (swimmer.x < 0 || swimmer.x > window.innerWidth || swimmer.y < 0 || swimmer.y > window.innerHeight) continue;
      const distance = Math.hypot(swimmer.x - x, swimmer.y - y);
      if (distance < bestDistance) { best = swimmer; bestDistance = distance; }
    }
    return best;
  }

  function svgElement(name, className) {
    const element = document.createElementNS(svgNamespace, name);
    element.setAttribute("class", className);
    return element;
  }

  function makeHarpoon(origin) {
    const rope = svgElement("line", "harpoon-rope");
    const spear = svgElement("g", "harpoon-spear");
    const shaft = svgElement("path", "harpoon-shaft");
    shaft.setAttribute("d", "M-100 0H-14");
    const tip = svgElement("path", "harpoon-tip");
    tip.setAttribute("d", "M2 0L-20-8L-15 0L-20 8Z");
    spear.append(shaft, tip);
    harpoons.append(rope, spear);
    return { rope, spear, origin, x: origin.x, y: origin.y };
  }

  function drawHarpoon(shot, origin, point) {
    shot.rope.setAttribute("x1", origin.x);
    shot.rope.setAttribute("y1", origin.y);
    shot.rope.setAttribute("x2", point.x);
    shot.rope.setAttribute("y2", point.y);
    const angle = Math.atan2(point.y - origin.y, point.x - origin.x) * 180 / Math.PI;
    shot.spear.setAttribute("transform", `translate(${point.x} ${point.y}) rotate(${angle})`);
  }

  function catchFish(swimmer, shot) {
    const index = fish.indexOf(swimmer);
    if (index < 0) return;
    fish.splice(index, 1);
    swimmer.element.remove();
    document.documentElement.classList.remove("fish-aiming");
    const point = { x: swimmer.x, y: swimmer.y };
    if (shot) { shot.rope.remove(); shot.spear.remove(); }
    orbit.reveal(swimmer.specimen, point);
    caught.add(swimmer.specimen.number);
    const available = species.filter((specimen) => !fish.some((other) => other.specimen.number === specimen.number));
    const next = available.find((specimen) => !caught.has(specimen.number)) || available.find((specimen) => specimen.number !== swimmer.specimen.number);
    if (next) {
      const fraction = motionPreference.matches ? .2 + Math.random() * .6 : (swimmer.direction > 0 ? 0 : 1);
      const replacement = makeFish(next, swimmer.lane, fraction, swimmer.direction);
      if (replacement) {
        if (!motionPreference.matches) replacement.x = swimmer.direction > 0 ? -replacement.element.offsetWidth / 2 + 1 : window.innerWidth + replacement.element.offsetWidth / 2 - 1;
        drawFish(replacement, performance.now(), 0);
      }
    }
  }

  function finishShot(shot, immediate = false) {
    const index = shots.indexOf(shot);
    if (index >= 0) shots.splice(index, 1);
    const swimmer = fishAt(shot.target.x, shot.target.y);
    if (swimmer) {
      catchFish(swimmer, shot);
    } else if (immediate || motionPreference.matches) {
      shot.rope.remove();
      shot.spear.remove();
    } else {
      shot.rope.animate([{ opacity: .72 }, { opacity: 0 }], { duration: 300, fill: "forwards" });
      shot.spear.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: "forwards" }).onfinish = () => {
        shot.rope.remove();
        shot.spear.remove();
      };
    }
  }

  function advanceShot(shot, delta) {
    const dx = shot.target.x - shot.x;
    const dy = shot.target.y - shot.y;
    const distance = Math.hypot(dx, dy);
    const step = shot.speed * delta;
    if (distance <= Math.max(12, step)) {
      shot.x = shot.target.x;
      shot.y = shot.target.y;
      drawHarpoon(shot, shot.origin, shot);
      finishShot(shot);
      return;
    }
    shot.x += dx / distance * step;
    shot.y += dy / distance * step;
    drawHarpoon(shot, shot.origin, shot);
  }

  function tick(now) {
    const delta = previousFrame ? Math.min((now - previousFrame) / 1000, .05) : 0;
    previousFrame = now;
    fish.forEach((swimmer) => drawFish(swimmer, now, delta));
    [...shots].forEach((shot) => advanceShot(shot, delta));
    if (!motionPreference.matches || shots.length) frameId = window.requestAnimationFrame(tick);
  }

  function launch(point) {
    if (!started) return;
    if (motionPreference.matches) {
      const swimmer = fishAt(point.x, point.y);
      if (swimmer) catchFish(swimmer, null);
      return;
    }
    const origin = { x: Math.max(24, Math.min(window.innerWidth - 24, point.x + 90)), y: window.innerHeight + 45 };
    const shot = makeHarpoon(origin);
    shot.target = { x: point.x, y: point.y };
    shot.speed = Math.min(1250, Math.max(220, Math.hypot(point.x - origin.x, point.y - origin.y) / .65));
    shots.push(shot);
    drawHarpoon(shot, origin, origin);
  }

  function isInteractive(target) {
    return target instanceof Element && Boolean(target.closest("a, button, .catalog-card, input, textarea, select"));
  }

  document.addEventListener("pointermove", (event) => {
    if (!started || event.pointerType !== "mouse") return;
    const target = isInteractive(event.target) ? null : fishAt(event.clientX, event.clientY);
    fish.forEach((swimmer) => swimmer.element.classList.toggle("is-targeted", swimmer === target));
    document.documentElement.classList.toggle("fish-aiming", Boolean(target));
  }, { passive: true });

  document.addEventListener("pointerdown", (event) => {
    if (!started || event.isPrimary === false || event.button !== 0 || isInteractive(event.target)) return;
    pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }, { passive: true });
  document.addEventListener("pointerup", (event) => {
    if (!pointerStart || pointerStart.id !== event.pointerId) return;
    const distance = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
    if (distance < 12 && !isInteractive(event.target)) {
      launch({ x: event.clientX, y: event.clientY });
    }
    pointerStart = null;
  }, { passive: true });
  document.addEventListener("pointercancel", () => { pointerStart = null; }, { passive: true });

  accessibleButton.addEventListener("click", () => {
    const swimmer = nearestFish(window.innerWidth / 2, window.innerHeight / 2);
    if (!swimmer) return;
    const width = swimmer.element.offsetWidth;
    const height = swimmer.element.offsetHeight;
    const offsets = [0, -.1, .1, -.2, .2, -.3, .3];
    for (const y of offsets) {
      for (const x of offsets) {
        const point = { x: swimmer.x + width * x, y: swimmer.y + height * y };
        if (point.x >= 0 && point.x <= window.innerWidth && point.y >= 0 && point.y <= window.innerHeight && hitsFish(swimmer, point.x, point.y)) {
          launch(point);
          return;
        }
      }
    }
  });

  motionPreference.addEventListener("change", () => {
    if (!started) return;
    window.cancelAnimationFrame(frameId);
    previousFrame = 0;
    if (motionPreference.matches) {
      for (const shot of [...shots]) {
        finishShot(shot, true);
      }
      fish.forEach((swimmer) => drawFish(swimmer, performance.now(), 0));
    } else {
      frameId = window.requestAnimationFrame(tick);
    }
  });

  return {
    start() {
      if (started) return;
      started = true;
      makeFish(species[0], .22, .24, -1);
      makeFish(species[1], .68, .18, 1);
      makeFish(species[2], .79, .78, -1);
      fish.forEach((swimmer) => drawFish(swimmer, performance.now(), 0));
      if (!motionPreference.matches) frameId = window.requestAnimationFrame(tick);
    },
  };
}
