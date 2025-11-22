import React, { useState, useEffect } from 'react';
import { Plus, Filter, ArrowUpRight, ArrowDownLeft, X, Globe, Loader2 } from 'lucide-react';
import { formatCurrency, STORAGE_KEY_CURRENCY } from '../utils/helpers';
import { db } from '../services/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getExchangeRates } from '../services/finance';

const APP_ID = 'default-app-id'; 

export default function Wallet({ transactions, userId }) {
  const [showAdd, setShowAdd] = useState(false);
  const [filterCat, setFilterCat] = useState('All');
  const [filterTime, setFilterTime] = useState('all');
  const baseCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY) || 'GBP';

  const categories = ['All', ...new Set(transactions.map(t => t.category))];
  const filtered = transactions.filter(t => {
    const matchCat = filterCat === 'All' || t.category === filterCat;
    const date = new Date(t.date);
    const now = new Date();
    const matchTime = filterTime === 'all' ? true :
                      filterTime === 'month' ? date.getMonth() === now.getMonth() :
                      date.getFullYear() === now.getFullYear();
    return matchCat && matchTime;
  });

  const deleteTx = async (id) => {
    if(confirm('Delete transaction?')) await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'transactions', id));
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Wallet</h2>
          <p className="text-xs text-slate-500">Base Currency: {baseCurrency}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-teal-600 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-teal-700 transition-colors shadow-lg shadow-teal-600/20">
          <Plus size={18} /> Add Entry
        </button>
      </div>

      <div className="bg-white p-3 rounded-xl border border-slate-200 flex gap-3 overflow-x-auto">
        <div className="flex items-center gap-2 px-3 text-slate-400 border-r border-slate-100"><Filter size={16}/><span className="text-xs font-bold uppercase">Filter</span></div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-slate-50 rounded-lg px-3 py-1 text-sm font-medium outline-none">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterTime} onChange={e => setFilterTime(e.target.value)} className="bg-slate-50 rounded-lg px-3 py-1 text-sm font-medium outline-none">
          <option value="all">All Time</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? <div className="p-12 text-center text-slate-400">No transactions found.</div> : 
        filtered.map(tx => (
          <div key={tx.id} className="flex items-center justify-between p-5 border-b border-slate-50 hover:bg-slate-50 transition-colors group">
             <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-teal-100 text-teal-600' : 'bg-slate-100 text-slate-500'}`}>
                  {tx.type === 'income' ? <ArrowUpRight size={20}/> : <ArrowDownLeft size={20}/>}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900">{tx.merchant || 'Unknown'}</p>
                    {tx.originalCurrency && tx.originalCurrency !== baseCurrency && (
                      <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 rounded font-bold">
                        {formatCurrency(tx.originalAmount, tx.originalCurrency)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()} • {tx.category}</p>
                </div>
             </div>
             <div className="text-right">
               {/* We show the Converted Amount in Base Currency here for consistency */}
               <p className={`font-bold ${tx.type === 'income' ? 'text-teal-600' : 'text-slate-900'}`}>
                 {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, baseCurrency)}
               </p>
               <button onClick={() => deleteTx(tx.id)} className="text-[10px] text-rose-500 opacity-0 group-hover:opacity-100">Delete</button>
             </div>
          </div>
        ))}
      </div>

      {showAdd && <AddTransactionModal userId={userId} onClose={() => setShowAdd(false)} baseCurrency={baseCurrency} />}
    </div>
  );
}

function AddTransactionModal({ userId, onClose, baseCurrency }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ 
    type: 'expense', 
    amount: '', 
    currency: baseCurrency, 
    merchant: '', 
    category: 'Groceries', 
    date: new Date().toISOString().split('T')[0], 
    taxDeductible: false 
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    let finalAmount = parseFloat(form.amount);
    let exchangeRate = 1;

    // If user selected a different currency, convert it to Base Currency
    if (form.currency !== baseCurrency) {
      try {
        const rates = await getExchangeRates(baseCurrency); // Get rates where Base = 1
        // rates[form.currency] gives us how much 1 Base equals in Foreign
        // So Foreign / Rate = Base
        // Example: Base GBP. Spent 100 USD. Rate GBP->USD is 1.25. 
        // 100 / 1.25 = 80 GBP.
        if (rates && rates[form.currency]) {
          exchangeRate = rates[form.currency];
          finalAmount = parseFloat(form.amount) / exchangeRate; 
        }
      } catch (err) {
        console.error("Conversion failed", err);
        alert("Could not fetch exchange rate. Saving as is.");
      }
    }

    await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'transactions'), {
      ...form, 
      originalAmount: parseFloat(form.amount),
      originalCurrency: form.currency,
      amount: finalAmount, // Normalized to Base Currency
      exchangeRateUsed: exchangeRate,
      createdAt: serverTimestamp()
    });
    
    setLoading(false);
    onClose();
  };

  const currencies = ['GBP', 'USD', 'EUR', 'JPY', 'AUD', 'CAD', 'CNY'];

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-6 animate-in zoom-in-95">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">Add Entry</h3>
          <button onClick={onClose}><X className="text-slate-400"/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {['expense', 'income'].map(t => (
              <button type="button" key={t} onClick={() => setForm({...form, type: t})} className={`flex-1 py-2 capitalize rounded-lg text-sm font-bold ${form.type === t ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'}`}>{t}</button>
            ))}
          </div>
          
          <div className="grid grid-cols-3 gap-3">
             <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Amount</label>
                <input type="number" step="any" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold text-lg" />
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Currency</label>
                <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold">
                  {currencies.map(c => <option key={c}>{c}</option>)}
                </select>
             </div>
          </div>

          <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
          <input type="text" placeholder={form.type === 'income' ? "Source" : "Merchant"} required value={form.merchant} onChange={e => setForm({...form, merchant: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
          
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none">
            {['Groceries', 'Transport', 'Utilities', 'Dining', 'Shopping', 'Salary', 'Freelance', 'Bills', 'Health', 'Entertainment'].map(c => <option key={c}>{c}</option>)}
          </select>

          {form.type === 'expense' && (
             <label className="flex items-center gap-2 text-sm font-medium text-slate-600 p-2">
               <input type="checkbox" checked={form.taxDeductible} onChange={e => setForm({...form, taxDeductible: e.target.checked})} className="rounded text-teal-600 focus:ring-teal-500"/>
               Is this Tax Deductible?
             </label>
          )}

          <button disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2">
            {loading ? <Loader2 className="animate-spin" /> : "Save Transaction"}
          </button>
        </form>
      </div>
    </div>
  );
}
