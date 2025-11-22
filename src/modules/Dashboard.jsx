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

  // Budget Calculation
  const monthlySpend = expenses; 
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + (parseFloat(b.limit) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Monthly Overview</h1>
        <p className="text-slate-500">
          {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} Cash Flow.
        </p>
      </div>

      {/* CASH FLOW CARD */}
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-6">
             <div>
                <p className="text-slate-400 font-medium mb-1">Net Balance</p>
                <h2 className="text-5xl font-bold tracking-tighter">{formatCurrency(balance, baseCurrency)}</h2>
             </div>
             {balance > 0 && (
                <div className="bg-teal-500/20 text-teal-300 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2">
                   <PiggyBank size={18}/> {savingsRate}% Saved
                </div>
             )}
          </div>
          
          <div className="grid grid-cols-2 gap-8 border-t border-white/10 pt-6">
            <div>
              <div className="flex items-center gap-2 text-teal-400 mb-1 font-bold text-sm uppercase tracking-wide">
                <ArrowUpRight size={16}/> Income
              </div>
              <p className="text-2xl font-semibold">{formatCurrency(income, baseCurrency)}</p>
            </div>
            <div>
              <div className="flex items-center gap-2 text-rose-400 mb-1 font-bold text-sm uppercase tracking-wide">
                <ArrowDownLeft size={16}/> Expenses
              </div>
              <p className="text-2xl font-semibold">{formatCurrency(expenses, baseCurrency)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* BUDGET HEALTH */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-center">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800 text-lg">Budget Status</h3>
            <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg text-slate-600">
              Limit: {formatCurrency(totalBudgetLimit, baseCurrency)}
            </span>
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className={`text-4xl font-bold ${monthlySpend > totalBudgetLimit ? 'text-rose-600' : 'text-slate-900'}`}>
              {((monthlySpend / (totalBudgetLimit || 1)) * 100).toFixed(0)}%
            </span>
            <span className="text-sm text-slate-400 mb-1 font-medium">spent</span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${monthlySpend > totalBudgetLimit ? 'bg-rose-500' : 'bg-teal-500'}`} 
              style={{ width: `${totalBudgetLimit > 0 ? Math.min((monthlySpend/totalBudgetLimit)*100, 100) : 0}%` }}
            ></div>
          </div>
        </div>

        {/* RECENT ACTIVITY */}
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
             <h3 className="font-bold text-slate-800 text-lg">Recent</h3>
             <Wallet size={20} className="text-slate-300"/>
          </div>
          <div className="space-y-4">
            {transactions.slice(0, 4).map(tx => (
              <div key={tx.id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${tx.type === 'income' ? 'bg-teal-50 text-teal-700' : 'bg-rose-50 text-rose-700'}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={18}/> : <ArrowDownLeft size={18}/>}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm line-clamp-1">{tx.merchant || tx.category}</p>
                    <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-teal-600' : 'text-slate-900'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, baseCurrency)}
                </span>
              </div>
            ))}
            {transactions.length === 0 && <p className="text-center text-slate-400 text-sm py-2">No transactions yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}


