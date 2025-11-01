import React, { useState, useContext, useRef, useEffect } from 'react';
import { Feature, Theme } from './types';
import { AuthContext } from './store';

// ====== ICONS ======

export const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
  </svg>
);

export const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
    <circle cx="8.5" cy="8.5" r="1.5"></circle>
    <polyline points="21 15 16 10 5 21"></polyline>
  </svg>
);

export const AppBuilderIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 0 2l-.15.08a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1 0-2l.15-.08a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
    <circle cx="12" cy="12" r="3"></circle>
  </svg>
);

export const SttIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
    <line x1="12" y1="19" x2="12" y2="22"></line>
  </svg>
);

export const HistoryIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 4v6h6"></path>
        <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
    </svg>
);

export const AboutIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="16" x2="12" y2="12"></line>
        <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
);

export const UserIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
    </svg>
);

export const GoogleIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
    </svg>
);

export const FacebookIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v7.028C18.343 21.128 22 16.991 22 12z"></path>
    </svg>
);

export const SunIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5"></circle>
        <line x1="12" y1="1" x2="12" y2="3"></line>
        <line x1="12" y1="21" x2="12" y2="23"></line>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
        <line x1="1" y1="12" x2="3" y2="12"></line>
        <line x1="21" y1="12" x2="23" y2="12"></line>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
    </svg>
);

export const MoonIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
    </svg>
);

export const SwitchCameraIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h5"/>
        <path d="M13 5h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5"/>
        <path d="m17 12-3-3 3-3"/>
        <path d="m7 12 3 3-3 3"/>
    </svg>
);

export const FlashIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
    </svg>
);

export const FlashOffIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="1" y1="1" x2="23" y2="23"></line>
        <path d="M12.87 12.87l-1.32.73-1.42 2.83 2.05 2.05.5-2.51.5-2.51h4.91l-1.29-1.29"></path>
        <path d="M13 2l-2.29 4.58L13 11h4l-3-6-2-3z"></path>
        <path d="M11 22l1.3-2.6"></path>
    </svg>
);

export const AttachIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
);

export const ChatCameraIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
);

export const SendIcon = ({ className }: { className?: string }) => (
    <svg className={className} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
);

export const SpeakerIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
  </svg>
);

export const StopCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <rect x="9" y="9" width="6" height="6"></rect>
  </svg>
);

export const CopyIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
);

export const PencilIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
    </svg>
);

export const DownloadIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
    </svg>
);


// ====== UI COMPONENTS ======

export const GlassCard: React.FC<{ children: React.ReactNode, className?: string }> = ({ children, className }) => (
    <div className={`bg-mirova-card-light/60 dark:bg-mirova-card-dark/60 backdrop-blur-xl rounded-2xl p-6 shadow-lg ring-1 ring-white/10 ${className}`}>
        {children}
    </div>
);

export const LoadingSpinner: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => {
    const sizeClasses = size === 'sm' ? 'h-5 w-5 border-2' : 'h-16 w-16 border-t-4 border-b-4';
    const marginClass = size === 'md' ? 'my-8' : '';

    return (
        <div className={`flex justify-center items-center ${marginClass}`}>
            <div className={`animate-spin rounded-full border-purple-500 ${sizeClasses}`}></div>
        </div>
    );
};

