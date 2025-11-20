import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, UploadCloud, FileJson } from 'lucide-react';
import { STORAGE_KEY_CONFIG, STORAGE_KEY_GEMINI } from '../utils/helpers';

export default function Settings() {
  const [geminiKey, setGeminiKey] = useState('');
  const [firebaseConf, setFirebaseConf] = useState('');

  useEffect(() => {
    setGeminiKey(localStorage.getItem(STORAGE_KEY_GEMINI) || '');
    setFirebaseConf(localStorage.getItem(STORAGE_KEY_CONFIG) ? JSON.stringify(JSON.parse(localStorage.getItem(STORAGE_KEY_CONFIG)), null, 2) : '');
  }, []);

  const handleSave = () => {
    if (geminiKey) localStorage.setItem(STORAGE_KEY_GEMINI, geminiKey);
    if (firebaseConf) {
      try {
        JSON.parse(firebaseConf); // Validate JSON
        localStorage.setItem(STORAGE_KEY_CONFIG, firebaseConf);
      } catch (e) {
        alert("Invalid Firebase JSON");
        return;
      }
    }
    alert("Configuration Saved! Reload the app to use new keys.");
    window.location.reload();
  };

  const handleClear = () => {
    localStorage.removeItem(STORAGE_KEY_GEMINI);
    localStorage.removeItem(STORAGE_KEY_CONFIG);
    alert("Keys cleared.");
    window.location.reload();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3"><SettingsIcon className="text-teal-600"/> Configuration</h2>
        <p className="text-slate-500 mt-1">
           For GitHub hosting: Enter your credentials here. They are saved to your browser's LocalStorage, keeping your GitHub repo clean and secure.
        </p>
      </div>

      <div className="space-y-6">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label className="flex items-center gap-2 font-bold text-slate-700 mb-2"><UploadCloud size={18}/> Firebase Config (JSON)</label>
            <textarea 
               rows={6}
               placeholder='{ "apiKey": "...", "authDomain": "..." }'
               value={firebaseConf}
               onChange={e => setFirebaseConf(e.target.value)}
               className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs outline-none focus:ring-2 focus:ring-teal-500"
            />
         </div>

         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label className="flex items-center gap-2 font-bold text-slate-700 mb-2"><FileJson size={18}/> Gemini API Key</label>
            <input 
               type="password"
               placeholder="AIzSy..."
               value={geminiKey}
               onChange={e => setGeminiKey(e.target.value)}
               className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500"
            />
         </div>

         <div className="flex gap-4">
            <button onClick={handleSave} className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-colors flex justify-center items-center gap-2">
              <Save size={18}/> Save to LocalStorage
            </button>
            <button onClick={handleClear} className="px-6 py-3 text-rose-500 font-bold bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors">
              Reset Keys
            </button>
         </div>
      </div>
    </div>
  );
}
