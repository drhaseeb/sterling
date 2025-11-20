import React, { useState } from 'react';
import { TrendingUp, PiggyBank } from 'lucide-react';
import { formatGBP } from '../utils/helpers';
import { db } from '../services/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';

const APP_ID = 'default-app-id';

export default function Wealth({ investments, userId }) {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Index Fund', currentValue: '', interestRate: '' });

  const handleAdd = async (e) => {
    e.preventDefault();
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'investments'), {
      ...form, currentValue: parseFloat(form.currentValue), interestRate: parseFloat(form.interestRate || 0), updatedAt: serverTimestamp()
    });
    setShowAdd(false);
    setForm({ name: '', type: 'Index Fund', currentValue: '', interestRate: '' });
  };

  const deleteInv = async (id) => await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'investments', id));
  const totalWealth = investments.reduce((s, i) => s + (i.currentValue || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in">
       <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
         <div className="relative z-10">
            <p className="text-indigo-200 mb-1 font-medium">Total Invested Assets</p>
            <h2 className="text-4xl font-bold">{formatGBP(totalWealth)}</h2>
            <div className="mt-6">
               <button onClick={() => setShowAdd(true)} className="bg-white text-indigo-900 px-5 py-2 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors">+ Add Asset</button>
            </div>
         </div>
       </div>

       {showAdd && (
         <form onSubmit={handleAdd} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-lg animate-in slide-in-from-top-2">
            <h3 className="font-bold mb-4">New Asset</h3>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input placeholder="Asset Name (e.g. S&P 500)" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="bg-slate-50 p-3 rounded-xl outline-none" />
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="bg-slate-50 p-3 rounded-xl outline-none">
                {['Index Fund', 'Savings Account', 'Stock', 'Crypto', 'Real Estate', 'Pension', 'ISA'].map(t => <option key={t}>{t}</option>)}
              </select>
              <input type="number" placeholder="Current Value (£)" required value={form.currentValue} onChange={e => setForm({...form, currentValue: e.target.value})} className="bg-slate-50 p-3 rounded-xl outline-none" />
              <input type="number" placeholder="Interest / APY (%)" value={form.interestRate} onChange={e => setForm({...form, interestRate: e.target.value})} className="bg-slate-50 p-3 rounded-xl outline-none" />
            </div>
            <div className="flex gap-3">
               <button type="button" onClick={() => setShowAdd(false)} className="flex-1 py-3 text-slate-500 font-bold">Cancel</button>
               <button type="submit" className="flex-1 bg-indigo-600 text-white rounded-xl font-bold">Save Asset</button>
            </div>
         </form>
       )}

       <div className="grid md:grid-cols-2 gap-4">
          {investments.map(inv => (
             <div key={inv.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex justify-between items-center group">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center">
                      {inv.type === 'Savings Account' ? <PiggyBank size={24} /> : <TrendingUp size={24} />}
                   </div>
                   <div>
                      <p className="font-bold text-slate-900">{inv.name}</p>
                      <div className="flex gap-2 text-xs text-slate-500">
                         <span>{inv.type}</span>
                         {inv.interestRate > 0 && <span className="bg-green-100 text-green-700 px-1.5 rounded font-bold">+{inv.interestRate}% APY</span>}
                      </div>
                   </div>
                </div>
                <div className="text-right">
                   <p className="font-bold text-lg">{formatGBP(inv.currentValue)}</p>
                   <button onClick={() => deleteInv(inv.id)} className="text-xs text-rose-500 opacity-0 group-hover:opacity-100">Remove</button>
                </div>
             </div>
          ))}
       </div>
    </div>
  );
}
