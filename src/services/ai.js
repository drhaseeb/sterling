import { STORAGE_KEY_GEMINI } from '../utils/helpers';

export const callGeminiVision = async (base64Image) => {
  const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI);
  if (!apiKey) throw new Error("API Key Missing. Please add it in Settings.");

  // Use the latest stable flash model
  const GEMINI_MODEL = "gemini-1.5-flash"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [
        { text: "Analyze this financial document (receipt/paycheck). Extract data into this strict JSON structure: { \"merchant\": string, \"amount\": number, \"date\": string (YYYY-MM-DD), \"category\": string (suggest one: Groceries, Transport, Utilities, Dining, Income, Bills, Health, Shopping), \"taxDeductible\": boolean }. Do not wrap the response in markdown or code blocks. Just return raw JSON." },
        { inlineData: { mimeType: "image/jpeg", data: base64Image } }
      ]
    }],
    generationConfig: { responseMimeType: "application/json" }
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || response.statusText);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!candidate) throw new Error("No data returned from AI.");

    // CRITICAL FIX: Strip Markdown code fences if AI includes them
    const cleanJson = candidate.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("AI Scan Error:", error);
    throw error;
  }
};
