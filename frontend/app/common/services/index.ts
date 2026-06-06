"use server";
import axios from "axios";
import { sortBy, uniq } from "lodash";
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
import { countriesBasicData } from "../constants/countries";

export const getCountries = async (): Promise<GroupBase<CountryField>[]> => {
  // if (process.env.NODE_ENV === "development")
  //   return [
  //     {
  //       label: "Africa",
  //       options: [
  //         {
  //           label: "Nigeria",
  //           value: "Nigeria",
  //           region: "Africa",
  //         },
  //         {
  //           label: "Niger",
  //           value: "Niger",
  //           region: "Africa",
  //         },
  //       ],
  //     },
  //   ];
  const countries: CountryField[] = countriesBasicData.map(country => ({
    label: country.name.common,
    value: country.name.common,
    region: country.region,
  }));
  const regions = sortBy(
    uniq(countries.map(country => country.region)),
    r => r
  );
  return regions.map(region => ({
    label: region,
    options: sortBy(
      countries.filter(country => country.region === region),
      c => c.label
    ),
  }));
};

export const getCountryCitiesMap = async (): Promise<CountryCitiesMap> => {
  if (process.env.NODE_ENV === "development")
    return { Nigeria: ["Lagos", "Abuja"] };
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
  return data;
};

export const getTools = async (
  query?: string
): Promise<TalentPortfolioTool[]> => {
  const data = await serverKyInstance
    .get<TalentPortfolioTool[]>("jobs/portfolio/tools", {
      searchParams: query ? { q: query } : undefined,
    })
    .json();
  return data;
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
