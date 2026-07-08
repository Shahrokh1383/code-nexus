import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';

// Polyfill Web APIs that jsdom might lack
Object.defineProperties(globalThis, {
  TextEncoder: { value: TextEncoder, writable: true, configurable: true },
  TextDecoder: { value: TextDecoder, writable: true, configurable: true },
});