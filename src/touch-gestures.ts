type TouchActions = {
  onTap?: (event: PointerEvent) => void;
  onSwipe?: (direction: number) => void;
};

export function mountTouchGestures(
  element: HTMLElement,
  actions: TouchActions,
) {
  let contact: {
    id: number;
    x: number;
    y: number;
    started: number;
    distance: number;
  } | null = null;
  let lastTouch = -Infinity;

  function cancel() {
    contact = null;
    lastTouch = performance.now();
  }

  element.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType !== "touch") return;
      if (!event.isPrimary) {
        cancel();
        return;
      }
      contact = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        started: performance.now(),
        distance: 0,
      };
    },
    { passive: true },
  );

  element.addEventListener(
    "pointermove",
    (event) => {
      if (!contact || contact.id !== event.pointerId) return;
      const horizontal = event.clientX - contact.x;
      const vertical = event.clientY - contact.y;
      contact.distance = Math.max(
        contact.distance,
        Math.hypot(horizontal, vertical),
      );
      if (Math.abs(vertical) > 12 && Math.abs(vertical) > Math.abs(horizontal))
        cancel();
    },
    { passive: true },
  );

  element.addEventListener(
    "pointerup",
    (event) => {
      if (!contact || contact.id !== event.pointerId) return;
      const completed = contact;
      cancel();
      const horizontal = event.clientX - completed.x;
      const vertical = event.clientY - completed.y;
      const distance = Math.max(
        completed.distance,
        Math.hypot(horizontal, vertical),
      );
      const duration = performance.now() - completed.started;
      if (distance <= 10 && duration < 600) actions.onTap?.(event);
      else if (
        Math.abs(horizontal) >= 48 &&
        Math.abs(horizontal) > Math.abs(vertical) * 1.5 &&
        duration < 1200
      ) {
        actions.onSwipe?.(horizontal < 0 ? 1 : -1);
      }
    },
    { passive: true },
  );

  element.addEventListener("pointercancel", cancel, { passive: true });
  element.addEventListener("lostpointercapture", () => {
    contact = null;
  });
  document.addEventListener(
    "pointerdown",
    (event) => {
      if (event.pointerType === "touch" && !event.isPrimary) cancel();
    },
    { passive: true },
  );
  window.addEventListener("blur", cancel);
  element.addEventListener(
    "click",
    (event) => {
      const pointerType =
        event instanceof PointerEvent ? event.pointerType : "";
      if (
        event.detail > 0 &&
        (pointerType === "touch" ||
          (!pointerType && performance.now() - lastTouch < 800))
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    },
    { capture: true },
  );
}
