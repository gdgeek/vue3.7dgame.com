const DEFAULT_SORT_LOCALES = [
  "zh-Hans",
  "zh-Hant",
  "ja",
  "th",
  "en-US",
] as const;

const multilingualCollator = new Intl.Collator(DEFAULT_SORT_LOCALES, {
  usage: "sort",
  sensitivity: "base",
  numeric: true,
  ignorePunctuation: true,
});

const strictCollator = new Intl.Collator(DEFAULT_SORT_LOCALES, {
  usage: "sort",
  sensitivity: "variant",
  numeric: true,
  ignorePunctuation: false,
});

const normalizeSortText = (value: unknown): string => {
  if (value === null || value === undefined) return "";
  return String(value).trim().normalize("NFKC");
};

const PUNCTUATION_OR_SYMBOL_PREFIX = /^[\p{P}\p{S}\s]+/u;
const PURE_NUMBER = /^[-+]?\d+(?:\.\d+)?$/;

const stripPrefixPunctuation = (value: string): string =>
  value.replace(PUNCTUATION_OR_SYMBOL_PREFIX, "");

export const compareMultilingualText = (a: unknown, b: unknown): number => {
  const aRaw = normalizeSortText(a);
  const bRaw = normalizeSortText(b);

  if (!aRaw && !bRaw) return 0;
  if (!aRaw) return 1;
  if (!bRaw) return -1;

  if (PURE_NUMBER.test(aRaw) && PURE_NUMBER.test(bRaw)) {
    const numericResult = Number(aRaw) - Number(bRaw);
    if (numericResult !== 0) return numericResult;
  }

  const aText = stripPrefixPunctuation(aRaw) || aRaw;
  const bText = stripPrefixPunctuation(bRaw) || bRaw;

  const result = multilingualCollator.compare(aText, bText);
  if (result !== 0) return result;

  // Fallback with punctuation sensitivity to stabilize symbols/special chars.
  return strictCollator.compare(aRaw, bRaw);
};

export const sortByMultilingualField = <T>(
  list: T[],
  field: string,
  descending = false
): T[] => {
  const stableList = list.map((item, index) => ({ item, index }));

  stableList.sort((left, right) => {
    const leftRecord = left.item as Record<string, unknown>;
    const rightRecord = right.item as Record<string, unknown>;
    const compared = compareMultilingualText(
      leftRecord?.[field],
      rightRecord?.[field]
    );

    if (compared !== 0) {
      return descending ? -compared : compared;
    }
    return left.index - right.index;
  });

  return stableList.map((entry) => entry.item);
};
