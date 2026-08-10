// Vercel Serverless Function — keeps the Gemini API key server-side only.
// Frontend calls POST /api/gemini with a JSON body: { prompt: "..." }

import { GoogleGenerativeAI } from '@google/genai';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { GEMINI_API_KEY } = process.env;
  if (!GEMINI_API_KEY) {
    return res.status(500).json({ error: 'Gemini API key not configured on server' });
  }

  try {
    const { prompt, model = 'gemini-2.0-flash' } = req.body || {};

    if (!prompt) {
      return res.status(400).json({ error: 'Missing "prompt" in request body' });
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const genModel = genAI.getGenerativeModel({ model });
    const result = await genModel.generateContent(prompt);
    const text = result.response.text();

    return res.status(200).json({ text });
  } catch (err) {
    console.error('gemini API error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
