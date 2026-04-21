'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import TranscriptPanel from '@/components/TranscriptPanel';
import SuggestionsPanel from '@/components/SuggestionsPanel';
import ChatPanel from '@/components/ChatPanel';
import SettingsModal from '@/components/SettingsModal';
import { DEFAULT_SETTINGS } from '@/lib/prompts';
import type {
  AppSettings,
  ChatMessage,
  Suggestion,
  SuggestionBatch,
  TranscriptChunk,
} from '@/lib/types';

const SETTINGS_KEY = 'prompter-settings';
const CHUNK_DURATION_MS = 30_000;

export default function Home() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [transcriptChunks, setTranscriptChunks] = useState<TranscriptChunk[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [suggestionBatches, setSuggestionBatches] = useState<SuggestionBatch[]>([]);
  const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatStreaming, setIsChatStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshCountdown, setRefreshCountdown] = useState(CHUNK_DURATION_MS / 1000);
  const [error, setError] = useState<string | null>(null);

  // Stable refs — avoids stale-closure issues in async callbacks
  const settingsRef = useRef(settings);
  const chunksRef = useRef(transcriptChunks);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const cycleActiveRef = useRef(false);
  const chunkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chatMessagesRef = useRef(chatMessages);
  // Allows startCycle (defined before fetchSuggestions) to call it without a stale closure
  const fetchSuggestionsRef = useRef<() => Promise<void>>(() => Promise.resolve());
  // Prevents concurrent suggestion fetches (countdown + recording cycle fire at the same time)
  const isFetchingRef = useRef(false);

  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { chunksRef.current = transcriptChunks; }, [transcriptChunks]);
  useEffect(() => { chatMessagesRef.current = chatMessages; }, [chatMessages]);

  // Load settings from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      try {
        setSettings(JSON.parse(raw) as AppSettings);
      } catch {
        // ignore malformed storage
      }
    } else {
      setShowSettings(true); // first run — prompt for API key
    }
  }, []);

  const saveSettings = (s: AppSettings) => {
    setSettings(s);
    settingsRef.current = s;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  };

  // ─── Transcription ────────────────────────────────────────────────────────

  const transcribeBlob = useCallback(async (blob: Blob) => {
    if (blob.size < 1000) return;
    const s = settingsRef.current;
    if (!s.groqApiKey) return;

    const audioFile = new File([blob], 'audio.webm', { type: blob.type || 'audio/webm' });
    const formData = new FormData();
    formData.append('audio', audioFile);

    try {
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'x-groq-api-key': s.groqApiKey },
        body: formData,
      });
      const data = await res.json();
      if (data.text?.trim()) {
        const chunk: TranscriptChunk = {
          id: crypto.randomUUID(),
          text: data.text.trim(),
          timestamp: Date.now(),
        };
        setTranscriptChunks((prev) => {
          const updated = [...prev, chunk];
          chunksRef.current = updated;
          return updated;
        });
      }
    } catch {
      // transcription errors are non-fatal — continue recording
    }
  }, []);

  // ─── Recording cycle ──────────────────────────────────────────────────────

  const startCycle = useCallback(
    (stream: MediaStream) => {
      if (!cycleActiveRef.current) return;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(audioChunks, { type: mimeType });
        await transcribeBlob(blob);
        // Fetch suggestions immediately after transcription lands — don't wait for countdown
        await fetchSuggestionsRef.current();
        if (cycleActiveRef.current) startCycle(stream);
      };

      recorder.start();
      chunkTimerRef.current = setTimeout(() => {
        if (recorder.state === 'recording') recorder.stop();
      }, CHUNK_DURATION_MS);
    },
    [transcribeBlob],
  );

  // ─── Countdown + auto-refresh ─────────────────────────────────────────────

  const fetchSuggestions = useCallback(async () => {
    const s = settingsRef.current;
    if (!s.groqApiKey) return;
    const chunks = chunksRef.current;
    if (chunks.length === 0) return;
    if (isFetchingRef.current) return;

    isFetchingRef.current = true;
    setIsSuggestionsLoading(true);
    const recentText = chunks
      .slice(-s.suggestionContextChunks)
      .map((c) => c.text)
      .join('\n\n');

    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-api-key': s.groqApiKey,
        },
        body: JSON.stringify({
          transcript: recentText,
          promptTemplate: s.suggestionPrompt,
          model: s.model,
        }),
      });
      const data = await res.json();
      if (data.suggestions) {
        const batch: SuggestionBatch = {
          id: crypto.randomUUID(),
          suggestions: data.suggestions.map((sg: Omit<Suggestion, 'id'>) => ({
            id: crypto.randomUUID(),
            ...sg,
          })),
          timestamp: Date.now(),
        };
        setSuggestionBatches((prev) => [batch, ...prev]);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load suggestions');
    } finally {
      isFetchingRef.current = false;
      setIsSuggestionsLoading(false);
    }
  }, []);

  // Keep the ref current so startCycle can call fetchSuggestions without a stale closure
  useEffect(() => { fetchSuggestionsRef.current = fetchSuggestions; }, [fetchSuggestions]);

  const startCountdown = useCallback(() => {
    const seconds = CHUNK_DURATION_MS / 1000;
    setRefreshCountdown(seconds);
    let remaining = seconds;

    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setRefreshCountdown(remaining);
      if (remaining <= 0) {
        fetchSuggestions();
        remaining = seconds;
        setRefreshCountdown(seconds);
      }
    }, 1000);
  }, [fetchSuggestions]);

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  // ─── Mic toggle ───────────────────────────────────────────────────────────

  const toggleMic = async () => {
    if (isRecording) {
      // Stop
      cycleActiveRef.current = false;
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      stopCountdown();
      setRefreshCountdown(CHUNK_DURATION_MS / 1000);
      setIsRecording(false);
    } else {
      // Start
      if (!settingsRef.current.groqApiKey) {
        setShowSettings(true);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaStreamRef.current = stream;
        cycleActiveRef.current = true;
        setIsRecording(true);
        setError(null);
        startCycle(stream);
        startCountdown();
      } catch {
        setError('Microphone access denied. Please allow mic access and try again.');
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cycleActiveRef.current = false;
      if (chunkTimerRef.current) clearTimeout(chunkTimerRef.current);
      if (countdownRef.current) clearInterval(countdownRef.current);
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // ─── Chat ─────────────────────────────────────────────────────────────────

  const sendChatMessage = useCallback(
    async (content: string, suggestion?: Suggestion) => {
      const s = settingsRef.current;
      if (!s.groqApiKey || !content.trim()) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content,
        timestamp: Date.now(),
      };
      const assistantId = crypto.randomUUID();
      const assistantMsg: ChatMessage = {
        id: assistantId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };

      setChatMessages((prev) => [...prev, userMsg, assistantMsg]);
      setIsChatStreaming(true);

      const transcript = chunksRef.current
        .slice(-s.chatContextChunks)
        .map((c) => c.text)
        .join('\n\n');

      const systemPrompt = suggestion
        ? s.detailedAnswerPrompt
            .replace('{transcript}', transcript)
            .replace('{type}', suggestion.type)
            .replace('{preview}', suggestion.preview)
        : s.chatSystemPrompt.replace('{transcript}', transcript);

      // Build message history excluding the empty assistant placeholder
      const historyMessages = chatMessagesRef.current.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      historyMessages.push({ role: 'user', content });

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-groq-api-key': s.groqApiKey,
          },
          body: JSON.stringify({ messages: historyMessages, systemPrompt, model: s.model }),
        });

        if (!res.ok || !res.body) {
          throw new Error('Chat request failed');
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += decoder.decode(value, { stream: true });
          setChatMessages((prev) =>
            prev.map((m) => (m.id === assistantId ? { ...m, content: accumulated } : m)),
          );
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Chat failed';
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: `Error: ${msg}` } : m,
          ),
        );
      } finally {
        setIsChatStreaming(false);
      }
    },
    [],
  );

  const handleSuggestionClick = (suggestion: Suggestion) => {
    sendChatMessage(suggestion.preview, suggestion);
  };

  // ─── Export ───────────────────────────────────────────────────────────────

  const exportSession = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      transcript: transcriptChunks.map((c) => ({
        timestamp: new Date(c.timestamp).toISOString(),
        text: c.text,
      })),
      suggestionBatches: suggestionBatches.map((b) => ({
        timestamp: new Date(b.timestamp).toISOString(),
        suggestions: b.suggestions,
      })),
      chat: chatMessages.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: new Date(m.timestamp).toISOString(),
      })),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prompter-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-[#0c0e16] text-gray-200 overflow-hidden">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-[#1e2130] shrink-0">
        <div>
          <h1 className="text-base font-semibold text-gray-100">Prompter</h1>
          <p className="text-xs text-gray-600">Live Suggestions</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportSession}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-gray-200 hover:bg-[#1e2130] transition-colors"
          >
            <ExportIcon />
            Export
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs text-gray-400 hover:text-gray-200 hover:bg-[#1e2130] transition-colors"
          >
            <SettingsIcon />
            Settings
          </button>
        </div>
      </header>

      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between px-5 py-2 bg-red-900/30 border-b border-red-800/40 text-sm text-red-300">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400 hover:text-red-200">
            ✕
          </button>
        </div>
      )}

      {/* 3-column layout */}
      <div className="flex flex-1 min-h-0 divide-x divide-[#1e2130]">
        <div className="w-[30%] min-w-[260px] flex flex-col">
          <TranscriptPanel
            chunks={transcriptChunks}
            isRecording={isRecording}
            onToggleMic={toggleMic}
          />
        </div>
        <div className="w-[35%] min-w-[280px] flex flex-col">
          <SuggestionsPanel
            batches={suggestionBatches}
            isLoading={isSuggestionsLoading}
            refreshCountdown={refreshCountdown}
            isRecording={isRecording}
            hasTranscript={transcriptChunks.length > 0}
            onRefresh={fetchSuggestions}
            onClickSuggestion={handleSuggestionClick}
          />
        </div>
        <div className="flex-1 min-w-[280px] flex flex-col">
          <ChatPanel
            messages={chatMessages}
            isStreaming={isChatStreaming}
            onSend={(text) => sendChatMessage(text)}
          />
        </div>
      </div>

      {/* Settings modal */}
      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={saveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

function ExportIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
