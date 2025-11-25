import React, { useState, useEffect } from 'react';
import { TrendingUp, PiggyBank, Search, Loader2, ArrowUpRight, ArrowDownLeft, RefreshCcw, X, Calendar, Lock, AlertCircle } from 'lucide-react';
import { formatCurrency, STORAGE_KEY_CURRENCY, ALL_CURRENCIES } from '../utils/helpers';
import { db } from '../services/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { searchAssets, getQuote, getExchangeRates, getHistoricalPrice } from '../services/finance';

const APP_ID = 'default-app-id';
const ASSET_CATS = ['General', 'ISA', 'Pension', 'College Fund', 'Retirement', 'Emergency Fund', 'Crypto Wallet', 'Real Estate'];

export default function Wealth({ investments, userId }) {
  const [showAdd, setShowAdd] = useState(false);
  const [livePrices, setLivePrices] = useState({});
  const [forexRates, setForexRates] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  
  const baseCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY) || 'GBP';

  useEffect(() => { refreshPrices(); }, [investments]);

  const refreshPrices = async () => {
    setRefreshing(true);
    const rates = await getExchangeRates(baseCurrency);
    if (rates) setForexRates(rates);
    const newPrices = {};
    const symbols = investments.filter(i => i.symbol).map(i => i.symbol);
    
    // Sequential fetch to be gentle on proxy
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
    if(confirm("Remove this asset? Data will be lost.")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'investments', id)); 
  }

  const totalWealth = investments.reduce((sum, inv) => {
    let assetValue = inv.currentValue || 0;
    
    // 1. Calculate Value in NATIVE currency
    if (inv.symbol && livePrices[inv.symbol]) {
      assetValue = inv.quantity * livePrices[inv.symbol].price;
    }

    // 2. Deduct Fees
    if (inv.annualFee) assetValue = assetValue * (1 - (inv.annualFee / 100));

    // 3. Convert to BASE currency
    const nativeCurrency = (inv.symbol && livePrices[inv.symbol]) ? livePrices[inv.symbol].currency : (inv.currency || baseCurrency);
    if (nativeCurrency !== baseCurrency && forexRates[nativeCurrency]) {
        // Convert Native -> Base (e.g. USD -> GBP: USD / Rate)
        assetValue = assetValue / forexRates[nativeCurrency];
    }

    return sum + assetValue;
  }, 0);

  return (
    <div className="space-y-4 animate-in fade-in max-w-4xl mx-auto">
       {/* HEADER */}
       <div className="bg-indigo-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
         <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-300 mb-1 font-medium text-xs uppercase tracking-wide">Net Portfolio ({baseCurrency})</p>
                <h2 className="text-3xl font-bold">{formatCurrency(totalWealth, baseCurrency)}</h2>
              </div>
              <button onClick={refreshPrices} disabled={refreshing} className="p-2 bg-indigo-800/50 rounded-full hover:bg-indigo-700 transition-colors">
                <RefreshCcw size={16} className={`text-indigo-200 ${refreshing ? "animate-spin" : ""}`} />
              </button>
            </div>
            <button onClick={() => setShowAdd(true)} className="mt-6 bg-white text-indigo-900 px-4 py-2 rounded-lg font-bold text-xs hover:bg-indigo-50 transition-colors shadow-md">
                 + Add Asset
            </button>
         </div>
       </div>

       {showAdd && <AddAssetModal userId={userId} onClose={() => setShowAdd(false)} baseCurrency={baseCurrency} />}

       {/* LIST */}
       <div className="grid md:grid-cols-2 gap-3">
          {investments.map(inv => {
             const live = livePrices[inv.symbol];
             const nativeCurrency = live?.currency || inv.currency || baseCurrency;
             
             // Current Value (Native)
             let nativeValue = live ? (inv.quantity * live.price) : inv.currentValue;
             if (inv.annualFee) nativeValue = nativeValue * (1 - (inv.annualFee / 100));

             // Current Value (Base) for ROI calc
             let baseValue = nativeValue;
             if (nativeCurrency !== baseCurrency && forexRates[nativeCurrency]) {
                 baseValue = nativeValue / forexRates[nativeCurrency];
             }

             // Invested Value (Base)
             // inv.costBasis is stored in the currency the user paid
             const investedCurrency = inv.currency || baseCurrency; 
             let baseInvested = inv.costBasis || 0;
             if (investedCurrency !== baseCurrency && forexRates[investedCurrency]) {
                 baseInvested = (inv.costBasis || 0) / forexRates[investedCurrency];
             }

             const returnAmt = baseValue - baseInvested;
             const returnPct = baseInvested > 0 ? (returnAmt / baseInvested) * 100 : 0;
             const isLocked = inv.lockDate && new Date(inv.lockDate) > new Date();

             return (
               <div key={inv.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3 group">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3 min-w-0">
                       <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                          {inv.type === 'Savings Account' ? <PiggyBank size={16} /> : <TrendingUp size={16} />}
                       </div>
                       <div className="min-w-0">
                          <div className="flex items-center gap-2">
                             <p className="font-bold text-slate-800 truncate text-sm">{inv.name}</p>
                             {isLocked && <Lock size={12} className="text-rose-500 flex-shrink-0" />}
                          </div>
                          <div className="flex flex-wrap gap-1.5 text-[10px] text-slate-500">
                             {inv.category && <span className="bg-slate-100 px-1.5 rounded text-slate-600">{inv.category}</span>}
                             <span className="font-mono bg-slate-50 px-1 rounded">{inv.symbol || inv.currency}</span>
                          </div>
                       </div>
                    </div>
                    <button onClick={() => deleteInv(inv.id)} className="text-slate-300 hover:text-rose-500 flex-shrink-0"><X size={16}/></button>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-50 pt-2">
                     <div>
                        <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5 flex items-center gap-1">
                           Net Value {inv.annualFee > 0 && <span className="text-rose-500">(-{inv.annualFee}%)</span>}
                        </p>
                        <div className="flex flex-col">
                            <span className="font-bold text-base text-slate-900">{formatCurrency(nativeValue, nativeCurrency)}</span>
                            {/* Live price indicator */}
                            {live && <span className="text-[9px] text-indigo-400">Live: {formatCurrency(live.price, nativeCurrency)}</span>}
                        </div>
                     </div>
                     
                     {inv.costBasis > 0 && (
                        <div className="text-right">
                            <p className="text-[10px] text-slate-400 uppercase font-bold mb-0.5">Return</p>
                            <div className={`font-bold text-xs flex items-center justify-end gap-1 ${returnAmt >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                {returnAmt >= 0 ? <ArrowUpRight size={12}/> : <ArrowDownLeft size={12}/>}
                                {returnPct.toFixed(1)}%
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

function AddAssetModal({ userId, onClose, baseCurrency }) {
  const [mode, setMode] = useState('search'); 
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [calculating, setCalculating] = useState(false);
  const [historicalPrice, setHistoricalPrice] = useState(null);
  
  // Form
  const [form, setForm] = useState({ 
      name: '', symbol: '', type: 'Stock', 
      amountInvested: '', dateInvested: new Date().toISOString().split('T')[0], 
      quantity: '', // Now explicitly tracked
      currentValue: '', interestRate: '', currency: baseCurrency, nativeCurrency: '',
      category: 'General', annualFee: '', lockDate: ''
  });

  const handleSearch = async (e) => {
    e.preventDefault(); setLoading(true);
    const data = await searchAssets(query);
    setResults(data); setLoading(false);
  };

  const selectAsset = (asset) => {
    let native = 'USD';
    if (asset.symbol.endsWith('.L')) native = 'GBP';
    if (asset.symbol.includes('.PA')) native = 'EUR';
    setForm({ ...form, name: asset.description || asset.symbol, symbol: asset.symbol, type: asset.type || 'Stock', currency: native, nativeCurrency: native });
    setResults([]); setQuery('');
  };

  // Auto-Calculate Hook
  useEffect(() => {
    const calculateQty = async () => {
        if (!form.symbol || !form.amountInvested || !form.dateInvested) return;
        setCalculating(true);
        
        // 1. Fetch Historical Price (Native)
        const priceAtDate = await getHistoricalPrice(form.symbol, form.dateInvested);
        setHistoricalPrice(priceAtDate);

        if (priceAtDate) {
            let investmentInNative = parseFloat(form.amountInvested);
            
            // 2. Apply Historical Forex if currencies differ
            if (form.currency !== form.nativeCurrency) {
                // Try to find rate on that specific date
                const pair = `${form.currency}${form.nativeCurrency}=X`; 
                const rate = await getHistoricalPrice(pair, form.dateInvested);
                
                if (rate) {
                    investmentInNative = investmentInNative * rate;
                } else {
                    // Simple fallback if historical forex fails: use 1:1 (User can edit later)
                    console.warn("Historical forex failed, using 1:1");
                }
            }

            // 3. Calculate Qty
            const qty = investmentInNative / priceAtDate;
            setForm(prev => ({ ...prev, quantity: qty.toFixed(4) }));
        }
        setCalculating(false);
    };
    const timer = setTimeout(calculateQty, 1000); // Debounce
    return () => clearTimeout(timer);
  }, [form.amountInvested, form.dateInvested, form.currency, form.symbol, form.nativeCurrency]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      quantity: parseFloat(form.quantity) || 0,
      costBasis: parseFloat(form.amountInvested), 
      currentValue: parseFloat(form.currentValue) || 0,
      interestRate: parseFloat(form.interestRate) || 0,
      annualFee: parseFloat(form.annualFee) || 0,
      updatedAt: serverTimestamp()
    };
    await addDoc(collection(db, 'artifacts', APP_ID, 'users', userId, 'investments'), payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-5 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4">
          <h3 className="font-bold text-base text-slate-800">Add Asset</h3>
          <button onClick={onClose}><X size={18} className="text-slate-400 hover:text-slate-600"/></button>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-lg mb-4">
           <button onClick={() => setMode('search')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'search' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Search (Yahoo)</button>
           <button onClick={() => setMode('manual')} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mode === 'manual' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Manual</button>
        </div>

        {mode === 'search' && !form.symbol && (
          <div className="space-y-3">
             <form onSubmit={handleSearch} className="flex gap-2">
               <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Symbol (e.g. VUSA.L)" className="flex-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 text-sm" autoFocus />
               <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-3 rounded-lg">{loading ? <Loader2 className="animate-spin" size={16}/> : <Search size={16}/>}</button>
             </form>
             <div className="max-h-48 overflow-y-auto space-y-1">
               {results.map(r => (
                 <button key={r.symbol} onClick={() => selectAsset(r)} className="w-full text-left p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-200 transition-colors">
                    <div className="flex justify-between"><span className="font-bold text-xs text-slate-900">{r.symbol}</span><span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-500">{r.exchange}</span></div>
                    <p className="text-[10px] text-slate-500 line-clamp-1">{r.description}</p>
                 </button>
               ))}
             </div>
          </div>
        )}

        {(mode === 'manual' || form.symbol) && (
           <form onSubmit={handleSubmit} className="space-y-3">
              {form.symbol && (
                <div className="bg-indigo-50 p-2 rounded-lg flex justify-between items-center text-indigo-700">
                   <span className="font-bold text-xs">{form.symbol}</span>
                   <button type="button" onClick={() => setForm({...form, symbol: '', name: ''})} className="text-[10px] underline">Change</button>
                </div>
              )}

              {/* Core Info */}
              <div className="grid grid-cols-2 gap-2">
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase">Category</label><select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs">{ASSET_CATS.map(c => <option key={c}>{c}</option>)}</select></div>
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase">Fee (%)</label><input type="number" step="any" placeholder="0.0%" value={form.annualFee} onChange={e => setForm({...form, annualFee: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs" /></div>
              </div>

              {mode === 'manual' && (
                 <div><label className="text-[10px] font-bold text-slate-400 uppercase">Name</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs" placeholder="e.g. Savings" /></div>
              )}

              {mode === 'search' ? (
                 <>
                    <div className="grid grid-cols-2 gap-2">
                       <div><label className="text-[10px] font-bold text-slate-400 uppercase">Amount Invested</label><input type="number" step="any" required value={form.amountInvested} onChange={e => setForm({...form, amountInvested: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs" /></div>
                       <div><label className="text-[10px] font-bold text-slate-400 uppercase">Currency Paid</label><select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs font-mono font-bold">{ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                    </div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase flex gap-1 items-center">Date <Calendar size={10}/></label><input type="date" required value={form.dateInvested} onChange={e => setForm({...form, dateInvested: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs" /></div>
                    
                    {/* AUTO-CALCULATION AREA */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-2">
                        <div className="flex justify-between items-center">
                           <label className="text-[10px] font-bold text-indigo-500 uppercase">Quantity (Editable)</label>
                           {calculating && <Loader2 size={10} className="animate-spin text-indigo-500"/>}
                        </div>
                        <input type="number" step="any" value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} className="w-full bg-white p-2 rounded-lg border border-slate-200 text-sm font-bold text-indigo-700 outline-none" placeholder="0.00" />
                        <p className="text-[10px] text-slate-400 text-right">
                           {historicalPrice ? `Found Price: ${formatCurrency(historicalPrice, form.nativeCurrency)}` : "Auto-calculating..."}
                        </p>
                    </div>
                 </>
              ) : (
                 /* Manual Mode */
                 <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">Value</label><input type="number" required value={form.currentValue} onChange={e => setForm({...form, currentValue: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs" /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase">Currency</label><select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs font-mono font-bold">{ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                 </div>
              )}

              <div><label className="text-[10px] font-bold text-slate-400 uppercase flex gap-1 items-center">Lock Date <Lock size={10}/></label><input type="date" value={form.lockDate} onChange={e => setForm({...form, lockDate: e.target.value})} className="w-full bg-slate-50 p-2 rounded-lg outline-none text-xs text-slate-600" /></div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-bold text-sm shadow-md mt-2">Save Asset</button>
           </form>
        )}
      </div>
    </div>
  );
                    }
