import React, { useState, useEffect } from 'react';
import { db, auth } from '@/src/lib/firebase';
import { collection, onSnapshot, query, addDoc, where, orderBy } from 'firebase/firestore';
import { DailyReport, Task } from '@/src/types';
import { History, FileText, Calendar, CheckSquare } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '@/src/utils/error';

export function WorkHistory({ userId, userRole }: { userId: string, userRole: string }) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showSubmit, setShowSubmit] = useState(false);
  const [summary, setSummary] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Show only my reports unless admin
    const q = userRole === 'member' 
      ? query(collection(db, 'dailyReports'), where('userId', '==', userId), orderBy('date', 'desc'))
      : query(collection(db, 'dailyReports'), orderBy('date', 'desc'));
    
    const unsub = onSnapshot(q, (snap) => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() } as DailyReport)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'dailyReports'));

    const taskUnsub = onSnapshot(query(collection(db, 'tasks'), where('assignedTo', '==', userId), where('status', '==', 'completed')), (snap) => {
      setTasks(snap.docs.map(d => d.data() as Task));
    });

    return () => { unsub(); taskUnsub(); };
  }, [userId, userRole]);

  const submitReport = async () => {
    if (!summary) return;
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'dailyReports'), {
        userId,
        date: new Date().toISOString().split('T')[0],
        activities: summary,
        tasksCompleted: tasks.length,
        createdAt: new Date().toISOString()
      });
      setSummary('');
      setShowSubmit(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'dailyReports');
    } finally {
      setTimeout(() => setIsSubmitting(false), 800);
    }
  };

  return (
    <div className="space-y-8 relative">
      <AnimatePresence>
        {isSubmitting && (
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Work History</h2>
          <p className="text-gray-500">Analyze performance and daily logs</p>
        </div>
        <button 
          onClick={() => setShowSubmit(!showSubmit)}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold shadow-lg shadow-indigo-200"
        >
          <FileText size={20} />
          End Day Report
        </button>
      </div>

      {showSubmit && (
        <div className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-xl space-y-4">
          <h3 className="font-bold text-lg">Daily Summary</h3>
          <p className="text-sm text-gray-500">Tasks completed today: <span className="font-black text-indigo-600">{tasks.length}</span></p>
          <textarea 
            placeholder="What did you achieve today?"
            className="w-full bg-gray-50 rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-indigo-500 border-none"
            value={summary}
            onChange={e => setSummary(e.target.value)}
          />
          <button onClick={submitReport} className="w-full bg-gray-900 text-white py-4 rounded-2xl font-bold">Submit Daily Log</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reports.map(report => (
          <div key={report.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-indigo-600">
                <Calendar size={18} />
                <span className="font-bold text-sm">{new Date(report.date).toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1 bg-green-50 text-green-700 px-2 py-1 rounded-lg text-xs font-black">
                <CheckSquare size={14} />
                {report.tasksCompleted}
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed italic text-sm">"{report.activities}"</p>
            <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 rounded-full" />
              <span className="text-[10px] text-gray-400 uppercase font-black tracking-widest">Employee Log #{report.id.slice(0, 5)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
