import { create } from "zustand";

import {
  AssessmentCert2,
  AssessmentCert3,
  ID,
  TalentPortfolio,
} from "@/app/common/types";

type AssessmentCert = AssessmentCert2 | AssessmentCert3;

type PortfolioStore = {
  portfolios: Record<string, TalentPortfolio>;
  certificates: Record<string, AssessmentCert[]>;
  setPortfolios: (portfolios: Record<string, TalentPortfolio>) => void;
  updatePortfolio: (portfolio: TalentPortfolio, talentId: ID) => void;
  updateCertificates: (certificates: AssessmentCert[], talentId: ID) => void;
};

export const usePortfolioStore = create<PortfolioStore>(set => ({
  portfolios: {},
  certificates: {},
  setPortfolios: portfolios => set({ portfolios }),
  updatePortfolio: (portfolio, talentId) =>
    set(state => ({
      portfolios: {
        ...state.portfolios,
        [talentId]: portfolio,
      },
    })),
  updateCertificates: (certificates, talentId) =>
    set(state => ({
      certificates: {
        ...state.certificates,
        [talentId]: certificates,
      },
    })),
}));
