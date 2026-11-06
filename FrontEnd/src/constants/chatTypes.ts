export interface Message {
  id: string;
  sender: 'admin' | 'user';
  text: string;
  timestamp: string;
  type: 'text' | 'image' | 'file' | 'multi_file';
  attachmentUrl?: string;
}

export interface ChatSession {
  id: string;
  userName: string;
  userAvatar: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  messages: Message[];
}

export interface CannedResponse {
  id: string;
  category: string;
  keyword: string;
  question: string;
  response: string;
}

export interface BlastTemplate {
  id: string;
  name: string;
  content: string;
}
