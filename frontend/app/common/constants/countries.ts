// Country data is lazy-loaded from /data/countries.json to avoid bundling 180KB of static data.

import { readFileSync } from "fs";
import { join } from "path";

interface CountryBasicData {
  flags: { png: string; svg: string; alt: string };
  name: {
    common: string;
    official: string;
    nativeName: Record<string, { official: string; common: string }>;
  };
  cca2: string;
  cca3: string;
  currencies: Record<string, { name: string; symbol: string }>;
  region: string;
  languages: Record<string, string>;
}

let _cache: CountryBasicData[] | null = null;

/**
 * Load countries data. Uses fs on the server (reads from public/data/countries.json)
 * or fetch() on the client (reads from /data/countries.json).
 */
export const getCountriesData = async (): Promise<CountryBasicData[]> => {
  if (_cache) return _cache;

  // Server-side: read directly from the filesystem
  if (typeof window === "undefined") {
    const filePath = join(process.cwd(), "public", "data", "countries.json");
    const raw = readFileSync(filePath, "utf-8");
    _cache = JSON.parse(raw);
    return _cache!;
  }

  // Client-side fallback
  const res = await fetch("/data/countries.json");
  _cache = await res.json();
  return _cache!;
};

export const countryOptions = async (): Promise<
  { value: string; label: string }[]
> => {
  const data = await getCountriesData();
  return data
    .map(country => ({
      value: country.name.common,
      label: country.name.common,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
};

export const getUniqueLanguages = async (): Promise<
  { label: string; value: string }[]
> => {
  const data = await getCountriesData();
  const languageSet = new Set<string>();

  data.forEach(country => {
    Object.entries(country.languages).forEach(([, value]) => {
      languageSet.add(value);
    });
  });

  return Array.from(languageSet).map(language => ({
    label: language,
    value: language,
  }));
};

export const getUniqueCurrencies = async (): Promise<
  { label: string; value: string }[]
> => {
  const data = await getCountriesData();
  const currencySet = new Set<string>();

  data.forEach(country => {
    Object.entries(country.currencies).forEach(([code, currency]) => {
      currencySet.add(`${currency.name} (${code})`);
    });
  });

  return Array.from(currencySet).map(currency => ({
    label: currency,
    value: currency,
  }));
};

export const getCurrencyCode = (currency: string) => {
  const regex = /\(([^)]+)\)/;
  const match = currency.match(regex);
  return match ? match[1] : null;
};

export const getCountryFlag = async (countryCode: string) => {
  const data = await getCountriesData();
  return data.find(c => c.cca2 === countryCode)?.flags.png;
};
