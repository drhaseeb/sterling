import React, { useState } from 'react';
import { Plus, Filter, ArrowUpRight, ArrowDownLeft, X, Loader2 } from 'lucide-react';
import { formatCurrency, STORAGE_KEY_CURRENCY, ALL_CURRENCIES } from '../utils/helpers';
import { db } from '../services/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { getExchangeRates } from '../services/finance';

const APP_ID = 'default-app-id'; 
const EXPENSE_CATS = ['Groceries', 'Transport', 'Utilities', 'Dining', 'Shopping', 'Housing', 'Health', 'Entertainment', 'Education', 'Travel', 'Personal Care', 'Subscriptions', 'Misc'];
const INCOME_CATS = ['Salary', 'Freelance', 'Business', 'Dividends', 'Interest', 'Gift', 'Refund', 'Rental', 'Sold Asset', 'Other'];

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
    <div className="space-y-4 animate-in fade-in max-w-4xl mx-auto">
      <div className="flex justify-between items-end px-1">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Wallet</h2>
          <p className="text-xs text-slate-500 font-medium">Base: {baseCurrency}</p>
        </div>
        <button onClick={() => setShowAdd(true)} className="bg-teal-600 text-white px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 hover:bg-teal-700 transition-colors shadow-sm">
          <Plus size={14} /> Add
        </button>
      </div>

      <div className="bg-white p-2 rounded-xl border border-slate-200 flex gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 px-2 text-slate-400 border-r border-slate-100 flex-shrink-0"><Filter size={14}/><span className="text-[10px] font-bold uppercase tracking-wide">Filter</span></div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="bg-slate-50 rounded-lg px-2 py-1 text-xs font-medium outline-none text-slate-600 min-w-[80px]">
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterTime} onChange={e => setFilterTime(e.target.value)} className="bg-slate-50 rounded-lg px-2 py-1 text-xs font-medium outline-none text-slate-600 min-w-[80px]">
          <option value="all">All Time</option>
          <option value="month">This Month</option>
          <option value="year">This Year</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filtered.length === 0 ? <div className="p-8 text-center text-slate-400 text-xs">No transactions found.</div> : 
        filtered.map(tx => (
          <div key={tx.id} className="flex items-center justify-between p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors group last:border-0">
             <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${tx.type === 'income' ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}>
                  {tx.type === 'income' ? <ArrowUpRight size={14}/> : <ArrowDownLeft size={14}/>}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-semibold text-slate-800 text-xs truncate max-w-[120px] sm:max-w-xs">{tx.merchant || 'Unknown'}</p>
                    {tx.originalCurrency && tx.originalCurrency !== baseCurrency && (
                      <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded font-mono">
                        {formatCurrency(tx.originalAmount, tx.originalCurrency)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400">{new Date(tx.date).toLocaleDateString()} • {tx.category}</p>
                </div>
             </div>
             <div className="text-right flex-shrink-0">
               <p className={`font-bold text-sm ${tx.type === 'income' ? 'text-teal-600' : 'text-slate-800'}`}>
                 {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, baseCurrency)}
               </p>
               <button onClick={() => deleteTx(tx.id)} className="text-[9px] text-rose-400 opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity">Delete</button>
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
  const [form, setForm] = useState({ type: 'expense', amount: '', currency: baseCurrency, merchant: '', category: 'Groceries', date: new Date().toISOString().split('T')[0], taxDeductible: false });

  const setType = (type) => {
      setForm({ ...form, type, category: type === 'expense' ? EXPENSE_CATS[0] : INCOME_CATS[0] });
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    let finalAmount = parseFloat(form.amount);
    let exchangeRate = 1;

    if (form.currency !== baseCurrency) {
      try {
        const rates = await getExchangeRates(baseCurrency); 
        if (rates && rates[form.currency]) {
          exchangeRate = rates[form.currency];
          finalAmount = parseFloat(form.amount) / exchangeRate; 
        }
      } catch (err) { alert("Rate fetch failed."); }
    }

    await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'transactions'), {
      ...form, originalAmount: parseFloat(form.amount), originalCurrency: form.currency, amount: finalAmount, exchangeRateUsed: exchangeRate, createdAt: serverTimestamp()
    });
    setLoading(false); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-5 animate-in zoom-in-95">
        <div className="flex justify-between mb-4 items-center">
          <h3 className="font-bold text-base text-slate-800">New Transaction</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600"/></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button type="button" onClick={() => setType('expense')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${form.type === 'expense' ? 'bg-white shadow text-slate-800' : 'text-slate-400'}`}>Expense</button>
            <button type="button" onClick={() => setType('income')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${form.type === 'income' ? 'bg-white shadow text-teal-600' : 'text-slate-400'}`}>Income</button>
          </div>
          
          <div className="grid grid-cols-3 gap-2">
             <div className="col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Amount</label>
                <input type="number" step="any" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full bg-slate-50 p-2.5 rounded-lg outline-none font-bold text-slate-800 text-sm border border-transparent focus:bg-white focus:border-slate-200 transition-colors" placeholder="0.00" />
             </div>
             <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Currency</label>
                <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-slate-50 p-2.5 rounded-lg outline-none font-bold text-xs border border-transparent focus:bg-white focus:border-slate-200">
                  {ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
             <input type="date" required value={form.date} onChange={e => setForm({...form, date: e.target.value})} className="bg-slate-50 p-2.5 rounded-lg outline-none text-xs font-medium text-slate-600" />
             <input type="text" placeholder={form.type === 'income' ? "Source" : "Merchant"} required value={form.merchant} onChange={e => setForm({...form, merchant: e.target.value})} className="bg-slate-50 p-2.5 rounded-lg outline-none text-xs font-medium" />
          </div>
          
          <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-slate-50 p-2.5 rounded-lg outline-none text-xs font-medium text-slate-600">
            {(form.type === 'expense' ? EXPENSE_CATS : INCOME_CATS).map(c => <option key={c}>{c}</option>)}
          </select>

          {form.type === 'expense' && (
             <label className="flex items-center gap-2 text-xs font-medium text-slate-500 px-1">
               <input type="checkbox" checked={form.taxDeductible} onChange={e => setForm({...form, taxDeductible: e.target.checked})} className="rounded text-teal-600 focus:ring-teal-500"/>
               Tax Deductible
             </label>
          )}

          <button disabled={loading} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold text-sm shadow-md hover:bg-slate-800 transition-all flex justify-center items-center gap-2">
            {loading ? <Loader2 className="animate-spin" size={16} /> : "Save"}
          </button>
        </form>
      </div>
    </div>
  );
}
