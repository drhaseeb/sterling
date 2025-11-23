import { STORAGE_KEY_GEMINI } from '../utils/helpers';

export const callGeminiVision = async (base64Image) => {
  const apiKey = localStorage.getItem(STORAGE_KEY_GEMINI);
  
  if (!apiKey) {
    throw new Error("Gemini API Key is missing. Go to Settings to add it.");
  }

  const GEMINI_MODEL = "gemini-1.5-flash"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  
  const payload = {
    contents: [{
      parts: [
        { text: "Analyze this receipt. Return ONLY a valid JSON object with these fields: { \"merchant\": string, \"amount\": number, \"date\": string (YYYY-MM-DD), \"category\": string, \"taxDeductible\": boolean }. Do not use markdown formatting." },
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
      const errorText = await response.text();
      console.error("Gemini API Error:", errorText);
      throw new Error(`AI Error (${response.status}): Check your API Key.`);
    }

    const data = await response.json();
    
    // Robust parsing
    if (!data.candidates || !data.candidates[0].content) {
      throw new Error("AI could not identify the image.");
    }

    const text = data.candidates[0].content.parts[0].text;
    
    // Sanitize markdown if AI ignores instructions
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(cleanJson);

  } catch (error) {
    console.error("Scanner Exception:", error);
    // Pass the error message up to the UI
    throw error;
  }
};
