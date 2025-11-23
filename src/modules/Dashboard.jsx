import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Wallet, PiggyBank } from 'lucide-react';
import { formatCurrency, STORAGE_KEY_CURRENCY } from '../utils/helpers';

export default function Dashboard({ transactions, budgets }) {
  const baseCurrency = localStorage.getItem(STORAGE_KEY_CURRENCY) || 'GBP';
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  // Filter for THIS MONTH only
  const monthTx = transactions.filter(t => {
    const d = new Date(t.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const income = monthTx.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const balance = income - expenses;
  const savingsRate = income > 0 ? ((balance / income) * 100).toFixed(0) : 0;

  const monthlySpend = expenses; 
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + (parseFloat(b.limit) || 0), 0);

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 max-w-4xl mx-auto">
      <div className="flex justify-between items-end px-1">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Overview</h1>
          <p className="text-xs text-slate-500 font-medium">
            {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* COMPACT HERO CARD */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-4">
             <div>
                <p className="text-slate-400 font-medium text-xs uppercase tracking-wider mb-1">Net Balance</p>
                <h2 className="text-3xl font-bold tracking-tight">{formatCurrency(balance, baseCurrency)}</h2>
             </div>
             {balance > 0 && (
                <div className="bg-teal-500/20 text-teal-300 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1.5">
                   <PiggyBank size={14}/> {savingsRate}%
                </div>
             )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4">
            <div>
              <div className="flex items-center gap-1.5 text-teal-400 mb-0.5 font-bold text-[10px] uppercase tracking-wide">
                <ArrowUpRight size={12}/> Income
              </div>
              <p className="text-lg font-semibold">{formatCurrency(income, baseCurrency)}</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-rose-400 mb-0.5 font-bold text-[10px] uppercase tracking-wide">
                <ArrowDownLeft size={12}/> Expenses
              </div>
              <p className="text-lg font-semibold">{formatCurrency(expenses, baseCurrency)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* BUDGET HEALTH */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold text-slate-700 text-sm">Budget</h3>
            <span className="text-[10px] font-semibold bg-slate-100 px-2 py-0.5 rounded text-slate-500">
              Limit: {formatCurrency(totalBudgetLimit, baseCurrency)}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5 mb-2">
            <span className={`text-2xl font-bold ${monthlySpend > totalBudgetLimit ? 'text-rose-600' : 'text-slate-900'}`}>
              {((monthlySpend / (totalBudgetLimit || 1)) * 100).toFixed(0)}%
            </span>
            <span className="text-xs text-slate-400 font-medium">used</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${monthlySpend > totalBudgetLimit ? 'bg-rose-500' : 'bg-teal-500'}`} 
              style={{ width: `${totalBudgetLimit > 0 ? Math.min((monthlySpend/totalBudgetLimit)*100, 100) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-3">
             <h3 className="font-bold text-slate-700 text-sm">Recent</h3>
             <Wallet size={14} className="text-slate-300"/>
          </div>
          <div className="space-y-3">
            {transactions.slice(0, 4).map(tx => (
              <div key={tx.id} className="flex justify-between items-center group">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${tx.type === 'income' ? 'bg-teal-50 text-teal-600' : 'bg-rose-50 text-rose-600'}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={14}/> : <ArrowDownLeft size={14}/>}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 text-xs truncate">{tx.merchant || tx.category}</p>
                    <p className="text-[10px] text-slate-400">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-bold text-xs whitespace-nowrap ${tx.type === 'income' ? 'text-teal-600' : 'text-slate-700'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, baseCurrency)}
                </span>
              </div>
            ))}
            {transactions.length === 0 && <p className="text-center text-slate-400 text-xs py-2">No transactions yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}


