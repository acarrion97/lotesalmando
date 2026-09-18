import { useMemo } from "react";

type LookupMap = Record<number, string>;

export function useLookup<T extends Record<string, unknown>>(
  data: T[] | undefined,
  idField: keyof T,
  labelField: keyof T,
  fallback?: string
): LookupMap {
  return useMemo(() => {
    if (!data) return {};

    return Object.fromEntries(
      data.map((item) => [
        item[idField],
        (item[labelField] as string) ?? fallback ?? String(item[idField]),
      ])
    ) as LookupMap;
  }, [data, idField, labelField, fallback]);
}
