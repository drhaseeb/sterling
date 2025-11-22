import React, { useState, useEffect } from 'react';
import { TrendingUp, PiggyBank, Search, Loader2, ArrowUpRight, ArrowDownLeft, RefreshCcw, X } from 'lucide-react';
import { formatCurrency, STORAGE_KEY_CURRENCY, ALL_CURRENCIES } from '../utils/helpers';
import { db } from '../services/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { searchAssets, getQuote, getExchangeRates } from '../services/finance';

const APP_ID = 'default-app-id';

export default function Wealth({ investments, userId }) {
  const [showAdd, setShowAdd] = useState(false);
  const [livePrices, setLivePrices] = useState({});
  const [forexRates, setForexRates] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  
  const baseCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY) || 'GBP';

  useEffect(() => {
    refreshPrices();
  }, [investments]);

  const refreshPrices = async () => {
    setRefreshing(true);
    
    const rates = await getExchangeRates(baseCurrency);
    if (rates) setForexRates(rates);

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
    let assetValue = inv.currentValue || 0;
    
    if (inv.symbol && livePrices[inv.symbol]) {
      assetValue = inv.quantity * livePrices[inv.symbol].price;
    }

    const assetCurrency = inv.currency || baseCurrency; 
    
    if (assetCurrency !== baseCurrency && forexRates[assetCurrency]) {
        assetValue = assetValue / forexRates[assetCurrency];
    }

    return sum + assetValue;
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in">
       <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
         <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-200 mb-1 font-medium">Total Portfolio ({baseCurrency})</p>
                <h2 className="text-4xl font-bold">{formatCurrency(totalWealth, baseCurrency)}</h2>
              </div>
              <button onClick={refreshPrices} disabled={refreshing} className="p-2 bg-indigo-800 rounded-full hover:bg-indigo-700 transition-colors">
                <RefreshCcw size={20} className={refreshing ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="mt-8">
               <button onClick={() => setShowAdd(true)} className="bg-white text-indigo-900 px-6 py-3 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-lg shadow-indigo-900/50">
                 + Add Asset
               </button>
            </div>
         </div>
       </div>

       {showAdd && <AddAssetModal userId={userId} onClose={() => setShowAdd(false)} baseCurrency={baseCurrency} />}

       <div className="grid md:grid-cols-2 gap-4">
          {investments.map(inv => {
             const live = livePrices[inv.symbol];
             const itemCurrency = inv.currency || baseCurrency;
             
             const nativeValue = live ? (inv.quantity * live.price) : inv.currentValue;
             
             let baseValue = nativeValue;
             if (itemCurrency !== baseCurrency && forexRates[itemCurrency]) {
                 baseValue = nativeValue / forexRates[itemCurrency];
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
                             <span className="font-bold bg-slate-100 px-1 rounded">{itemCurrency}</span>
                             {inv.symbol && <span className="font-mono">{inv.symbol}</span>}
                          </div>
                       </div>
                    </div>
                    <button onClick={() => deleteInv(inv.id)} className="text-slate-300 hover:text-rose-500"><X size={20}/></button>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-50 pt-3">
                     <div>
                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Value</p>
                        <div className="flex items-baseline gap-2">
                            <span className="font-bold text-xl text-slate-900">{formatCurrency(nativeValue, itemCurrency)}</span>
                            {itemCurrency !== baseCurrency && (
                                <span className="text-xs text-slate-400">≈ {formatCurrency(baseValue, baseCurrency)}</span>
                            )}
                        </div>
                     </div>
                  </div>
               </div>
             );
          })}
       </div>
    </div>
  );
}

function AddAssetModal({ userId, onClose, baseCurrency }) {
  const [mode, setMode] = useState('search'); 
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({ 
      name: '', 
      symbol: '', 
      type: 'Stock', 
      quantity: '', 
      costBasis: '', 
      currentValue: '', 
      interestRate: '',
      currency: baseCurrency 
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = await searchAssets(query);
    setResults(data);
    setLoading(false);
  };

  const selectAsset = (asset) => {
    let suggestedCurrency = 'USD';
    if (asset.symbol.endsWith('.L')) suggestedCurrency = 'GBP';
    
    setForm({ ...form, name: asset.description, symbol: asset.symbol, type: asset.type || 'Stock', currency: suggestedCurrency });
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

              {/* Currency Selector for the Asset */}
              <div>
                 <label className="text-xs font-bold text-slate-400 uppercase">Asset Currency</label>
                 <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none font-bold font-mono">
                    {ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>

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
                      <input type="number" step="any" required value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Cost Basis (in {form.currency})</label>
                      <input type="number" step="any" placeholder="Price per share" value={form.costBasis} onChange={e => setForm({...form, costBasis: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
                    </div>
                 </div>
              ) : (
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase">Current Value (in {form.currency})</label>
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
