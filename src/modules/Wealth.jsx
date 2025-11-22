import React, { useState, useEffect } from 'react';
import { TrendingUp, PiggyBank, Search, Loader2, ArrowUpRight, ArrowDownLeft, RefreshCcw, MoreHorizontal } from 'lucide-react';
import { formatGBP } from '../utils/helpers';
import { db } from '../services/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { searchAssets, getQuote } from '../services/finance';

const APP_ID = 'default-app-id';

export default function Wealth({ investments, userId }) {
  const [showAdd, setShowAdd] = useState(false);
  const [livePrices, setLivePrices] = useState({});
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshPrices();
  }, [investments]);

  const refreshPrices = async () => {
    setRefreshing(true);
    const newPrices = {};
    const symbols = investments.filter(i => i.symbol).map(i => i.symbol);
    
    for (const sym of symbols) {
      try {
        const quote = await getQuote(sym);
        if (quote) newPrices[sym] = quote;
      } catch (e) { console.error(e); }
    }
    setLivePrices(prev => ({ ...prev, ...newPrices }));
    setRefreshing(false);
  };

  const deleteInv = async (id) => {
    if(confirm("Remove this asset?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'investments', id));
  }

  const totalWealth = investments.reduce((sum, inv) => {
    let val = inv.currentValue || 0;
    if (inv.symbol && livePrices[inv.symbol]) {
      val = inv.quantity * livePrices[inv.symbol].price;
    }
    return sum + val;
  }, 0);

  // Calculate Total Portfolio Return
  const totalCostBasis = investments.reduce((sum, inv) => sum + ((inv.costBasis || 0) * (inv.quantity || 0)), 0);
  const totalReturn = totalWealth - totalCostBasis;
  const totalReturnPct = totalCostBasis > 0 ? (totalReturn / totalCostBasis) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in">
       {/* HEADER CARD */}
       <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
         <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-200 mb-1 font-medium">Total Portfolio Value</p>
                <h2 className="text-4xl font-bold">{formatGBP(totalWealth)}</h2>
              </div>
              <button onClick={refreshPrices} disabled={refreshing} className="p-2 bg-indigo-800 rounded-full hover:bg-indigo-700 transition-colors">
                <RefreshCcw size={20} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>

            {/* Total Return Badge */}
            <div className="mt-4 flex items-center gap-3">
               <div className={`px-3 py-1 rounded-lg text-sm font-bold flex items-center gap-1 ${totalReturn >= 0 ? 'bg-green-500/20 text-green-300' : 'bg-rose-500/20 text-rose-300'}`}>
                 {totalReturn >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                 {formatGBP(totalReturn)} ({totalReturnPct.toFixed(2)}%)
               </div>
               <span className="text-xs text-indigo-300">All Time Return</span>
            </div>

            <div className="mt-8">
               <button onClick={() => setShowAdd(true)} className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/50">
                 + Add Asset
               </button>
            </div>
         </div>
       </div>

       {showAdd && <AddAssetModal userId={userId} onClose={() => setShowAdd(false)} />}

       <div className="grid md:grid-cols-2 gap-4">
          {investments.map(inv => {
             const live = livePrices[inv.symbol];
             // If live price exists, use it. Otherwise use manual value.
             const currentPrice = live ? live.price : 0;
             const val = live ? (inv.quantity * currentPrice) : inv.currentValue;
             
             // ROI Logic
             let returnAmt = 0;
             let returnPct = 0;
             const hasCostBasis = inv.costBasis && inv.quantity;
             
             if (hasCostBasis) {
               const totalCost = inv.costBasis * inv.quantity;
               returnAmt = val - totalCost;
               returnPct = (returnAmt / totalCost) * 100;
             }

             return (
               <div key={inv.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 group relative overflow-hidden">
                  
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                          {inv.type === 'Savings Account' ? <PiggyBank size={24} /> : <TrendingUp size={24} />}
                       </div>
                       <div>
                          <p className="font-bold text-slate-900 line-clamp-1 text-lg">{inv.name}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                             <span className="font-bold">{inv.symbol || inv.type}</span>
                             {inv.interestRate > 0 && <span className="bg-green-100 text-green-700 px-1.5 rounded font-bold">+{inv.interestRate}% APY</span>}
                             {hasCostBasis && <span>• Avg Cost: {formatGBP(inv.costBasis)}</span>}
                          </div>
                       </div>
                    </div>
                    <button onClick={() => deleteInv(inv.id)} className="text-slate-300 hover:text-rose-500"><X size={20}/></button>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-50 pt-3">
                     <div>
                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Current Value</p>
                        <p className="font-bold text-xl text-slate-900">{formatGBP(val)}</p>
                     </div>
                     
                     {/* Dynamic ROI Display */}
                     {hasCostBasis && (
                       <div className="text-right">
                         <p className="text-xs text-slate-400 uppercase font-bold mb-1">Return</p>
                         <div className={`font-bold flex items-center justify-end gap-1 ${returnAmt >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                           {returnAmt >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                           {returnPct.toFixed(2)}%
                         </div>
                       </div>
                     )}
                  </div>
               </div>
             );
          })}
       </div>
    </div>
  );
}

function AddAssetModal({ userId, onClose }) {
  const [mode, setMode] = useState('search'); 
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name: '', symbol: '', type: 'Stock', quantity: '', costBasis: '', currentValue: '', interestRate: '' });

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = await searchAssets(query);
    setResults(data);
    setLoading(false);
  };

  const selectAsset = (asset) => {
    setForm({ ...form, name: asset.description, symbol: asset.symbol, type: asset.type || 'Stock' });
    setResults([]);
    setQuery('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      quantity: form.quantity ? parseFloat(form.quantity) : 0,
      costBasis: form.costBasis ? parseFloat(form.costBasis) : 0,
      currentValue: form.currentValue ? parseFloat(form.currentValue) : 0,
      interestRate: form.interestRate ? parseFloat(form.interestRate) : 0,
      updatedAt: serverTimestamp()
    };
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'investments'), payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl p-6 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-lg">Add New Asset</h3>
          <button onClick={onClose}><X size={24} className="text-slate-400 hover:text-slate-600"/></button>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
           <button onClick={() => setMode('search')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'search' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Search (Stocks/ETF)</button>
           <button onClick={() => setMode('manual')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'manual' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Manual (Savings)</button>
        </div>

        {mode === 'search' && !form.symbol && (
          <div className="space-y-4">
             <form onSubmit={handleSearch} className="flex gap-2">
               <input 
                 value={query} 
                 onChange={e => setQuery(e.target.value)} 
                 placeholder="Search Symbol (e.g. VUSA.L, AAPL)" 
                 className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" 
                 autoFocus
               />
               <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 rounded-xl">
                 {loading ? <Loader2 className="animate-spin"/> : <Search size={20}/>}
               </button>
             </form>
             <div className="max-h-60 overflow-y-auto space-y-2">
               {results.map(r => (
                 <button key={r.symbol} onClick={() => selectAsset(r)} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-colors">
                    <p className="font-bold text-slate-900">{r.symbol}</p>
                    <p className="text-xs text-slate-500">{r.description}</p>
                 </button>
               ))}
               {results.length === 0 && query && !loading && <p className="text-center text-slate-400 text-sm">No results found.</p>}
             </div>
          </div>
        )}

        {(mode === 'manual' || form.symbol) && (
           <form onSubmit={handleSubmit} className="space-y-4">
              {form.symbol && (
                <div className="bg-indigo-50 p-3 rounded-xl flex justify-between items-center text-indigo-700">
                   <span className="font-bold">{form.symbol} - {form.name}</span>
                   <button type="button" onClick={() => setForm({...form, symbol: '', name: ''})} className="text-xs underline">Change</button>
                </div>
              )}

              {mode === 'manual' && (
                 <div>
                   <label className="text-xs font-bold text-slate-400 uppercase">Asset Name</label>
                   <input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" placeholder="e.g. Barclays Savings" />
                 </div>
              )}

              {mode === 'search' ? (
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Quantity (Shares)</label>
                      <input type="number" step="any" required value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Avg. Cost Basis (£)</label>
                      <input type="number" step="any" placeholder="Price per share" value={form.costBasis} onChange={e => setForm({...form, costBasis: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
                    </div>
                 </div>
              ) : (
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Current Value (£)</label>
                      <input type="number" step="any" required value={form.currentValue} onChange={e => setForm({...form, currentValue: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">APY / Interest (%)</label>
                      <input type="number" step="any" placeholder="Optional" value={form.interestRate} onChange={e => setForm({...form, interestRate: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
                    </div>
                 </div>
              )}

              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg mt-4">Save Asset</button>
           </form>
        )}
      </div>
    </div>
  );
}
