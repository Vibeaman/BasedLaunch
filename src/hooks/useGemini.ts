import { useState } from 'react';

// Calls the server-side /api/gemini endpoint (keeps the API key off the client).
// Returns the generated text, or null on failure (with `error` populated).
export function useGemini() {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async (prompt: string): Promise<string | null> => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Request failed: ${res.statusText}`);
      }

      const data = await res.json();
      return (data.text ?? '').trim();
    } catch (err: any) {
      console.error('Gemini generate error:', err);
      setError(err.message || 'Failed to generate text');
      return null;
    } finally {
      setGenerating(false);
    }
  };

  return { generate, generating, error };
}
