const pinyinCollator = new Intl.Collator("zh-CN-u-co-pinyin", {
  sensitivity: "base",
  numeric: true,
  ignorePunctuation: true,
});

const latinCollator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
  ignorePunctuation: true,
});

const normalizeName = (value: string): string => {
  return value
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/\s*[（(]副本.*?[)）]\s*$/i, "")
    .trim();
};

const isLatinLike = (value: string): boolean => /^[a-z0-9]/i.test(value);

export const compareNameWithPinyin = (a: string, b: string): number => {
  const left = normalizeName(a);
  const right = normalizeName(b);

  if (isLatinLike(left) && isLatinLike(right)) {
    return latinCollator.compare(left, right);
  }
  return pinyinCollator.compare(left, right);
};

export const sortByNameWithPinyin = <T>(
  items: T[],
  sortValue: string,
  getName: (item: T) => string
): T[] => {
  if (!sortValue.includes("name")) return items;

  const isAsc = !sortValue.startsWith("-");
  return [...items].sort((a, b) => {
    const nameA = (getName(a) || "").trim();
    const nameB = (getName(b) || "").trim();
    const result = compareNameWithPinyin(nameA, nameB);
    return isAsc ? result : -result;
  });
};
