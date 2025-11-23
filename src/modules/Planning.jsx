import React, { useState } from 'react';
import { X, Target, PieChart } from 'lucide-react';
import { formatCurrency, STORAGE_KEY_CURRENCY } from '../utils/helpers';
import { db } from '../services/firebase';
import { addDoc, collection, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const APP_ID = 'default-app-id';

export default function Planning({ budgets, goals, transactions, userId }) {
  const [tab, setTab] = useState('budgets');
  const baseCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY) || 'GBP';
  
  return (
    <div className="space-y-4 animate-in fade-in max-w-4xl mx-auto">
       <div className="flex bg-slate-100 p-1 rounded-lg w-fit mx-auto md:mx-0">
          <button onClick={() => setTab('budgets')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${tab === 'budgets' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}><PieChart size={14}/> Budgets</button>
          <button onClick={() => setTab('goals')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-colors flex items-center gap-1.5 ${tab === 'goals' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}><Target size={14}/> Goals</button>
       </div>
       {tab === 'budgets' 
         ? <BudgetSection budgets={budgets} transactions={transactions} userId={userId} baseCurrency={baseCurrency} /> 
         : <GoalSection goals={goals} userId={userId} baseCurrency={baseCurrency} />
       }
    </div>
  );
}

function BudgetSection({ budgets, transactions, userId, baseCurrency }) {
  const [form, setForm] = useState({ category: 'Groceries', limit: '' });
  const currentMonth = new Date().getMonth();

  const handleSet = async (e) => {
     e.preventDefault();
     const existing = budgets.find(b => b.category === form.category);
     if (existing) await updateDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'budgets', existing.id), { limit: parseFloat(form.limit) });
     else await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'budgets'), { ...form, limit: parseFloat(form.limit) });
     setForm({ category: 'Groceries', limit: '' });
  };

  return (
     <div className="space-y-4">
        <form onSubmit={handleSet} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex items-end gap-3">
           <div className="flex-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Category</label>
             <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs text-slate-700 font-medium">
                {['Groceries', 'Transport', 'Utilities', 'Dining', 'Shopping', 'Bills', 'Health', 'Entertainment'].map(c => <option key={c}>{c}</option>)}
             </select>
           </div>
           <div className="flex-1">
             <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Limit ({baseCurrency})</label>
             <input type="number" value={form.limit} onChange={e => setForm({...form, limit: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs font-bold" />
           </div>
           <button className="bg-teal-600 text-white px-4 py-2 rounded-lg font-bold text-xs h-[34px]">Set</button>
        </form>

        <div className="grid md:grid-cols-2 gap-3">
           {budgets.map(b => {
              const spent = transactions.filter(t => t.type === 'expense' && t.category === b.category && new Date(t.date).getMonth() === currentMonth).reduce((s, t) => s + t.amount, 0);
              const pct = Math.min((spent / b.limit) * 100, 100);
              const isOver = spent > b.limit;
              return (
                 <div key={b.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex justify-between mb-1.5">
                       <span className="font-bold text-slate-700 text-sm">{b.category}</span>
                       <span className={`font-bold text-xs ${isOver ? 'text-rose-500' : 'text-slate-500'}`}>{formatCurrency(spent, baseCurrency)} / {formatCurrency(b.limit, baseCurrency)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div className={`h-full rounded-full ${isOver ? 'bg-rose-500' : 'bg-teal-500'}`} style={{ width: `${pct}%` }}></div>
                    </div>
                 </div>
              );
           })}
        </div>
     </div>
  );
}

function GoalSection({ goals, userId, baseCurrency }) {
   const [form, setForm] = useState({ name: '', target: '', savedAmount: '' });

   const handleAdd = async (e) => {
     e.preventDefault();
     await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'goals'), { ...form, target: parseFloat(form.target), savedAmount: parseFloat(form.savedAmount || 0), createdAt: serverTimestamp() });
     setForm({ name: '', target: '', savedAmount: '' });
   };

   const deleteGoal = async (id) => await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'goals', id));

   return (
      <div className="space-y-4">
         <form onSubmit={handleAdd} className="bg-white p-3 rounded-xl shadow-sm border border-slate-200 flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[150px]"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs" /></div>
            <div className="w-24"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Target</label><input type="number" value={form.target} onChange={e => setForm({...form, target: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs" /></div>
            <div className="w-24"><label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Saved</label><input type="number" value={form.savedAmount} onChange={e => setForm({...form, savedAmount: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs" /></div>
            <button className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs h-[34px]">Add</button>
         </form>

         <div className="grid md:grid-cols-2 gap-3">
            {goals.map(g => {
               const pct = Math.min((g.savedAmount / g.target) * 100, 100);
               return (
                  <div key={g.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative group">
                     <div className="flex justify-between mb-3">
                        <div><h3 className="font-bold text-sm text-slate-800">{g.name}</h3><p className="text-[10px] text-slate-500">{formatCurrency(g.savedAmount, baseCurrency)} of {formatCurrency(g.target, baseCurrency)}</p></div>
                        <button onClick={() => deleteGoal(g.id)} className="text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                     </div>
                     <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">{pct.toFixed(0)}%</span>
                        <button onClick={async () => {
                           const amt = prompt("Add funds:");
                           if(amt) await updateDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'goals', g.id), { savedAmount: g.savedAmount + parseFloat(amt) });
                        }} className="text-[10px] font-bold text-slate-500 hover:text-indigo-600">+ Funds</button>
                     </div>
                  </div>
               )
            })}
         </div>
      </div>
   );
}


