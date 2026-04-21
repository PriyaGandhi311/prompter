'use client';

import { useState } from 'react';
import type { AppSettings } from '@/lib/types';
import { DEFAULT_SETTINGS } from '@/lib/prompts';

interface Props {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<AppSettings>(settings);

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const handleReset = () => setDraft(DEFAULT_SETTINGS);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl bg-[#131520] border border-[#252838] shadow-2xl">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#252838]">
          <h2 className="text-base font-semibold text-gray-100">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-300 transition-colors"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* API Key */}
          <Field label="Groq API Key" hint="Stored locally in your browser only.">
            <input
              type="password"
              value={draft.groqApiKey}
              onChange={(e) => set('groqApiKey', e.target.value)}
              placeholder="gsk_..."
              className="input-base font-mono"
              autoComplete="off"
            />
          </Field>

          {/* Model */}
          <Field label="Model" hint="The Groq model ID used for suggestions and chat.">
            <input
              type="text"
              value={draft.model}
              onChange={(e) => set('model', e.target.value)}
              className="input-base font-mono"
            />
          </Field>

          {/* Context windows */}
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Suggestion context (chunks)"
              hint="How many transcript chunks to send when generating suggestions."
            >
              <input
                type="number"
                min={1}
                max={20}
                value={draft.suggestionContextChunks}
                onChange={(e) => set('suggestionContextChunks', Number(e.target.value))}
                className="input-base"
              />
            </Field>
            <Field
              label="Chat context (chunks)"
              hint="How many transcript chunks to include in the chat system prompt."
            >
              <input
                type="number"
                min={1}
                max={50}
                value={draft.chatContextChunks}
                onChange={(e) => set('chatContextChunks', Number(e.target.value))}
                className="input-base"
              />
            </Field>
          </div>

          {/* Suggestion prompt */}
          <Field
            label="Live suggestion prompt"
            hint="Use {transcript} as a placeholder for the recent transcript."
          >
            <textarea
              rows={8}
              value={draft.suggestionPrompt}
              onChange={(e) => set('suggestionPrompt', e.target.value)}
              className="input-base font-mono text-xs resize-y"
            />
          </Field>

          {/* Detailed answer prompt */}
          <Field
            label="Detailed answer prompt (on suggestion click)"
            hint="Placeholders: {transcript}, {type}, {preview}"
          >
            <textarea
              rows={6}
              value={draft.detailedAnswerPrompt}
              onChange={(e) => set('detailedAnswerPrompt', e.target.value)}
              className="input-base font-mono text-xs resize-y"
            />
          </Field>

          {/* Chat system prompt */}
          <Field
            label="Chat system prompt"
            hint="Use {transcript} as a placeholder for the recent transcript."
          >
            <textarea
              rows={5}
              value={draft.chatSystemPrompt}
              onChange={(e) => set('chatSystemPrompt', e.target.value)}
              className="input-base font-mono text-xs resize-y"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#252838]">
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Reset to defaults
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-300">{label}</label>
      {hint && <p className="text-xs text-gray-500">{hint}</p>}
      {children}
    </div>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
