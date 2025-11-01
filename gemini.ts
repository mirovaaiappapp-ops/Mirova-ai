import { GoogleGenAI, GenerateContentResponse, Modality, Chat } from "@google/genai";
import { ChatMessage } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

// ====== HELPERS ======

export const getVikasAge = (): number => {
    const birthday = new Date('2011-01-23');
    const today = new Date();
    let age = today.getFullYear() - birthday.getFullYear();
    const m = today.getMonth() - birthday.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthday.getDate())) {
        age--;
    }
    return age;
};

// ====== API FUNCTIONS ======

export const getChatResponse = async (messages: ChatMessage[]): Promise<GenerateContentResponse> => {
    // Convert our app's message format to the Gemini API's format
    const contents = messages.map(msg => {
        const parts = [];
        // Add images first if they exist
        if (msg.images && msg.images.length > 0) {
            msg.images.forEach(imgBase64 => {
                parts.push({
                    inlineData: {
                        mimeType: 'image/jpeg', // Assuming jpeg for simplicity
                        data: imgBase64,
                    }
                });
            });
        }
        // Then add the text part
        parts.push({ text: msg.text });

        return { role: msg.role, parts };
    });

    return await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: {
            systemInstruction: 'You are MIROVA, a smart, creative, and conversational AI assistant. Be helpful and friendly.',
        }
    });
};


export const getImage = async (prompt: string, style: string, aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4') => {
    const fullPrompt = `${prompt}, ${style} style`;
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: aspectRatio,
        },
    });

    const base64ImageBytes = response.generatedImages[0]?.image?.imageBytes;
    if (base64ImageBytes) {
        return base64ImageBytes;
    }
    
    throw new Error("No image generated in response.");
};


export const editImage = async (prompt: string, images: {data: string, mimeType: string}[], aspectRatio: string) => {
    const imageParts = images.map(image => ({
        inlineData: {
            data: image.data,
            mimeType: image.mimeType,
        }
    }));
    
    const fullPrompt = `${prompt}\n\nIMPORTANT: The final generated image must have a strict aspect ratio of ${aspectRatio}.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          ...imageParts,
          {
            text: fullPrompt,
          },
        ],
      },
      config: {
          responseModalities: [Modality.IMAGE],
      },
    });
    
    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return part.inlineData.data;
      }
    }
    throw new Error("No image generated in response.");
}

export const generateCode = async (prompt: string, language: string) => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Based on the user's idea: "${prompt}", generate a complete, production-ready code snippet in ${language}. The code should be well-documented. Respond ONLY with the raw code for the requested language inside a single markdown code block. Do not include any explanatory text before or after the code block.`,
    });
    return response.text;
};

export const getSpeech = async (text: string, voice: string) => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: `Say this with a natural, friendly tone: ${text}` }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice },
                },
            },
        },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
};

// Fix: Corrected the return type to use GenerateContentResponse, as GenerateContentStreamResponse is not a valid export.
export const transcribeAudioStream = async (audioChunks: { data: string, mimeType: string }[], language: string): Promise<AsyncGenerator<GenerateContentResponse>> => {
    const audioParts = audioChunks.map(chunk => ({
        inlineData: {
            mimeType: chunk.mimeType,
            data: chunk.data,
        },
    }));

    const contents = {
        parts: [
            { text: `You are an expert multilingual transcription service. Transcribe the following audio recording. The primary language spoken in the audio is ${language}. Provide a precise and accurate transcription.` },
            ...audioParts,
        ],
    };

    const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-pro',
        contents,
    });

    return stream;
};

export const transcribeSpeech = async (audioChunk: { data: string, mimeType: string }, language: string): Promise<string> => {
    const audioPart = {
        inlineData: {
            mimeType: audioChunk.mimeType,
            data: audioChunk.data,
        },
    };

    const contents = {
        parts: [
            { text: `You are an expert multilingual transcription service. Transcribe the following audio recording. The primary language spoken in the audio is ${language}. Provide a precise and accurate transcription. Respond only with the transcribed text.` },
            audioPart,
        ],
    };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents,
    });

    return response.text;
};


// ====== AUDIO UTILITIES ======

// Base64 decode
function decode(base64: string) {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Raw PCM to AudioBuffer
async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
}


let audioContext: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;

export const playAudio = async (base64Audio: string, onEnded: () => void = () => {}) => {
    if (currentSource) {
        currentSource.onended = null; // Prevent old onEnded from firing
        currentSource.stop();
        currentSource.disconnect();
    }

    if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const audioBuffer = await decodeAudioData(
        decode(base64Audio),
        audioContext,
        24000,
        1,
    );
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContext.destination);
    source.start();

    source.onended = () => {
        if (currentSource === source) {
            currentSource = null;
        }
        onEnded();
    };

    currentSource = source;
};

export const stopAudio = () => {
    if (currentSource) {
        currentSource.stop();
        // The onended event will fire, which will set currentSource to null and call the component's onEnded callback.
    }
};
