"use server";
import axios from "axios";
import { GroupBase } from "react-select";

import {
  CountryCitiesMap,
  CountryField,
  PaymentAccount,
  TalentPortfolioTool,
  TalentProfileStatus,
  TalentRole,
} from "../types";
import serverKyInstance from "../utils/server-ky.instance";
import { getCountriesData } from "../constants/countries";

export const getCountries = async (): Promise<GroupBase<CountryField>[]> => {
  const countriesBasicData = await getCountriesData();
  const countries: CountryField[] = countriesBasicData.map(country => ({
    label: country.name.common,
    value: country.name.common,
    region: country.region,
  }));
  const regions = Array.from(new Set(countries.map(country => country.region))).sort();
  return regions.map(region => ({
    label: region,
    options: countries
      .filter(country => country.region === region)
      .sort((a, b) => a.label.localeCompare(b.label)),
  }));
};

export const getCountryCitiesMap = async (): Promise<CountryCitiesMap> => {
  if (process.env.NODE_ENV === "development")
    return { Nigeria: ["Lagos", "Abuja"] };
  const countriesBasicData = await getCountriesData();
  return countriesBasicData.reduce((acc: CountryCitiesMap, country: any) => {
    acc[country.country] = country.cities;
    return acc;
  }, {});
};

export const getTalentRoles = async (
  isStartupRoles?: boolean
): Promise<TalentRole[]> => {
  const data = await serverKyInstance
    .get<TalentRole[]>(
      "roles",
      isStartupRoles
        ? {
            searchParams: { startup: true },
          }
        : undefined
    )
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as TalentRole[];
};

export const getTools = async (
  query?: string
): Promise<TalentPortfolioTool[]> => {
  const data = await serverKyInstance
    .get<TalentPortfolioTool[]>("jobs/portfolio/tools", {
      searchParams: query ? { q: query } : undefined,
    })
    .json();
  const results = Array.isArray(data) ? data : (data as any)?.results || [];
  return results as TalentPortfolioTool[];
};

export const getTalentRole = async (slug: string): Promise<TalentRole> => {
  const data = await serverKyInstance.get<TalentRole>(`roles/${slug}`).json();
  return data;
};

export const getTalenProfileStatus = async (): Promise<TalentProfileStatus> => {
  const data = await serverKyInstance
    .get<TalentProfileStatus>("auth/talent-profile-status")
    .json();
  return data;
};
