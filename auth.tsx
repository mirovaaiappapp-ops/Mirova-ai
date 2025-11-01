import React, { useState, useContext } from 'react';
import { AuthContext } from './store';
import { AuthInput, UserIcon } from './components';

type AuthScreen = 'welcome' | 'login';

export const AuthScreens: React.FC = () => {
    const [screen, setScreen] = useState<AuthScreen>('welcome');

    const renderScreen = () => {
        switch (screen) {
            case 'login': return <LoginScreen />;
            case 'welcome':
            default:
                return <WelcomeScreen setScreen={setScreen} />;
        }
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-[#3C1053] to-[#ad5389] p-4">
           {renderScreen()}
        </div>
    );
};

const WelcomeScreen: React.FC<{setScreen: (s: AuthScreen) => void}> = ({ setScreen }) => (
    <div className="text-center text-white animate-fade-in">
        <h1 className="text-6xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-blue-400 mb-2">MIROVA</h1>
        <p className="text-lg text-white/80 mb-8">Your All-in-One AI Companion.</p>
        <div className="space-y-4">
            <button onClick={() => setScreen('login')} className="w-64 py-3 bg-cyan-400 text-slate-900 font-bold rounded-lg shadow-lg hover:scale-105 transition-transform">
                Login to Continue
            </button>
        </div>
    </div>
);

const LoginScreen: React.FC = () => {
    const { login } = useContext(AuthContext);
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    
    const handleLogin = () => {
        setError('');
        if (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim()) {
            setError('Please fill in all fields.');
            return;
        }

        if (password.length > 8) {
            setError('Password must be 8 characters or less.');
            return;
        }
        
        login({ firstName, lastName, email });
    };

    return (
        <div className="w-full max-w-md p-8 space-y-6 bg-black/20 backdrop-blur-lg rounded-2xl ring-1 ring-white/10 text-white animate-fade-in">
            <div className="text-center">
                <h2 className="text-3xl font-bold">Welcome to MIROVA 👋</h2>
                <p className="text-white/70 mt-2">Create your account to begin.</p>
            </div>
            {error && <p className="text-red-400 text-center bg-red-900/50 p-2 rounded-md">{error}</p>}
            <div className="space-y-4">
                <AuthInput 
                    icon={<UserIcon className="w-5 h-5" />} 
                    type="text" 
                    placeholder="First Name" 
                    value={firstName} 
                    onChange={e => setFirstName(e.target.value)} 
                    isInvalid={!!error}
                />
                <AuthInput 
                    icon={<UserIcon className="w-5 h-5" />} 
                    type="text" 
                    placeholder="Last Name" 
                    value={lastName} 
                    onChange={e => setLastName(e.target.value)} 
                    isInvalid={!!error}
                />
                <AuthInput 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path></svg>} 
                    type="email" 
                    placeholder="Enter any email address" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    isInvalid={!!error}
                />
                <AuthInput 
                    icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>} 
                    type="password" 
                    placeholder="Password (up to 8 characters)" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    isInvalid={!!error}
                />
            </div>
            <button onClick={handleLogin} className="w-full py-3 bg-cyan-400 text-slate-900 font-bold rounded-lg shadow-lg hover:scale-105 transition-transform mt-4">Login</button>
        </div>
    );
};