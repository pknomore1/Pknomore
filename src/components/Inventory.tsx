import React, { useState, useEffect } from 'react';
import { db, auth } from '@/src/lib/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { InventoryItem } from '@/src/types';
import { Package, Plus, Minus, Search, Trash2, Tag } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '@/src/utils/error';

export function Inventory({ userRole }: { userRole: string }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: 0, unit: 'pcs', category: 'General' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'inventory'), (snap) => {
      setItems(snap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryItem)));
    });
    return unsub;
  }, []);

  const isAdmin = userRole === 'leader' || userRole === 'manager';

  const addItem = async () => {
    if (!newItem.name) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'inventory'), {
        ...newItem,
        updatedAt: new Date().toISOString(),
        lastUpdatedBy: auth.currentUser?.uid
      });
      setShowAdd(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'inventory');
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const updateQty = async (itemId: string, delta: number) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'inventory', itemId), {
        quantity: Math.max(0, item.quantity + delta),
        updatedAt: new Date().toISOString(),
        lastUpdatedBy: auth.currentUser?.uid
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `inventory/${itemId}`);
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const filtered = items.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 relative">
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Inventory</h2>
          <p className="text-gray-500">Track team tools and supplies</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              className="w-full bg-white border border-gray-100 rounded-xl pl-10 pr-4 py-2 focus:ring-2 focus:ring-indigo-500" 
              placeholder="Search stock..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setShowAdd(true)}
              className="bg-indigo-600 text-white p-2 rounded-xl shadow-lg"
            >
              <Plus />
            </button>
          )}
        </div>
      </div>

      {showAdd && (
        <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100 grid md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="text-[10px] font-bold uppercase text-indigo-400 mb-1 block">Item Name</label>
            <input className="w-full bg-white rounded-xl px-3 py-2" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-indigo-400 mb-1 block">Qty</label>
            <input type="number" className="w-full bg-white rounded-xl px-3 py-2" value={newItem.quantity} onChange={e => setNewItem({...newItem, quantity: parseInt(e.target.value)})} />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-indigo-400 mb-1 block">Unit</label>
            <input className="w-full bg-white rounded-xl px-3 py-2" value={newItem.unit} onChange={e => setNewItem({...newItem, unit: e.target.value})} />
          </div>
          <button onClick={addItem} className="bg-indigo-600 text-white font-bold py-2 rounded-xl">Add Item</button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map(item => (
          <div key={item.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Package size={80} />
            </div>
            <span className="bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase px-2 py-1 rounded-lg mb-3 inline-block">
              {item.category}
            </span>
            <h4 className="text-xl font-bold text-gray-900 mb-1">{item.name}</h4>
            <p className="text-gray-400 text-xs mb-6">Last update: {new Date(item.updatedAt).toLocaleDateString()}</p>
            
            <div className="flex items-center justify-between">
              <div>
                <span className="text-3xl font-black text-gray-900">{item.quantity}</span>
                <span className="ml-1 text-gray-400 font-bold">{item.unit}</span>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => updateQty(item.id, -1)}
                  className="bg-gray-50 hover:bg-red-50 hover:text-red-600 text-gray-400 p-2 rounded-xl transition-colors"
                >
                  <Minus size={20} />
                </button>
                <button 
                  onClick={() => updateQty(item.id, 1)}
                  className="bg-gray-50 hover:bg-green-50 hover:text-green-600 text-gray-400 p-2 rounded-xl transition-colors"
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
