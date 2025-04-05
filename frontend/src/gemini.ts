import { GoogleGenerativeAI } from "@google/generative-ai";
import { Note } from "./types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(API_KEY);

export async function generateText(prompt: string, attachedNote?: Note | null): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  let fullPrompt = prompt;
  
  if (attachedNote) {
    fullPrompt = `
NOTA ANEXADA:
Título: ${attachedNote.title || "Sem título"}
Conteúdo:
${attachedNote.content.replace(/<[^>]*>/g, '')}
---

PERGUNTA/SOLICITAÇÃO DO USUÁRIO:
${prompt}

Por favor, responda considerando o conteúdo da nota anexada acima.
`;
  }
  
  const result = await model.generateContent(fullPrompt);
  const response = await result.response;
  const text = response.text();
  return text;
}

export async function analyzeNote(note: Note, type: 'grammar' | 'summary' | 'expand' | 'custom', customPrompt?: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
  
  let prompt = '';
  const plainTextContent = note.content.replace(/<[^>]*>/g, '');
  
  switch (type) {
    case 'grammar':
      prompt = `
Por favor, analise o seguinte conteúdo de nota e corrija quaisquer erros gramaticais ou de pontuação.
Forneça o texto corrigido e explique brevemente as alterações mais importantes.

Título da nota: ${note.title || "Sem título"}
Conteúdo:
${plainTextContent}
`;
      break;
    case 'summary':
      prompt = `
Por favor, crie um resumo conciso da seguinte nota, captando os principais pontos e ideias:

Título da nota: ${note.title || "Sem título"}
Conteúdo:
${plainTextContent}
`;
      break;
    case 'expand':
      prompt = `
Por favor, expanda e desenvolva o conteúdo da seguinte nota com detalhes adicionais,
exemplos ou explicações que possam enriquecer o texto:

Título da nota: ${note.title || "Sem título"}
Conteúdo:
${plainTextContent}
`;
      break;
    case 'custom':
      prompt = customPrompt + `\n\nConteúdo da nota (${note.title || "Sem título"}):\n${plainTextContent}`;
      break;
  }
  
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