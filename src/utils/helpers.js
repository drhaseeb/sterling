// LocalStorage Keys
export const STORAGE_KEY_CONFIG = 'sterling_firebase_config';
export const STORAGE_KEY_GEMINI = 'sterling_gemini_key';
export const STORAGE_KEY_FINNHUB = 'sterling_finnhub_key';

// UK Currency Formatter
export const formatGBP = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount);
};

// SMART CONFIG PARSER
// Handles both strict JSON and the "firebaseConfig = { ... }" format
export const parseFirebaseConfig = (inputString) => {
  if (!inputString) return null;

  try {
    // 1. Try parsing as strict JSON first
    return JSON.parse(inputString);
  } catch (e) {
    try {
      // 2. If that fails, try to clean up JS object syntax
      let cleaned = inputString
        .replace(/const\s+firebaseConfig\s*=\s*/, '') // Remove variable decl
        .replace(/firebaseConfig\s*=\s*/, '')         // Remove direct assignment
        .replace(/;\s*$/, '')                         // Remove trailing semicolon
        // Regex to quote unquoted keys (e.g. apiKey: -> "apiKey":)
        .replace(/(['"])?([a-zA-Z0-9_]+)(['"])?:/g, '"$2":') 
        // Replace single quotes with double quotes for values
        .replace(/'/g, '"');
      
      return JSON.parse(cleaned);
    } catch (error) {
      console.error("Config Parsing Failed", error);
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
