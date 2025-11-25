// YAHOO FINANCE ENGINE (Via Proxy)
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

// HELPER: Normalize Pence to Pounds
// Yahoo often returns LSE stocks in GBp (pence). If currency is GBP/GBp and price > 200, assume pence.
const normalizeYahooPrice = (price, currency) => {
  if (!price) return 0;
  if ((currency === 'GBP' || currency === 'GBp') && price > 200) {
    return price / 100;
  }
  return price;
};

// 1. GET EXCHANGE RATES
export const getExchangeRates = async (baseCurrency = 'GBP') => {
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

// 2. SEARCH ASSETS
export const searchAssets = async (query) => {
  if (!query) return [];
  
  try {
    const url = `${YAHOO_SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=10&newsCount=0`;
    const res = await fetch(PROXY_URL + encodeURIComponent(url));
    
    if (!res.ok) return [];
    const data = await res.json();
    
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
    const url = `${YAHOO_CHART_URL}/${symbol}`;
    const res = await fetch(PROXY_URL + encodeURIComponent(url));
    
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart.result[0];
    
    if (!result || !result.meta) return null;

    const rawPrice = result.meta.regularMarketPrice;
    const currency = result.meta.currency;
    const price = normalizeYahooPrice(rawPrice, currency);
    const prevClose = normalizeYahooPrice(result.meta.chartPreviousClose, currency);

    return {
      price,
      currency: currency === 'GBp' ? 'GBP' : currency, // Normalize code
      change: price - prevClose,
      percent: ((price - prevClose) / prevClose) * 100
    };
  } catch (e) {
    console.error(`Quote Error for ${symbol}`, e);
    return null;
  }
};

// 4. GET HISTORICAL PRICE
export const getHistoricalPrice = async (symbol, dateString) => {
  if (!symbol || !dateString) return null;

  try {
    const date = new Date(dateString);
    const period1 = Math.floor(date.getTime() / 1000);
    const period2 = period1 + 86400; // +1 Day

    const url = `${YAHOO_CHART_URL}/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;
    const res = await fetch(PROXY_URL + encodeURIComponent(url));
    
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart.result[0];

    if (result && result.indicators && result.indicators.quote[0].close) {
        const closes = result.indicators.quote[0].close;
        const validClose = closes.find(c => c != null);
        const currency = result.meta.currency;
        
        return normalizeYahooPrice(validClose, currency);
    }
    return null;
  } catch (e) {
    console.error(`History Error for ${symbol}`, e);
    return null;
  }
};
