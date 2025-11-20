import React from 'react';
import { LayoutDashboard, Wallet, TrendingUp, PieChart, ScanLine, Settings, Landmark } from 'lucide-react';

export function Sidebar({ activeTab, setActiveTab }) {
  return (
    <nav className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 p-6 space-y-8 z-30">
      <div className="flex items-center gap-3 text-teal-700 font-bold text-2xl tracking-tight">
        <div className="p-2 bg-teal-100 rounded-xl"><Landmark size={24} /></div>Sterling
      </div>
      <div className="space-y-1">
        <NavButton id="dashboard" icon={LayoutDashboard} label="Overview" active={activeTab} set={setActiveTab} />
        <NavButton id="wallet" icon={Wallet} label="Wallet & Tax" active={activeTab} set={setActiveTab} />
        <NavButton id="wealth" icon={TrendingUp} label="Wealth & Assets" active={activeTab} set={setActiveTab} />
        <NavButton id="planning" icon={PieChart} label="Budgets & Goals" active={activeTab} set={setActiveTab} />
        <NavButton id="scan" icon={ScanLine} label="AI Scanner" active={activeTab} set={setActiveTab} />
      </div>
      <div className="mt-auto">
        <NavButton id="settings" icon={Settings} label="Config" active={activeTab} set={setActiveTab} />
      </div>
    </nav>
  );
}

export function MobileNav({ activeTab, setActiveTab }) {
  return (
    <div className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 p-2 flex justify-around items-center z-30 safe-area-pb">
      <NavIcon id="dashboard" icon={LayoutDashboard} active={activeTab} set={setActiveTab} />
      <NavIcon id="wallet" icon={Wallet} active={activeTab} set={setActiveTab} />
      <button onClick={() => setActiveTab('scan')} className="bg-teal-600 text-white p-4 rounded-full shadow-lg -mt-8 border-4 border-slate-50"><ScanLine size={24} /></button>
      <NavIcon id="wealth" icon={TrendingUp} active={activeTab} set={setActiveTab} />
      <NavIcon id="planning" icon={PieChart} active={activeTab} set={setActiveTab} />
    </div>
  );
}

const NavButton = ({ id, icon: Icon, label, active, set }) => (
  <button onClick={() => set(id === 'scan' ? 'scanner' : id)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active === id || (id === 'scan' && active === 'scanner') ? 'bg-teal-50 text-teal-700 font-bold' : 'text-slate-500 hover:bg-slate-50'}`}>
    <Icon size={20} /> {label}
  </button>
);

const NavIcon = ({ id, icon: Icon, active, set }) => (
  <button onClick={() => set(id)} className={`p-3 rounded-xl ${active === id ? 'text-teal-600 bg-teal-50' : 'text-slate-400'}`}>
    <Icon size={24} />
  </button>
);