export const Header: React.FC<{ theme: Theme; setTheme: (theme: Theme) => void }> = ({ theme, setTheme }) => {
    const { user, logout } = useContext(AuthContext);

    return (
        <header className="fixed top-0 left-0 right-0 z-20 bg-transparent backdrop-blur-md">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex-shrink-0">
                        <h1 className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400">MIROVA</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setTheme(theme === Theme.Light ? Theme.Dark : Theme.Light)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                            {theme === Theme.Light ? <MoonIcon className="w-5 h-5"/> : <SunIcon className="w-5 h-5"/>}
                        </button>
                        {user && (
                             <div className="flex items-center gap-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white/20">
                                        {user.firstName?.charAt(0).toUpperCase()}
                                    </div>
                                    <span className="text-sm font-semibold hidden sm:inline">{`${user.firstName} ${user.lastName}`}</span>
                                </div>
                                <button onClick={logout} className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-md hover:bg-red-600 transition-colors">Logout</button>
                             </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export const FloatingMenu: React.FC<{ activeFeature: Feature, setActiveFeature: (feature: Feature) => void }> = ({ activeFeature, setActiveFeature }) => {
    const features = [
        { name: Feature.Chat, icon: ChatIcon },
        { name: Feature.Image, icon: ImageIcon },
        { name: Feature.MirovaCoder, icon: AppBuilderIcon },
        { name: Feature.STT, icon: SttIcon },
        { name: Feature.History, icon: HistoryIcon },
        { name: Feature.About, icon: AboutIcon },
    ];

    return (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20">
            <div className="flex items-center justify-center gap-2 bg-mirova-card-light/80 dark:bg-mirova-card-dark/80 backdrop-blur-lg rounded-full shadow-2xl p-2 ring-1 ring-white/10">
                {features.map(({ name, icon: Icon }) => (
                    <button
                        key={name}
                        onClick={() => setActiveFeature(name)}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex flex-col items-center justify-center transition-all duration-300 ${activeFeature === name ? 'bg-purple-600 text-white shadow-neon-purple' : 'text-gray-600 dark:text-gray-300 hover:bg-white/20'}`}
                        aria-label={name}
                    >
                        <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                        <span className="text-[10px] mt-1">{name}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};


export const AuthInput: React.FC<{ icon: React.ReactNode, type: string, placeholder: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void, isInvalid?: boolean }> = ({ icon, type, placeholder, value, onChange, isInvalid }) => (
    <div className={`flex items-center bg-black/30 rounded-lg p-3 ring-1 ${isInvalid ? 'ring-red-500' : 'ring-white/20 focus-within:ring-cyan-400'}`}>
        <span className="text-white/60 mr-3">{icon}</span>
        <input 
            type={type} 
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            className="w-full bg-transparent text-white focus:outline-none"
        />
    </div>
);

export const TabView: React.FC<{
    tabs: { id: string, name: string }[];
    activeTabId: string;
    onTabClick: (id: string) => void;
    onAddTab: () => void;
    onCloseTab: (id: string) => void;
    featureName: string;
}> = ({ tabs, activeTabId, onTabClick, onAddTab, onCloseTab, featureName }) => {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const activeTab = scrollContainerRef.current?.querySelector(`[data-tab-id="${activeTabId}"]`);
        activeTab?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }, [activeTabId]);
    
    return (
        <div className="flex items-center border-b border-white/10 mb-4">
            <div ref={scrollContainerRef} className="flex-grow flex items-center gap-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {tabs.map((tab, index) => (
                    <div
                        key={tab.id}
                        data-tab-id={tab.id}
                        onClick={() => onTabClick(tab.id)}
                        className={`flex items-center gap-2 cursor-pointer px-4 py-2 border-b-2 transition-colors duration-200 whitespace-nowrap ${activeTabId === tab.id ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-400 hover:text-white'}`}
                    >
                        <span className="text-sm font-medium">{tab.name || `${featureName} ${index + 1}`}</span>
                        {tabs.length > 1 && (
                            <button
                                onClick={(e) => { e.stopPropagation(); onCloseTab(tab.id); }}
                                className="w-5 h-5 rounded-full hover:bg-white/20 flex items-center justify-center"
                                aria-label="Close tab"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </button>
                        )}
                    </div>
                ))}
            </div>
            <button
                onClick={onAddTab}
                className="flex-shrink-0 ml-2 p-2 rounded-full hover:bg-white/10 text-gray-400 hover:text-white"
                aria-label="New tab"
            >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            </button>
        </div>
    );
};


const AnimatedMirovaLogo: React.FC = () => (
    <div className="relative w-64 h-72 flex flex-col items-center justify-center">
        <svg viewBox="0 0 200 200" className="w-56 h-56">
            <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8A2BE2" />
                    <stop offset="100%" stopColor="#00F0FF" />
                </linearGradient>
                <filter id="logo-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <g className="opacity-0 animate-logo-fade-in" filter="url(#logo-glow)">
                {/* Orbits */}
                <ellipse cx="100" cy="100" rx="40" ry="90" stroke="url(#logo-gradient)" strokeWidth="2" fill="none" transform="rotate(45 100 100)" className="animate-[spin_10s_linear_infinite]" style={{ animationDelay: '0.2s' }} />
                <ellipse cx="100" cy="100" rx="60" ry="90" stroke="url(#logo-gradient)" strokeWidth="2" fill="none" transform="rotate(-30 100 100)" className="animate-[spin_12s_linear_infinite_reverse]" />
                <ellipse cx="100" cy="100" rx="90" ry="50" stroke="url(#logo-gradient)" strokeWidth="2" fill="none" className="animate-[spin_15s_linear_infinite]" style={{ animationDelay: '0.5s' }} />
                
                {/* Central M */}
                <path d="M 50 150 L 75 75 L 100 125 L 125 75 L 150 150" stroke="white" strokeWidth="5" strokeLinecap="round" fill="none" className="opacity-0 animate-logo-fade-in" style={{ animationDelay: '0.8s' }} />
            </g>
        </svg>
        <div className="opacity-0 animate-text-fade-in" style={{ animationDelay: '1.5s' }}>
             <h1 className="text-5xl font-bold tracking-widest text-white mt-4" style={{ filter: 'drop-shadow(0 0 10px rgba(138, 43, 226, 0.8))' }}>MIROVA</h1>
        </div>
    </div>
);

export const SplashScreen: React.FC = () => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-mirova-bg-dark animate-splash-fade-out" style={{ animationDelay: '3.0s' }}>
        <div className="absolute inset-0 z-0 overflow-hidden">
            <div className="absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br from-purple-900/50 via-blue-900/30 to-transparent rounded-full filter blur-3xl animate-pulse opacity-50"></div>
            <div className="absolute bottom-0 -right-1/4 w-full h-full bg-gradient-to-tl from-indigo-900/50 via-pink-900/30 to-transparent rounded-full filter blur-3xl animate-pulse animation-delay-4000 opacity-50"></div>
        </div>
        <AnimatedMirovaLogo />
    </div>
);
