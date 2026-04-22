export const denseResourceBreakpoints = {
  4000: { rowPerView: 6 },
  1200: { rowPerView: 6 },
  992: { rowPerView: 5 },
  768: { rowPerView: 4 },
  576: { rowPerView: 3 },
  420: { rowPerView: 2 },
  300: { rowPerView: 1 },
};

export const denseResourceCardGutter = 20;

const toPositiveNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
};

export const getAspectRatioFromDimensions = (
  width: unknown,
  height: unknown
): string | undefined => {
  const resolvedWidth = toPositiveNumber(width);
  const resolvedHeight = toPositiveNumber(height);

  if (!resolvedWidth || !resolvedHeight) return undefined;

  return `${resolvedWidth} / ${resolvedHeight}`;
};

export const getAspectRatioFromInfo = (
  info?: string | null
): string | undefined => {
  if (!info) return undefined;

  try {
    const parsed = JSON.parse(info) as {
      size?: {
        x?: unknown;
        y?: unknown;
        width?: unknown;
        height?: unknown;
      };
      width?: unknown;
      height?: unknown;
    } | null;

    if (!parsed || typeof parsed !== "object") return undefined;

    return (
      getAspectRatioFromDimensions(parsed.size?.x, parsed.size?.y) ||
      getAspectRatioFromDimensions(parsed.size?.width, parsed.size?.height) ||
      getAspectRatioFromDimensions(parsed.width, parsed.height)
    );
  } catch {
    return undefined;
  }
};
