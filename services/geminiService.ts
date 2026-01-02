import { GoogleGenAI, Type, FunctionDeclaration, Schema, Modality } from "@google/genai";
import { Task, TaskPriority } from "../types";
import { blobToBase64 } from "./audioUtils";

// ============================================
// SECURITY CONFIGURATION
// ============================================

const apiKey = process.env.API_KEY || '';

// Security: Validate API key on startup (no key exposure in logs)
if (!apiKey || apiKey.trim() === '') {
  console.error('⚠️ GEMINI_API_KEY is missing! Please add it to your .env.local file.');
  console.error('   Get your API key from: https://aistudio.google.com/apikey');
}

const ai = new GoogleGenAI({ apiKey });

// ============================================
// SECURITY UTILITIES
// ============================================

// Rate limiting: Simple in-memory rate limiter
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 30; // Max requests per minute
const RATE_WINDOW = 60000; // 1 minute in ms

const checkRateLimit = (action: string): void => {
  const now = Date.now();
  const key = action;
  const entry = rateLimitMap.get(key);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + RATE_WINDOW });
    return;
  }

  if (entry.count >= RATE_LIMIT) {
    throw new Error('RATE_LIMIT_EXCEEDED: Too many requests. Please wait a moment before trying again.');
  }

  entry.count++;
};

// Input sanitization: Remove potentially dangerous content
const sanitizeTextInput = (text: string, maxLength: number = 10000): string => {
  if (!text || typeof text !== 'string') {
    throw new Error('INVALID_INPUT: Text input is required');
  }

  // Trim and limit length
  let sanitized = text.trim().slice(0, maxLength);

  // Remove null bytes and control characters (except newlines/tabs)
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  return sanitized;
};

// Validate audio blob
const validateAudioBlob = (blob: Blob): void => {
  const MAX_AUDIO_SIZE = 25 * 1024 * 1024; // 25MB max
  const ALLOWED_TYPES = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/mpeg'];

  if (!blob || !(blob instanceof Blob)) {
    throw new Error('INVALID_INPUT: Audio blob is required');
  }

  if (blob.size > MAX_AUDIO_SIZE) {
    throw new Error('INVALID_INPUT: Audio file too large (max 25MB)');
  }

  if (blob.size === 0) {
    throw new Error('INVALID_INPUT: Audio file is empty');
  }

  // Check mime type (allow empty for flexibility)
  if (blob.type && !ALLOWED_TYPES.some(t => blob.type.startsWith(t.split('/')[0]))) {
    throw new Error('INVALID_INPUT: Invalid audio format');
  }
};

// Secure error handler - prevents leaking internal details
const handleApiError = (error: any, context: string): never => {
  console.error(`[${context}] Error:`, error?.message || 'Unknown error');

  // Map known errors to user-friendly messages
  if (error?.message?.includes('API key not valid')) {
    throw new Error('API_KEY_INVALID: Your API key is invalid. Please check your configuration.');
  }
  if (error?.message?.includes('quota')) {
    throw new Error('QUOTA_EXCEEDED: API quota exceeded. Please try again later.');
  }
  if (error?.message?.includes('rate')) {
    throw new Error('RATE_LIMIT: Too many requests. Please slow down.');
  }
  if (error?.message?.includes('INVALID_INPUT') || error?.message?.includes('API_KEY') || error?.message?.includes('RATE_LIMIT')) {
    throw error; // Re-throw our custom errors
  }

  // Generic error for unknown issues (don't expose internal details)
  throw new Error('SERVICE_ERROR: An error occurred while processing your request. Please try again.');
};

// Helper to check API key
const validateApiKey = (): void => {
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API_KEY_MISSING: Please set GEMINI_API_KEY in your .env.local file.');
  }
};

// ============================================
// API FUNCTIONS WITH SECURITY
// ============================================

// 1. Transcribe Audio (Gemini 2.5 Flash)
export const transcribeAudio = async (audioBlob: Blob): Promise<string> => {
  validateApiKey();
  checkRateLimit('transcribe');
  validateAudioBlob(audioBlob);

  const base64Data = await blobToBase64(audioBlob);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: audioBlob.type || 'audio/webm',
              data: base64Data
            }
          },
          {
            text: "Transcribe this audio exactly as spoken. The language may be English, Hindi, or a mix of both (Hinglish). If Hindi is spoken, you may transcribe it in Devanagari or Romanized script as appropriate for accuracy. Do not translate the entire text to English, preserve the original language. Return ONLY the transcript text."
          }
        ]
      }
    });

    // Sanitize output
    return sanitizeTextInput(response.text || "", 50000);
  } catch (error: any) {
    handleApiError(error, 'transcribeAudio');
  }
};

