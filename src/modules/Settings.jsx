import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, UploadCloud, FileJson, TrendingUp, AlertCircle, Check, LogOut } from 'lucide-react'; // Added TrendingUp
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { STORAGE_KEY_CONFIG, STORAGE_KEY_GEMINI, STORAGE_KEY_FINNHUB, parseFirebaseConfig } from '../utils/helpers'; // Added FINNHUB key

export default function Settings() {
  const [geminiKey, setGeminiKey] = useState('');
  const [finnhubKey, setFinnhubKey] = useState(''); // NEW state
  const [firebaseConf, setFirebaseConf] = useState('');
  const [status, setStatus] = useState({ type: '', msg: '' });

  useEffect(() => {
    setGeminiKey(localStorage.getItem(STORAGE_KEY_GEMINI) || '');
    setFinnhubKey(localStorage.getItem(STORAGE_KEY_FINNHUB) || ''); // Load key
    const storedConfig = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (storedConfig) {
       setFirebaseConf(JSON.stringify(JSON.parse(storedConfig), null, 2));
    }
  }, []);

  const handleSave = () => {
    setStatus({ type: '', msg: '' });
    if (geminiKey.trim()) localStorage.setItem(STORAGE_KEY_GEMINI, geminiKey.trim());
    if (finnhubKey.trim()) localStorage.setItem(STORAGE_KEY_FINNHUB, finnhubKey.trim()); // Save key

    if (firebaseConf.trim()) {
      const parsed = parseFirebaseConfig(firebaseConf);
      if (!parsed || !parsed.apiKey || !parsed.projectId) {
        setStatus({ type: 'error', msg: 'Invalid Firebase Config.' });
        return;
      }
      localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(parsed));
      setStatus({ type: 'success', msg: 'Configuration Saved! Reloading...' });
      setTimeout(() => window.location.reload(), 1500);
    } else {
      setStatus({ type: 'error', msg: 'Firebase Config cannot be empty.' });
    }
  };

  // ... keep handleSignOut and handleClear ...
  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      window.location.reload(); 
    }
  };

  const handleClear = () => {
    if(confirm("Are you sure? This will wipe your keys.")) {
      localStorage.removeItem(STORAGE_KEY_GEMINI);
      localStorage.removeItem(STORAGE_KEY_CONFIG);
      localStorage.removeItem(STORAGE_KEY_FINNHUB);
      alert("Keys cleared.");
      window.location.reload();
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in">
      {/* ... Header ... */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3"><SettingsIcon className="text-teal-600"/> Configuration</h2>
        <p className="text-slate-500 mt-1">Manage your keys and account.</p>
      </div>

      <div className="space-y-6">
         {/* Firebase Config */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label className="flex items-center gap-2 font-bold text-slate-700 mb-2"><UploadCloud size={18}/> Firebase Config</label>
            <textarea 
               rows={6}
               placeholder={`const firebaseConfig = {\n  apiKey: "..."\n};`}
               value={firebaseConf}
               onChange={e => setFirebaseConf(e.target.value)}
               className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 font-mono text-xs outline-none focus:ring-2 focus:ring-teal-500 whitespace-pre"
            />
         </div>

         {/* Gemini Key */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label className="flex items-center gap-2 font-bold text-slate-700 mb-2"><FileJson size={18}/> Gemini API Key (for Receipts)</label>
            <input type="password" value={geminiKey} onChange={e => setGeminiKey(e.target.value)} className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500" />
         </div>

         {/* NEW: Finnhub Key */}
         <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <label className="flex items-center gap-2 font-bold text-slate-700 mb-2"><TrendingUp size={18}/> Finnhub API Key (for Stocks)</label>
            <input 
              type="password" 
              value={finnhubKey} 
              onChange={e => setFinnhubKey(e.target.value)} 
              placeholder="Get free key from finnhub.io"
              className="w-full bg-slate-50 p-4 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-teal-500" 
            />
            <p className="text-xs text-slate-400 mt-2">Required for automatic stock/ETF tracking.</p>
         </div>

         {/* ... Status and Buttons (Keep existing) ... */}
          {status.msg && (
            <div className={`p-4 rounded-xl flex items-center gap-2 font-bold ${status.type === 'error' ? 'bg-rose-50 text-rose-600' : 'bg-green-50 text-green-600'}`}>
               {status.type === 'error' ? <AlertCircle size={20}/> : <Check size={20}/>} {status.msg}
            </div>
         )}

         <div className="flex gap-4">
            <button onClick={handleSave} className="flex-1 bg-teal-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-teal-700 transition-colors flex justify-center items-center gap-2">
              <Save size={18}/> Save & Reload
            </button>
         </div>

         <div className="pt-6 border-t border-slate-200 flex justify-between">
            <button onClick={handleSignOut} className="text-slate-600 font-bold flex items-center gap-2 hover:text-slate-900">
              <LogOut size={18}/> Sign Out
            </button>
            <button onClick={handleClear} className="text-rose-500 font-bold hover:text-rose-700">
              Reset Keys
            </button>
         </div>
      </div>
    </div>
  );
}
