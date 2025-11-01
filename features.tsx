import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { ChatMessage, Feature, HistoryItem, ChatTab } from './types';
import * as API from './gemini';
import { GlassCard, LoadingSpinner, SttIcon, SwitchCameraIcon, AttachIcon, ChatCameraIcon, SendIcon, FlashIcon, FlashOffIcon, SpeakerIcon, StopCircleIcon, CopyIcon, DownloadIcon, TabView, PencilIcon } from './components';
import { HistoryContext, ChatContext, ImageContext, CoderContext, SttContext } from './store';
// @ts-ignore
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';

// Base64 encode
function encode(bytes: Uint8Array): string {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

const fileToBase64 = (file: File): Promise<{ data: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const result = reader.result as string;
            const mimeType = result.split(':')[1].split(';')[0];
            const base64Data = result.split(',')[1];
            resolve({ data: base64Data, mimeType });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
};

// ====== SPEECH TO TEXT HOOK ======
const useSpeechToText = (onTranscription: (text: string) => void, language: string) => {
    const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing'>('idle');
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const startRecording = async () => {
        if (status !== 'idle') return;
        setStatus('recording');
        audioChunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.start();
        } catch (err) {
            console.error("Microphone access error:", err);
            alert("Could not access microphone. Please grant permission.");
            setStatus('idle');
        }
    };

    const stopRecording = () => {
        if (status !== 'recording' || !mediaRecorderRef.current) return;

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = async () => {
                const base64data = reader.result as string;
                const audio = {
                    data: base64data.split(',')[1],
                    mimeType: 'audio/webm',
                };
                
                try {
                    const transcription = await API.transcribeSpeech(audio, language);
                    onTranscription(transcription);
                } catch (e) {
                    console.error("Transcription failed:", e);
                    alert("Sorry, I couldn't understand that. Please try again.");
                } finally {
                    setStatus('idle');
                }
            };

            mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.stop();
        setStatus('transcribing');
    };
    
    const toggleRecording = () => {
        if (status === 'recording') {
            stopRecording();
        } else if (status === 'idle') {
            startRecording();
        }
    };

    return { status, toggleRecording };
};


// ====== CAMERA VIEW COMPONENT ======
const CameraView: React.FC<{ onCapture: (base64: string) => void, onClose: () => void }> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [isTorchSupported, setIsTorchSupported] = useState(false);

    useEffect(() => {
        let active = true;

        const openCamera = async () => {
            // First, stop any existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            // Reset torch state when camera changes
            setIsTorchOn(false);

            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode } });
                if (!active) {
                    stream.getTracks().forEach(track => track.stop());
                    return;
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
                
                // Check for torch support
                const videoTrack = stream.getVideoTracks()[0];
                if (videoTrack && 'getCapabilities' in videoTrack) {
                    try {
                        const capabilities = videoTrack.getCapabilities();
                        // @ts-ignore - torch is a valid capability but might not be in all TS libs
                        if (capabilities.torch) {
                            setIsTorchSupported(true);
                        } else {
                            setIsTorchSupported(false);
                        }
                    } catch (e) {
                        console.warn("Could not read camera capabilities:", e);
                        setIsTorchSupported(false);
                    }
                } else {
                    setIsTorchSupported(false);
                }

            } catch (err) {
                console.error("Error accessing camera:", err);
                if (!active) return;
                
                if (facingMode === 'environment') {
                    console.warn("Back camera not found or not available, falling back to front camera.");
                    setFacingMode('user'); // Fallback to front camera
                } else {
                    alert("Could not access camera. Please grant permission.");
                    onClose();
                }
            }
        };

        openCamera();

        return () => {
            active = false;
            // Cleanup: stop all tracks on unmount
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, [onClose, facingMode]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const context = canvas.getContext('2d');
            if (context) {
                // If front camera, flip the image horizontally to match the mirrored preview
                if (facingMode === 'user') {
                    context.translate(video.videoWidth, 0);
                    context.scale(-1, 1);
                }
                context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
                const dataUrl = canvas.toDataURL('image/jpeg');
                const base64Data = dataUrl.split(',')[1];
                onCapture(base64Data);
                onClose();
            }
        }
    };
    
    const switchCamera = () => {
        setFacingMode(prev => (prev === 'user' ? 'environment' : 'user'));
    };

    const toggleTorch = async () => {
        if (!streamRef.current || !isTorchSupported || facingMode !== 'environment') return;
        const videoTrack = streamRef.current.getVideoTracks()[0];
        try {
            await videoTrack.applyConstraints({
                // @ts-ignore
                advanced: [{ torch: !isTorchOn }]
            });
            setIsTorchOn(!isTorchOn);
        } catch (err) {
            console.error('Failed to toggle torch:', err);
            alert('Could not control the flashlight.');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 z-50 flex flex-col items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className={`w-full max-w-lg rounded-lg ${facingMode === 'user' ? 'transform scale-x-[-1]' : ''}`}></video>
            <canvas ref={canvasRef} className="hidden"></canvas>
            <div className="absolute bottom-10 flex w-full max-w-lg items-center px-4">
                 <div className="flex-1 flex justify-start gap-4">
                     <button onClick={onClose} className="p-3 bg-white/20 text-white rounded-full backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                    {isTorchSupported && facingMode === 'environment' && (
                         <button onClick={toggleTorch} className="p-3 bg-white/20 text-white rounded-full backdrop-blur-sm" aria-label="Toggle flash">
                             {isTorchOn ? <FlashIcon className="w-6 h-6" /> : <FlashOffIcon className="w-6 h-6" />}
                         </button>
                     )}
                </div>
                <div className="flex-shrink-0">
                    <button onClick={handleCapture} className="w-20 h-20 rounded-full bg-white flex items-center justify-center ring-4 ring-white/30" aria-label="Capture photo">
                        <div className="w-16 h-16 rounded-full bg-white ring-2 ring-black"></div>
                    </button>
                </div>
                <div className="flex-1 flex justify-end">
                     <button onClick={switchCamera} className="p-3 bg-white/20 text-white rounded-full backdrop-blur-sm" aria-label="Switch camera">
                        <SwitchCameraIcon className="w-6 h-6" />
                     </button>
                </div>
            </div>
        </div>
    );
};


