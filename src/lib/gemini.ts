import { CustomRecipe } from "../types";

const getHeaders = () => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  return headers;
};

export async function analyzeFood(query: string, images: {data: string, mimeType: string}[], recipes: CustomRecipe[]) {
  const response = await fetch('/api/analyzeFood', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ query, images, recipes })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to analyze food');
  }
  
  return response.json();
}

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

export async function getRecommendations(meals: any[], goals: any, profile?: any) {
  const response = await fetch('/api/getRecommendations', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ meals, goals, profile })
  });
  
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to get recommendations');
  }
  
  const data = await response.json();
  return data.text;
}
