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

export async function generateSuggestion(
  textBefore: string, 
  textAfter: string = '', 
  isFollowUpSuggestion: boolean = false
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  const relevantTextBefore = textBefore.slice(-500);
  const relevantTextAfter = textAfter.slice(0, 200);
  
  const isMiddleOfSentence = relevantTextAfter.trim() !== '' && 
                            !relevantTextBefore.trim().endsWith('.') && 
                            !relevantTextBefore.trim().endsWith('!') && 
                            !relevantTextBefore.trim().endsWith('?');
  
  const prompt = `
    Como um assistente acadêmico, sugira uma continuação natural para o texto no ponto onde o cursor está.
    
    ${isMiddleOfSentence 
      ? 'O cursor está no meio de uma frase ou parágrafo. Sugira texto que conecte naturalmente o que vem antes e depois do cursor.'
      : 'Sugira uma continuação natural do texto.'
    }
    
    ${isFollowUpSuggestion 
      ? 'IMPORTANTE: O usuário acabou de aceitar uma sugestão anterior. Gere uma continuação NOVA e DIFERENTE que avance o texto, não repita ideias próximas.'
      : ''
    }
    
    Forneça apenas a continuação direta (1-2 sentenças), sem introduções ou explicações.
    Mantenha o mesmo tom, estilo e idioma do texto original.
    
    IMPORTANTE: 
    - NUNCA comece a sugestão com reticências ("...").
    - Se for necessário conectar com o texto posterior, faça isso naturalmente.
    - A sugestão deve parecer uma parte natural e fluida do texto completo.
    - Não repita o conteúdo que já existe no texto.
    
    Texto antes do cursor: "${relevantTextBefore}"
    ${relevantTextAfter ? `Texto após o cursor: "${relevantTextAfter}"` : ''}
    
    Continuação:
  `;
  
  const result = await model.generateContent(prompt);
  const response = await result.response;
  const suggestion = response.text();
  
  return suggestion.startsWith('...') ? suggestion.substring(3).trim() : suggestion;
}