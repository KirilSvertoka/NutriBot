import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import path from 'path';

const app = express();
const PORT = 3000;

// Increase payload limit for base64 images
app.use(express.json({ limit: '50mb' }));

// Helper to get AI instance
const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API ключ не найден. Пожалуйста, добавьте его в настройках.");
  }
  return new GoogleGenAI({ apiKey });
};

// Endpoint 1: Analyze Food
app.post('/api/analyzeFood', async (req, res) => {
  try {
    const { query, images, recipes } = req.body;
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
      return res.status(400).json({ error: "Пожалуйста, добавьте текстовое описание или фото." });
    }

    let recipeContext = "";
    if (recipes && recipes.length > 0) {
      recipeContext = `\n\nПользователь сохранил свои собственные рецепты/блюда. Если он упоминает их, используй эти данные для расчета (значения указаны на 100г):\n` +
        recipes.map((r: any) => `- ${r.name}: ${r.macrosPer100g.calories} ккал, Б:${r.macrosPer100g.protein}г, Ж:${r.macrosPer100g.fat}г, У:${r.macrosPer100g.carbs}г на 100г.`).join('\n');
    }

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction: "Вы — эксперт-диетолог ИИ. Ваша задача — анализировать описания еды или фотографии и оценивать их пищевую ценность (калории, белки, жиры, углеводы). Будьте максимально точны. Если пользователь дает расплывчатое описание, сделайте разумную среднюю оценку для стандартной порции. Всегда возвращайте данные в запрошенном формате JSON. Отвечайте на русском языке." + recipeContext,
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            foodName: {
              type: "STRING" as any,
              description: "Краткое, понятное название еды или блюда на русском языке.",
            },
            calories: {
              type: "NUMBER" as any,
              description: "Примерное количество калорий (ккал).",
            },
            protein: {
              type: "NUMBER" as any,
              description: "Примерное количество белков в граммах.",
            },
            fat: {
              type: "NUMBER" as any,
              description: "Примерное количество жиров в граммах.",
            },
            carbs: {
              type: "NUMBER" as any,
              description: "Примерное количество углеводов в граммах.",
            },
            explanation: {
              type: "STRING" as any,
              description: "Краткое объяснение оценки, предполагаемый размер порции и любой быстрый совет по питанию (на русском языке).",
            },
          },
          required: ["foodName", "calories", "protein", "fat", "carbs", "explanation"],
        },
      },
    });

    const jsonStr = response.text?.trim() || "{}";
    res.json(JSON.parse(jsonStr));
  } catch (error: any) {
    console.error("Error analyzing food:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint 2: Analyze Ingredient
app.post('/api/analyzeIngredient', async (req, res) => {
  try {
    const { name } = req.body;
    const prompt = `Укажи пищевую ценность (КБЖУ) на 100 грамм сырого/обычного продукта "${name}". Верни только JSON.`;

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Вы — эксперт-диетолог ИИ.",
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT" as any,
          properties: {
            calories: { type: "NUMBER" as any, description: "Ккал на 100г" },
            protein: { type: "NUMBER" as any, description: "Белки на 100г" },
            fat: { type: "NUMBER" as any, description: "Жиры на 100г" },
            carbs: { type: "NUMBER" as any, description: "Углеводы на 100г" },
          },
          required: ["calories", "protein", "fat", "carbs"],
        }
      }
    });
    res.json(JSON.parse(response.text?.trim() || "{}"));
  } catch (error: any) {
    console.error("Error analyzing ingredient:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint 3: Get Recommendations
app.post('/api/getRecommendations', async (req, res) => {
  try {
    const { meals, goals, profile } = req.body;
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

    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        systemInstruction: "Вы — дружелюбный и поддерживающий ИИ-диетолог. Отвечайте на русском языке.",
      }
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error getting recommendations:", error);
    res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Static serving for production
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
