import { STORAGE_KEY_FINNHUB } from '../utils/helpers';

const BASE_URL = 'https://finnhub.io/api/v1';

const getHeaders = () => {
  const token = localStorage.getItem(STORAGE_KEY_FINNHUB);
  if (!token) throw new Error("Finnhub Key Missing");
  return { 'X-Finnhub-Token': token };
};

export const searchAssets = async (query) => {
  if (!query) return [];
  const token = localStorage.getItem(STORAGE_KEY_FINNHUB);
  if (!token) return [];

  // Finnhub search endpoint
  const res = await fetch(`${BASE_URL}/search?q=${query}&token=${token}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.result || [];
};

export const getQuote = async (symbol) => {
  const token = localStorage.getItem(STORAGE_KEY_FINNHUB);
  if (!token) return null;

  const res = await fetch(`${BASE_URL}/quote?symbol=${symbol}&token=${token}`);
  if (!res.ok) return null;
  const data = await res.json();
  
  // c: Current price, d: Change, dp: Percent change
  return {
    price: data.c,
    change: data.d,
    percent: data.dp
  };
};
