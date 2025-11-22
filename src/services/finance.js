import { STORAGE_KEY_FINNHUB } from '../utils/helpers';

const FINNHUB_URL = 'https://finnhub.io/api/v1';
// Using a free, public API for currency to save Finnhub limits for Stocks
const FOREX_URL = 'https://api.exchangerate-api.com/v4/latest'; 

// ... keep existing getHeaders ...
const getHeaders = () => {
  const token = localStorage.getItem(STORAGE_KEY_FINNHUB);
  if (!token) throw new Error("Finnhub Key Missing");
  return { 'X-Finnhub-Token': token };
};

export const getExchangeRates = async (baseCurrency = 'GBP') => {
  try {
    const res = await fetch(`${FOREX_URL}/${baseCurrency}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates; // Returns object like { USD: 1.2, EUR: 1.15 }
  } catch (e) {
    console.error("Forex Error", e);
    return null;
  }
};

export const searchAssets = async (query) => {
  if (!query) return [];
  const token = localStorage.getItem(STORAGE_KEY_FINNHUB);
  if (!token) return [];

  const res = await fetch(`${FINNHUB_URL}/search?q=${query}&token=${token}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.result || [];
};

export const getQuote = async (symbol) => {
  const token = localStorage.getItem(STORAGE_KEY_FINNHUB);
  if (!token) return null;

  const res = await fetch(`${FINNHUB_URL}/quote?symbol=${symbol}&token=${token}`);
  if (!res.ok) return null;
  const data = await res.json();
  
  return {
    price: data.c,
    change: data.d,
    percent: data.dp
  };
};
