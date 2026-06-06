"use server";
import { handleServerApiCallError } from "../utils";
import axiosInstance from "../utils/axios.instance";
import { ID, Contract, PagedResource } from "../types";
import serverKyInstance from "../utils/server-ky.instance";

export const getContracts = async (page = 1, page_size = 10) => {
  const data = await serverKyInstance
    .get<PagedResource<Contract>>("contracts/all/", {
      searchParams: {
        page,
        page_size,
      },
    })
    .json();
  return data;
};

export type CreateContract = {
  role: ID;
  value: number;
  currency: string;
  expires: string;
};

export const createContract = async (talent: ID, contract: CreateContract) => {
  try {
    const response = await axiosInstance.post<Contract>(
      `contracts/create/${talent}/`,
      contract
    );
    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    const errMsg = await handleServerApiCallError(error);
    console.log("Create contract error: ", errMsg);
    return {
      success: false,
      error: errMsg,
    };
  }
};

export const getContract = async (id: ID) => {
  const data = await serverKyInstance.get<Contract>(`contracts/${id}/`).json();
  return data;
};

export const deleteContract = async (id: ID) => {
  await axiosInstance.delete(`contracts/${id}/`);
};
