import Groq from 'groq-sdk';

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-groq-api-key');
  if (!apiKey) {
    return Response.json({ error: 'Missing Groq API key' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const audioFile = formData.get('audio') as File | null;
  if (!audioFile || audioFile.size === 0) {
    return Response.json({ error: 'No audio file provided' }, { status: 400 });
  }

  // Skip very small blobs (silence / sub-second clips)
  if (audioFile.size < 1000) {
    return Response.json({ text: '' });
  }

  try {
    const groq = new Groq({ apiKey });
    const transcription = await groq.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-large-v3',
    });
    return Response.json({ text: transcription.text });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Transcription failed';
    return Response.json({ error: message }, { status: 500 });
  }
}