// ====== CHAT SUB-COMPONENTS ======
const MessageBubble: React.FC<{
    msg: ChatMessage;
    editingMessage: { id: string; text: string } | null;
    playingMessageId: string | null;
    setEditingMessage: (msg: { id: string; text: string } | null) => void;
    handleEditSave: () => void;
    handleCopy: (text: string) => void;
    handlePlaybackToggle: (msg: ChatMessage) => void;
}> = ({ msg, editingMessage, playingMessageId, setEditingMessage, handleEditSave, handleCopy, handlePlaybackToggle }) => {
    const isEditing = editingMessage?.id === msg.id;

    return (
        <div className={`group flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'user' && !isEditing && (
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setEditingMessage({ id: msg.id, text: msg.text })} className="p-1.5 rounded-full hover:bg-white/20"><PencilIcon className="w-4 h-4 text-white"/></button>
                    <button onClick={() => handleCopy(msg.text)} className="p-1.5 rounded-full hover:bg-white/20"><CopyIcon className="w-4 h-4 text-white"/></button>
                </div>
            )}
            <div className={`relative max-w-xs md:max-w-md lg:max-w-lg p-3 rounded-2xl ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-br-none' : 'bg-mirova-card-light dark:bg-mirova-card-dark text-gray-800 dark:text-gray-200 rounded-bl-none'}`}>
                {msg.role === 'model' && msg.audio && (
                    <button onClick={() => handlePlaybackToggle(msg)} className="absolute -top-2 -right-2 w-7 h-7 bg-white dark:bg-gray-700 rounded-full flex items-center justify-center shadow-md text-purple-600 dark:text-purple-400 z-10" aria-label={playingMessageId === msg.id ? "Stop speech" : "Play speech"}>
                        {playingMessageId === msg.id ? <StopCircleIcon className="w-4 h-4" /> : <SpeakerIcon className="w-4 h-4" />}
                    </button>
                )}
                {msg.images && msg.images.length > 0 && (
                    <div className={`grid gap-2 mb-2 ${msg.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        {msg.images.map((img, index) => <img key={index} src={`data:image/jpeg;base64,${img}`} alt={`user upload ${index + 1}`} className="rounded-lg max-h-48 w-full object-cover" />)}
                    </div>
                )}
                {isEditing ? (
                    <div className="space-y-2">
                        <textarea value={editingMessage.text} onChange={e => setEditingMessage({...editingMessage, text: e.target.value})} className="w-full bg-black/20 text-white p-2 rounded-md focus:outline-none" autoFocus/>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingMessage(null)} className="px-3 py-1 text-xs bg-gray-500 rounded">Cancel</button>
                            <button onClick={handleEditSave} className="px-3 py-1 text-xs bg-green-500 rounded">Save & Send</button>
                        </div>
                    </div>
                ) : (
                    <div className="prose prose-sm dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: marked(msg.text) }} />
                )}
            </div>
            {msg.role === 'model' && (
                 <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleCopy(msg.text)} className="p-1.5 rounded-full hover:bg-black/10 dark:hover:bg-white/20"><CopyIcon className="w-4 h-4 text-gray-500 dark:text-gray-400"/></button>
                </div>
            )}
        </div>
    );
};

const ChatInputBar: React.FC<{
    input: string;
    setInput: (val: string) => void;
    images: string[];
    setImages: (val: string[]) => void;
    isLoading: boolean;
    handleSend: () => void;
    sttStatus: 'idle' | 'recording' | 'transcribing';
    toggleRecording: () => void;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    setIsCameraOpen: (val: boolean) => void;
}> = ({ input, setInput, images, setImages, isLoading, handleSend, sttStatus, toggleRecording, handleFileUpload, setIsCameraOpen }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [input]);

    const canSend = (input.trim().length > 0 || images.length > 0) && !isLoading;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[95%] max-w-lg z-10">
             {images.length > 0 && (
                <div className="mb-2 p-2 bg-black/10 dark:bg-white/5 rounded-lg">
                    <div className="flex space-x-2 overflow-x-auto">{images.map((img, index) => (<div key={index} className="relative flex-shrink-0 w-20 h-20"><img src={`data:image/jpeg;base64,${img}`} className="w-full h-full object-cover rounded-md"/><button onClick={() => setImages(images.filter((_, i) => i !== index))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">X</button></div>))}</div>
                </div>
             )}
            <div className="flex items-end gap-2 bg-mirova-card-light dark:bg-mirova-card-dark backdrop-blur-lg rounded-2xl shadow-lg p-2 ring-1 ring-white/10">
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" multiple />
                <button onClick={() => fileInputRef.current?.click()} className="p-2 text-gray-600 dark:text-gray-300 hover:text-purple-500 transition-colors flex-shrink-0" aria-label="Attach file"><AttachIcon className="w-6 h-6" /></button>
                <button onClick={() => setIsCameraOpen(true)} className="p-2 text-gray-600 dark:text-gray-300 hover:text-purple-500 transition-colors flex-shrink-0" aria-label="Open camera"><ChatCameraIcon className="w-6 h-6" /></button>
                <textarea ref={textareaRef} rows={1} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); if (canSend) handleSend(); }}} placeholder="Message MIROVA..." className="flex-grow bg-transparent focus:outline-none px-2 resize-none max-h-40 overflow-y-auto text-gray-800 dark:text-gray-200"/>
                 <button onClick={toggleRecording} className="p-2 text-gray-600 dark:text-gray-300 hover:text-purple-500 transition-colors flex-shrink-0" aria-label="Use microphone">
                    {sttStatus === 'transcribing' ? <LoadingSpinner size="sm" /> : sttStatus === 'recording' ? <div className="w-6 h-6 flex items-center justify-center text-red-500"><SttIcon className="w-6 h-6 animate-pulse" /></div> : <SttIcon className="w-6 h-6" />}
                </button>
                <button onClick={handleSend} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-600 text-white shadow-md transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canSend} aria-label="Send message"><SendIcon className="h-5 w-5" /></button>
            </div>
        </div>
    );
};


// ====== CHAT VIEW ======
export const ChatView: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const { tabs, activeTabId, setActiveTabId, addTab, closeTab, updateTab } = useContext(ChatContext);
    const { language } = useContext(SttContext);
    const [input, setInput] = useState('');
    const [images, setImages] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
    const [editingMessage, setEditingMessage] = useState<{ id: string; text: string } | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    const activeTab = tabs.find(t => t.id === activeTabId);
    const messages = activeTab?.messages || [];

    const handleTranscription = (text: string) => {
        if (editingMessage) {
            setEditingMessage(prev => prev ? { ...prev, text: prev.text ? `${prev.text} ${text}` : text } : null);
        } else {
            setInput(prev => prev ? `${prev} ${text}` : text);
        }
    };
    const { status: sttStatus, toggleRecording } = useSpeechToText(handleTranscription, language);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(scrollToBottom, [messages]);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
           if (images.length + files.length > 50) {
               alert('You can upload a maximum of 50 images.');
               return;
           }
           const filePromises = [...files].map(fileToBase64);
           const results = await Promise.all(filePromises);
           const base64Images = results.map(r => r.data);
           setImages(prev => [...prev, ...base64Images]);
        }
    };

    const handlePhotoCapture = (imageBase64: string) => {
        if (images.length < 50) {
            setImages(prev => [...prev, imageBase64]);
        } else {
            alert('You can upload a maximum of 50 images.');
        }
    };

    const handlePlaybackToggle = async (message: ChatMessage) => {
        if (!message.audio) return;

        if (playingMessageId === message.id) {
            API.stopAudio();
            setPlayingMessageId(null);
        } else {
            // Stop any currently playing audio before starting a new one
            if (playingMessageId) {
                API.stopAudio();
            }
            await API.playAudio(message.audio, () => setPlayingMessageId(null));
            setPlayingMessageId(message.id);
        }
    };

    const performSend = async (messageHistory: ChatMessage[], newTabName?: string) => {
        if (!activeTab) return;

        setIsLoading(true);
        updateTab(activeTab.id, { messages: messageHistory, name: newTabName || activeTab.name });

        const lowerCaseInput = messageHistory[messageHistory.length - 1].text.toLowerCase();
        if (lowerCaseInput.includes('who is your developer') || lowerCaseInput.includes('who created you') || lowerCaseInput.includes('who is your owner')) {
            const age = API.getVikasAge();
            const replyText = `I was developed by G. Vikas, a ${age}-year-old child.`;
            
            let audio: string | undefined;
            try {
                audio = await API.getSpeech(replyText, 'Kore');
            } catch (e) { console.error("Speech generation failed:", e); }

            const reply: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'model',
                text: replyText,
                audio: audio,
            };
            const finalConversation = [...messageHistory, reply];
            updateTab(activeTab.id, { messages: finalConversation });
            setIsLoading(false);
            addHistoryItem({ feature: Feature.Chat, payload: { ...activeTab, messages: finalConversation, name: newTabName || activeTab.name } });
            if (audio) {
                await handlePlaybackToggle({ ...reply, id: reply.id });
            }
            return;
        }

        try {
            const response = await API.getChatResponse(messageHistory);
            
            let audio: string | undefined;
            if (response.text) {
                try { audio = await API.getSpeech(response.text, 'Kore'); } 
                catch (speechError) { console.error("Speech generation failed:", speechError); }
            }

            const modelMessage: ChatMessage = { 
                id: (Date.now() + 1).toString(), 
                role: 'model', 
                text: response.text,
                audio: audio
            };
            const finalConversation = [...messageHistory, modelMessage];
            updateTab(activeTab.id, { messages: finalConversation });
            addHistoryItem({ feature: Feature.Chat, payload: { ...activeTab, messages: finalConversation, name: newTabName || activeTab.name } });
            
            if (audio) {
                await handlePlaybackToggle({ ...modelMessage, id: modelMessage.id });
            }
        } catch (error) {
            console.error("Error fetching chat response:", error);
            const errorMessage: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: "Sorry, I encountered an error. Please try again." };
            updateTab(activeTab.id, { messages: [...messageHistory, errorMessage] });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSend = () => {
        const canSend = (input.trim().length > 0 || images.length > 0) && !isLoading;
        if (!canSend || !activeTab) return;

        const userMessage: ChatMessage = { id: Date.now().toString(), role: 'user', text: input, images: images };
        const updatedMessages = [...messages, userMessage];
        
        const newTabName = messages.length === 0 ? input.substring(0, 20) : activeTab.name;
        
        setInput('');
        setImages([]);

        performSend(updatedMessages, newTabName);
    };

    const handleEditSave = () => {
        if (!editingMessage || !activeTab) return;

        const messageIndex = messages.findIndex(m => m.id === editingMessage.id);
        if (messageIndex === -1) return;

        const updatedMessages = messages.slice(0, messageIndex);
        updatedMessages.push({ ...messages[messageIndex], text: editingMessage.text, images: messages[messageIndex].images });
        
        setEditingMessage(null);
        performSend(updatedMessages);
    };

    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    if (!activeTab) {
        return <div className="p-4">Loading chat...</div>;
    }

    return (
        <div className="h-full flex flex-col">
            {isCameraOpen && <CameraView onCapture={handlePhotoCapture} onClose={() => setIsCameraOpen(false)} />}
            <TabView tabs={tabs} activeTabId={activeTabId} onTabClick={setActiveTabId} onAddTab={addTab} onCloseTab={closeTab} featureName="Chat" />
            <div className="flex-grow overflow-y-auto mb-40 space-y-4 px-4">
                {messages.map((msg) => (
                    <MessageBubble
                        key={msg.id}
                        msg={msg}
                        editingMessage={editingMessage}
                        playingMessageId={playingMessageId}
                        setEditingMessage={setEditingMessage}
                        handleEditSave={handleEditSave}
                        handleCopy={handleCopy}
                        handlePlaybackToggle={handlePlaybackToggle}
                    />
                ))}
                {isLoading && (
                    <div className="flex items-end gap-2 justify-start">
                        <div className="max-w-xs p-3 rounded-2xl bg-mirova-card-light dark:bg-mirova-card-dark text-gray-800 dark:text-gray-200 rounded-bl-none">
                            <div className="flex items-center space-x-2"><div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div><div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse [animation-delay:0.2s]"></div><div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse [animation-delay:0.4s]"></div></div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <ChatInputBar
                input={input}
                setInput={setInput}
                images={images}
                setImages={setImages}
                isLoading={isLoading}
                handleSend={handleSend}
                sttStatus={sttStatus}
                toggleRecording={toggleRecording}
                handleFileUpload={handleFileUpload}
                setIsCameraOpen={setIsCameraOpen}
            />
        </div>
    );
};


// ====== IMAGE VIEW ======

export const ImageView: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const { tabs, activeTabId, setActiveTabId, addTab, closeTab, updateTab } = useContext(ImageContext);
    const { language } = useContext(SttContext);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeTab = tabs.find(t => t.id === activeTabId);

    const handleTranscription = (text: string) => {
        if (activeTab) {
            updateTab(activeTabId, { prompt: activeTab.prompt ? `${activeTab.prompt} ${text}` : text });
        }
    };
    const { status: sttStatus, toggleRecording } = useSpeechToText(handleTranscription, language);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!activeTab) return;
        const files = event.target.files;
        if (files) {
            if (activeTab.sourceImages.length + files.length > 50) {
                alert('You can upload a maximum of 50 images.');
                return;
            }
            const filePromises = [...files].map(fileToBase64);
            const results = await Promise.all(filePromises);
            updateTab(activeTabId, { sourceImages: [...activeTab.sourceImages, ...results] });
        }
    };
    
    const canGenerate = activeTab && activeTab.prompt.trim().length > 0 && !isLoading;

    const handleGenerate = async () => {
        if (!canGenerate) return;
        setIsLoading(true);
        updateTab(activeTabId, { generatedImage: null });
        setError('');
        try {
            let base64Image;
            if (activeTab.sourceImages.length > 0) {
                base64Image = await API.editImage(activeTab.prompt, activeTab.sourceImages, activeTab.resolution);
            } else {
                base64Image = await API.getImage(activeTab.prompt, activeTab.style, activeTab.resolution);
            }
            const newTabState = { ...activeTab, generatedImage: base64Image, name: activeTab.name || activeTab.prompt.substring(0,20) };
            updateTab(activeTabId, newTabState);
            addHistoryItem({ 
                feature: Feature.Image, 
                payload: newTabState,
            });
        } catch (err) {
            console.error(err);
            setError('Failed to generate image. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };
    
    const styles = ['Realistic', '3D', 'Anime', 'Digital Art', 'Cartoon'];
    const aspectRatios: { value: '1:1' | '16:9' | '9:16' | '4:3' | '3:4', label: string }[] = [
        { value: '1:1', label: 'Square (1:1) - Profile Pictures, Instagram' },
        { value: '16:9', label: 'Widescreen (16:9) - YouTube Thumbnail & Banner' },
        { value: '9:16', label: 'Portrait (9:16) - YouTube Shorts, Stories, TikTok' },
        { value: '4:3', label: 'Standard (4:3) - Classic Displays, Photography' },
        { value: '3:4', label: 'Tall (3:4) - Print, Posters' },
    ];
    
    if (!activeTab) return null;

    return (
        <div className="p-4 space-y-6">
            <TabView tabs={tabs} activeTabId={activeTabId} onTabClick={setActiveTabId} onAddTab={addTab} onCloseTab={closeTab} featureName="Image" />
            <GlassCard>
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Image Generation</h2>
                <div className="space-y-4">
                    <div className="relative">
                        <textarea value={activeTab.prompt} onChange={e => updateTab(activeTabId, { prompt: e.target.value })} placeholder={activeTab.sourceImages.length > 0 ? "Combine images into a YouTube thumbnail..." : "A robot holding a red skateboard..."} className="w-full p-2 pr-12 bg-white/50 dark:bg-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all" rows={3}></textarea>
                        <button onClick={toggleRecording} className="absolute top-1/2 right-2 -translate-y-1/2 p-1 text-gray-600 dark:text-gray-400 hover:text-purple-500" aria-label="Use microphone">
                           {sttStatus === 'transcribing' ? <LoadingSpinner size="sm" /> : sttStatus === 'recording' ? <div className="w-6 h-6 flex items-center justify-center text-red-500"><SttIcon className="w-6 h-6 animate-pulse" /></div> : <SttIcon className="w-6 h-6" />}
                        </button>
                    </div>
                    
                    {activeTab.sourceImages.length > 0 && (
                        <div className="p-2 bg-black/10 dark:bg-white/5 rounded-lg">
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                                {activeTab.sourceImages.map((img, index) => (
                                    <div key={index} className="relative">
                                        <img src={`data:${img.mimeType};base64,${img.data}`} className="w-full h-auto object-cover rounded-md aspect-square"/>
                                        <button onClick={() => updateTab(activeTabId, { sourceImages: activeTab.sourceImages.filter((_, i) => i !== index) })} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">X</button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <button onClick={() => fileInputRef.current?.click()} className="w-full py-2 border-2 border-dashed border-purple-400/50 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-purple-400/10 transition-colors">
                        Upload Image(s) to Edit (Optional)
                    </button>
                     <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" multiple />

                    {activeTab.sourceImages.length === 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Style</label>
                            <select value={activeTab.style} onChange={e => updateTab(activeTabId, { style: e.target.value })} className="w-full p-2 bg-white/50 dark:bg-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                                {styles.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    )}
                    <div>
                       <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Aspect Ratio</label>
                       <select value={activeTab.resolution} onChange={e => updateTab(activeTabId, { resolution: e.target.value as any })} className="w-full p-2 bg-white/50 dark:bg-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                           {aspectRatios.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                       </select>
                   </div>
                    <button onClick={handleGenerate} disabled={!canGenerate} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-transform disabled:opacity-50 disabled:cursor-not-allowed">
                        {isLoading ? 'Generating...' : (activeTab.sourceImages.length > 0 ? 'Edit Image(s)' : 'Generate Image')}
                    </button>
                </div>
            </GlassCard>
            
            {isLoading && <div className="flex justify-center items-center my-8"><LoadingSpinner /></div>}
            {error && <p className="text-red-500 text-center">{error}</p>}
            
            {activeTab.generatedImage && (
                <GlassCard>
                    <img src={`data:image/jpeg;base64,${activeTab.generatedImage}`} alt={activeTab.prompt} className="rounded-lg w-full" />
                    <a href={`data:image/jpeg;base64,${activeTab.generatedImage}`} download="mirova-image.jpg" className="mt-4 w-full block text-center py-2 bg-green-500 text-white font-bold rounded-lg hover:bg-green-600 transition-colors">
                        Download Image
                    </a>
                </GlassCard>
            )}
        </div>
    );
};

// ====== MIROVA CODER VIEW ======

const languages: { [key: string]: string } = { 'JavaScript': 'js', 'Python': 'py', 'Dart': 'dart', 'Java': 'java', 'C++': 'cpp', 'C#': 'cs', 'Go': 'go', 'Rust': 'rs', 'TypeScript': 'ts', 'HTML': 'html', 'CSS': 'css', 'SQL': 'sql', 'Swift': 'swift', 'Kotlin': 'kt', 'Ruby': 'rb', 'PHP': 'php' };

export const MirovaCoderView: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const { tabs, activeTabId, setActiveTabId, addTab, closeTab, updateTab } = useContext(CoderContext);
    const [isLoading, setIsLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const activeTab = tabs.find(t => t.id === activeTabId);

    const handleGenerate = async () => {
        if (!activeTab || !activeTab.prompt.trim()) return;
        setIsLoading(true);
        updateTab(activeTabId, { result: '' });
        try {
            const code = await API.generateCode(activeTab.prompt, activeTab.language);
            const newTabState = { ...activeTab, result: code, name: activeTab.name || activeTab.prompt.substring(0, 20) };
            updateTab(activeTabId, newTabState);
            addHistoryItem({ feature: Feature.MirovaCoder, payload: newTabState });
        } catch(e) {
            console.error(e);
            updateTab(activeTabId, { result: "An error occurred while generating the code." });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCopy = () => {
        if (!activeTab?.result) return;
        const codeMatch = activeTab.result.match(/```(?:\w*\n)?([\s\S]*?)```/);
        const textToCopy = codeMatch ? codeMatch[1] : activeTab.result;
        navigator.clipboard.writeText(textToCopy).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleDownload = () => {
        if (!activeTab?.result) return;
        const codeMatch = activeTab.result.match(/```(?:\w*\n)?([\s\S]*?)```/);
        const textToDownload = codeMatch ? codeMatch[1] : activeTab.result;
        
        const fileExtension = languages[activeTab.language] || 'txt';
        const blob = new Blob([textToDownload], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mirova-code.${fileExtension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
    if (!activeTab) return null;

    return (
        <div className="p-4 space-y-6">
            <TabView tabs={tabs} activeTabId={activeTabId} onTabClick={setActiveTabId} onAddTab={addTab} onCloseTab={closeTab} featureName="Coder" />
            <GlassCard>
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Mirova Coder</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Describe the app or code you want to build, select a language, and let MIROVA write the code for you.</p>
                <div className="space-y-4">
                    <textarea value={activeTab.prompt} onChange={e => updateTab(activeTabId, { prompt: e.target.value })} placeholder="A Python script that organizes files in a directory by their extension..." className="w-full p-2 bg-white/50 dark:bg-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" rows={4}></textarea>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Programming Language</label>
                        <select value={activeTab.language} onChange={e => updateTab(activeTabId, { language: e.target.value })} className="w-full p-2 bg-white/50 dark:bg-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500">
                            {Object.keys(languages).map(lang => <option key={lang} value={lang}>{lang}</option>)}
                        </select>
                    </div>

                    <button onClick={handleGenerate} disabled={isLoading} className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white font-bold rounded-lg shadow-lg hover:scale-105 transition-transform disabled:opacity-50">
                        {isLoading ? 'Generating Code...' : 'Generate Code'}
                    </button>
                </div>
            </GlassCard>
            
            {isLoading && <div className="flex justify-center items-center my-8"><LoadingSpinner /></div>}

            {activeTab.result && (
                <GlassCard>
                    <div className="flex justify-between items-center mb-2 bg-gray-900/50 p-2 rounded-t-lg">
                        <span className="font-mono text-sm text-cyan-300">{activeTab.language}</span>
                        <div className="flex items-center gap-2">
                            <button onClick={handleCopy} className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md transition-colors bg-gray-600 text-white hover:bg-gray-500"><CopyIcon className="w-3.5 h-3.5" />{copied ? 'Copied!' : 'Copy'}</button>
                            <button onClick={handleDownload} className="flex items-center gap-1.5 px-2 py-1 text-xs font-semibold rounded-md transition-colors bg-gray-600 text-white hover:bg-gray-500"><DownloadIcon className="w-3.5 h-3.5" />Download</button>
                        </div>
                    </div>
                    <div className="bg-gray-800/80 p-4 rounded-b-lg overflow-x-auto max-h-96"><div className="prose prose-sm dark:prose-invert max-w-none prose-pre:bg-transparent prose-pre:p-0" dangerouslySetInnerHTML={{ __html: marked(activeTab.result) }}></div></div>
                </GlassCard>
            )}
        </div>
    );
};


// ====== STT VIEW ======
type SttStatus = 'idle' | 'recording' | 'processing' | 'transcribing';

export const SttView: React.FC = () => {
    const { addHistoryItem } = useContext(HistoryContext);
    const { transcription, setTranscription, language, setLanguage } = useContext(SttContext);
    const [status, setStatus] = useState<SttStatus>('idle');
    const [error, setError] = useState('');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [copied, setCopied] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);

    const languages = ['Telugu', 'English', 'Hindi', 'Bengali', 'Marathi', 'Tamil', 'Urdu', 'Gujarati', 'Kannada', 'Malayalam', 'Punjabi'];

    const cleanup = () => {
        mediaRecorderRef.current = null;
        audioChunksRef.current = [];
        setSelectedFile(null);
        // Do not clear transcription on cleanup to allow copying
        setStatus('idle');
    };
    
    const handleCopy = () => {
        if (!transcription) return;
        navigator.clipboard.writeText(transcription).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    const handleTranscriptionStream = async (audioChunks: { data: string; mimeType: string }[], prompt: string) => {
        setStatus('transcribing');
        setTranscription('');
        try {
            const stream = await API.transcribeAudioStream(audioChunks, language);
            let fullText = '';
            for await (const chunk of stream) {
                const text = chunk.text;
                fullText += text;
                setTranscription(fullText);
            }
            if (fullText) {
                addHistoryItem({ 
                    feature: Feature.STT, 
                    payload: { language, prompt, result: { text: fullText } }
                });
            }
        } catch (err) {
            console.error("Transcription error:", err);
            setError("Failed to transcribe the audio. Please try again.");
        } finally {
            cleanup();
        }
    };
    
    const startRecording = async () => {
        if (status !== 'idle') return;
        setStatus('recording');
        setError('');
        setTranscription('');
        audioChunksRef.current = [];

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };
            mediaRecorderRef.current.start();
        } catch (err) {
            console.error("Microphone access error:", err);
            setError("Could not access microphone. Please grant permission.");
            setStatus('idle');
        }
    };

    const stopRecording = () => {
        if (status !== 'recording' || !mediaRecorderRef.current) return;

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
            const reader = new FileReader();
            reader.readAsDataURL(audioBlob);
            reader.onloadend = () => {
                const base64data = reader.result as string;
                const audio = {
                    data: base64data.split(',')[1],
                    mimeType: 'audio/webm',
                };
                handleTranscriptionStream([audio], 'Live Recording');
            };

            // Stop microphone tracks
            mediaRecorderRef.current?.stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorderRef.current.stop();
        setStatus('processing');
    };
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && status === 'idle') {
            setSelectedFile(file);
            setError('');
            setTranscription('');
            handleTranscribeFile(file);
        }
    };

    const handleTranscribeFile = async (file: File) => {
        setStatus('processing');
        try {
            const audioCtx = new AudioContext();
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
            
            const offlineCtx = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                audioBuffer.length,
                audioBuffer.sampleRate
            );
            
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(offlineCtx.destination);
            source.start();

            const renderedBuffer = await offlineCtx.startRendering();
            
            const wavBlob = bufferToWave(renderedBuffer);

            const reader = new FileReader();
            reader.readAsDataURL(wavBlob);
            reader.onloadend = () => {
                const base64data = reader.result as string;
                const audio = {
                    data: base64data.split(',')[1],
                    mimeType: 'audio/wav',
                };
                handleTranscriptionStream([audio], `File: ${file.name}`);
            };
        } catch (err) {
             console.error("File processing error:", err);
             setError("Failed to process the audio file. It may be corrupted or in an unsupported format.");
             cleanup();
        }
    };

    // Helper to convert AudioBuffer to WAV Blob
    const bufferToWave = (abuffer: AudioBuffer): Blob => {
        const numOfChan = abuffer.numberOfChannels;
        const length = abuffer.length * numOfChan * 2 + 44;
        const buffer = new ArrayBuffer(length);
        const view = new DataView(buffer);
        const channels: Float32Array[] = [];
        let i, sample;
        let offset = 0;
        let pos = 0;
        
        for(i = 0; i < numOfChan; i++)
            channels.push(abuffer.getChannelData(i));
        
        // write WAVE header
        setUint32(0x46464952);                         // "RIFF"
        setUint32(length - 8);                         // file length - 8
        setUint32(0x45564157);                         // "WAVE"

        setUint32(0x20746d66);                         // "fmt " chunk
        setUint32(16);                                 // length = 16
        setUint16(1);                                  // PCM (uncompressed)
        setUint16(numOfChan);
        setUint32(abuffer.sampleRate);
        setUint32(abuffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
        setUint16(numOfChan * 2);                      // block-align
        setUint16(16);                                 // 16-bit
        
        setUint32(0x61746164);                         // "data" - chunk
        setUint32(length - pos - 4);                   // chunk length
        
        // write interleaved data
        for(i = 0; i < abuffer.length; i++) {
            for(let ch = 0; ch < numOfChan; ch++) {
                sample = Math.max(-1, Math.min(1, channels[ch][i]));
                sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
                view.setInt16(pos, sample, true);
                pos += 2;
            }
        }
        
        return new Blob([view], { type: 'audio/wav' });

        function setUint16(data: number) {
            view.setUint16(pos, data, true);
            pos += 2;
        }

        function setUint32(data: number) {
            view.setUint32(pos, data, true);
            pos += 4;
        }
    }

    const getStatusText = () => {
        switch (status) {
            case 'recording': return 'Listening...';
            case 'processing': return `Processing: ${selectedFile?.name || 'Live Audio'}`;
            case 'transcribing': return 'Transcribing...';
            case 'idle':
            default:
                return 'Select a language, then record or upload';
        }
    }

    return (
        <div className="p-4 space-y-6">
            <GlassCard className="text-center">
                <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-200">Speech to Text</h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Select the language, then record your voice or upload an audio file for a complete transcription.</p>
                
                <div className="mb-6">
                    <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Audio Language
                    </label>
                    <select
                        id="language-select"
                        value={language}
                        onChange={e => setLanguage(e.target.value)}
                        disabled={status !== 'idle'}
                        className="w-full max-w-xs mx-auto p-2 bg-white/50 dark:bg-black/20 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                    >
                        {languages.map(lang => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                </div>

                <div className="flex justify-center items-center gap-4">
                    <button onClick={status === 'recording' ? stopRecording : startRecording} disabled={(status !== 'idle' && status !== 'recording') || !!selectedFile} className={`relative w-24 h-24 rounded-full transition-all duration-300 flex items-center justify-center mx-auto disabled:opacity-50 disabled:cursor-not-allowed ${status === 'recording' ? 'bg-red-500 shadow-neon-purple' : 'bg-purple-600 shadow-lg'}`}>
                        {status === 'recording' ? 
                            <div className="w-8 h-8 bg-white rounded-md"></div> : 
                            <SttIcon className="w-10 h-10 text-white" />
                        }
                        {status === 'recording' && <div className="absolute inset-0 rounded-full border-2 border-white animate-ping"></div>}
                    </button>
                    <div className="text-2xl text-gray-400 dark:text-gray-600">OR</div>
                     <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="audio/*,video/*" className="hidden" />
                     <button onClick={() => fileInputRef.current?.click()} disabled={status !== 'idle'} className="w-24 h-24 border-2 border-dashed border-purple-400/50 rounded-full flex flex-col items-center justify-center text-gray-600 dark:text-gray-300 hover:bg-purple-400/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        <svg className="w-8 h-8 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"></path></svg>
                        <span className="text-xs">Upload File</span>
                    </button>
                </div>
                 <p className="mt-4 text-sm font-semibold h-5">{getStatusText()}</p>
            </GlassCard>

            {(status === 'processing' || status === 'transcribing') && (
                 <GlassCard>
                    <div className="flex flex-col items-center justify-center">
                        <div className="flex justify-center items-center my-8"><LoadingSpinner /></div>
                        <p className="mt-2 text-gray-600 dark:text-gray-300">{status === 'processing' ? 'Preparing audio for transcription...' : 'Transcribing...'}</p>
                    </div>
                </GlassCard>
            )}

            {error && <p className="text-red-500 text-center bg-red-500/10 p-2 rounded-lg">{error}</p>}
            
            {transcription && (
                <GlassCard>
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="font-bold text-gray-800 dark:text-gray-200">Transcription:</h3>
                        <button
                            onClick={handleCopy}
                            className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
                                copied
                                    ? 'bg-green-500 text-white'
                                    : 'bg-purple-500 text-white hover:bg-purple-600'
                            }`}
                        >
                            {copied ? 'Copied!' : 'Copy'}
                        </button>
                    </div>
                    <div className="bg-black/5 dark:bg-white/5 p-3 rounded-lg">
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap max-h-60 overflow-y-auto">
                            {transcription}
                        </p>
                    </div>
                </GlassCard>
            )}
        </div>
    );
};


// ====== HISTORY VIEW ======
interface HistoryViewProps {
    loadItemFromHistory: (item: HistoryItem) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({ loadItemFromHistory }) => {
    const { history, clearHistory } = useContext(HistoryContext);

    const getPrompt = (item: HistoryItem) => {
        if (item.feature === Feature.STT) return (item.payload as any).prompt;
        return (item.payload as any).prompt || (item.payload as ChatTab).name || 'Chat Session';
    }
    const getResult = (item: HistoryItem) => {
        if(item.feature === Feature.Chat) {
            const lastModelMessage = (item.payload as ChatTab).messages.filter(m => m.role === 'model').pop();
            return lastModelMessage?.text;
        }
        if(item.feature === Feature.Image) return (item.payload as any).generatedImage;
        return (item.payload as any).result?.text || (item.payload as any).result;
    }

    return (
        <div className="p-4 space-y-6">
            <GlassCard>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">History</h2>
                    {history.length > 0 && <button onClick={clearHistory} className="px-3 py-1 bg-red-500 text-white text-sm font-semibold rounded-md hover:bg-red-600 transition-colors">Clear All</button>}
                </div>
                {history.length === 0 ? (
                    <p className="text-center text-gray-600 dark:text-gray-400">Your history is empty. Start creating!</p>
                ) : (
                    <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-2">
                        {history.map(item => (
                            <div 
                                key={item.id} 
                                className="p-4 bg-white/50 dark:bg-black/20 rounded-lg transition-all cursor-pointer hover:ring-2 hover:ring-purple-500"
                                onClick={() => loadItemFromHistory(item)}
                            >
                                <div className="flex justify-between items-center mb-2">
                                    <span className="font-bold text-purple-600 dark:text-purple-400">{item.feature}</span>
                                    <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(item.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="text-sm text-gray-600 dark:text-gray-300 mb-2 truncate"><strong>Prompt:</strong> {getPrompt(item)}</p>
                                {getResult(item) && item.feature !== Feature.Image && <p className="text-sm text-gray-800 dark:text-gray-200 bg-black/5 dark:bg-white/5 p-2 rounded-md max-h-24 overflow-y-auto">{getResult(item)}</p>}
                                {getResult(item) && item.feature === Feature.Image && <img src={`data:image/jpeg;base64,${getResult(item)}`} alt={getPrompt(item)} className="rounded-lg mt-2 max-h-48" />}
                            </div>
                        ))}
                    </div>
                )}
            </GlassCard>
        </div>
    );
};

// ====== ABOUT VIEW ======
export const AboutView: React.FC = () => {
    const age = API.getVikasAge();

    return (
        <div className="p-4 space-y-6">
            <GlassCard>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-200">About MIROVA</h2>
                </div>
                <div className="space-y-4 text-gray-700 dark:text-gray-300">
                    <p className="font-semibold text-lg">MIROVA is a 100% Free and Unlimited AI Assistant App.</p>
                    <p>You can use all its features — Chat, Image, Voice, and App Builder — without any API keys or limits.</p>
                    <p>Developed by G. Vikas, age {age}.</p>
                    <p className="font-bold">MIROVA is for everyone, everywhere — totally free forever.</p>
                </div>
            </GlassCard>
        </div>
    );
};
