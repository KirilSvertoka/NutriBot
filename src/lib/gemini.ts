import { GoogleGenAI, Type } from "@google/genai";
import { CustomRecipe } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function analyzeFood(query: string, images: {data: string, mimeType: string}[], recipes: CustomRecipe[]) {
  const parts: any[] = [];
  
  for (const img of images) {
    parts.push({
      inlineData: {
        data: img.data,
        mimeType: img.mimeType,
      },
    });
  }
  
  if (query) {
    parts.push({ text: query });
  } else if (parts.length > 0) {
    parts.push({ text: "Проанализируй эту еду. Что это, и какова примерная пищевая ценность (КБЖУ)?" });
  } else {
    throw new Error("Пожалуйста, добавьте текстовое описание или фото.");
  }

  let recipeContext = "";
  if (recipes && recipes.length > 0) {
    recipeContext = `\n\nПользователь сохранил свои собственные рецепты/блюда. Если он упоминает их, используй эти данные для расчета (значения указаны на 100г):\n` +
      recipes.map(r => `- ${r.name}: ${r.macrosPer100g.calories} ккал, Б:${r.macrosPer100g.protein}г, Ж:${r.macrosPer100g.fat}г, У:${r.macrosPer100g.carbs}г на 100г.`).join('\n');
  }

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: { parts },
    config: {
      systemInstruction: "Вы — эксперт-диетолог ИИ. Ваша задача — анализировать описания еды или фотографии и оценивать их пищевую ценность (калории, белки, жиры, углеводы). Будьте максимально точны. Если пользователь дает расплывчатое описание, сделайте разумную среднюю оценку для стандартной порции. Всегда возвращайте данные в запрошенном формате JSON. Отвечайте на русском языке." + recipeContext,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          foodName: {
            type: Type.STRING,
            description: "Краткое, понятное название еды или блюда на русском языке.",
          },
          calories: {
            type: Type.NUMBER,
            description: "Примерное количество калорий (ккал).",
          },
          protein: {
            type: Type.NUMBER,
            description: "Примерное количество белков в граммах.",
          },
          fat: {
            type: Type.NUMBER,
            description: "Примерное количество жиров в граммах.",
          },
          carbs: {
            type: Type.NUMBER,
            description: "Примерное количество углеводов в граммах.",
          },
          explanation: {
            type: Type.STRING,
            description: "Краткое объяснение оценки, предполагаемый размер порции и любой быстрый совет по питанию (на русском языке).",
          },
        },
        required: ["foodName", "calories", "protein", "fat", "carbs", "explanation"],
      },
    },
  });

  const jsonStr = response.text?.trim() || "{}";
  return JSON.parse(jsonStr);
}

export async function analyzeIngredient(name: string) {
  const prompt = `Укажи пищевую ценность (КБЖУ) на 100 грамм сырого/обычного продукта "${name}". Верни только JSON.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "Вы — эксперт-диетолог ИИ.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          calories: { type: Type.NUMBER, description: "Ккал на 100г" },
          protein: { type: Type.NUMBER, description: "Белки на 100г" },
          fat: { type: Type.NUMBER, description: "Жиры на 100г" },
          carbs: { type: Type.NUMBER, description: "Углеводы на 100г" },
        },
        required: ["calories", "protein", "fat", "carbs"],
      }
    }
  });
  return JSON.parse(response.text?.trim() || "{}");
}

export async function getRecommendations(meals: any[], goals: any, profile?: any) {
  let profileContext = "";
  if (profile) {
    profileContext = `
    Информация о пользователе:
    Пол: ${profile.gender === 'male' ? 'Мужской' : 'Женский'}
    Возраст: ${profile.age} лет
    Текущий вес: ${profile.weight} кг
    Желаемый вес: ${profile.targetWeight} кг
    Уровень активности: ${profile.activityLevel}
    `;
  }

  const prompt = `
    ${profileContext}
    Вот что пользователь съел за день:
    ${JSON.stringify(meals, null, 2)}
    
    Его дневные цели:
    Калории: ${goals.calories} ккал
    Белки: ${goals.protein} г
    Жиры: ${goals.fat} г
    Углеводы: ${goals.carbs} г
    
    Основываясь на том, что он съел, его целях и параметрах, дай короткую, дружелюбную и полезную рекомендацию для следующего приема пищи или перекуса. Не более 3 предложений. Отвечай на русском языке.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: "Вы — дружелюбный и поддерживающий ИИ-диетолог. Отвечайте на русском языке.",
    }
  });

  return response.text;
}
