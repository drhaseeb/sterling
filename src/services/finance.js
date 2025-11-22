// YAHOO FINANCE ENGINE (Via Proxy)
const PROXY_URL = 'https://api.allorigins.win/raw?url=';
const YAHOO_SEARCH_URL = 'https://query1.finance.yahoo.com/v1/finance/search';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

// 1. GET EXCHANGE RATES (Live)
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

    return {
      price: result.meta.regularMarketPrice,
      currency: result.meta.currency,
      change: result.meta.regularMarketPrice - result.meta.chartPreviousClose,
      percent: ((result.meta.regularMarketPrice - result.meta.chartPreviousClose) / result.meta.chartPreviousClose) * 100
    };
  } catch (e) {
    console.error(`Quote Error for ${symbol}`, e);
    return null;
  }
};

// 4. GET HISTORICAL PRICE (New)
export const getHistoricalPrice = async (symbol, dateString) => {
  if (!symbol || !dateString) return null;

  try {
    // Create timestamps for the specific date (Start of day to End of day)
    const date = new Date(dateString);
    const period1 = Math.floor(date.getTime() / 1000);
    const period2 = period1 + 86400; // +1 Day

    const url = `${YAHOO_CHART_URL}/${symbol}?period1=${period1}&period2=${period2}&interval=1d`;
    const res = await fetch(PROXY_URL + encodeURIComponent(url));
    
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.chart.result[0];

    // Return the Close price on that day
    if (result && result.indicators && result.indicators.quote[0].close) {
        // Find the first valid close price
        const closes = result.indicators.quote[0].close;
        const validClose = closes.find(c => c != null);
        return validClose || null;
    }
    return null;
  } catch (e) {
    console.error(`History Error for ${symbol}`, e);
    return null;
  }
};