// 2. Extract and Prioritize Tasks (Gemini 3.0 Pro with Thinking)
export const analyzeTasksFromText = async (transcript: string): Promise<Task[]> => {
  validateApiKey();
  checkRateLimit('analyze');

  // Sanitize input
  const sanitizedTranscript = sanitizeTextInput(transcript, 15000);

  const taskSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        title: { type: Type.STRING },
        description: { type: Type.STRING },
        priority: { type: Type.STRING, enum: Object.values(TaskPriority) },
        dueDate: { type: Type.STRING, description: "YYYY-MM-DD format if mentioned, else null" },
        assignee: { type: Type.STRING, description: "Name of person assigned if mentioned" }
      },
      required: ["id", "title", "description", "priority"]
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `Analyze the following conversation transcript. The transcript may be in English, Hindi, or a mix of both. 
      Extract actionable tasks.
      Prioritize them based on urgency and importance implied in the conversation.
      
      IMPORTANT: Even if the transcript is in Hindi, output the Task Title and Description in English for consistency.
      
      TRANSCRIPT:
      ${sanitizedTranscript}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: taskSchema
      }
    });

    const tasks = JSON.parse(response.text || "[]");
    // Ensure IDs are unique and sanitize output
    return tasks.map((t: any) => ({
      ...t,
      title: sanitizeTextInput(t.title || '', 200),
      description: sanitizeTextInput(t.description || '', 1000),
      completed: false,
      id: t.id || Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString()
    }));
  } catch (error: any) {
    console.error("Failed to analyze tasks", error);
    return [];
  }
};

// 3. Chat with Tools (Search & Maps)
export const chatWithAssistant = async (
  message: string,
  history: any[],
  location?: { lat: number; lng: number },
  context?: string
) => {
  validateApiKey();
  checkRateLimit('chat');

  // Sanitize message input
  const sanitizedMessage = sanitizeTextInput(message, 5000);

  const tools: any[] = [
    { googleSearch: {} }
  ];

  if (location) {
    // Validate coordinates
    if (typeof location.lat !== 'number' || typeof location.lng !== 'number' ||
      location.lat < -90 || location.lat > 90 ||
      location.lng < -180 || location.lng > 180) {
      throw new Error('INVALID_INPUT: Invalid location coordinates');
    }
    tools.push({ googleMaps: {} });
  }

  const systemInstruction = `
    You are a helpful AI assistant.
    ${context ? `CONTEXT FROM RECORDING HISTORY:\n${context}\n\nUser questions may be about the above context.` : ''}
    
    SPECIAL INSTRUCTION FOR TASK CREATION:
    If the user's message implies creating a task (e.g., "create a task to...", "remind me to...", "add to my tasks..."), 
    you MUST output the task details in the following strict format on a separate line:
    [[TASK: Title | Description | Priority]]
    
    Priority must be one of: Critical, High, Medium, Low.
    Example: [[TASK: Buy Milk | Get 2 gallons of whole milk | Medium]]
    Do not mention you are creating a task in text if you use this format, just use the format.
  `;

  try {
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      history: history,
      config: {
        tools: tools,
        systemInstruction: systemInstruction, // Inject instructions
        toolConfig: location ? {
          retrievalConfig: {
            latLng: {
              latitude: location.lat,
              longitude: location.lng
            }
          }
        } : undefined
      }
    });

    const response = await chat.sendMessage({ message: sanitizedMessage });
    return response;
  } catch (error: any) {
    handleApiError(error, 'chatWithAssistant');
  }
};

// 4. Text to Speech
export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<AudioBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName }
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    // Decode logic needs to happen in browser context with AudioContext
    // We will return base64 here and decode in the component to keep service pure-ish or pass context
    // For simplicity, let's return base64 string here
    return null; // Placeholder, actually better to just return the Base64 string
  } catch (e) {
    console.error("TTS Error", e);
    return null;
  }
};

export const generateSpeechBase64 = async (text: string): Promise<string | undefined> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Fenrir' }
        },
      },
    },
  });
  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
}

// 5. Fast Responses (Flash Lite)
export const getFastResponse = async (prompt: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-flash-lite-latest',
    contents: prompt
  });
  return response.text || "";
}