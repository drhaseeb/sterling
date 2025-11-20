import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, UploadCloud, FileJson, AlertCircle, Check } from 'lucide-react';
import { STORAGE_KEY_CONFIG, STORAGE_KEY_GEMINI, parseFirebaseConfig } from '../utils/helpers';

export default function Settings() {
  const [geminiKey, setGeminiKey] = useState('');
  const [firebaseConf, setFirebaseConf] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    setGeminiKey(localStorage.getItem(STORAGE_KEY_GEMINI) || '');
    const storedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (storedConfig) {
       // Pretty print the stored JSON for display
       setFirebaseConf(JSON.stringify(JSON.parse(storedConfig), null, 2));
    }
  }, []);

  const handleSave = () => {
    setStatus({ type: '', msg: '' });

    // 1. Save Gemini Key
    if (geminiKey.trim()) {
      localStorage.setItem(STORAGE_KEY_GEMINI, geminiKey.trim());
    }

    // 2. Process Firebase Config
    if (firebaseConf.trim()) {
      const parsed = parseFirebaseConfig(firebaseConf);
      
      if (!parsed || !parsed.apiKey || !parsed.projectId) {
        setStatus({ type: 'error', msg: 'Invalid Firebase Config. Please check the format.' });
        return;
      }

      // Save as strict JSON string
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(parsed));
      setStatus({ type: 'success', msg: 'Configuration Saved! Reloading...' });
      
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setStatus({ type: 'error', msg: 'Firebase Config cannot be empty.' });
    }
  };

  const handleClear = () => {
    if(confirm("Are you sure? This will wipe your keys.")) {
      localStorage.removeItem(STORAGE_KEY_GEMINI);
      localStorage.removeItem(STORAGE_KEY_CONFIG);
      alert("Keys cleared.");
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3"><SettingsIcon className="text-teal-600"/> Configuration</h2>
        <p className="text-slate-500 mt-1">
           Paste your credentials below. They are stored locally in your browser.
        </p>
      </div>

      <div className="space-y-6">
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label className="flex items-center gap-2 font-bold text-slate-700 mb-2"><UploadCloud size={18}/> Firebase Config</label>
            <p className="text-xs text-slate-400 mb-3">
              Paste the full <code>firebaseConfig = &#123; ... &#125;</code> block or just the JSON object.
            </p>
            <textarea 
               rows={8}
               placeholder={`const firebaseConfig = {\n  apiKey: "AIzaSy...",\n  authDomain: "...",\n  projectId: "..."\n};`}
               value={firebaseConf}
               onChange={e => setFirebaseConf(e.target.value)}
               className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs outline-none focus:ring-2 focus:ring-teal-500 whitespace-pre"
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

         {status.msg && (
            <div className={`p-4 rounded-xl flex items-center gap-2 font-bold ${status.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-600'}`}>
               {status.type === 'error' ? <AlertCircle size={20}/> : <Check size={20}/>}
               {status.msg}
            </div>
         )}

         <div className="flex gap-4">
            <button onClick={handleSave} className="flex-1 bg-teal-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-teal-600/20 hover:bg-teal-700 transition-colors flex justify-center items-center gap-2">
              <Save size={18}/> Save & Reload
            </button>
            <button onClick={handleClear} className="px-6 py-4 text-rose-500 font-bold bg-rose-50 rounded-xl hover:bg-rose-100 transition-colors">
              Reset
            </button>
         </div>
      </div>
    </div>
  );
}
