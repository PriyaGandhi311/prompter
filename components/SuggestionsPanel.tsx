'use client';

import type { SuggestionBatch, Suggestion, SuggestionType } from '@/lib/types';

interface Props {
  batches: SuggestionBatch[];
  isLoading: boolean;
  refreshCountdown: number;
  isRecording: boolean;
  onRefresh: () => void;
  onClickSuggestion: (suggestion: Suggestion) => void;
}

const TYPE_CONFIG: Record<SuggestionType, { label: string; color: string; bg: string; border: string }> = {
  question: {
    label: 'Question',
    color: 'text-blue-400',
    bg: 'bg-blue-400/10',
    border: 'border-blue-400/20',
  },
  'talking-point': {
    label: 'Talking Point',
    color: 'text-emerald-400',
    bg: 'bg-emerald-400/10',
    border: 'border-emerald-400/20',
  },
  answer: {
    label: 'Answer',
    color: 'text-violet-400',
    bg: 'bg-violet-400/10',
    border: 'border-violet-400/20',
  },
  'fact-check': {
    label: 'Fact Check',
    color: 'text-amber-400',
    bg: 'bg-amber-400/10',
    border: 'border-amber-400/20',
  },
};

export default function SuggestionsPanel({
  batches,
  isLoading,
  refreshCountdown,
  isRecording,
  onRefresh,
  onClickSuggestion,
}: Props) {
  const totalBatches = batches.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252838]">
        <span className="text-xs font-semibold tracking-widest text-gray-500 uppercase">
          2. Live Suggestions
        </span>
        <span className="text-xs text-gray-500">
          {totalBatches} {totalBatches === 1 ? 'BATCH' : 'BATCHES'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#252838]">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1e2130] hover:bg-[#252838] text-gray-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshIcon spinning={isLoading} />
          Reload suggestions
        </button>
        {isRecording && (
          <span className="text-xs text-gray-500">
            auto-refresh in {refreshCountdown}s
          </span>
        )}
      </div>

      {/* Suggestion batches */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {batches.length === 0 ? (
          <div className="space-y-3 mt-2">
            <InfoCard />
            <p className="text-sm text-gray-600 text-center mt-6">
              Suggestions appear here once recording starts.
            </p>
          </div>
        ) : (
          batches.map((batch, batchIndex) => (
            <div
              key={batch.id}
              className={`space-y-2 transition-opacity ${batchIndex > 0 ? 'opacity-50' : ''}`}
            >
              {batchIndex > 0 && (
                <p className="text-xs text-gray-600 pt-1">
                  {new Date(batch.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              )}
              {batch.suggestions.map((s) => (
                <SuggestionCard
                  key={s.id}
                  suggestion={s}
                  onClick={() => onClickSuggestion(s)}
                />
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onClick,
}: {
  suggestion: Suggestion;
  onClick: () => void;
}) {
  const config = TYPE_CONFIG[suggestion.type] ?? TYPE_CONFIG.question;

  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg bg-[#1a1d2e] border border-[#252838] hover:border-[#353850] hover:bg-[#1e2236] transition-all duration-150 group"
    >
      <span
        className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-2 ${config.color} ${config.bg} border ${config.border}`}
      >
        {config.label}
      </span>
      <p className="text-sm text-gray-300 leading-snug group-hover:text-gray-100 transition-colors">
        {suggestion.preview}
      </p>
    </button>
  );
}

function InfoCard() {
  return (
    <div className="p-3 rounded-lg bg-[#1a1d2e] border border-[#252838] text-sm text-gray-400 leading-relaxed">
      On reload (or auto every ~30s), generate{' '}
      <strong className="text-gray-200">3 fresh suggestions</strong> from recent transcript
      context. New batch appears at the top; older batches push down (faded). Each is a
      tappable card:{' '}
      <span className="text-blue-400">a question to ask</span>,{' '}
      <span className="text-emerald-400">a talking point</span>,{' '}
      <span className="text-violet-400">an answer</span>, or{' '}
      <span className="text-amber-400">a fact-check</span>. The preview alone should already
      be useful.
    </div>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}
