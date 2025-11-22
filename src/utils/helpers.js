// LocalStorage Keys
export const STORAGE_KEY_CONFIG = 'sterling_firebase_config';
export const STORAGE_KEY_GEMINI = 'sterling_gemini_key';
export const STORAGE_KEY_CURRENCY = 'sterling_base_currency';
// Removed FINNHUB Key

// Comprehensive List of World Currencies
export const ALL_CURRENCIES = [
  "AED", "AFN", "ALL", "AMD", "ANG", "AOA", "ARS", "AUD", "AWG", "AZN",
  "BAM", "BBD", "BDT", "BGN", "BHD", "BIF", "BMD", "BND", "BOB", "BRL",
  "BSD", "BTN", "BWP", "BYN", "BZD", "CAD", "CDF", "CHF", "CLP", "CNY",
  "COP", "CRC", "CUP", "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP",
  "ERN", "ETB", "EUR", "FJD", "FKP", "GBP", "GEL", "GGP", "GHS", "GIP",
  "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HRK", "HTG", "HUF", "IDR",
  "ILS", "IMP", "INR", "IQD", "IRR", "ISK", "JEP", "JMD", "JOD", "JPY",
  "KES", "KGS", "KHR", "KID", "KMF", "KRW", "KWD", "KYD", "KZT", "LAK",
  "LBP", "LKR", "LRD", "LSL", "LYD", "MAD", "MDL", "MGA", "MKD", "MMK",
  "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN", "MYR", "MZN", "NAD",
  "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN", "PGK", "PHP",
  "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD",
  "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SLL", "SOS", "SRD", "SSP",
  "STN", "SYP", "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD",
  "TVD", "TWD", "TZS", "UAH", "UGX", "USD", "UYU", "UZS", "VES", "VND",
  "VUV", "WST", "XAF", "XCD", "XOF", "XPF", "YER", "ZAR", "ZMW", "ZWL"
];

export const formatCurrency = (amount, currencyCode = 'GBP') => {
  const code = currencyCode || 'GBP';
  try {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2
    }).format(amount);
  } catch (e) {
    return `${code} ${parseFloat(amount).toFixed(2)}`;
  }
};

export const parseFirebaseConfig = (inputString) => {
  if (!inputString) return null;
  try {
    return JSON.parse(inputString);
  } catch (e) {
    try {
      let cleaned = inputString
        .replace(/const\s+firebaseConfig\s*=\s*/, '')
        .replace(/firebaseConfig\s*=\s*/, '')
        .replace(/;\s*$/, '')
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":')
        .replace(/'/g, '"');
      return JSON.parse(cleaned);
    } catch (error) {
      return null;
    }
  }
};

export const getStoredConfig = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CONFIG);
    return raw ? JSON.parse(raw) : null;
  } catch (e) { return null; }
};
