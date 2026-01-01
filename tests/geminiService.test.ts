import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock process.env.API_KEY before any imports
vi.stubGlobal('process', {
    env: {
        API_KEY: 'test-api-key-for-mocking'
    }
});

// Mock the @google/genai module before importing the service
vi.mock('@google/genai', () => {
    const mockGenerateContent = vi.fn();
    const mockChatCreate = vi.fn();
    const mockChatSendMessage = vi.fn();

    return {
        GoogleGenAI: vi.fn().mockImplementation(() => ({
            models: {
                generateContent: mockGenerateContent
            },
            chats: {
                create: mockChatCreate.mockReturnValue({
                    sendMessage: mockChatSendMessage
                })
            }
        })),
        Type: {
            ARRAY: 'array',
            OBJECT: 'object',
            STRING: 'string'
        },
        Modality: {
            AUDIO: 'AUDIO'
        },
        __mockGenerateContent: mockGenerateContent,
        __mockChatSendMessage: mockChatSendMessage
    };
});

describe('geminiService', () => {
    let mockGenerateContent: ReturnType<typeof vi.fn>;
    let mockChatSendMessage: ReturnType<typeof vi.fn>;

    beforeEach(async () => {
        vi.clearAllMocks();
        const genaiModule = await import('@google/genai');
        mockGenerateContent = (genaiModule as any).__mockGenerateContent;
        mockChatSendMessage = (genaiModule as any).__mockChatSendMessage;
    });

    afterEach(() => {
        vi.resetModules();
    });

    describe('transcribeAudio', () => {
        it('should call Gemini API with audio blob', async () => {
            mockGenerateContent.mockResolvedValue({
                text: 'This is the transcribed text.'
            });

            const { transcribeAudio } = await import('../services/geminiService');
            const audioBlob = new Blob(['audio data'], { type: 'audio/webm' });

            const result = await transcribeAudio(audioBlob);

            expect(result).toBe('This is the transcribed text.');
            expect(mockGenerateContent).toHaveBeenCalledTimes(1);
        });

        it('should return empty string when no transcription', async () => {
            mockGenerateContent.mockResolvedValue({
                text: undefined
            });

            const { transcribeAudio } = await import('../services/geminiService');
            const audioBlob = new Blob(['audio'], { type: 'audio/webm' });

            const result = await transcribeAudio(audioBlob);

            expect(result).toBe('');
        });
    });

    describe('analyzeTasksFromText', () => {
        it('should parse tasks from transcript', async () => {
            const mockTasks = [
                {
                    id: 'task-1',
                    title: 'Complete report',
                    description: 'Finish the quarterly report',
                    priority: 'High'
                }
            ];

            mockGenerateContent.mockResolvedValue({
                text: JSON.stringify(mockTasks)
            });

            const { analyzeTasksFromText } = await import('../services/geminiService');
            const result = await analyzeTasksFromText('We need to complete the report by tomorrow');

            expect(result).toHaveLength(1);
            expect(result[0].title).toBe('Complete report');
            expect(result[0].completed).toBe(false);
            expect(result[0].createdAt).toBeDefined();
        });

        it('should handle empty response', async () => {
            mockGenerateContent.mockResolvedValue({
                text: '[]'
            });

            const { analyzeTasksFromText } = await import('../services/geminiService');
            const result = await analyzeTasksFromText('No tasks here');

            expect(result).toEqual([]);
        });

        it('should handle parse errors gracefully', async () => {
            mockGenerateContent.mockResolvedValue({
                text: 'invalid json'
            });

            const { analyzeTasksFromText } = await import('../services/geminiService');
            const result = await analyzeTasksFromText('Some text');

            expect(result).toEqual([]);
        });
    });

    describe('chatWithAssistant', () => {
        it('should send message and return response', async () => {
            mockChatSendMessage.mockResolvedValue({
                text: 'Hello! How can I help you?',
                candidates: []
            });

            const { chatWithAssistant } = await import('../services/geminiService');
            const result = await chatWithAssistant('Hello', []);

            expect(result.text).toBe('Hello! How can I help you?');
        });

        it('should include location when provided', async () => {
            mockChatSendMessage.mockResolvedValue({
                text: 'Found nearby restaurants',
                candidates: [{
                    groundingMetadata: {
                        groundingChunks: []
                    }
                }]
            });

            const { chatWithAssistant } = await import('../services/geminiService');
            const location = { lat: 40.7128, lng: -74.0060 };
            const result = await chatWithAssistant('Find restaurants', [], location);

            expect(result).toBeDefined();
        });
    });

    describe('generateSpeechBase64', () => {
        it('should return base64 audio data', async () => {
            mockGenerateContent.mockResolvedValue({
                candidates: [{
                    content: {
                        parts: [{
                            inlineData: {
                                data: 'base64AudioData'
                            }
                        }]
                    }
                }]
            });

            const { generateSpeechBase64 } = await import('../services/geminiService');
            const result = await generateSpeechBase64('Hello world');

            expect(result).toBe('base64AudioData');
        });

        it('should handle missing audio data', async () => {
            mockGenerateContent.mockResolvedValue({
                candidates: []
            });

            const { generateSpeechBase64 } = await import('../services/geminiService');
            const result = await generateSpeechBase64('Hello');

            expect(result).toBeUndefined();
        });
    });

    describe('getFastResponse', () => {
        it('should return text response', async () => {
            mockGenerateContent.mockResolvedValue({
                text: 'Quick answer'
            });

            const { getFastResponse } = await import('../services/geminiService');
            const result = await getFastResponse('Quick question');

            expect(result).toBe('Quick answer');
        });
    });
});
