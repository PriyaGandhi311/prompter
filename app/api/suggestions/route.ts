import Groq from 'groq-sdk';
import type { Suggestion } from '@/lib/types';

interface SuggestionsRequest {
  transcript: string;
  promptTemplate: string;
  model: string;
}

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-groq-api-key');
  if (!apiKey) {
    return Response.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  const { transcript, promptTemplate, model }: SuggestionsRequest = await request.json();

  if (!transcript?.trim()) {
    return Response.json({ error: 'No transcript provided' }, { status: 400 });
  }

  const prompt = promptTemplate.replace('{transcript}', transcript);

  try {
    const groq = new Groq({ apiKey });
    const completion = await groq.chat.completions.create({
      model,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 1024,
    });

    const content = completion.choices[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as { suggestions?: Suggestion[] };

    if (!Array.isArray(parsed.suggestions)) {
      return Response.json({ error: 'Unexpected response shape' }, { status: 500 });
    }

    return Response.json({ suggestions: parsed.suggestions.slice(0, 3) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Suggestions failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
