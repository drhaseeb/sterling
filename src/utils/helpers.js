// LocalStorage Keys
export const STORAGE_KEY_CONFIG = 'sterling_firebase_config';
export const STORAGE_KEY_GEMINI = 'sterling_gemini_key';

// UK Currency Formatter
export const formatGBP = (amount) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 2
  }).format(amount);
};

export const getStoredConfig = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG));
  } catch (e) { return null; }
};
