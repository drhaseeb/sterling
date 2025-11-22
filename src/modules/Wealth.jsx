import React, { useState, useEffect } from 'react';
import { TrendingUp, PiggyBank, Search, Loader2, ArrowUpRight, ArrowDownLeft, RefreshCcw, X, Calendar } from 'lucide-react';
import { formatCurrency, STORAGE_KEY_CURRENCY, ALL_CURRENCIES } from '../utils/helpers';
import { db } from '../services/firebase';
import { addDoc, collection, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { searchAssets, getQuote, getExchangeRates, getHistoricalPrice } from '../services/finance';

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

  const totalWealth = investments.reduce((sum, inv) => {
    let assetValue = inv.currentValue || 0;
    
    if (inv.symbol && livePrices[inv.symbol]) {
      assetValue = inv.quantity * livePrices[inv.symbol].price;
    }

    // Convert from Asset Currency to Base Currency
    // We use the LIVE forex rates for the Total Wealth view
    // Note: inv.currency is the currency the USER INVESTED IN. 
    // livePrices.currency is the FUND NATIVE currency.
    // We need to normalize to Base.
    
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
             
             // Determine Native Currency (The currency the stock is traded in)
             const nativeCurrency = live?.currency || inv.currency || baseCurrency;
             
             // 1. Current Value in Native Currency (e.g. 10 shares * £50 = £500)
             const nativeValue = live ? (inv.quantity * live.price) : inv.currentValue;
             
             // 2. Invested Amount (Cost Basis)
             // This is stored in inv.currency (The currency the user paid with)
             const investedAmount = inv.costBasis || 0;
             const investedCurrency = inv.currency || baseCurrency;

             // 3. ROI Calculation (Challenging part: Cross-currency ROI)
             // We convert everything to BASE currency to compare apples to apples
             
             // Convert Current Value -> Base
             let baseCurrentValue = nativeValue;
             if (nativeCurrency !== baseCurrency && forexRates[nativeCurrency]) {
                 baseCurrentValue = nativeValue / forexRates[nativeCurrency];
             }

             // Convert Invested Amount -> Base (Approximate using CURRENT rate for simple display, 
             // ideally we'd store the historical base value, but this is decent for now)
             let baseInvestedValue = investedAmount;
             if (investedCurrency !== baseCurrency && forexRates[investedCurrency]) {
                 baseInvestedValue = investedAmount / forexRates[investedCurrency];
             }

             const returnAmt = baseCurrentValue - baseInvestedValue;
             const returnPct = baseInvestedValue > 0 ? (returnAmt / baseInvestedValue) * 100 : 0;

             return (
               <div key={inv.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-4 group relative overflow-hidden">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                          {inv.type === 'Savings Account' ? <PiggyBank size={24} /> : <TrendingUp size={24} />}
                       </div>
                       <div className="overflow-hidden">
                          <p className="font-bold text-slate-900 line-clamp-1 text-lg">{inv.name}</p>
                          <div className="flex flex-wrap gap-2 text-xs text-slate-500 mt-1">
                             <span className="font-bold bg-slate-100 px-1 rounded">{nativeCurrency}</span>
                             {inv.symbol && <span className="font-mono">{inv.symbol}</span>}
                          </div>
                       </div>
                    </div>
                    <button onClick={() => deleteInv(inv.id)} className="text-slate-300 hover:text-rose-500 flex-shrink-0"><X size={20}/></button>
                  </div>

                  <div className="flex items-end justify-between border-t border-slate-50 pt-3">
                     <div>
                        <p className="text-xs text-slate-400 uppercase font-bold mb-1">Current Value</p>
                        <div className="flex flex-col">
                            <span className="font-bold text-xl text-slate-900">{formatCurrency(nativeValue, nativeCurrency)}</span>
                            {nativeCurrency !== baseCurrency && (
                                <span className="text-xs text-slate-400">≈ {formatCurrency(baseCurrentValue, baseCurrency)}</span>
                            )}
                        </div>
                     </div>
                     
                     {/* ROI Badge */}
                     {investedAmount > 0 && (
                        <div className="text-right">
                            <p className="text-xs text-slate-400 uppercase font-bold mb-1">Return</p>
                            <div className={`font-bold flex items-center justify-end gap-1 ${returnAmt >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                                {returnAmt >= 0 ? <ArrowUpRight size={16}/> : <ArrowDownLeft size={16}/>}
                                {returnPct.toFixed(1)}%
                            </div>
                            <span className="text-[10px] text-slate-400">Inv: {formatCurrency(investedAmount, investedCurrency)}</span>
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
  
  // Calculated state
  const [calculating, setCalculating] = useState(false);
  const [historicalPrice, setHistoricalPrice] = useState(null);
  const [calculatedQuantity, setCalculatedQuantity] = useState('');

  const [form, setForm] = useState({ 
      name: '', 
      symbol: '', 
      type: 'Stock', 
      amountInvested: '', // New field: Total money put in
      dateInvested: new Date().toISOString().split('T')[0], // New field
      currentValue: '', 
      interestRate: '',
      currency: baseCurrency,
      nativeCurrency: '' // The currency the fund trades in
  });

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = await searchAssets(query);
    setResults(data);
    setLoading(false);
  };

  const selectAsset = (asset) => {
    // Heuristic for Native Currency
    let native = 'USD';
    if (asset.symbol.endsWith('.L')) native = 'GBP';
    if (asset.symbol.includes('.PA')) native = 'EUR';
    // ... other heuristics ...

    setForm({ 
      ...form, 
      name: asset.description || asset.symbol, 
      symbol: asset.symbol, 
      type: asset.type || 'Stock', 
      currency: native, // Default invest currency to native, user can change
      nativeCurrency: native
    });
    setResults([]);
    setQuery('');
  };

  // THE MAGIC: Calculate Quantity based on History
  useEffect(() => {
    const calculateQty = async () => {
        if (!form.symbol || !form.amountInvested || !form.dateInvested) return;
        
        setCalculating(true);
        
        // 1. Get Historical Price of Asset (in Native Currency)
        const priceAtDate = await getHistoricalPrice(form.symbol, form.dateInvested);
        
        if (priceAtDate) {
            let investmentInNative = parseFloat(form.amountInvested);

            // 2. If Invested Currency != Native Currency, we need historical Forex
            // E.g. Invested USD, Fund is GBP. We need USDGBP=X on that date.
            if (form.currency !== form.nativeCurrency) {
                // Construct Pair Symbol (e.g. GBPUSD=X)
                // Note: Yahoo pairs are usually "BaseTarget=X"
                // We try both directions if needed, but for simplicity assume Major pairs exist
                const pair = `${form.currency}${form.nativeCurrency}=X`; 
                const rate = await getHistoricalPrice(pair, form.dateInvested);
                
                if (rate) {
                    investmentInNative = investmentInNative * rate;
                } else {
                    // Fallback: If simple inversion exists
                    const pairInv = `${form.nativeCurrency}${form.currency}=X`;
                    const rateInv = await getHistoricalPrice(pairInv, form.dateInvested);
                    if (rateInv) investmentInNative = investmentInNative / rateInv;
                }
            }

            // 3. Calculate Quantity
            // Note: LSE stocks often in pence (GBp). If price > 500 and native is GBP, likely pence.
            let finalPrice = priceAtDate;
            if (form.nativeCurrency === 'GBP' && priceAtDate > 500) {
                finalPrice = priceAtDate / 100;
            }

            const qty = investmentInNative / finalPrice;
            setHistoricalPrice(finalPrice);
            setCalculatedQuantity(qty.toFixed(4));
        }
        setCalculating(false);
    };

    // Debounce slightly
    const timer = setTimeout(calculateQty, 800);
    return () => clearTimeout(timer);

  }, [form.amountInvested, form.dateInvested, form.currency, form.symbol]);


  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      quantity: parseFloat(calculatedQuantity) || 0, // Use the calculated quantity
      costBasis: parseFloat(form.amountInvested), // Store total invested
      currentValue: parseFloat(form.currentValue) || 0,
      interestRate: parseFloat(form.interestRate) || 0,
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

        {/* SEARCH UI */}
        {mode === 'search' && !form.symbol && (
          <div className="space-y-4">
             <form onSubmit={handleSearch} className="flex gap-2">
               <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search Symbol (e.g. VUSA.L, SPY)" className="flex-1 bg-slate-50 p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" autoFocus />
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

        {/* ASSET FORM */}
        {(mode === 'manual' || form.symbol) && (
           <form onSubmit={handleSubmit} className="space-y-4">
              {form.symbol && (
                <div className="bg-indigo-50 p-3 rounded-xl flex justify-between items-center text-indigo-700">
                   <span className="font-bold">{form.symbol}</span>
                   <button type="button" onClick={() => setForm({...form, symbol: '', name: ''})} className="text-xs underline">Change</button>
                </div>
              )}

              {mode === 'manual' && (
                 <div><label className="text-xs font-bold text-slate-400 uppercase">Asset Name</label><input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" /></div>
              )}

              {mode === 'search' ? (
                 <>
                    <div className="grid grid-cols-2 gap-4">
                       <div>
                          <label className="text-xs font-bold text-slate-400 uppercase">Amount Invested</label>
                          <input type="number" step="any" required value={form.amountInvested} onChange={e => setForm({...form, amountInvested: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
                       </div>
                       <div>
                          <label className="text-xs font-bold text-slate-400 uppercase">Currency Invested</label>
                          <select value={form.currency} onChange={e => setForm({...form, currency: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none font-mono font-bold">
                             {ALL_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                       </div>
                    </div>
                    
                    <div>
                       <label className="text-xs font-bold text-slate-400 uppercase flex gap-2 items-center">Date Invested <Calendar size={12}/></label>
                       <input type="date" required value={form.dateInvested} onChange={e => setForm({...form, dateInvested: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" />
                    </div>

                    {/* Auto-Calculation Display */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                       <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-slate-500 uppercase">Calculated Quantity</span>
                          {calculating && <Loader2 size={14} className="animate-spin text-indigo-600"/>}
                       </div>
                       <div className="flex gap-3">
                          <input value={calculatedQuantity} onChange={e => setCalculatedQuantity(e.target.value)} className="flex-1 bg-white p-2 rounded-lg border border-slate-200 text-lg font-bold text-indigo-700 outline-none" placeholder="0.00" />
                          <div className="text-right text-xs text-slate-400 leading-tight">
                             {historicalPrice ? <>Price on Date:<br/>{formatCurrency(historicalPrice, form.nativeCurrency)}</> : "Enter details to fetch"}
                          </div>
                       </div>
                    </div>
                 </>
              ) : (
                 /* Manual Mode Fields */
                 <div className="grid grid-cols-2 gap-4">
                    <div><label className="text-xs font-bold text-slate-400 uppercase">Current Value</label><input type="number" required value={form.currentValue} onChange={e => setForm({...form, currentValue: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" /></div>
                    <div><label className="text-xs font-bold text-slate-400 uppercase">APY (%)</label><input type="number" value={form.interestRate} onChange={e => setForm({...form, interestRate: e.target.value})} className="w-full bg-slate-50 p-3 rounded-xl outline-none" /></div>
                 </div>
              )}

              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg mt-4">Save Asset</button>
           </form>
        )}
      </div>
    </div>
  );
                   }
