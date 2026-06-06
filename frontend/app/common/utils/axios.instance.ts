import axios from "axios";

import { API_URL } from "../constants";
import { getAuthCookiesAsync } from "../actions";

const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

export const publicAxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 120000,
});

axiosInstance.interceptors.request.use(
  async config => {
    const res = await getAuthCookiesAsync();
    const access = await res?.access;
    if (access) {
      config.headers.Authorization = `Bearer ${access.value}`;
    }
    return config;
  },
  error => Promise.reject(error)
);

export default axiosInstance;
