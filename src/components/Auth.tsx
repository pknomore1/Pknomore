import { auth, db } from '@/src/lib/firebase';
import { GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { LogIn, LogOut, User as UserIcon, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useEffect } from 'react';
import { UserProfile } from '@/src/types';

import { handleFirestoreError, OperationType } from '@/src/utils/error';

export function Auth() {
  const [user, setUser] = useState(auth.currentUser);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return auth.onAuthStateChanged(async (u) => {
      setUser(u);
      if (u) {
        const docRef = doc(db, 'users', u.uid);
        try {
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setProfile(docSnap.data() as UserProfile);
          } else {
            // New user, default to 'member'
            const newProfile: UserProfile = {
              uid: u.uid,
              email: u.email || '',
              displayName: u.displayName || '',
              photoURL: u.photoURL || '',
              role: 'member',
              status: 'online',
            };
            await setDoc(docRef, newProfile);
            setProfile(newProfile);
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${u.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
  }, []);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Login Error', error);
    }
  };

  const handleLogout = () => signOut(auth);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-screen font-sans bg-gray-50">
      <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
      <p className="text-indigo-600 font-black text-2xl tracking-tighter">SABAR Bro...</p>
      <p className="text-gray-400 text-sm mt-2">Connecting to TeamPulse</p>
    </div>
  );

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-12 rounded-3xl shadow-xl w-full max-w-md text-center"
        >
          <div className="w-24 h-24 bg-indigo-600 rounded-[40px] flex items-center justify-center mx-auto mb-8 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-indigo-500 to-violet-500" />
            <Zap className="text-white relative z-10" size={48} fill="currentColor" />
            <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-400 rounded-full border-8 border-white shadow-[0_0_20px_rgba(74,222,128,0.6)] animate-pulse" />
          </div>
          <h1 className="text-4xl font-sans font-black tracking-tighter text-gray-900 mb-2">TeamPulse</h1>
          <p className="text-indigo-600/60 font-bold text-xs uppercase tracking-[0.2em] mb-10">Sync Your Squad</p>
          <button
            onClick={handleLogin}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all duration-200 shadow-md hover:shadow-lg"
          >
            <LogIn size={20} />
            Sign in with Google
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-full border border-gray-100 shadow-xl">
      <div className="flex items-center gap-3 relative">
        <div className="relative">
          {profile?.photoURL ? (
            <img src={profile.photoURL} alt="Profile" className="w-10 h-10 rounded-full border-2 border-indigo-100 shadow-sm" />
          ) : (
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
              <UserIcon size={20} />
            </div>
          )}
          {/* Green light right corner of profile */}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-[0_0_10px_rgba(34,197,94,0.6)] animate-pulse" />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-gray-900 leading-none">{profile?.displayName || user.email}</span>
          <span className="text-[10px] uppercase tracking-widest font-black text-indigo-600 mt-1">{profile?.role}</span>
        </div>
      </div>
      <button
        onClick={handleLogout}
        className="text-gray-400 hover:text-red-500 transition-colors p-1"
        title="Logout"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
}
