import Groq from 'groq-sdk';

interface ChatRequest {
  messages: { role: 'user' | 'assistant'; content: string }[];
  systemPrompt: string;
  model: string;
}

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-groq-api-key');
  if (!apiKey) {
    return Response.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  const { messages, systemPrompt, model }: ChatRequest = await request.json();

  try {
    const groq = new Groq({ apiKey });
    const stream = await groq.chat.completions.create({
      model,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      stream: true,
      temperature: 0.7,
      max_tokens: 2048,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          const text = chunk.choices[0]?.delta?.content ?? '';
          if (text) controller.enqueue(encoder.encode(text));
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Chat failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
