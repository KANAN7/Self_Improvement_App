/**
 * Zustand UI store for the chat screen.
 *
 * Synchronous, ephemeral state only — the mode the user has selected for
 * this session, and the in-flight streaming buffer for the assistant
 * reply we're currently receiving. Persisted history lives in SQLite /
 * localStorage, not here.
 */

import { create } from 'zustand';

import type { ChatMode } from '@/lib/db/schema';

export type ChatUIState = {
  mode: ChatMode;
  setMode: (mode: ChatMode) => void;

  /** Live token buffer for the assistant message currently streaming, if any. */
  streaming: { messageId: string; text: string } | null;
  beginStream: (messageId: string) => void;
  appendStream: (text: string) => void;
  endStream: () => void;
};

export const useChatUI = create<ChatUIState>((set) => ({
  mode: 'reflective',
  setMode: (mode) => set({ mode }),

  streaming: null,
  beginStream: (messageId) => set({ streaming: { messageId, text: '' } }),
  appendStream: (text) =>
    set((state) =>
      state.streaming
        ? { streaming: { ...state.streaming, text: state.streaming.text + text } }
        : state,
    ),
  endStream: () => set({ streaming: null }),
}));
