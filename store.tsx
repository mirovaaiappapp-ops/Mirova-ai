import React, { createContext, useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { AuthUser, HistoryItem, ChatMessage, ChatTab, ImageTab, CoderTab, Feature } from './types';

// ====== AUTH CONTEXT ======

interface AuthContextType {
  user: AuthUser | null;
  login: (user: AuthUser) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const storedUser = localStorage.getItem('mirova-user');
      return storedUser ? JSON.parse(storedUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) {
      localStorage.setItem('mirova-user', JSON.stringify(user));
    } else {
      localStorage.removeItem('mirova-user');
    }
  }, [user]);

  const login = useCallback((userData: AuthUser) => setUser(userData), []);
  const logout = useCallback(() => setUser(null), []);
  
  const value = useMemo(() => ({ user, login, logout }), [user, login, logout]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ====== TAB-BASED CONTEXT FACTORY ======

// Defines the shape of the state managed by the hook
interface TabState<T> {
    tabs: T[];
    activeTabId: string;
}

// A generic hook to create robust tab management logic
const useTabManager = <T extends { id: string; name: string }>(
    initialTabFactory: (id: string, count: number) => T
) => {
    // Manages tabs and the active tab ID in a single state object to prevent inconsistencies.
    const [state, setState] = useState<TabState<T>>(() => {
        const firstTab = initialTabFactory(`${Date.now()}`, 1);
        return {
            tabs: [firstTab],
            activeTabId: firstTab.id
        };
    });

    const setActiveTabId = useCallback((tabId: string) => {
        setState(prev => ({ ...prev, activeTabId: tabId }));
    }, []);

    const addTab = useCallback((tabData?: T) => {
        setState(prev => {
            const newTab = tabData ? { ...tabData, id: `${Date.now()}` } : initialTabFactory(`${Date.now()}`, prev.tabs.length + 1);
            return {
                tabs: [...prev.tabs, newTab],
                activeTabId: newTab.id
            };
        });
    }, [initialTabFactory]);

    const closeTab = useCallback((tabId: string) => {
        setState(prev => {
            const newTabs = prev.tabs.filter(t => t.id !== tabId);

            if (newTabs.length === 0) {
                const newTab = initialTabFactory(`${Date.now()}`, 1);
                return { tabs: [newTab], activeTabId: newTab.id };
            }

            let newActiveId = prev.activeTabId;
            // If the closed tab was the active one, set the last tab as the new active one.
            if (prev.activeTabId === tabId) {
                newActiveId = newTabs[newTabs.length - 1].id;
            }

            return { tabs: newTabs, activeTabId: newActiveId };
        });
    }, [initialTabFactory]);

    const updateTab = useCallback((tabId: string, updates: Partial<T>) => {
        setState(prev => ({
            ...prev,
            tabs: prev.tabs.map(tab => tab.id === tabId ? { ...tab, ...updates } : tab)
        }));
    }, []);

    // Return the state properties and the memoized updater functions.
    return { ...state, setActiveTabId, addTab, closeTab, updateTab };
};


// ====== CHAT CONTEXT ======
const chatTabFactory = (id: string, count: number): ChatTab => ({ id, name: `Chat ${count}`, messages: [] });
interface ChatContextType extends ReturnType<typeof useTabManager<ChatTab>> {}
export const ChatContext = createContext<ChatContextType>({} as ChatContextType);
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const value = useTabManager<ChatTab>(chatTabFactory);
    return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// ====== IMAGE CONTEXT ======
const imageTabFactory = (id: string, count: number): ImageTab => ({
    id, name: `Image ${count}`, prompt: '', style: 'Realistic', resolution: '1:1', sourceImages: [], generatedImage: null
});
interface ImageContextType extends ReturnType<typeof useTabManager<ImageTab>> {}
export const ImageContext = createContext<ImageContextType>({} as ImageContextType);
export const ImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const value = useTabManager<ImageTab>(imageTabFactory);
    return <ImageContext.Provider value={value}>{children}</ImageContext.Provider>;
};

// ====== MIROVA CODER CONTEXT ======
const coderTabFactory = (id: string, count: number): CoderTab => ({
    id, name: `Code ${count}`, prompt: '', result: '', language: 'JavaScript'
});
interface CoderContextType extends ReturnType<typeof useTabManager<CoderTab>> {}
export const CoderContext = createContext<CoderContextType>({} as CoderContextType);
export const CoderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const value = useTabManager<CoderTab>(coderTabFactory);
    return <CoderContext.Provider value={value}>{children}</CoderContext.Provider>;
};

// ====== STT CONTEXT ======
interface SttContextType {
    transcription: string; setTranscription: (s: string) => void;
    language: string; setLanguage: (s: string) => void;
}
export const SttContext = createContext<SttContextType>({} as SttContextType);
export const SttProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [transcription, setTranscription] = useState('');
    const [language, setLanguage] = useState('Telugu');
    const value = useMemo(() => ({ transcription, setTranscription, language, setLanguage }), [transcription, language]);
    return (
        <SttContext.Provider value={value}>
            {children}
        </SttContext.Provider>
    );
};

// ====== HISTORY CONTEXT ======

interface HistoryContextType {
    history: HistoryItem[];
    addHistoryItem: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;
    clearHistory: () => void;
}

export const HistoryContext = createContext<HistoryContextType>({
    history: [],
    addHistoryItem: () => {},
    clearHistory: () => {},
});

export const HistoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useContext(AuthContext);
    const [history, setHistory] = useState<HistoryItem[]>([]);

    useEffect(() => {
        if (user?.email) {
            try {
                const storedHistory = localStorage.getItem(`mirova-history-${user.email}`);
                setHistory(storedHistory ? JSON.parse(storedHistory) : []);
            } catch {
                setHistory([]);
            }
        } else {
            setHistory([]);
        }
    }, [user]);

    useEffect(() => {
        if (user?.email) {
            localStorage.setItem(`mirova-history-${user.email}`, JSON.stringify(history));
        }
    }, [history, user]);

    const addHistoryItem = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
        const newItem: HistoryItem = {
            ...item,
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
        };
        setHistory(prev => [newItem, ...prev.filter(h => {
             // Prevent duplicate history entries for the same tab session
            if ('id' in h.payload && 'id' in newItem.payload) {
                return h.payload.id !== newItem.payload.id;
            }
            return true;
        })]);
    }, []);
    
    const clearHistory = useCallback(() => {
        setHistory([]);
    }, []);

    const value = useMemo(() => ({ history, addHistoryItem, clearHistory }), [history, addHistoryItem, clearHistory]);

    return (
        <HistoryContext.Provider value={value}>
            {children}
        </HistoryContext.Provider>
    );
};