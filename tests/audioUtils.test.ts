import { describe, it, expect } from 'vitest';
import {
    base64ToUint8Array,
    arrayBufferToBase64,
    float32ToPCM16,
    blobToBase64
} from '../services/audioUtils';

describe('audioUtils', () => {
    describe('base64ToUint8Array', () => {
        it('should convert base64 string to Uint8Array', () => {
            const base64 = 'SGVsbG8gV29ybGQ='; // "Hello World"
            const result = base64ToUint8Array(base64);

            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBe(11);
            expect(String.fromCharCode(...result)).toBe('Hello World');
        });

        it('should handle empty string', () => {
            const result = base64ToUint8Array('');
            expect(result).toBeInstanceOf(Uint8Array);
            expect(result.length).toBe(0);
        });

        it('should handle single character', () => {
            const base64 = 'QQ=='; // "A"
            const result = base64ToUint8Array(base64);
            expect(result.length).toBe(1);
            expect(result[0]).toBe(65); // ASCII for 'A'
        });
    });

    describe('arrayBufferToBase64', () => {
        it('should convert ArrayBuffer to base64 string', () => {
            const text = 'Hello World';
            const encoder = new TextEncoder();
            const buffer = encoder.encode(text).buffer;

            const result = arrayBufferToBase64(buffer);
            expect(result).toBe('SGVsbG8gV29ybGQ=');
        });

        it('should handle empty buffer', () => {
            const buffer = new ArrayBuffer(0);
            const result = arrayBufferToBase64(buffer);
            expect(result).toBe('');
        });

        it('should roundtrip with base64ToUint8Array', () => {
            const original = 'Test data 123';
            const encoder = new TextEncoder();
            const buffer = encoder.encode(original).buffer;

            const base64 = arrayBufferToBase64(buffer);
            const decoded = base64ToUint8Array(base64);

            expect(String.fromCharCode(...decoded)).toBe(original);
        });
    });

    describe('float32ToPCM16', () => {
        it('should convert float32 audio samples to PCM16', () => {
            const float32 = new Float32Array([0, 0.5, 1, -0.5, -1]);
            const result = float32ToPCM16(float32);

            expect(result).toBeInstanceOf(Int16Array);
            expect(result.length).toBe(5);
        });

        it('should clamp values at 1.0 to max PCM16', () => {
            const float32 = new Float32Array([1.0]);
            const result = float32ToPCM16(float32);
            expect(result[0]).toBe(32767); // 0x7FFF
        });

        it('should clamp values at -1.0 to min PCM16', () => {
            const float32 = new Float32Array([-1.0]);
            const result = float32ToPCM16(float32);
            expect(result[0]).toBe(-32768); // -0x8000
        });

        it('should handle zero correctly', () => {
            const float32 = new Float32Array([0]);
            const result = float32ToPCM16(float32);
            expect(result[0]).toBe(0);
        });

        it('should clamp values outside [-1, 1] range', () => {
            const float32 = new Float32Array([2.0, -2.0]);
            const result = float32ToPCM16(float32);
            expect(result[0]).toBe(32767); // clamped to max
            expect(result[1]).toBe(-32768); // clamped to min
        });

        it('should handle empty array', () => {
            const float32 = new Float32Array([]);
            const result = float32ToPCM16(float32);
            expect(result.length).toBe(0);
        });
    });

    describe('blobToBase64', () => {
        it('should convert Blob to base64 string', async () => {
            const blob = new Blob(['Hello'], { type: 'text/plain' });
            const result = await blobToBase64(blob);

            expect(typeof result).toBe('string');
            expect(result.length).toBeGreaterThan(0);
        });
    });
});
