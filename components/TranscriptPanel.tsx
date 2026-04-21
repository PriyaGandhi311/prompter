'use client';

import { useEffect, useRef } from 'react';
import type { TranscriptChunk } from '@/lib/types';

interface Props {
  chunks: TranscriptChunk[];
  isRecording: boolean;
  onToggleMic: () => void;
}

export default function TranscriptPanel({ chunks, isRecording, onToggleMic }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chunks]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252838]">
        <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          1. Mic &amp; Transcript
        </span>
        <span className={`text-xs font-medium ${isRecording ? 'text-emerald-400' : 'text-gray-500'}`}>
          {isRecording ? 'RECORDING' : 'IDLE'}
        </span>
      </div>

      {/* Mic button */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-[#252838]">
        <button
          onClick={onToggleMic}
          className={`relative flex items-center justify-center w-12 h-12 rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#131520] ${
            isRecording
              ? 'bg-blue-500 focus:ring-blue-500'
              : 'bg-[#1e2130] hover:bg-[#252838] focus:ring-gray-600'
          }`}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
          {isRecording && (
            <span className="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-40" />
          )}
          <MicIcon recording={isRecording} />
        </button>
        <p className="text-sm text-gray-400">
          {isRecording
            ? 'Recording\u2026 transcript appends every ~30s.'
            : 'Click mic to start. Transcript appends every ~30s.'}
        </p>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {chunks.length === 0 ? (
          <p className="text-sm text-gray-600 text-center mt-8">
            No transcript yet \u2014 start the mic.
          </p>
        ) : (
          chunks.map((chunk) => (
            <div key={chunk.id} className="text-sm text-gray-300 leading-relaxed">
              <span className="text-xs text-gray-600 mr-2">
                {new Date(chunk.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              {chunk.text}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MicIcon({ recording }: { recording: boolean }) {
  return (
    <svg
      className={`w-5 h-5 ${recording ? 'text-white' : 'text-gray-400'}`}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4zm-1 18.93V22h2v-2.07A8.001 8.001 0 0 0 20 12h-2a6 6 0 0 1-12 0H4a8.001 8.001 0 0 0 7 7.93z" />
    </svg>
  );
}
