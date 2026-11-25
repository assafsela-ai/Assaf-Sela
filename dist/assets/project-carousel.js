const track = document.querySelector("#project-carousel");
const cards = [...track.querySelectorAll(".feature")];
const controls = document.querySelector(".project-controls");
const previous = controls.querySelector('[data-step="previous"]');
const next = controls.querySelector('[data-step="next"]');
const position = controls.querySelector(".project-position");
const progress = document.querySelector(".project-progress");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const tolerance = 2;
let settleTimer;
let mouseDrag;
let suppressClick = false;

function endOffset() {
  return track.scrollWidth - track.clientWidth;
}

function cardOffsets() {
  const firstLeft = cards[0].offsetLeft;
  return cards.map((card) => card.offsetLeft - firstLeft);
}

function updateControls() {
  const left = track.scrollLeft;
  const right = left + track.clientWidth;
  const visible = cardOffsets().flatMap((offset, index) =>
    offset >= left - tolerance && offset + cards[index].offsetWidth <= right + tolerance
      ? [index + 1]
      : []
  );
  const [first] = visible;
  const last = visible.at(-1);
  if (first !== undefined) {
    const label = `${first === last ? first : `${first}–${last}`} of ${cards.length}`;
    if (position.textContent !== label) position.textContent = label;
    progress.value = last;
  }
  previous.setAttribute("aria-disabled", String(left <= tolerance));
  next.setAttribute("aria-disabled", String(left >= endOffset() - tolerance));
}

function scrollToOffset(left) {
  track.scrollTo({ left, behavior: reducedMotion.matches ? "instant" : "smooth" });
}

function scrollOne(direction) {
  const left = track.scrollLeft;
  const offsets = cardOffsets();
  const target = direction > 0
    ? offsets.find((offset) => offset > left + tolerance) ?? endOffset()
    : offsets.findLast((offset) => offset < left - tolerance) ?? 0;
  scrollToOffset(Math.min(target, endOffset()));
}

function finishMouseDrag(event) {
  if (!mouseDrag || mouseDrag.pointerId !== event.pointerId) return;
  const { active } = mouseDrag;
  mouseDrag = undefined;
  if (!active) return;

  const left = track.scrollLeft;
  const end = endOffset();
  const stops = cardOffsets().map((offset) => Math.min(offset, end));
  const nearest = stops.reduce((best, stop) =>
    Math.abs(stop - left) < Math.abs(best - left) ? stop : best
  );
  track.classList.remove("is-dragging");
  scrollToOffset(nearest);
}

track.addEventListener("pointerdown", (event) => {
  if (event.button !== 0) return;
  suppressClick = false;
  if (event.pointerType !== "mouse" || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
      !event.target.closest(".feature")) return;
  mouseDrag = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
    left: track.scrollLeft,
    active: false,
  };
});
window.addEventListener("pointermove", (event) => {
  if (!mouseDrag || mouseDrag.pointerId !== event.pointerId) return;
  if (!(event.buttons & 1)) {
    finishMouseDrag(event);
    return;
  }
  const distance = event.clientX - mouseDrag.x;
  if (!mouseDrag.active) {
    if (Math.abs(distance) < 6 || Math.abs(distance) < Math.abs(event.clientY - mouseDrag.y)) return;
    mouseDrag.active = true;
    suppressClick = true;
    track.classList.add("is-dragging");
    track.setPointerCapture(event.pointerId);
  }
  event.preventDefault();
  track.scrollLeft = mouseDrag.left - distance;
});
window.addEventListener("pointerup", finishMouseDrag);
window.addEventListener("pointercancel", finishMouseDrag);
track.addEventListener("lostpointercapture", finishMouseDrag);
track.addEventListener("dragstart", (event) => {
  if (mouseDrag) event.preventDefault();
});
track.addEventListener("click", (event) => {
  if (!suppressClick || event.detail === 0) return;
  suppressClick = false;
  event.preventDefault();
  event.stopPropagation();
}, { capture: true });

previous.addEventListener("click", () => {
  if (previous.getAttribute("aria-disabled") !== "true") scrollOne(-1);
});
next.addEventListener("click", () => {
  if (next.getAttribute("aria-disabled") !== "true") scrollOne(1);
});
track.addEventListener("keydown", (event) => {
  if (event.target !== track || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  switch (event.key) {
    case "ArrowLeft": scrollOne(-1); break;
    case "ArrowRight": scrollOne(1); break;
    case "Home": scrollToOffset(0); break;
    case "End": scrollToOffset(endOffset()); break;
    default: return;
  }
  event.preventDefault();
});
track.addEventListener("scroll", () => {
  clearTimeout(settleTimer);
  settleTimer = setTimeout(updateControls, 120);
}, { passive: true });
const resizeObserver = new ResizeObserver(updateControls);
track.classList.add("is-carousel", "mouse-draggable");
progress.max = cards.length;
updateControls();
resizeObserver.observe(track);
track.tabIndex = 0;
track.setAttribute("aria-roledescription", "carousel");
controls.hidden = false;
progress.hidden = false;
