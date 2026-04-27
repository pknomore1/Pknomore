import React, { useState, useEffect } from 'react';
import { auth, db } from '@/src/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { UserProfile } from '@/src/types';
import { Auth } from '@/src/components/Auth';
import { TeamMap } from '@/src/components/Map';
import { TaskBoard } from '@/src/components/TaskBoard';
import { Inventory } from '@/src/components/Inventory';
import { WorkHistory } from '@/src/components/History';
import { TeamProfile } from '@/src/components/Profile';
import { Chat } from '@/src/components/Chat';
import { Zap, MessageCircle, Map as MapIcon, ClipboardList, Package, History as HistoryIcon, Users, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Tab = 'dashboard' | 'chat' | 'map' | 'tasks' | 'inventory' | 'history' | 'team';

export default function App() {
  const [user, setUser] = useState(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');

  useEffect(() => {
    const handleTabChange = (e: any) => setActiveTab(e.detail);
    window.addEventListener('changeTab', handleTabChange);

    let unsubFirestore: (() => void) | null = null;
    
    const unsubAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (unsubFirestore) {
        unsubFirestore();
        unsubFirestore = null;
      }
      
      if (u) {
        unsubFirestore = onSnapshot(doc(db, 'users', u.uid), (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as UserProfile);
          }
        });
      } else {
        setProfile(null);
      }
    });

    return () => {
      window.removeEventListener('changeTab', handleTabChange);
      unsubAuth();
      if (unsubFirestore) unsubFirestore();
    };
  }, []);

  if (!user) return <Auth />;
  
  if (!profile) return (
    <div className="flex flex-col items-center justify-center h-screen font-sans bg-gray-50">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-indigo-600 font-black text-2xl tracking-tighter">SABAR Bro...</p>
      <p className="text-gray-400 text-sm mt-2">Connecting to TeamPulse</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-gray-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <Auth />
      
      {/* Sidebar / Navigation */}
      <nav className="fixed left-0 top-0 bottom-0 w-24 md:w-64 bg-white border-r border-gray-100 flex flex-col z-40">
        <div className="p-6 md:p-8 flex items-center justify-center md:justify-start gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-100 relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600 to-indigo-400" />
            <Zap className="text-white relative z-10" size={28} fill="currentColor" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-[0_0_10px_rgba(74,222,128,0.8)] animate-pulse" />
          </div>
          <div className="hidden md:flex flex-col">
            <span className="font-sans font-black text-2xl tracking-tighter leading-none mb-0.5">TeamPulse</span>
            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">Elite Squad</span>
          </div>
        </div>

        <div className="flex-1 px-4 space-y-2 py-6">
          <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
          <NavButton active={activeTab === 'chat'} onClick={() => setActiveTab('chat')} icon={<MessageCircle size={20} />} label="Chat Hub" />
          <NavButton active={activeTab === 'map'} onClick={() => setActiveTab('map')} icon={<MapIcon size={20} />} label="Live Map" />
          <NavButton active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} icon={<ClipboardList size={20} />} label="Daily Tasks" />
          <NavButton active={activeTab === 'inventory'} onClick={() => setActiveTab('inventory')} icon={<Package size={20} />} label="Inventory" />
          <NavButton active={activeTab === 'history'} onClick={() => setActiveTab('history')} icon={<HistoryIcon size={20} />} label="Work History" />
          <NavButton active={activeTab === 'team'} onClick={() => setActiveTab('team')} icon={<Users size={20} />} label="Team Members" />
        </div>

        <div className="p-6 mt-auto">
          <div className="hidden md:block bg-indigo-50 p-4 rounded-2xl">
            <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-1">Status</h4>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm font-bold text-indigo-900">System Live</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="pl-24 md:pl-64 pt-6 md:pt-10 min-h-screen">
        <div className="max-w-7xl mx-auto px-6 md:px-10 pb-24">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <TabContent tab={activeTab} profile={profile!} />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function NavButton({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center justify-center md:justify-start gap-4 p-4 rounded-2xl transition-all duration-200 group ${
        active 
          ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' 
          : 'text-gray-400 hover:bg-gray-50 hover:text-indigo-600'
      }`}
    >
      <div className={active ? 'scale-110' : 'group-hover:scale-110 transition-transform'}>{icon}</div>
      <span className="hidden md:block font-bold text-sm">{label}</span>
    </button>
  );
}

function TabContent({ tab, profile }: { tab: Tab, profile: UserProfile }) {
  if (!profile) return null; // Extra safety
  const userId = profile.uid;
  const userRole = profile.role;

  switch (tab) {
    case 'dashboard':
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-10 rounded-[40px] text-white shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 p-10 opacity-10 rotate-12 group-hover:rotate-45 transition-transform duration-700">
                 <LayoutDashboard size={150} />
               </div>
               <h1 className="text-4xl font-black mb-2 tracking-tighter leading-none">Welcome back, {profile.displayName?.split(' ')[0] || 'User'}</h1>
               <p className="text-indigo-100 opacity-80 text-lg font-medium">Your elite squad is online and ready. Let's conquer the day.</p>
               <div className="flex gap-4 mt-10">
                 <div className="bg-white/10 backdrop-blur-md px-8 py-5 rounded-[2rem] border border-white/10">
                   <p className="text-[10px] uppercase font-black tracking-widest text-indigo-200">Role</p>
                   <p className="text-2xl font-black">{userRole}</p>
                 </div>
                 <div className="bg-white/10 backdrop-blur-md px-8 py-5 rounded-[2rem] border border-white/10">
                   <p className="text-[10px] uppercase font-black tracking-widest text-indigo-200">Team Status</p>
                   <p className="text-2xl font-black">Elite</p>
                 </div>
               </div>
               <button onClick={() => window.dispatchEvent(new CustomEvent('changeTab', { detail: 'chat' }))} className="mt-8 bg-white text-indigo-600 px-8 py-4 rounded-3xl font-black tracking-tighter hover:bg-opacity-90 transition-all shadow-xl shadow-indigo-900/20 active:scale-95">Open Chat Hub</button>
            </div>
            <TaskBoard userRole={userRole} userId={userId} />
          </div>
          <div className="space-y-8">
             <div className="bg-white p-2 rounded-[40px] shadow-xl border border-gray-100">
               <TeamMap />
             </div>
             <TeamProfile userRole={userRole} />
          </div>
        </div>
      );
    case 'chat':
      return <Chat userProfile={profile} />;
    case 'map':
      return <TeamMap />;
    case 'tasks':
      return <TaskBoard userRole={userRole} userId={userId} />;
    case 'inventory':
      return <Inventory userRole={userRole} />;
    case 'history':
      return <WorkHistory userId={userId} userRole={userRole} />;
    case 'team':
      return <TeamProfile userRole={userRole} />;
    default:
      return null;
  }
}
