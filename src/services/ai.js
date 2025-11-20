import { STORAGE_KEY_GEMINI } from '../utils/helpers';

export const callGeminiVision = async (base64Image) => {
  const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI);
  if (!apiKey) throw new Error("API Key Missing. Please add it in Settings.");

  const GEMINI_MODEL = "gemini-2.5-flash-preview-09-2025";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [
        { text: "Analyze this financial document. Return a strict JSON object with: { \"merchant\": string, \"amount\": number, \"date\": string (YYYY-MM-DD), \"category\": string (suggest: Groceries, Transport, Utilities, Dining, Income, Bills, Health, Savings), \"taxDeductible\": boolean (true if business expense), \"taxAmount\": number (if explicit tax shown) }. Return { \"error\": \"Not a receipt\" } if invalid." },
        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
      ]
    }],
    generationConfig: { responseMimeType: "application/json" }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) throw new Error(`AI Error: ${response.statusText}`);
  const data = await response.json();
  return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
};
