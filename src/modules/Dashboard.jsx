import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { formatGBP } from '../utils/helpers';

export default function Dashboard({ transactions, investments, budgets }) {
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
  const totalInvested = investments.reduce((s, i) => s + (i.currentValue || 0), 0);
  const netWorth = (totalIncome - totalExpense) + totalInvested;

  const currentMonth = new Date().getMonth();
  const monthlySpend = transactions
    .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === currentMonth)
    .reduce((sum, t) => sum + (t.amount || 0), 0);
  const totalBudgetLimit = budgets.reduce((sum, b) => sum + (parseFloat(b.limit) || 0), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Financial Pulse</h1>
        <p className="text-slate-500">Your complete wealth overview.</p>
      </div>

      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl -mr-10 -mt-10"></div>
        <div className="relative z-10">
          <p className="text-slate-400 font-medium mb-1">Total Net Worth</p>
          <h2 className="text-5xl font-bold tracking-tighter mb-8">{formatGBP(netWorth)}</h2>
          <div className="grid grid-cols-3 gap-4 border-t border-white/10 pt-6">
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold mb-1">Assets</p>
              <p className="text-xl font-semibold text-teal-400">{formatGBP(totalInvested)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold mb-1">Cash In</p>
              <p className="text-xl font-semibold text-white">{formatGBP(totalIncome)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 uppercase font-bold mb-1">Cash Out</p>
              <p className="text-xl font-semibold text-rose-400">{formatGBP(totalExpense)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800">Monthly Budget</h3>
            <span className="text-xs font-bold bg-slate-100 px-2 py-1 rounded-lg text-slate-600">
              {new Date().toLocaleString('default', { month: 'long' })}
            </span>
          </div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-2xl font-bold text-slate-900">{formatGBP(monthlySpend)}</span>
            <span className="text-sm text-slate-400 mb-1">/ {formatGBP(totalBudgetLimit)}</span>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full ${monthlySpend > totalBudgetLimit ? 'bg-rose-500' : 'bg-teal-500'}`} 
              style={{ width: `${totalBudgetLimit > 0 ? Math.min((monthlySpend/totalBudgetLimit)*100, 100) : 0}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-4">Recent Transactions</h3>
          <div className="space-y-3">
            {transactions.slice(0, 3).map(tx => (
              <div key={tx.id} className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${tx.type === 'income' ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'}`}>
                    {tx.type === 'income' ? <ArrowUpRight size={14}/> : <ArrowDownLeft size={14}/>}
                  </div>
                  <div className="text-sm">
                    <p className="font-bold text-slate-900">{tx.merchant || tx.category}</p>
                    <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <span className={`font-bold text-sm ${tx.type === 'income' ? 'text-teal-600' : 'text-slate-900'}`}>
                  {tx.type === 'income' ? '+' : '-'}{formatGBP(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
