import React, { useState, useEffect, useContext } from 'react';
import { Theme, Feature, HistoryItem, ChatTab, ImageTab, CoderTab, SttHistoryPayload } from './types';
import { Header, FloatingMenu, SplashScreen } from './components';
import { ChatView, ImageView, MirovaCoderView, SttView, HistoryView, AboutView } from './features';
import { AuthProvider, AuthContext, HistoryProvider, ChatProvider, ChatContext, ImageProvider, CoderProvider, SttProvider, ImageContext, CoderContext, SttContext } from './store';
import { AuthScreens } from './auth';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HistoryProvider>
        <ChatProvider>
          <ImageProvider>
            <CoderProvider>
              <SttProvider>
                <MirovaApp />
              </SttProvider>
            </CoderProvider>
          </ImageProvider>
        </ChatProvider>
      </HistoryProvider>
    </AuthProvider>
  );
};

const MirovaApp: React.FC = () => {
    const { user } = useContext(AuthContext);
    const [isSplashing, setIsSplashing] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsSplashing(false);
        }, 3500); // Splash screen visible for 3.5 seconds

        return () => clearTimeout(timer);
    }, []);

    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined' && window.localStorage) {
          const storedTheme = window.localStorage.getItem('mirova-theme') as Theme;
          return storedTheme || Theme.Dark;
        }
        return Theme.Dark;
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove(theme === Theme.Dark ? Theme.Light : Theme.Dark);
        root.classList.add(theme);
        localStorage.setItem('mirova-theme', theme);
    }, [theme]);
    
    return (
        <div className={`min-h-screen font-sans ${theme === Theme.Light ? 'bg-mirova-bg-light text-gray-900' : 'bg-mirova-bg-dark text-gray-100 dark'} transition-colors duration-300`}>
            {isSplashing ? (
                <SplashScreen />
            ) : !user ? (
                 <AuthScreens />
            ) : (
                <MainApp theme={theme} setTheme={setTheme} />
            )}
        </div>
    );
};

interface MainAppProps {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const MainApp: React.FC<MainAppProps> = ({ theme, setTheme }) => {
    const [activeFeature, setActiveFeature] = useState<Feature>(Feature.Chat);
    const chatContext = useContext(ChatContext);
    const imageContext = useContext(ImageContext);
    const coderContext = useContext(CoderContext);
    const sttContext = useContext(SttContext);

    const loadItemFromHistory = (item: HistoryItem) => {
        if (!item) return;

        switch (item.feature) {
            case Feature.Chat:
                chatContext.addTab(item.payload as ChatTab);
                break;
            case Feature.Image:
                imageContext.addTab(item.payload as ImageTab);
                break;
            case Feature.MirovaCoder:
                coderContext.addTab(item.payload as CoderTab);
                break;
            case Feature.STT:
                const sttPayload = item.payload as SttHistoryPayload;
                sttContext.setLanguage(sttPayload.language);
                sttContext.setTranscription(sttPayload.result.text || '');
                break;
            default:
                break;
        }
        
        setActiveFeature(item.feature);
    };

    const renderFeature = () => {
        switch (activeFeature) {
          case Feature.Chat: return <ChatView />;
          case Feature.Image: return <ImageView />;
          case Feature.MirovaCoder: return <MirovaCoderView />;
          case Feature.STT: return <SttView />;
          case Feature.History: return <HistoryView loadItemFromHistory={loadItemFromHistory} />;
          case Feature.About: return <AboutView />;
          default: return <ChatView />;
        }
    };

    return (
        <>
           <div className="absolute inset-0 z-0 overflow-hidden">
                <div className="absolute top-0 -left-1/4 w-full h-full bg-gradient-to-br from-purple-900/50 via-blue-900/30 to-transparent rounded-full filter blur-3xl animate-pulse opacity-30 dark:opacity-50"></div>
                <div className="absolute bottom-0 -right-1/4 w-full h-full bg-gradient-to-tl from-indigo-900/50 via-pink-900/30 to-transparent rounded-full filter blur-3xl animate-pulse animation-delay-4000 opacity-30 dark:opacity-50"></div>
            </div>
            <div className="relative z-10 min-h-screen flex flex-col">
                <Header theme={theme} setTheme={setTheme} />
                <main className="flex-grow pt-16 pb-28">
                    <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-full">
                       {renderFeature()}
                    </div>
                </main>
                <FloatingMenu activeFeature={activeFeature} setActiveFeature={setActiveFeature} />
            </div>
        </>
    );
};

export default App;
