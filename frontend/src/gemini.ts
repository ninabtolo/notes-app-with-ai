import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateText(prompt: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  return text;
}

export async function generateSuggestion(currentText: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  const prompt = `
    Como um assistente acadêmico, continue este texto de forma natural.
    Forneça apenas a continuação direta (1-2 sentenças), sem introduções ou explicações.
    Mantenha o mesmo tom, estilo e idioma do texto original.
    Texto original: "${currentText.slice(-500)}"
    Continuação:
  `;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const suggestion = response.text();
  return suggestion;
}