// YAHOO FINANCE ENGINE (Via Proxy)
// We use 'allorigins' proxy to bypass CORS since Yahoo doesn't support client-side calls directly.

const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const YAHOO_QUOTE_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

// 1. GET EXCHANGE RATES
// Yahoo stores pairs like "GBPUSD=X"
export const getExchangeRates = async (baseCurrency = 'GBP') => {
  // We want to convert FROM Base TO others.
  // But getting ALL rates from Yahoo is hard. 
  // Strategy: We fallback to a dedicated free Forex API for the bulk rates list
  // because Yahoo is better for single asset lookups.
  try {
    const res = await fetch(`https://api.exchangerate-api.com/v4/latest/${baseCurrency}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.rates; 
  } catch (e) {
    console.error("Forex Error", e);
    return null;
  }
};

// 2. SEARCH ASSETS (Stocks, ETFs, Funds)
export const searchAssets = async (query) => {
  if (!query) return [];
  
  try {
    const url = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
    const res = await fetch(PROXY_URL + encodeURIComponent(url));
    
    if (!res.ok) return [];
    const data = await res.json();
    
    // Map Yahoo format to our app format
    return data.quotes.map(item => ({
      symbol: item.symbol,
      description: item.longname || item.shortname,
      type: item.quoteType,
      exchange: item.exchange
    }));
  } catch (e) {
    console.error("Yahoo Search Error", e);
    return [];
  }
};

// 3. GET LIVE QUOTE
export const getQuote = async (symbol) => {
  if (!symbol) return null;

  try {
    const url = `${YAHOO_QUOTE_URL}/${symbol}`;
    const res = await fetch(PROXY_URL + encodeURIComponent(url));
    
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart.result[0];
    
    if (!result || !result.meta) return null;

    return {
      price: result.meta.regularMarketPrice,
      prevClose: result.meta.chartPreviousClose,
      currency: result.meta.currency, // Yahoo tells us the currency of the asset!
      change: result.meta.regularMarketPrice - result.meta.chartPreviousClose,
      percent: ((result.meta.regularMarketPrice - result.meta.chartPreviousClose) / result.meta.chartPreviousClose) * 100
    };
  } catch (e) {
    console.error(`Quote Error for ${symbol}`, e);
    return null;
  }
};
