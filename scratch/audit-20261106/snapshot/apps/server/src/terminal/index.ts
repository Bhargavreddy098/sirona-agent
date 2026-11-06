/**
 * @file apps/server/src/terminal/index.ts
 * Terminal domain module: Bounded virtual PTY sessions, resize events, and WebSocket proxies.
 */
export * from '../windows/canonicalTerminal.js';
export * from '../windows/terminalService.js';
export { TerminalGateway } from '../../services/terminalGateway.js';
