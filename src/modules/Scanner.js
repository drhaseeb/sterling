import React, { useState, useRef } from 'react';
import { ScanLine, Loader2, Check } from 'lucide-react';
import { callGeminiVision } from '../services/ai';
import { db } from '../services/firebase';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';

const APP_ID = 'default-app-id';

export default function Scanner({ userId, onComplete }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if(file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if(!image) return;
    setLoading(true);
    try {
      const base64 = image.split(',')[1];
      const data = await callGeminiVision(base64);
      setResult(data);
    } catch (err) {
      alert("Error analyzing image. " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const saveResult = async () => {
    if(!result) return;
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'transactions'), {
      merchant: result.merchant || "Unknown",
      amount: parseFloat(result.amount) || 0,
      date: result.date || new Date().toISOString().split('T')[0],
      category: result.category || 'Uncategorized',
      taxDeductible: result.taxDeductible || false,
      taxAmount: result.taxAmount || 0,
      type: 'expense',
      createdAt: serverTimestamp()
    });
    onComplete();
  };

  return (
    <div className="max-w-xl mx-auto animate-in slide-in-from-bottom-8">
       <h2 className="text-2xl font-bold mb-6">AI Receipt Scanner</h2>
       
       {!result ? (
         <div className="flex flex-col gap-6">
            <div onClick={() => inputRef.current?.click()} className="border-2 border-dashed border-slate-300 rounded-3xl h-80 flex flex-col items-center justify-center bg-slate-50 cursor-pointer relative overflow-hidden hover:bg-slate-100 transition-colors">
               {image ? <img src={image} alt="Preview" className="absolute inset-0 w-full h-full object-contain p-4" /> : (
                 <>
                   <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm text-teal-600"><ScanLine size={32} /></div>
                   <p className="text-slate-500 font-medium">Tap to Upload Receipt</p>
                 </>
               )}
            </div>
            <input type="file" ref={inputRef} className="hidden" accept="image/*" onChange={handleFile} />
            <button onClick={processImage} disabled={!image || loading} className="bg-teal-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg flex justify-center items-center gap-2 disabled:opacity-50">
               {loading ? <><Loader2 className="animate-spin"/> Processing...</> : "Analyze with AI"}
            </button>
         </div>
       ) : (
         <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-lg space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
               <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Check size={20} /></div>
               <h3 className="font-bold text-slate-900">Scan Complete</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
               <div><label className="text-xs font-bold text-slate-400">Merchant</label><input value={result.merchant} onChange={e => setResult({...result, merchant: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg" /></div>
               <div><label className="text-xs font-bold text-slate-400">Amount (£)</label><input value={result.amount} onChange={e => setResult({...result, amount: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg" /></div>
               <div><label className="text-xs font-bold text-slate-400">Date</label><input value={result.date} onChange={e => setResult({...result, date: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg" /></div>
               <div><label className="text-xs font-bold text-slate-400">Category</label><input value={result.category} onChange={e => setResult({...result, category: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg" /></div>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl">
               <input type="checkbox" checked={result.taxDeductible} onChange={e => setResult({...result, taxDeductible: e.target.checked})} />
               <span className="text-sm font-bold text-slate-700">Tax Deductible Expense</span>
            </div>
            <div className="flex gap-3 pt-2">
               <button onClick={() => { setResult(null); setImage(null); }} className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl font-bold">Retake</button>
               <button onClick={saveResult} className="flex-1 bg-slate-900 text-white py-3 rounded-xl font-bold shadow-lg">Confirm</button>
            </div>
         </div>
       )}
    </div>
  );
}
