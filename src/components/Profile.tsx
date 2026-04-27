import React, { useState, useEffect } from 'react';
import { db, auth } from '@/src/lib/firebase';
import { collection, onSnapshot, doc, updateDoc, query } from 'firebase/firestore';
import { UserProfile } from '@/src/types';
import { Phone, MessageSquare, Edit3, Image as ImageIcon, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '@/src/utils/error';

export function TeamProfile({ userRole }: { userRole: string }) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ displayName: '', phoneNumber: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'users'), (snap) => {
      setProfiles(snap.docs.map(d => d.data() as UserProfile));
    });
    return unsub;
  }, []);

  const saveProfile = async (uid: string) => {
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'users', uid), editData);
      setEditingId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${uid}`);
    } finally {
      setTimeout(() => setIsSaving(false), 800); // Give them time to see "SABAR Bro"
    }
  };

  const currentUid = auth.currentUser?.uid;

  return (
    <div className="space-y-8 relative">
      <AnimatePresence>
        {isSaving && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <div className="bg-white p-8 rounded-[40px] shadow-2xl flex flex-col items-center">
              <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-indigo-600 font-black text-2xl tracking-tighter">SABAR Bro...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Team Members</h2>
        <p className="text-gray-500">Contact and coordinate with your squad</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {profiles.map(p => (
          <div key={p.uid} className={`bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center text-center relative ${p.status === 'online' ? 'ring-2 ring-green-100' : ''}`}>
            <div className="relative mb-4">
              {p.photoURL ? (
                <img src={p.photoURL} className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white shadow-xl" />
              ) : (
                <div className="w-24 h-24 bg-gray-100 rounded-3xl flex items-center justify-center">
                  <ImageIcon className="text-gray-400" />
                </div>
              )}
              <div className={`absolute -bottom-2 -right-2 w-6 h-6 rounded-full border-4 border-white ${p.status === 'online' ? 'bg-green-500 shadow-[0_0_15px_rgba(34,197,94,0.8)] animate-pulse' : p.status === 'busy' ? 'bg-amber-500' : 'bg-gray-300'}`} />
            </div>

            {editingId === p.uid ? (
              <div className="w-full space-y-2 mb-4">
                <input 
                  className="w-full bg-gray-50 rounded-xl px-3 py-2 text-center font-bold" 
                  value={editData.displayName} 
                  onChange={e => setEditData({...editData, displayName: e.target.value})}
                  placeholder="Display Name"
                />
                <input 
                  className="w-full bg-gray-50 rounded-xl px-3 py-2 text-center" 
                  value={editData.phoneNumber} 
                  onChange={e => setEditData({...editData, phoneNumber: e.target.value})}
                  placeholder="Phone Number"
                />
                <button onClick={() => saveProfile(p.uid)} className="bg-green-500 text-white p-2 rounded-full mx-auto block hover:bg-green-600 transition-colors">
                  <Check size={20} />
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900">{p.displayName || p.email}</h3>
                <p className="text-indigo-600 font-bold uppercase tracking-widest text-[10px] mb-6">{p.role}</p>
                
                <div className="grid grid-cols-2 gap-3 w-full">
                  <a 
                    href={`tel:${p.phoneNumber}`}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${p.phoneNumber ? 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' : 'bg-gray-50 text-gray-300 cursor-not-allowed'}`}
                  >
                    <Phone size={18} /> Call
                  </a>
                  <a 
                    href={`sms:${p.phoneNumber}`}
                    className={`flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${p.phoneNumber ? 'bg-gray-900 text-white hover:bg-black' : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                  >
                    <MessageSquare size={18} /> SMS
                  </a>
                </div>
              </>
            )}

            {p.uid === currentUid && editingId !== p.uid && (
              <button 
                onClick={() => {
                  setEditingId(p.uid);
                  setEditData({ displayName: p.displayName || '', phoneNumber: p.phoneNumber || '' });
                }}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
              >
                <Edit3 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
