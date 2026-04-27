export type UserRole = 'leader' | 'manager' | 'member';

export interface Location {
  lat: number;
  lng: number;
  timestamp: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  role: UserRole;
  status: 'online' | 'offline' | 'busy';
  lastLocation?: Location;
  phoneNumber?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // userId
  assignedBy: string; // userId
  status: 'todo' | 'in-progress' | 'completed';
  createdAt: string;
  completedAt?: string;
  date: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  lastUpdatedBy: string;
  updatedAt: string;
}

export interface DailyReport {
  id: string;
  userId: string;
  date: string;
  activities: string;
  tasksCompleted: number;
  createdAt: string;
}

export interface ChatRoom {
  id: string;
  name?: string;
  type: 'private' | 'group';
  participants: string[];
  lastMessage?: {
    text: string;
    senderId: string;
    timestamp: any;
  };
  createdAt: any;
}

export interface Message {
  id: string;
  chatRoomId: string;
  senderId: string;
  senderName: string;
  text?: string;
  type: 'text' | 'image' | 'audio';
  mediaUrl?: string;
  reactions?: Record<string, string[]>; // emoji -> list of userIds
  readBy?: string[]; // list of userIds
  isPinned?: boolean;
  createdAt: any;
}
