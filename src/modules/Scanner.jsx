import React, { useState } from 'react';
import { ScanLine, Loader2, Check, AlertCircle, UploadCloud, RefreshCcw, X } from 'lucide-react';
import { callGeminiVision } from '../services/ai';
import { db } from '../services/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const APP_ID = 'default-app-id';

export default function Scanner({ userId, onComplete }) {
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if(file) {
      setError('');
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result); // For display
        // Extract base64 (remove "data:image/jpeg;base64," prefix)
        const base64 = reader.result.split(',')[1];
        setImage(base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if(!image) return;
    setLoading(true);
    setError('');
    
    try {
      const data = await callGeminiVision(image);
      
      // Validate data structure
      if (!data || typeof data.amount !== 'number') {
        throw new Error("AI could not read the price. Please try again.");
      }
      
      setResult(data);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to analyze receipt.");
    } finally {
      setLoading(false);
    }
  };

  const saveResult = async () => {
    if(!result) return;
    setLoading(true);
    
    try {
      await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'transactions'), {
        merchant: result.merchant || "Unknown",
        amount: parseFloat(result.amount) || 0,
        // Ensure date is YYYY-MM-DD, fallback to today
        date: result.date && result.date.length === 10 ? result.date : new Date().toISOString().split('T')[0],
        category: result.category || 'Uncategorized',
        taxDeductible: result.taxDeductible || false,
        type: 'expense',
        // Add original scan data for reference
        scannedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      onComplete(); // Switch back to Wallet
    } catch (err) {
      setError("Could not save to database.");
      setLoading(false);
    }
  };

  const reset = () => {
    setImage(null);
    setPreview(null);
    setResult(null);
    setError('');
  };

  return (
    <div className="max-w-md mx-auto animate-in fade-in space-y-6 p-2">
       
       {/* Header */}
       <div>
         <h2 className="text-xl font-bold text-slate-900">AI Receipt Scanner</h2>
         <p className="text-xs text-slate-500">Upload a receipt to auto-fill details.</p>
       </div>

       {/* Error Banner */}
       {error && (
         <div className="bg-rose-50 p-3 rounded-xl flex items-center gap-2 text-rose-600 text-xs font-bold">
           <AlertCircle size={16} /> {error}
         </div>
       )}

       {/* STEP 1: UPLOAD (Showing if no result yet) */}
       {!result && (
         <div className="space-y-4">
            {/* Image Preview Area */}
            <div className="relative bg-slate-100 rounded-2xl overflow-hidden border-2 border-dashed border-slate-300 min-h-[250px] flex flex-col items-center justify-center">
               {preview ? (
                 <>
                   <img src={preview} alt="Receipt" className="w-full h-full object-contain max-h-[400px]" />
                   <button onClick={reset} className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70">
                     <X size={16} />
                   </button>
                 </>
               ) : (
                 <label className="cursor-pointer flex flex-col items-center justify-center w-full h-full p-10 hover:bg-slate-50 transition-colors">
                    <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center mb-3 text-teal-600">
                      <UploadCloud size={28} />
                    </div>
                    <span className="text-sm font-bold text-slate-600">Tap to Upload Receipt</span>
                    <span className="text-[10px] text-slate-400 mt-1">Supports JPG, PNG</span>
                    {/* Hidden Native Input */}
                    <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
                 </label>
               )}
            </div>

            {/* Action Button */}
            <button 
              onClick={processImage} 
              disabled={!image || loading} 
              className="w-full bg-teal-600 text-white py-3.5 rounded-xl font-bold text-sm shadow-lg shadow-teal-600/20 flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
               {loading ? <><Loader2 className="animate-spin" size={18} /> Analyzing...</> : <><ScanLine size={18} /> Extract Data</>}
            </button>
         </div>
       )}

       {/* STEP 2: CONFIRMATION (Showing if Result exists) */}
       {result && (
         <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-lg animate-in zoom-in-95">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-4">
               <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Check size={16} /></div>
               <h3 className="font-bold text-slate-900 text-sm">Scan Successful</h3>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
               <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Merchant</label>
                 <input value={result.merchant} onChange={e => setResult({...result, merchant: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg text-sm font-bold text-slate-800 outline-none" />
               </div>
               <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Total</label>
                 <input type="number" value={result.amount} onChange={e => setResult({...result, amount: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg text-sm font-bold text-slate-800 outline-none" />
               </div>
               <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Date</label>
                 <input type="date" value={result.date} onChange={e => setResult({...result, date: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg text-xs font-medium text-slate-600 outline-none" />
               </div>
               <div>
                 <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                 <input value={result.category} onChange={e => setResult({...result, category: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg text-xs font-medium text-slate-600 outline-none" />
               </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg mb-4">
               <input type="checkbox" checked={result.taxDeductible} onChange={e => setResult({...result, taxDeductible: e.target.checked})} className="rounded text-teal-600 focus:ring-teal-500 w-4 h-4" />
               <span className="text-xs font-bold text-slate-600">Tax Deductible?</span>
            </div>

            <div className="flex gap-3">
               <button onClick={reset} className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors">Retake</button>
               <button onClick={saveResult} disabled={loading} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold text-xs shadow-md hover:bg-slate-800 transition-colors flex justify-center items-center gap-2">
                 {loading ? <Loader2 className="animate-spin" size={14}/> : "Confirm & Save"}
               </button>
            </div>
         </div>
       )}
    </div>
  );
}
