import React, { useState, useEffect } from 'react';
import { Loader2, Landmark, Settings as SettingsIcon, AlertTriangle } from 'lucide-react';
import { auth, db } from './services/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { Sidebar, MobileNav } from './components/Layout';

// Import Modules
import Dashboard from './modules/Dashboard';
import Wallet from './modules/Wallet';
import Wealth from './modules/Wealth';
import Planning from './modules/Planning';
import Scanner from './modules/Scanner';
import Settings from './modules/Settings';
import Auth from './modules/Auth';

const APP_ID = 'default-app-id';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false); // Separate loading state for data
  
  const [transactions, setTransactions] = useState([]);
  const [investments, setInvestments] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);

  // 1. Auth State Listener
  useEffect(() => {
    // If auth is null (services/firebase.js returned null), it means no config exists.
    // Stop loading and let renderView handle the "Welcome" screen.
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Listeners (Only run if User AND DB exist)
  useEffect(() => {
    if (!user || !db) return;
    setDataLoading(true);

    // Wrap in try-catch to handle permission errors gracefully
    try {
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
          setDataLoading(false);
        }
      );

      return () => { unsubTx(); unsubInv(); unsubBud(); unsubGoals(); };
    } catch (err) {
      console.error("Data Fetch Error:", err);
      setDataLoading(false);
    }
  }, [user]);

  // 3. Render Logic
  const renderView = () => {
    if (loading) return <div className="flex h-screen justify-center items-center"><Loader2 className="animate-spin text-teal-600" size={48} /></div>;
    
    // STATE A: NO CONFIGURATION (First Run)
    // If 'auth' is null, we force the user to Settings to paste keys.
    if (!auth) {
       if (activeTab === 'settings') return <Settings />;
       return <WelcomeScreen onConfig={() => setActiveTab('settings')} />;
    }

    // STATE B: CONFIGURED BUT NOT LOGGED IN
    // We have 'auth', but 'user' is null. Show Login Screen.
    // (We allow access to 'settings' in case they need to fix a bad config)
    if (!user) {
        if (activeTab === 'settings') return <Settings />;
        return <Auth />;
    }

    // STATE C: LOGGED IN (The App)
    switch(activeTab) {
      case 'dashboard': return <Dashboard transactions={transactions} investments={investments} budgets={budgets} />;
      case 'wallet': return <Wallet transactions={transactions} userId={user.uid} />;
      case 'wealth': return <Wealth investments={investments} userId={user.uid} />;
      case 'planning': return <Planning budgets={budgets} goals={goals} transactions={transactions} userId={user.uid} />;
      case 'scanner': return <Scanner userId={user.uid} onComplete={() => setActiveTab('wallet')} />;
      case 'settings': return <Settings />;
      default: return <Dashboard transactions={transactions} investments={investments} budgets={budgets} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      {/* Only show Sidebar if logged in */}
      {(user) && <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />}
      
      <main className="flex-1 overflow-hidden flex flex-col relative">
        {/* Mobile Header: Always show, but Contextual */}
        <header className="md:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-2 font-bold text-teal-700 text-xl"><Landmark size={20} /> Sterling</div>
          {/* Allow accessing settings even if locked out */}
          <button onClick={() => setActiveTab('settings')}><SettingsIcon size={20} className="text-slate-400" /></button>
        </header>
        
        <div className="flex-1 overflow-y-auto pb-24 md:pb-8 max-w-6xl mx-auto w-full">
           {/* Remove padding for Auth screens to allow full centering */}
           <div className={(!user && activeTab !== 'settings') ? "h-full" : "p-4 md:p-8"}>
              {renderView()}
           </div>
        </div>

        {(user) && <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />}
      </main>
    </div>
  );
}

function WelcomeScreen({ onConfig }) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-10 space-y-8 animate-in fade-in">
      <div className="bg-teal-100 p-8 rounded-full text-teal-700 shadow-inner"><Landmark size={64} /></div>
      <div>
        <h1 className="text-4xl font-bold text-slate-900 mb-3 tracking-tight">Sterling Finance</h1>
        <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
          The privacy-first, AI-powered financial operating system. <br/>
          To get started, connect your personal cloud.
        </p>
      </div>
      
      <div className="p-4 bg-yellow-50 border border-yellow-100 rounded-2xl max-w-sm mx-auto flex gap-3 text-left">
         <AlertTriangle className="text-yellow-600 flex-shrink-0" size={24} />
         <p className="text-xs text-yellow-800">
           <strong>Setup Required:</strong> You need a free Firebase project to store your data securely. 
         </p>
      </div>

      <button 
        onClick={onConfig} 
        className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:scale-105 transition-transform flex items-center gap-3"
      >
        <SettingsIcon size={20} /> Configure Backend
      </button>
    </div>
  );
}
