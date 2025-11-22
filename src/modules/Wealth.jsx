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
        if (quote) {
           if (quote.currency === 'GBp') {
             quote.price = quote.price / 100;
             quote.currency = 'GBP';
           }
           newPrices[sym] = quote;
        }
      } catch (e) { console.error(e); }
    }
    setLivePrices(prev => ({ ...prev, ...newPrices }));
    setRefreshing(false);
  };

  const deleteInv = async (id) => {
    if(confirm("Remove this asset?")) await deleteDoc(doc(db, 'artifacts', APP_ID, 'users', userId, 'investments', id));
  }

  // --- CALCULATIONS ---
  const totalWealth = investments.reduce((sum, inv) => {
    let assetValue = inv.currentValue || 0;
    if (inv.symbol && livePrices[inv.symbol]) {
      assetValue = inv.quantity * livePrices[inv.symbol].price;
    }

    // Apply Fee Deduction (Simple flat reduction of current value based on fee %)
    // Note: This is a visual "Net Value" approximation.
    if (inv.annualFee) {
       assetValue = assetValue * (1 - (inv.annualFee / 100));
    }

    // Convert to Base Currency
    const nativeCurrency = (inv.symbol && livePrices[inv.symbol]) ? livePrices[inv.symbol].currency : (inv.currency || baseCurrency);
    if (nativeCurrency !== baseCurrency && forexRates[nativeCurrency]) {
        assetValue = assetValue / forexRates[nativeCurrency];
    }

    return sum + assetValue;
  }, 0);

  return (
    <div className="space-y-6 animate-in fade-in">
       {/* HEADER CARD */}
       <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
         <div className="relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-indigo-200 mb-1 font-medium">Total Net Portfolio ({baseCurrency})</p>
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
             
             const nativeCurrency = live?.currency || inv.currency || baseCurrency;
             let nativeValue = live ? (inv.quantity * live.price) : inv.currentValue;
             
             // Deduct Fee for Display
             if (inv.annualFee) {
                nativeValue = nativeValue * (1 - (inv.annualFee / 100));
             }

             // Base Currency Conversion for Totals/ROI
             let baseValue = nativeValue;
             if (nativeCurrency !== baseCurrency && forexRates[nativeCurrency]) {
                 baseValue = nativeValue / forexRates[nativeCurrency];
             }

             // ROI
             const investedAmount = inv.costBasis || 0;
             const investedCurrency = inv.currency || baseCurrency; // The currency user paid in
             let baseInvested = investedAmount;
             if (investedCurrency !== baseCurrency && forexRates[investedCurrency]) {
                 baseInvested = investedAmount / forexRates[investedCurrency];
             }
             const returnAmt = baseValue - baseInvested;
             const returnPct = baseInvested > 0 ? (returnAmt / baseInvested) * 100 : 0;

             // Check Lock Status
             const isLocked = inv.lockDate && new Date(inv.lockDate) > new Date();

             return (
               <div key={inv.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 group relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                          {inv.type === 'Savings Account' ? <PiggyBank size={24} /> : <TrendingUp size={24} />}
                       </div>
                       <div className="overflow-hidden">
                          <div className="flex items-center gap-2">
                             <p className="font-bold text-slate-900 line-clamp-1 text-lg">{inv.name}</p>
                             {isLocked && <Lock size={14} className="text-rose-500" title={`Locked until ${inv.lockDate}`} />}
                          </div>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                             {inv.category && <span className="bg-slate-100 px-1.5 py-0.5 rounded font-semibold">{inv.category}</span>}
                             <span className="font-mono bg-slate-50 px-1 rounded">{inv.symbol || inv.currency}</span>
                          </div>
                       </div>
                    </div>
                    <button onClick={() => deleteInv(inv.id)} className="text-slate-300 hover:text-rose-500 flex-shrink-0"><X size={20}/></button>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-50 pt-3">
                     <div>
                        <p className="text-xs text-slate-400 uppercase font-bold mb-1 flex items-center gap-1">
                           Net Value {inv.annualFee > 0 && <span className="text-[9px] bg-rose-100 text-rose-600 px-1 rounded">-{inv.annualFee}% Fee</span>}
                        </p>
                        <div className="flex flex-col">
                            <span className="font-bold text-xl text-slate-900">{formatCurrency(nativeValue, nativeCurrency)}</span>
                            {nativeCurrency !== baseCurrency && (
                                <span className="text-xs text-slate-400">≈ {formatCurrency(baseValue, baseCurrency)}</span>
                            )}
                        </div>
                     </div>
                     
                     {inv.costBasis > 0 && (
                        <div className="text-right">
                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Return</p>
                            <div className={`font-bold flex items-center justify-end gap-1 ${returnAmt >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                {returnAmt >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                                {returnPct.toFixed(1)}%
                            </div>
                        </div>
                     )}
                  </div>
                  
                  {/* Footer Info */}
                  {isLocked && (
                     <div className="mt-2 text-[10px] text-rose-500 flex items-center gap-1 bg-rose-50 p-2 rounded-lg">
                        <Lock size={10}/> Funds locked until {new Date(inv.lockDate).toLocaleDateString()}
                     </div>
                  )}
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
  const [calculatedQuantity, setCalculatedQuantity] = useState('');

  const [form, setForm] = useState({ 
      name: '', 
      symbol: '', 
      type: 'Stock', 
      amountInvested: '', 
      dateInvested: new Date().toISOString().split('T')[0], 
      currentValue: '', 
      interestRate: '',
      currency: baseCurrency,
      nativeCurrency: '',
      
      // New Fields
      category: 'General',
      annualFee: '', // %
      lockDate: ''   // Date string
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = await searchAssets(query);
    setResults(data);
    setLoading(false);
  };

  const selectAsset = (asset) => {
    let native = 'USD';
    if (asset.symbol.endsWith('.L')) native = 'GBP';
    if (asset.symbol.includes('.PA')) native = 'EUR';

    setForm({ 
      ...form, 
      name: asset.description || asset.symbol, 
      symbol: asset.symbol, 
      type: asset.type || 'Stock', 
      currency: native, 
      nativeCurrency: native
    });
    setResults([]);
    setQuery('');
  };

  // Auto-Calculate Quantity (Same as before)
  useEffect(() => {
    const calculateQty = async () => {
        if (!form.symbol || !form.amountInvested || !form.dateInvested) return;
        setCalculating(true);
        
        const priceAtDate = await getHistoricalPrice(form.symbol, form.dateInvested);
        if (priceAtDate) {
            let investmentInNative = parseFloat(form.amountInvested);
            if (form.currency !== form.nativeCurrency) {
                const pair = `${form.currency}${form.nativeCurrency}=X`; 
                const rate = await getHistoricalPrice(pair, form.dateInvested);
                if (rate) {
                    investmentInNative = investmentInNative * rate;
                } else {
                    const pairInv = `${form.nativeCurrency}${form.currency}=X`;
                    const rateInv = await getHistoricalPrice(pairInv, form.dateInvested);
                    if (rateInv) investmentInNative = investmentInNative / rateInv;
                }
            }
            let finalPrice = priceAtDate;
            if (form.nativeCurrency === 'GBP' && priceAtDate > 500) finalPrice = priceAtDate / 100;

            const qty = investmentInNative / finalPrice;
            setHistoricalPrice(finalPrice);
            setCalculatedQuantity(qty.toFixed(4));
        }
        setCalculating(false);
    };
    const timer = setTimeout(calculateQty, 800);
    return () => clearTimeout(timer);
  }, [form.amountInvested, form.dateInvested, form.currency, form.symbol]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      quantity: parseFloat(calculatedQuantity) || 0,
      costBasis: parseFloat(form.amountInvested), 
      currentValue: parseFloat(form.currentValue) || 0,
      interestRate: parseFloat(form.interestRate) || 0,
      annualFee: parseFloat(form.annualFee) || 0, // NEW
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
           <button onClick={() => setMode('search')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'search' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Search (Yahoo)</button>
           <button onClick={() => setMode('manual')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${mode === 'manual' ? 'bg-white shadow text-indigo-600' : 'text-slate-500'}`}>Manual (Savings)</button>
        </div>

        {/* Search Input */}
        {mode === 'search' && !form.symbol && (
          <div className="space-y-4">
             <form onSubmit={handleSearch} className="flex gap-2">
               <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Symbol (e.g. VUSA.L)" className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
               <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-4 rounded-xl">{loading ? <Loader2 className="animate-spin"/> : <Search size={20}/>}</button>
             </form>
             <div className="max-h-60 overflow-y-auto space-y-2">
               {results.map(r => (
                 <button key={r.symbol} onClick={() => selectAsset(r)} className="w-full text-left p-3 hover:bg-slate-50 rounded-xl border border-transparent hover:border-slate-200 transition-colors">
                    <div className="flex justify-between"><span className="font-bold text-slate-900">{r.symbol}</span><span className="text-xs bg-slate-100 px-2 rounded text-slate-500">{r.exchange}</span></div>
                    <p className="text-xs text-slate-500 line-clamp-1">{r.description}</p>
                 </button>
               ))}
             </div>
          </div>
        )}

        {/* Main Form */}
        {(mode === 'manual' || form.symbol) && (
           <form onSubmit={handleSubmit} className="space-y-4">
              {/* New Fields: Category & Fee */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Category</label>
                    <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none">
                       {ASSET_CATS.map(c => <option key={c}>{c}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-slate-400 uppercase">Annual Fee (%)</label>
                    <input type="number" step="any" placeholder="0.0%" value={form.annualFee} onChange={e => setForm({...form, annualFee: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
                 </div>
              </div>

              {mode === 'manual' && (
                 <div><label className="text-xs font-bold text-slate-400 uppercase">Asset Name</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" /></div>
              )}

              {mode === 'search' ? (
                 <>
                    <div className="grid grid-cols-2 gap-4">
                       <div><label className="text-xs font-bold text-slate-400 uppercase">Amount Invested</label><input type="number" step="any" required value={form.amountInvested} onChange={e => setForm({...form, amountInvested: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" /></div>
                       <div>
                          <label className="text-xs font-bold text-slate-400 uppercase">Currency Paid</label>
                          <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none font-mono font-bold">
                             {ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                       </div>
                    </div>
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase flex gap-2 items-center">Date Invested <Calendar size={12}/></label>
                       <input type="date" required value={form.dateInvested} onChange={e => setForm({...form, dateInvested: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
                    </div>
                    {calculating && <div className="text-center text-xs text-indigo-500 animate-pulse">Calculating historical quantity...</div>}
                 </>
              ) : (
                 /* Manual Mode */
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-400 uppercase">Current Value</label><input type="number" required value={form.currentValue} onChange={e => setForm({...form, currentValue: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase">APY (%)</label><input type="number" value={form.interestRate} onChange={e => setForm({...form, interestRate: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" /></div>
                 </div>
              )}

              {/* Lock Date */}
              <div>
                 <label className="text-xs font-bold text-slate-400 uppercase flex gap-2 items-center">Lock / Maturity Date <Lock size={12}/></label>
                 <input type="date" value={form.lockDate} onChange={e => setForm({...form, lockDate: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none text-slate-600" />
                 <p className="text-[10px] text-slate-400 mt-1">Optional. For Pensions, Bonds, or Fixed Savings.</p>
              </div>

              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg mt-4">Save Asset</button>
           </form>
        )}
      </div>
    </div>
  );
                           }
