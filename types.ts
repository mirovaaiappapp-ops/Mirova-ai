export enum Theme {
  Light = 'light',
  Dark = 'dark',
}

export enum Feature {
  Chat = 'Chat',
  Image = 'Image',
  MirovaCoder = 'Mirova Coder',
  STT = 'STT',
  History = 'History',
  About = 'About',
}

// ====== Tab Interfaces ======

export interface Tab {
  id: string;
  name: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  images?: string[]; // array of base64 strings
  audio?: string; // base64 audio string
}

export interface ChatTab extends Tab {
  messages: ChatMessage[];
}

export interface ImageTab extends Tab {
  prompt: string;
  style: string;
  resolution: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  sourceImages: {data: string, mimeType: string}[];
  generatedImage: string | null;
}

export interface CoderTab extends Tab {
  prompt: string;
  result: string;
  language: string;
}


// ====== Other Types ======

export interface AuthUser {
  firstName: string;
  lastName: string;
  email: string;
}

export interface SttHistoryPayload {
    language: string;
    prompt: string; // e.g., "Live Recording" or filename
    result: { text: string };
}

export interface HistoryItem {
    id: string;
    feature: Feature;
    // A snapshot of the tab's state or a simple payload for non-tabbed features
    payload: ChatTab | ImageTab | CoderTab | SttHistoryPayload;
    timestamp: string;
}
