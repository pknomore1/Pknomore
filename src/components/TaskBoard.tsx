import React, { useState, useEffect } from 'react';
import { db, auth } from '@/src/lib/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, doc, where, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { Task, UserProfile } from '@/src/types';
import { Plus, CheckCircle2, Circle, Clock, Trash2, UserPlus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '@/src/utils/error';

export function TaskBoard({ userRole, userId }: { userRole: string, userId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: '' });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'tasks'));
    const unsubTasks = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Task)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tasks'));

    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(d => d.data() as UserProfile));
    });

    return () => { unsubTasks(); unsubUsers(); };
  }, []);

  const isAdmin = userRole === 'leader' || userRole === 'manager';

  const createTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title || !newTask.assignedTo) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, 'tasks'), {
        ...newTask,
        status: 'todo',
        assignedBy: userId,
        createdAt: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0]
      });
      setNewTask({ title: '', description: '', assignedTo: '' });
      setShowForm(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'tasks');
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const toggleStatus = async (task: Task) => {
    if (task.assignedTo !== userId && !isAdmin) return;
    setIsSaving(true);
    const nextStatus = task.status === 'todo' ? 'in-progress' : task.status === 'in-progress' ? 'completed' : 'todo';
    try {
      await updateDoc(doc(db, 'tasks', task.id), { 
        status: nextStatus,
        completedAt: nextStatus === 'completed' ? new Date().toISOString() : null
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `tasks/${task.id}`);
    } finally {
      setTimeout(() => setIsSaving(false), 800);
    }
  };

  const myTasks = tasks.filter(t => t.assignedTo === userId);
  const otherTasks = tasks.filter(t => t.assignedTo !== userId);

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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Task Center</h2>
          <p className="text-gray-500">Manage daily goals and progress</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 font-semibold shadow-lg shadow-indigo-200 hover:scale-105 transition-transform"
          >
            <Plus size={20} />
            New Task
          </button>
        )}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.form 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            onSubmit={createTask}
            className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-xl overflow-hidden"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                placeholder="Task Title" 
                className="bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
                value={newTask.title}
                onChange={e => setNewTask({...newTask, title: e.target.value})}
              />
              <select 
                className="bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500"
                value={newTask.assignedTo}
                onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
              >
                <option value="">Assign To...</option>
                {users.map(u => <option key={u.uid} value={u.uid}>{u.displayName}</option>)}
              </select>
              <textarea 
                placeholder="Description" 
                className="bg-gray-50 border-none rounded-xl p-3 focus:ring-2 focus:ring-indigo-500 md:col-span-2"
                value={newTask.description}
                onChange={e => setNewTask({...newTask, description: e.target.value})}
              />
            </div>
            <button type="submit" className="mt-4 bg-gray-900 text-white w-full py-3 rounded-xl font-bold">Assign Task</button>
          </motion.form>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">My Daily Work</h3>
          <div className="space-y-3">
            {myTasks.length === 0 && <div className="p-8 text-center bg-white rounded-3xl text-gray-400 italic">No tasks assigned to you yet.</div>}
            {myTasks.map(task => (
              <TaskCard key={task.id} task={task} onToggle={() => toggleStatus(task)} />
            ))}
          </div>
        </section>

        {isAdmin && (
          <section>
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Team Progress</h3>
            <div className="space-y-3">
              {otherTasks.map(task => (
                <TaskCard key={task.id} task={task} onToggle={() => toggleStatus(task)} users={users} isAdminView />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, onToggle, users, isAdminView }: { task: Task, onToggle: () => void | Promise<void>, users?: UserProfile[], isAdminView?: boolean, key?: string }) {
  const assignedUser = users?.find(u => u.uid === task.assignedTo);
  
  return (
    <motion.div 
      layout
      className={`bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between shadow-sm hover:shadow-md transition-shadow ${task.status === 'completed' ? 'opacity-60' : ''}`}
    >
      <div className="flex items-start gap-4">
        <button onClick={onToggle} className="mt-1 transition-colors">
          {task.status === 'completed' ? 
            <CheckCircle2 className="text-green-500" size={24} /> : 
            task.status === 'in-progress' ? <Clock className="text-amber-500" size={24} /> : <Circle className="text-gray-300" size={24} />
          }
        </button>
        <div>
          <h4 className={`font-bold text-gray-900 ${task.status === 'completed' ? 'line-through' : ''}`}>{task.title}</h4>
          <p className="text-sm text-gray-500 line-clamp-1">{task.description}</p>
          {isAdminView && assignedUser && (
            <div className="flex items-center gap-2 mt-2">
              <img src={assignedUser.photoURL} className="w-5 h-5 rounded-full" />
              <span className="text-xs font-semibold text-gray-600">{assignedUser.displayName}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
          task.status === 'completed' ? 'bg-green-100 text-green-700' : 
          task.status === 'in-progress' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
        }`}>
          {task.status}
        </span>
      </div>
    </motion.div>
  );
}
