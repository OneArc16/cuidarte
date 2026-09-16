import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

type TooltipState = {
  target: HTMLElement;
  text: string;
};

type TooltipPosition = {
  left: number;
  top: number;
  arrowLeft: number;
  placement: "top" | "bottom";
};

export function TooltipLayer() {
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [position, setPosition] = useState<TooltipPosition>({
    left: 0,
    top: 0,
    arrowLeft: 0,
    placement: "top",
  });
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function getTooltipTarget(eventTarget: EventTarget | null): HTMLElement | null {
      return eventTarget instanceof Element
        ? eventTarget.closest<HTMLElement>("[data-tooltip]")
        : null;
    }

    function show(event: Event) {
      const target = getTooltipTarget(event.target);
      const text = target?.dataset.tooltip?.trim();

      if (target !== null && text !== undefined && text !== "") {
        setTooltip({ target, text });
      }
    }

    function hide(event: Event) {
      const target = getTooltipTarget(event.target);
      const relatedTarget = event instanceof FocusEvent || event instanceof MouseEvent
        ? event.relatedTarget
        : null;

      if (target !== null && !(relatedTarget instanceof Node && target.contains(relatedTarget))) {
        setTooltip((current) => (current?.target === target ? null : current));
      }
    }

    document.addEventListener("pointerover", show);
    document.addEventListener("pointerout", hide);
    document.addEventListener("focusin", show);
    document.addEventListener("focusout", hide);

    return () => {
      document.removeEventListener("pointerover", show);
      document.removeEventListener("pointerout", hide);
      document.removeEventListener("focusin", show);
      document.removeEventListener("focusout", hide);
    };
  }, []);

  useLayoutEffect(() => {
    if (tooltip === null || tooltipRef.current === null) {
      return;
    }

    const targetRect = tooltip.target.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const margin = 8;
    const viewportPadding = 12;
    const fitsAbove = targetRect.top >= tooltipRect.height + margin + viewportPadding;
    const placement = fitsAbove ? "top" : "bottom";
    const unclampedLeft = targetRect.left + targetRect.width / 2;
    const left = Math.min(
      Math.max(unclampedLeft, tooltipRect.width / 2 + viewportPadding),
      window.innerWidth - tooltipRect.width / 2 - viewportPadding,
    );
    const top = fitsAbove
      ? targetRect.top - margin
      : targetRect.bottom + margin;
    const arrowLeft = Math.min(
      Math.max(
        tooltipRect.width / 2 + targetRect.left + targetRect.width / 2 - left,
        12,
      ),
      tooltipRect.width - 12,
    );

    setPosition({ left, top, arrowLeft, placement });
  }, [tooltip]);

  if (tooltip === null) {
    return null;
  }

  return createPortal(
    <div
      ref={tooltipRef}
      className={`app-tooltip app-tooltip--${position.placement}`}
      role="tooltip"
      style={
        {
          left: position.left,
          top: position.top,
          "--tooltip-arrow-left": `${position.arrowLeft}px`,
        } as CSSProperties
      }
    >
      {tooltip.text}
    </div>,
    document.body,
  );
}
