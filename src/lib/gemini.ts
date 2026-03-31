import { CustomRecipe } from "../types";

const getHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const apiKey = localStorage.getItem('gemini_api_key');
  if (apiKey) {
    headers['x-gemini-api-key'] = apiKey;
  }
  return headers;
};

export async function analyzeIngredient(name: string) {
  const response = await fetch('/api/analyzeIngredient', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ name })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to analyze ingredient');
  }
  
  return response.json();
}

export async function chatWithAssistant(message: string, history: any[], context: any, images: {data: string, mimeType: string}[] = [], recipes: CustomRecipe[] = []) {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ message, history, context, images, recipes })
  });
  
  if (!response.ok) {
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.indexOf("application/json") !== -1) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to chat');
    } else {
      const errorText = await response.text();
      throw new Error(errorText || 'Failed to chat');
    }
  }
  
  return response.json();
}
