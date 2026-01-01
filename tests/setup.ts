import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock AudioContext for browser audio APIs
class MockAudioContext {
    sampleRate = 24000;
    destination = {};

    createBuffer(numChannels: number, length: number, sampleRate: number) {
        return {
            numberOfChannels: numChannels,
            length: length,
            sampleRate: sampleRate,
            getChannelData: () => new Float32Array(length),
            duration: length / sampleRate
        };
    }

    createBufferSource() {
        return {
            buffer: null,
            connect: vi.fn(),
            start: vi.fn(),
            stop: vi.fn()
        };
    }

    createMediaStreamSource() {
        return {
            connect: vi.fn(),
            disconnect: vi.fn()
        };
    }

    createScriptProcessor() {
        return {
            connect: vi.fn(),
            disconnect: vi.fn(),
            onaudioprocess: null
        };
    }

    close() {
        return Promise.resolve();
    }
}

// @ts-ignore
global.AudioContext = MockAudioContext;
// @ts-ignore
global.webkitAudioContext = MockAudioContext;

// Mock MediaRecorder
class MockMediaRecorder {
    stream: any;
    ondataavailable: ((e: any) => void) | null = null;
    onstop: (() => void) | null = null;
    state = 'inactive';

    constructor(stream: any) {
        this.stream = stream;
    }

    start() {
        this.state = 'recording';
    }

    stop() {
        this.state = 'inactive';
        if (this.onstop) this.onstop();
    }
}

// @ts-ignore
global.MediaRecorder = MockMediaRecorder;

// Mock navigator.mediaDevices
Object.defineProperty(global.navigator, 'mediaDevices', {
    value: {
        getUserMedia: vi.fn().mockResolvedValue({
            getTracks: () => [{ stop: vi.fn() }]
        })
    },
    writable: true
});

// Mock Notification API
// @ts-ignore
global.Notification = {
    permission: 'granted',
    requestPermission: vi.fn().mockResolvedValue('granted')
};

// Mock FileReader
class MockFileReader {
    result: string | null = null;
    onloadend: (() => void) | null = null;
    onerror: ((e: any) => void) | null = null;

    readAsDataURL() {
        this.result = 'data:audio/webm;base64,SGVsbG8gV29ybGQ=';
        if (this.onloadend) this.onloadend();
    }
}

// @ts-ignore
global.FileReader = MockFileReader;
