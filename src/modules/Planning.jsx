import React, { useState } from 'react';
import { X } from 'lucide-react';
import { formatCurrency, STORAGE_KEY_CURRENCY } from '../utils/helpers';
import { db } from '../services/firebase';
import { addDoc, collection, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const APP_ID = 'default-app-id';

export default function Planning({ budgets, goals, transactions, userId }) {
  const [tab, setTab] = useState('budgets');
  const baseCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY) || 'GBP';
  
  return (
    <div className="space-y-6 animate-in fade-in">
       <div className="flex bg-white p-1 rounded-xl border border-slate-100 w-fit">
          <button onClick={() => setTab('budgets')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'budgets' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Budgets</button>
          <button onClick={() => setTab('goals')} className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${tab === 'goals' ? 'bg-slate-900 text-white' : 'text-slate-500'}`}>Savings Goals</button>
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
     if (existing) {
       await updateDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'budgets', existing.id), { limit: parseFloat(form.limit) });
     } else {
       await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'budgets'), { ...form, limit: parseFloat(form.limit) });
     }
     setForm({ category: 'Groceries', limit: '' });
  };

  return (
     <div className="space-y-6">
        <form onSubmit={handleSet} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-end gap-4">
           <div className="flex-1">
             <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
             <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none">
                {['Groceries', 'Transport', 'Utilities', 'Dining', 'Shopping', 'Bills', 'Health', 'Entertainment'].map(c => <option key={c}>{c}</option>)}
             </select>
           </div>
           <div className="flex-1">
             <label className="text-xs font-bold text-slate-400 uppercase">Monthly Limit ({baseCurrency})</label>
             <input type="number" value={form.limit} onChange={e => setForm({...form, limit: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none" />
           </div>
           <button className="bg-teal-600 text-white px-6 py-2 rounded-lg font-bold h-10">Set Budget</button>
        </form>

        <div className="grid md:grid-cols-2 gap-4">
           {budgets.map(b => {
              const spent = transactions
                .filter(t => t.type === 'expense' && t.category === b.category && new Date(t.date).getMonth() === currentMonth)
                .reduce((s, t) => s + t.amount, 0);
              const pct = Math.min((spent / b.limit) * 100, 100);
              const isOver = spent > b.limit;
              
              return (
                 <div key={b.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                    <div className="flex justify-between mb-2">
                       <span className="font-bold text-slate-800">{b.category}</span>
                       <span className={`font-bold text-sm ${isOver ? 'text-rose-500' : 'text-slate-500'}`}>{formatCurrency(spent, baseCurrency)} / {formatCurrency(b.limit, baseCurrency)}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className={`h-full rounded-full ${isOver ? 'bg-rose-500' : 'bg-teal-500'}`} style={{ width: `${pct}%` }}></div>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 text-right">{isOver ? 'Over Limit' : `${(100-pct).toFixed(0)}% Left`}</p>
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
     await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'goals'), {
        ...form, target: parseFloat(form.target), savedAmount: parseFloat(form.savedAmount || 0), createdAt: serverTimestamp()
     });
     setForm({ name: '', target: '', savedAmount: '' });
   };

   const deleteGoal = async (id) => await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'goals', id));

   return (
      <div className="space-y-6">
         <form onSubmit={handleAdd} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[200px]"><label className="text-xs font-bold text-slate-400 uppercase">Goal Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none" /></div>
            <div className="w-32"><label className="text-xs font-bold text-slate-400 uppercase">Target ({baseCurrency})</label><input type="number" value={form.target} onChange={e => setForm({...form, target: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none" /></div>
            <div className="w-32"><label className="text-xs font-bold text-slate-400 uppercase">Saved ({baseCurrency})</label><input type="number" value={form.savedAmount} onChange={e => setForm({...form, savedAmount: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none" /></div>
            <button className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold h-10">Add Goal</button>
         </form>

         <div className="grid md:grid-cols-2 gap-4">
            {goals.map(g => {
               const pct = Math.min((g.savedAmount / g.target) * 100, 100);
               return (
                  <div key={g.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative">
                     <div className="flex justify-between mb-4">
                        <div><h3 className="font-bold text-lg">{g.name}</h3><p className="text-xs text-slate-500">{formatCurrency(g.savedAmount, baseCurrency)} of {formatCurrency(g.target, baseCurrency)}</p></div>
                        <button onClick={() => deleteGoal(g.id)} className="text-slate-300 hover:text-rose-500"><X size={18} /></button>
                     </div>
                     <div className="h-4 bg-slate-100 rounded-full overflow-hidden mb-2">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">{pct.toFixed(0)}%</span>
                        <button onClick={async () => {
                           const amt = prompt("Amount to add to savings:");
                           if(amt) await updateDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'goals', g.id), { savedAmount: g.savedAmount + parseFloat(amt) });
                        }} className="text-xs font-bold text-slate-500 hover:text-indigo-600">+ Add Funds</button>
                     </div>
                  </div>
               )
            })}
         </div>
      </div>
   );
}
