import type { AppSettings } from './types';

export const DEFAULT_SETTINGS: AppSettings = {
  groqApiKey: '',
  model: 'llama-3.3-70b-versatile',

  suggestionPrompt: `You are an AI copilot monitoring a live conversation. Analyze the transcript and generate exactly 3 suggestions that would be immediately useful to the participant RIGHT NOW.

RECENT TRANSCRIPT:
{transcript}

ANALYSIS (do this internally, not in output):
1. What is the conversation currently about?
2. Was a question just asked that wasn't answered? → "answer" is most valuable
3. Was a specific factual claim just made? → "fact-check" is valuable
4. What follow-up questions would deepen understanding? → "question"
5. What context or perspective hasn't been raised yet? → "talking-point"

SUGGESTION TYPES — pick what the conversation genuinely needs:
- "question": A specific, incisive follow-up question that would surface important information
- "talking-point": Relevant context, data, or perspective worth raising that wasn't mentioned
- "answer": A direct, useful answer to something just asked or left unclear
- "fact-check": A specific factual claim made that should be verified, with the actual fact

RULES:
- Each preview (1–2 sentences) must deliver standalone value — reading it should already help
- Be highly specific to what was actually said — no generic suggestions
- Don't force type variety; pick what the conversation genuinely needs most
- If the transcript is very short or unclear, still generate 3 useful suggestions about the topic

Return ONLY valid JSON, no other text:
{"suggestions":[{"type":"question|talking-point|answer|fact-check","preview":"..."},{"type":"...","preview":"..."},{"type":"...","preview":"..."}]}`,

  detailedAnswerPrompt: `You are a knowledgeable AI assistant helping someone in a live conversation. They clicked a suggestion for more details.

FULL CONVERSATION TRANSCRIPT:
{transcript}

SUGGESTION CLICKED:
Type: {type}
Preview: {preview}

Provide a thorough, well-structured response expanding on this suggestion. Ground your answer in what was actually discussed in the transcript. Use headers and bullet points where they improve clarity. Be comprehensive but focused — this person needs immediately useful information during an active meeting.`,

  chatSystemPrompt: `You are a knowledgeable AI assistant helping someone in a live conversation. You have access to their meeting transcript.

TRANSCRIPT:
{transcript}

Answer questions directly and helpfully. Reference specific things said in the meeting when relevant. Be concise but thorough — the user needs help in real time.`,

  suggestionContextChunks: 5,
  chatContextChunks: 10,
};
