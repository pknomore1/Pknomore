import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '@/src/lib/firebase';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, 
  serverTimestamp, updateDoc, doc, getDocs, limit, setDoc,
  arrayUnion, arrayRemove
} from 'firebase/firestore';
import { ChatRoom, Message, UserProfile } from '@/src/types';
import { 
  Send, Image as ImageIcon, Mic, X, Users, Search, 
  Plus, MessageSquare, MoreVertical, Camera, Square, Play, Pause,
  Type, RotateCcw, Sun, Contrast, Check, CheckCheck, Smile, Heart, ThumbsUp, PartyPopper, Zap, Pin, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { handleFirestoreError, OperationType } from '@/src/utils/error';

const REACTIONS_LIST = ['👍', '❤️', '🔥', '👏', '😂', '😮'];

interface EditProps {
  image: string;
  onSave: (editedImage: string) => void;
  onCancel: () => void;
}

const PhotoEditor = ({ image, onSave, onCancel }: EditProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [filter, setFilter] = useState<'none' | 'grayscale' | 'sepia' | 'invert'>('none');
  const [brightness, setBrightness] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const lastMousePos = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Use square canvas for easy cropping
      const size = Math.min(img.width, img.height);
      canvas.width = 600;
      canvas.height = 600;
      drawImage(ctx, img);
    };
    img.src = image;
  }, [image, filter, brightness, rotation, zoom, pan]);

  const drawImage = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    const canvas = ctx.canvas;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    // Center of canvas
    ctx.translate(canvas.width / 2 + pan.x, canvas.height / 2 + pan.y);
    // Apply Rotation
    ctx.rotate((rotation * Math.PI) / 180);
    // Apply Zoom
    ctx.scale(zoom, zoom);
    // Translate back to center point
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    let filterStr = '';
    if (filter === 'grayscale') filterStr += 'grayscale(100%) ';
    if (filter === 'sepia') filterStr += 'sepia(100%) ';
    if (filter === 'invert') filterStr += 'invert(100%) ';
    filterStr += `brightness(${brightness}%)`;
    
    ctx.filter = filterStr;
    
    // Draw image centered in the square canvas
    const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const x = (canvas.width / 2) - (img.width / 2) * scale;
    const y = (canvas.height / 2) - (img.height / 2) * scale;
    ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
    
    ctx.restore();
    
    // Draw a subtle focus ring to indicate cropping area
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, canvas.width-4, canvas.height-4);
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    setIsDragging(true);
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const dx = clientX - lastMousePos.current.x;
    const dy = clientY - lastMousePos.current.y;
    
    setPan(p => ({ x: p.x + dx, y: p.y + dy }));
    lastMousePos.current = { x: clientX, y: clientY };
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.8);
    onSave(dataUrl);
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/95 flex flex-col items-center justify-center p-4 backdrop-blur-2xl">
      <div className="max-w-2xl w-full flex flex-col gap-6">
        <div className="flex items-center justify-between text-white">
          <div>
            <h3 className="text-2xl font-black tracking-tighter">Photo Lab</h3>
            <p className="text-[10px] uppercase font-black text-indigo-400 tracking-widest">Crop & Polish</p>
          </div>
          <button onClick={onCancel} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
            <X size={24} />
          </button>
        </div>

        <div 
          className="relative aspect-square bg-gray-900 rounded-[32px] overflow-hidden flex items-center justify-center cursor-move shadow-2xl ring-1 ring-white/10"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={() => setIsDragging(false)}
        >
          <canvas ref={canvasRef} className="w-full h-full object-contain" />
          <div className="absolute inset-0 pointer-events-none border-4 border-dashed border-white/20 rounded-[32px]" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-[10px] font-black text-white uppercase tracking-widest">Drag to Pan</div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <button onClick={() => setFilter('none')} className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'none' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-white/10 text-white hover:bg-white/20'}`}>None</button>
          <button onClick={() => setFilter('grayscale')} className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'grayscale' ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}>Mono</button>
          <button onClick={() => setFilter('sepia')} className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'sepia' ? 'bg-indigo-200 text-indigo-900' : 'bg-white/10 text-white hover:bg-white/20'}`}>Vibe</button>
          <button onClick={() => setFilter('invert')} className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${filter === 'invert' ? 'bg-red-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>X-Ray</button>
        </div>

        <div className="space-y-4">
          <div className="flex items-center gap-4 text-white">
            <Search size={20} className="text-gray-400" />
            <input 
              type="range" min="1" max="3" step="0.1" value={zoom} 
              onChange={(e) => setZoom(parseFloat(e.target.value))} 
              className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-[10px] font-black w-8 text-right">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-4 text-white">
            <Sun size={20} className="text-gray-400" />
            <input 
              type="range" min="50" max="150" value={brightness} 
              onChange={(e) => setBrightness(parseInt(e.target.value))} 
              className="flex-1 h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-indigo-500"
            />
            <span className="text-[10px] font-black w-8 text-right">{brightness}%</span>
          </div>
        </div>

        <div className="flex gap-4">
          <button onClick={() => setRotation(r => (r + 90) % 360)} className="flex-1 bg-white/10 text-white py-5 rounded-3xl flex items-center justify-center gap-2 font-black tracking-tighter uppercase text-xs ring-1 ring-white/10 hover:bg-white/20 transition-all">
            <RotateCcw size={20} /> Rotate
          </button>
          <button onClick={handleSave} className="flex-2 bg-indigo-600 text-white py-5 rounded-3xl flex items-center justify-center gap-2 font-black tracking-tighter uppercase text-xl shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 transition-all active:scale-95">
            <Check size={24} /> Send Photo
          </button>
        </div>
      </div>
    </div>
  );
};

export function Chat({ userProfile }: { userProfile: UserProfile }) {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showManageMembers, setShowManageMembers] = useState(false);
  const [showPinnedOnly, setShowPinnedOnly] = useState(false);

  const isAdmin = userProfile.role === 'leader' || userProfile.role === 'manager';

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  const togglePin = async (messageId: string) => {
    if (!activeRoom) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    try {
      await updateDoc(doc(db, 'chatRooms', activeRoom.id, 'messages', messageId), {
        isPinned: !msg.isPinned
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chatRooms/${activeRoom.id}/messages/${messageId}`);
    }
  };

  const removeMember = async (userId: string) => {
    if (!activeRoom || !isAdmin) return;
    try {
      await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
        participants: arrayRemove(userId)
      });
      // Also close active room for the admin if they removed themselves (though unlikely)
      if (userId === userProfile.uid) setActiveRoom(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chatRooms/${activeRoom.id}`);
    }
  };

  const addMember = async (userId: string) => {
    if (!activeRoom || !isAdmin) return;
    try {
      await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
        participants: arrayUnion(userId)
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chatRooms/${activeRoom.id}`);
    }
  };

  useEffect(() => {
    // Rooms listener
    const qRooms = query(
      collection(db, 'chatRooms'),
      where('participants', 'array-contains', userProfile.uid),
      orderBy('createdAt', 'desc')
    );
    const unsubRooms = onSnapshot(qRooms, (snap) => {
      setRooms(snap.docs.map(d => ({ ...d.data(), id: d.id } as ChatRoom)));
    });

    // Users listener for new chats
    onSnapshot(collection(db, 'users'), (snap) => {
      setUsers(snap.docs.map(d => d.data() as UserProfile).filter(u => u.uid !== userProfile.uid));
    });

    return () => unsubRooms();
  }, [userProfile.uid]);

  useEffect(() => {
    if (!activeRoom) return;
    const qMessages = query(
      collection(db, 'chatRooms', activeRoom.id, 'messages'),
      orderBy('createdAt', 'asc'),
      limit(100)
    );
    const unsubMessages = onSnapshot(qMessages, (snap) => {
      const msgs = snap.docs.map(d => ({ ...d.data(), id: d.id } as Message));
      setMessages(msgs);

      // Auto mark as read
      msgs.forEach(m => {
        if (m.senderId !== userProfile.uid && (!m.readBy || !m.readBy.includes(userProfile.uid))) {
          updateDoc(doc(db, 'chatRooms', activeRoom.id, 'messages', m.id), {
            readBy: arrayUnion(userProfile.uid)
          }).catch(err => console.error("Read receipt error", err));
        }
      });
    });
    return () => unsubMessages();
  }, [activeRoom]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleReaction = async (messageId: string, emoji: string) => {
    if (!activeRoom) return;
    const msg = messages.find(m => m.id === messageId);
    if (!msg) return;

    const currentReactions = msg.reactions?.[emoji] || [];
    const hasReacted = currentReactions.includes(userProfile.uid);

    const update: any = {};
    update[`reactions.${emoji}`] = hasReacted ? arrayRemove(userProfile.uid) : arrayUnion(userProfile.uid);

    try {
      await updateDoc(doc(db, 'chatRooms', activeRoom.id, 'messages', messageId), update);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `chatRooms/${activeRoom.id}/messages/${messageId}`);
    }
  };

  const startPrivateChat = async (targetUser: UserProfile) => {
    const existing = rooms.find(r => r.type === 'private' && r.participants.includes(targetUser.uid));
    if (existing) {
      setActiveRoom(existing);
      return;
    }

    const roomId = [userProfile.uid, targetUser.uid].sort().join('_');
    const roomRef = doc(db, 'chatRooms', roomId);
    const newRoom: ChatRoom = {
      id: roomId,
      type: 'private',
      participants: [userProfile.uid, targetUser.uid],
      createdAt: serverTimestamp(),
    };
    try {
      await setDoc(roomRef, newRoom);
      setActiveRoom({ ...newRoom, id: roomId });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `chatRooms/${roomId}`);
    }
  };

  const createGroup = async () => {
    if (!groupName || selectedParticipants.length === 0) return;
    try {
      const docRef = await addDoc(collection(db, 'chatRooms'), {
        name: groupName,
        type: 'group',
        participants: [userProfile.uid, ...selectedParticipants],
        createdAt: serverTimestamp(),
      });
      setShowNewGroup(false);
      setGroupName('');
      setSelectedParticipants([]);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'chatRooms');
    }
  };

  const sendMessage = async (type: 'text' | 'image' | 'audio', content?: string) => {
    if (!activeRoom) return;
    if (type === 'text' && !text.trim()) return;

    try {
      const msg: any = {
        chatRoomId: activeRoom.id,
        senderId: userProfile.uid,
        senderName: userProfile.displayName || 'User',
        type,
        createdAt: serverTimestamp(),
      };
      if (type === 'text') msg.text = text;
      if (type === 'image') msg.mediaUrl = content;
      if (type === 'audio') msg.mediaUrl = content;

      await addDoc(collection(db, 'chatRooms', activeRoom.id, 'messages'), msg);
      
      // Update last message in room
      await updateDoc(doc(db, 'chatRooms', activeRoom.id), {
        lastMessage: {
          text: type === 'text' ? text : `[${type}]`,
          senderId: userProfile.uid,
          timestamp: serverTimestamp(),
        }
      });

      if (type === 'text') setText('');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `chatRooms/${activeRoom.id}/messages`);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (e) => {
        audioChunks.current.push(e.data);
      };

      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          sendMessage('audio', base64data);
        };
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic error", err);
    }
  };

  const stopRecording = () => {
    mediaRecorder.current?.stop();
    setIsRecording(false);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setEditingPhoto(reader.result as string);
    reader.readAsDataURL(file);
  };

  const filteredRooms = rooms.filter(r => {
    if (!search) return true;
    if (r.name?.toLowerCase().includes(search.toLowerCase())) return true;
    const otherParticipantId = r.participants.find(p => p !== userProfile.uid);
    const otherUser = users.find(u => u.uid === otherParticipantId);
    return otherUser?.displayName?.toLowerCase().includes(search.toLowerCase());
  });

  const filteredUsers = users.filter(u => 
    u.displayName?.toLowerCase().includes(search.toLowerCase()) || 
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-[calc(100vh-120px)] bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100">
      {/* Sidebar */}
      <div className="w-80 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black tracking-tighter">Messages</h2>
            <button onClick={() => setShowNewGroup(true)} className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-colors">
              <Plus size={20} />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" placeholder="Search conversations..." 
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-6">
          <div className="space-y-1">
            {search && filteredRooms.length > 0 && (
              <p className="px-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Conversations</p>
            )}
            
            {filteredRooms.map(r => {
              const otherParticipant = r.participants.find(p => p !== userProfile.uid);
              const otherUser = users.find(u => u.uid === otherParticipant);
              const name = r.name || otherUser?.displayName || 'Unknown';
              const image = r.type === 'group' 
                ? `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff` 
                : (otherUser?.photoURL || `https://ui-avatars.com/api/?name=${name}`);

              return (
                <button 
                  key={r.id} onClick={() => { setActiveRoom(r); setSearch(''); }}
                  className={`w-full p-4 rounded-3xl flex items-center gap-4 transition-all text-left ${activeRoom?.id === r.id && !search ? 'bg-white shadow-xl shadow-indigo-100 ring-1 ring-indigo-100 scale-102 z-10' : 'hover:bg-white/60'}`}
                >
                  <div className="relative flex-shrink-0">
                    <img src={image} className="w-14 h-14 rounded-2xl object-cover" />
                    {r.type === 'private' && otherUser?.status === 'online' && (
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-4 border-white shadow-lg" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-black text-gray-900 truncate tracking-tight">{name}</p>
                      {r.lastMessage && (
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          {new Date(r.lastMessage.timestamp?.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate font-medium">
                      {r.lastMessage?.senderId === userProfile.uid ? 'You: ' : ''}{r.lastMessage?.text || 'No messages yet'}
                    </p>
                  </div>
                </button>
              );
            })}

            {search && filteredUsers.length > 0 && (
              <>
                <p className="px-3 text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-6 mb-2">New Chat</p>
                {filteredUsers.map(u => (
                  <button 
                    key={u.uid} onClick={() => { startPrivateChat(u); setSearch(''); }}
                    className="w-full p-3 rounded-2xl hover:bg-white flex items-center gap-3 transition-all text-left group border border-transparent hover:border-indigo-100 hover:shadow-sm"
                  >
                    <div className="relative">
                      <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-12 h-12 rounded-xl" />
                      {u.status === 'online' && <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{u.displayName}</p>
                      <p className="text-xs text-gray-400 truncate">{u.role}</p>
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col relative bg-white">
        {activeRoom ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-indigo-600">
                  {activeRoom.name ? activeRoom.name[0] : (users.find(u => u.uid === activeRoom.participants.find(p => p !== userProfile.uid))?.displayName?.[0] || '?')}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-lg tracking-tight leading-none">
                      {activeRoom.name || users.find(u => u.uid === activeRoom.participants.find(p => p !== userProfile.uid))?.displayName || 'Chat'}
                    </h3>
                    {isAdmin && (
                      <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full ring-1 ring-amber-200 flex items-center gap-1">
                        <Zap size={10} fill="currentColor" /> BIGG BOSS
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{activeRoom.type} Chat</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowPinnedOnly(!showPinnedOnly)}
                  className={`p-2 rounded-2xl transition-all ${showPinnedOnly ? 'bg-amber-100 text-amber-600 shadow-inner' : 'text-gray-400 hover:text-amber-500 hover:bg-amber-50'}`}
                  title="Pinned Messages"
                >
                  <Pin size={20} fill={showPinnedOnly ? "currentColor" : "none"} />
                </button>
                {isAdmin && activeRoom.type === 'group' && (
                  <button 
                    onClick={() => setShowManageMembers(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-2xl font-bold text-sm hover:bg-indigo-100 transition-all border border-indigo-100"
                  >
                    <Users size={16} /> Manage
                  </button>
                )}
                <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/30">
              {showPinnedOnly && (
                <div className="bg-amber-50 border border-amber-100 p-4 rounded-3xl mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-xl text-amber-600"><Pin size={18} fill="currentColor" /></div>
                    <p className="text-sm font-black text-amber-900 tracking-tighter uppercase">Viewing Pinned Intel</p>
                  </div>
                  <button onClick={() => setShowPinnedOnly(false)} className="text-xs font-black text-amber-600 uppercase tracking-widest hover:underline">Show All</button>
                </div>
              )}
              {messages.filter(m => !showPinnedOnly || m.isPinned).map((m, i) => {
                const isMe = m.senderId === userProfile.uid;
                const showSender = !isMe && activeRoom.type === 'group' && (i === 0 || messages[i-1].senderId !== m.senderId);

                return (
                  <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    {showSender && <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-1 ml-3">{m.senderName}</p>}
                    <div className="relative group/msg">
                      {m.isPinned && (
                        <div className={`flex items-center gap-1 mb-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <Pin size={10} className="text-amber-500" fill="currentColor" />
                          <span className="text-[8px] font-black uppercase text-amber-600 tracking-widest">Pinned</span>
                        </div>
                      )}
                      <div className={`max-w-md rounded-[24px] px-5 py-3 shadow-sm ${
                        isMe 
                          ? 'bg-indigo-600 text-white rounded-tr-none' 
                          : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none'
                      } ${m.isPinned ? 'ring-2 ring-amber-200 shadow-amber-100' : ''}`}>
                        {m.type === 'text' && <p className="leading-relaxed font-medium">{m.text}</p>}
                        {m.type === 'image' && (
                          <div className="p-1">
                            <img src={m.mediaUrl} className="max-w-xs rounded-xl shadow-lg border-2 border-white/10" alt="Shared photo" />
                          </div>
                        )}
                        {m.type === 'audio' && (
                          <div className="flex items-center gap-3 min-w-[200px]">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isMe ? 'bg-white/20' : 'bg-indigo-50'}`}>
                              <Play size={16} fill="currentColor" />
                            </div>
                            <audio src={m.mediaUrl} controls className="h-8 max-w-[150px] contrast-125 saturate-150 rounded-full" />
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-4 mt-1">
                          <p className={`text-[9px] font-bold uppercase tracking-wider opacity-70`}>
                            {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                          </p>
                          {isMe && (
                            <div className="flex items-center">
                              {m.readBy && m.readBy.length > 0 ? (
                                <CheckCheck size={12} className="text-indigo-200" />
                              ) : (
                                <Check size={12} className="text-indigo-300" />
                              )}
                            </div>
                          )}
                        </div>

                        {/* Reactions Display */}
                        {m.reactions && Object.entries(m.reactions).some(([_, users]) => (users as string[]).length > 0) && (
                          <div className={`flex flex-wrap gap-1 mt-2 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            {Object.entries(m.reactions).map(([emoji, users]) => (users as string[]).length > 0 && (
                              <button 
                                key={emoji} 
                                onClick={() => toggleReaction(m.id, emoji)}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-all ${
                                  (users as string[]).includes(userProfile.uid) 
                                    ? 'bg-indigo-500 text-white shadow-sm ring-1 ring-white/20' 
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                              >
                                <span>{emoji}</span>
                                <span>{(users as string[]).length}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Reaction Picker & Pin Trigger */}
                      <div className={`absolute top-0 ${isMe ? '-left-20' : '-right-20'} opacity-0 group-hover/msg:opacity-100 transition-opacity flex flex-col gap-1`}>
                        <div className="bg-white shadow-xl rounded-2xl border border-gray-100 p-1 flex gap-1 items-center animate-in fade-in slide-in-from-bottom-2">
                          {REACTIONS_LIST.slice(0, 3).map(emoji => (
                            <button 
                              key={emoji} 
                              onClick={() => toggleReaction(m.id, emoji)}
                              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors text-lg"
                            >
                              {emoji}
                            </button>
                          ))}
                          <div className="w-[1px] h-4 bg-gray-100 mx-1" />
                          <button 
                            onClick={() => togglePin(m.id)}
                            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-colors ${m.isPinned ? 'text-amber-500 bg-amber-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          >
                            <Pin size={16} fill={m.isPinned ? "currentColor" : "none"} />
                          </button>
                          <button className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-xl transition-colors text-gray-400">
                             <Smile size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={scrollRef} />
            </div>

            {/* Input */}
            <div className="p-6 bg-white border-t border-gray-50">
              <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-[32px] border border-gray-100 shadow-inner">
                <div className="flex gap-1 pl-2">
                  <label className="p-3 text-gray-400 hover:text-indigo-600 rounded-full hover:bg-white transition-all cursor-pointer">
                    <ImageIcon size={22} />
                    <input type="file" accept="image/*" onChange={handleImagePick} className="hidden" />
                  </label>
                  <button 
                    onMouseDown={startRecording} onMouseUp={stopRecording} 
                    onTouchStart={startRecording} onTouchEnd={stopRecording}
                    className={`p-3 rounded-full transition-all ${isRecording ? 'bg-red-100 text-red-600 scale-125 shadow-lg animate-pulse' : 'text-gray-400 hover:text-indigo-600 hover:bg-white'}`}
                  >
                    <Mic size={22} />
                  </button>
                </div>
                <input 
                  type="text" placeholder={isRecording ? "Listening..." : "Type your message..."}
                  value={text} onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage('text')}
                  disabled={isRecording}
                  className="flex-1 bg-transparent py-3 px-2 outline-none font-medium placeholder:text-gray-400"
                />
                <button 
                  onClick={() => sendMessage('text')}
                  className="p-4 bg-indigo-600 text-white rounded-[24px] shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:scale-105 active:scale-95 transition-all"
                >
                  <Send size={20} />
                </button>
              </div>
              {isRecording && <p className="text-[10px] font-black text-red-500 uppercase tracking-widest text-center mt-3 animate-pulse">Release to send Audio</p>}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-gray-50/20">
            <div className="w-24 h-24 bg-white rounded-[40px] shadow-xl flex items-center justify-center mb-6 text-indigo-600 border border-indigo-50">
              <MessageSquare size={48} />
            </div>
            <h3 className="text-3xl font-black tracking-tighter mb-2">TeamPulse Chat</h3>
            <p className="text-gray-400 max-w-sm font-medium">Select a teammate or group to start collaborating in real-time.</p>
          </div>
        )}
      </div>

      {/* New Group Modal */}
      <AnimatePresence>
        {showNewGroup && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                <h3 className="text-2xl font-black tracking-tighter">Create Group</h3>
                <button onClick={() => setShowNewGroup(false)} className="p-2 hover:bg-gray-50 rounded-full transition-colors"><X /></button>
              </div>
              
              <div className="p-8 space-y-6 overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Group Name</label>
                  <input 
                    type="text" placeholder="Squad Name..." value={groupName} onChange={(e) => setGroupName(e.target.value)}
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold"
                  />
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Teammates</label>
                  <div className="space-y-2">
                    {users.map(u => (
                      <label key={u.uid} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 cursor-pointer transition-colors border border-transparent">
                        <input 
                          type="checkbox" checked={selectedParticipants.includes(u.uid)}
                          onChange={(e) => e.target.checked 
                            ? setSelectedParticipants(p => [...p, u.uid]) 
                            : setSelectedParticipants(p => p.filter(id => id !== u.uid))}
                          className="w-5 h-5 rounded-md border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-10 h-10 rounded-xl" />
                        <span className="font-bold">{u.displayName}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50/50">
                <button 
                  onClick={createGroup}
                  disabled={!groupName || selectedParticipants.length === 0}
                  className="w-full py-4 bg-indigo-600 text-white rounded-3xl font-black tracking-tighter text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
                >
                  Create Squad
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Manage Members Modal */}
      <AnimatePresence>
        {showManageMembers && activeRoom && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/40 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-indigo-600 text-white">
                <div>
                  <h3 className="text-2xl font-black tracking-tighter">Manage Squad</h3>
                  <p className="text-[10px] font-black uppercase opacity-80 tracking-widest">Admin Control Center</p>
                </div>
                <button onClick={() => setShowManageMembers(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X /></button>
              </div>
              
              <div className="p-8 space-y-6 overflow-y-auto">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Members</label>
                  <div className="space-y-2">
                    {users.filter(u => activeRoom.participants.includes(u.uid)).map(u => (
                      <div key={u.uid} className="flex items-center justify-between p-4 rounded-3xl bg-gray-50 border border-gray-100 group hover:border-indigo-100 transition-all">
                        <div className="flex items-center gap-3">
                          <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-10 h-10 rounded-xl" />
                          <div>
                            <p className="font-bold text-gray-900">{u.displayName}</p>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">{u.role}</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => removeMember(u.uid)}
                          className="p-3 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ))}
                    {/* Always show self if manager */}
                    <div className="flex items-center justify-between p-4 rounded-3xl bg-indigo-50/50 border border-indigo-100">
                      <div className="flex items-center gap-3">
                        <img src={userProfile.photoURL || `https://ui-avatars.com/api/?name=${userProfile.displayName}`} className="w-10 h-10 rounded-xl" />
                        <div>
                          <p className="font-bold text-gray-900">{userProfile.displayName} (You)</p>
                          <p className="text-[10px] text-indigo-600 uppercase font-black tracking-widest">Master Admin</p>
                        </div>
                      </div>
                      <div className="p-3 text-indigo-400">
                        <CheckCheck size={18} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Add Teammates</label>
                  <div className="space-y-2">
                    {users.filter(u => !activeRoom.participants.includes(u.uid)).map(u => (
                      <button 
                        key={u.uid} 
                        onClick={() => addMember(u.uid)}
                        className="w-full flex items-center justify-between p-4 rounded-3xl hover:bg-gray-50 border border-transparent hover:border-indigo-100 transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <img src={u.photoURL || `https://ui-avatars.com/api/?name=${u.displayName}`} className="w-10 h-10 rounded-xl" />
                          <span className="font-bold text-gray-700">{u.displayName}</span>
                        </div>
                        <Plus size={18} className="text-gray-300 group-hover:text-indigo-600" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 bg-gray-50/50">
                <button 
                  onClick={() => setShowManageMembers(false)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-3xl font-black tracking-tighter text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Editor Modal */}
      <AnimatePresence>
        {editingPhoto && (
          <PhotoEditor 
            image={editingPhoto} 
            onCancel={() => setEditingPhoto(null)} 
            onSave={(img) => {
              sendMessage('image', img);
              setEditingPhoto(null);
            }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
