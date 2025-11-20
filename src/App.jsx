import React, { useState, useEffect } from 'react';
import { Loader2, Landmark, Settings as SettingsIcon } from 'lucide-react';
import { auth, db } from './services/firebase';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Sidebar, MobileNav } from './components/Layout';

// Import Modules
import Dashboard from './modules/Dashboard';
import Wallet from './modules/Wallet';
import Wealth from './modules/Wealth';
import Planning from './modules/Planning';
import Scanner from './modules/Scanner';
import Settings from './modules/Settings';

const APP_ID = 'default-app-id';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);

  // Auth
  useEffect(() => {
    // If auth service failed to init (missing config), stop loading immediately
    if (!auth) {
      setLoading(false);
      return;
    }
    
    // Try to sign in. If config is invalid/placeholder, this will fail silently,
    // user remains null, and we handle that in renderView.
    signInAnonymously(auth).catch(err => {
      console.warn("Auth Failed (Likely missing config):", err);
      setLoading(false);
    });

    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!user || !db) return;

    const unsubTx = onSnapshot(
      query(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'transactions')),
      (snap) => setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => new Date(b.date) - new Date(a.date)))
    );
    const unsubInv = onSnapshot(
      query(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'investments')),
      (snap) => setInvestments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubBud = onSnapshot(
      query(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'budgets')),
      (snap) => setBudgets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    const unsubGoals = onSnapshot(
      query(collection(db, 'artifacts', APP_ID, 'users', user.uid, 'goals')),
      (snap) => {
        setGoals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    );

    return () => { unsubTx(); unsubInv(); unsubBud(); unsubGoals(); };
  }, [user]);

  // Render Router
  const renderView = () => {
    if (loading) return <div className="flex h-full justify-center items-center"><Loader2 className="animate-spin text-teal-600" size={40} /></div>;
    
    // CRITICAL FIX: If we are not in Settings tab, and we don't have a User (because of missing config),
    // force the user to the Welcome/Settings screen.
    if ((!auth || !user) && activeTab !== 'settings') {
       return (
         <div className="flex flex-col items-center justify-center h-full text-center p-10 space-y-6 animate-in fade-in">
            <div className="bg-teal-100 p-6 rounded-full text-teal-700 mb-4">
              <Landmark size={48} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 mb-2">Welcome to Sterling</h2>
              <p className="text-slate-500 max-w-md mx-auto">
                Your personal, private finance OS. To get started, please connect your database.
              </p>
            </div>
            <button 
              onClick={() => setActiveTab('settings')} 
              className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:scale-105 transition-transform flex items-center gap-2"
            >
              <SettingsIcon size={20} /> Configure Backend
            </button>
         </div>
       );
    }

    switch(activeTab) {
      case 'dashboard': return <Dashboard transactions={transactions} investments={investments} budgets={budgets} />;
      // Safe navigation: We use optional chaining (?.) just in case, though the check above handles it.
      case 'wallet': return <Wallet transactions={transactions} userId={user?.uid} />;
      case 'wealth': return <Wealth investments={investments} userId={user?.uid} />;
      case 'planning': return <Planning budgets={budgets} goals={goals} transactions={transactions} userId={user?.uid} />;
      case 'scanner': return <Scanner userId={user?.uid} onComplete={() => setActiveTab('wallet')} />;
      case 'settings': return <Settings />;
      default: return <Dashboard transactions={transactions} investments={investments} budgets={budgets} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Hide Sidebar if not configured to reduce clutter */}
      {(auth && user) && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}
      
      <main className="flex-1 overflow-hidden flex flex-col relative">
        <header className="md:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-2 font-bold text-teal-700 text-xl"><Landmark size={20} /> Sterling</div>
          <button onClick={() => setActiveTab('settings')}><SettingsIcon size={20} className="text-slate-400" /></button>
        </header>
        
        <div className="flex-1 overflow-y-auto p-4 md:p-8 pb-24 md:pb-8 max-w-6xl mx-auto w-full">
          {renderView()}
        </div>

        {(auth && user) && <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />}
      </main>
    </div>
  );
}
