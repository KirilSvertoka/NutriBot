import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import path from 'path';
import crypto from 'crypto';

const app = express();
const PORT = 3000;

// Increase payload limit for base64 images
app.use(express.json({ limit: '50mb' }));

// Helper to get AI instance
const getAI = (req: express.Request) => {
  const clientApiKey = req.headers['x-gemini-api-key'] as string;
  const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("API ключ не найден. Пожалуйста, добавьте его в настройках.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper for retrying API calls
const generateContentWithRetry = async (ai: GoogleGenAI, params: any, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      if (error?.status === 503 || error?.message?.includes('503') || error?.message?.includes('UNAVAILABLE')) {
        if (i === maxRetries - 1) throw error;
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.log(`API 503 error, retrying in ${Math.round(delay)}ms... (Attempt ${i + 1} of ${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Max retries reached");
};

const addMealDecl: FunctionDeclaration = {
  name: "addMeal",
  description: "Добавить новый прием пищи в дневник пользователя.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Название блюда" },
      calories: { type: Type.NUMBER, description: "Калории (ккал)" },
      protein: { type: Type.NUMBER, description: "Белки (г)" },
      fat: { type: Type.NUMBER, description: "Жиры (г)" },
      carbs: { type: Type.NUMBER, description: "Углеводы (г)" }
    },
    required: ["name", "calories", "protein", "fat", "carbs"]
  }
};

const deleteMealDecl: FunctionDeclaration = {
  name: "deleteMeal",
  description: "Удалить прием пищи из дневника по его ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "ID приема пищи для удаления" }
    },
    required: ["id"]
  }
};

const editMealDecl: FunctionDeclaration = {
  name: "editMeal",
  description: "Изменить существующий прием пищи в дневнике по его ID.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      id: { type: Type.STRING, description: "ID приема пищи для изменения" },
      name: { type: Type.STRING, description: "Новое название блюда (опционально)" },
      calories: { type: Type.NUMBER, description: "Новые калории (ккал) (опционально)" },
      protein: { type: Type.NUMBER, description: "Новые белки (г) (опционально)" },
      fat: { type: Type.NUMBER, description: "Новые жиры (г) (опционально)" },
      carbs: { type: Type.NUMBER, description: "Новые углеводы (г) (опционально)" }
    },
    required: ["id"]
  }
};

const saveRecipeDecl: FunctionDeclaration = {
  name: "saveRecipe",
  description: "Сохранить новый рецепт или блюдо в список 'Мои блюда' пользователя. Используйте это, когда пользователь просит запомнить рецепт или сохранить блюдо для будущего использования.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      name: { type: Type.STRING, description: "Название рецепта/блюда" },
      ingredients: { type: Type.STRING, description: "Список ингредиентов (через запятую или текстом)" },
      calories: { type: Type.NUMBER, description: "Калории на 100г" },
      protein: { type: Type.NUMBER, description: "Белки на 100г" },
      fat: { type: Type.NUMBER, description: "Жиры на 100г" },
      carbs: { type: Type.NUMBER, description: "Углеводы на 100г" }
    },
    required: ["name", "ingredients", "calories", "protein", "fat", "carbs"]
  }
};

// Endpoint 2: Analyze Ingredient
app.post('/api/analyzeIngredient', async (req, res) => {
  try {
    const { name } = req.body;
    const prompt = `Укажи пищевую ценность (КБЖУ) на 100 грамм сырого/обычного продукта "${name}". Верни только JSON.`;

    const ai = getAI(req);
    const response = await generateContentWithRetry(ai, {
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
    res.json(JSON.parse(response.text?.trim() || "{}"));
  } catch (error: any) {
    console.error("Error analyzing ingredient:", error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint 4: Chat Assistant
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], context = {}, images = [], recipes = [] } = req.body;
    const { meals = [], goals = { calories: 2000, protein: 150, fat: 70, carbs: 250 }, profile = {} } = context;

    let recipeContext = "";
    if (recipes && recipes.length > 0) {
      recipeContext = `\n\nПользователь сохранил свои собственные рецепты/блюда. Если он упоминает их, используй эти данные для расчета (значения указаны на 100г):\n` +
        recipes.map((r: any) => `- ${r.name}: ${r.macrosPer100g.calories} ккал, Б:${r.macrosPer100g.protein}г, Ж:${r.macrosPer100g.fat}г, У:${r.macrosPer100g.carbs}г на 100г.`).join('\n');
    }

    const systemInstruction = `Вы — умный ИИ-ассистент по питанию в приложении "НутриБот".
    Вы можете общаться с пользователем, давать советы по питанию, рекомендовать блюда и управлять его дневником питания.
    
    Текущий контекст пользователя:
    - Цели: ${goals.calories} ккал, Б: ${goals.protein}г, Ж: ${goals.fat}г, У: ${goals.carbs}г.
    - Приемы пищи за сегодня: ${JSON.stringify(meals)}
    
    Если пользователь просит добавить еду, используйте функцию addMeal. Оценивайте КБЖУ самостоятельно, если пользователь не указал точные цифры. Если прикреплено фото, проанализируйте его.
    Если пользователь просит удалить еду, найдите ее ID в списке приемов пищи за сегодня и используйте функцию deleteMeal.
    Если пользователь просит изменить еду (например, поменять вес, калории или название), найдите ее ID и используйте функцию editMeal.
    Если пользователь просит сохранить рецепт или блюдо для будущего использования (в список "Мои блюда"), используйте функцию saveRecipe.
    Отвечайте дружелюбно, кратко и по делу.` + recipeContext;

    const ai = getAI(req);
    
    let contents = [...history];
    
    const userParts: any[] = [];
    for (const img of images) {
      userParts.push({
        inlineData: {
          data: img.data,
          mimeType: img.mimeType,
        },
      });
    }
    if (message) {
      userParts.push({ text: message });
    } else if (userParts.length > 0) {
      userParts.push({ text: "Проанализируй эту еду и добавь в дневник." });
    }
    
    contents.push({ role: 'user', parts: userParts });

    let response = await generateContentWithRetry(ai, {
      model: "gemini-3-flash-preview",
      contents,
      config: {
        systemInstruction,
        tools: [{ functionDeclarations: [addMealDecl, deleteMealDecl, editMealDecl, saveRecipeDecl] }],
        toolConfig: { includeServerSideToolInvocations: true }
      }
    });

    const actions: any[] = [];

    while (response.functionCalls && response.functionCalls.length > 0) {
      contents.push(response.candidates?.[0]?.content);

      const functionResponses: any[] = [];
      for (const call of response.functionCalls) {
        try {
          if (call.name === 'addMeal') {
            const newMeal = {
              id: crypto.randomUUID(),
              name: call.args.name,
              calories: call.args.calories,
              protein: call.args.protein,
              fat: call.args.fat,
              carbs: call.args.carbs
            };
            actions.push({ type: 'ADD_MEAL', payload: { meal: newMeal } });
            functionResponses.push({
              functionResponse: { name: call.name, response: { success: true, meal: newMeal } }
            });
          } else if (call.name === 'deleteMeal') {
            actions.push({ type: 'DELETE_MEAL', payload: { id: call.args.id } });
            functionResponses.push({
              functionResponse: { name: call.name, response: { success: true } }
            });
          } else if (call.name === 'editMeal') {
            actions.push({ type: 'EDIT_MEAL', payload: { 
              id: call.args.id, 
              updates: {
                ...(call.args.name !== undefined && { name: call.args.name }),
                ...(call.args.calories !== undefined && { calories: call.args.calories }),
                ...(call.args.protein !== undefined && { protein: call.args.protein }),
                ...(call.args.fat !== undefined && { fat: call.args.fat }),
                ...(call.args.carbs !== undefined && { carbs: call.args.carbs })
              }
            } });
            functionResponses.push({
              functionResponse: { name: call.name, response: { success: true } }
            });
          } else if (call.name === 'saveRecipe') {
            console.log("Processing saveRecipe, args:", JSON.stringify(call.args));
            let recipeId;
            try {
              recipeId = crypto.randomUUID();
            } catch (e) {
              console.error("crypto.randomUUID() failed, falling back:", e);
              recipeId = Date.now().toString() + Math.random().toString();
            }
            
            if (!call.args.name || !call.args.ingredients) {
               console.error("Missing required arguments for saveRecipe");
               throw new Error("Missing required arguments for saveRecipe");
            }

            const newRecipe = {
              id: recipeId,
              name: call.args.name,
              ingredients: call.args.ingredients,
              macrosPer100g: {
                calories: call.args.calories || 0,
                protein: call.args.protein || 0,
                fat: call.args.fat || 0,
                carbs: call.args.carbs || 0
              }
            };
            console.log("New recipe object created:", JSON.stringify(newRecipe));
            actions.push({ type: 'SAVE_RECIPE', payload: { recipe: newRecipe } });
            functionResponses.push({
              functionResponse: { name: call.name, response: { success: true, recipe: newRecipe } }
            });
          }
        } catch (err: any) {
          console.error(`Error processing function call ${call.name}:`, err);
          functionResponses.push({
            functionResponse: { name: call.name, response: { success: false, error: err.message } }
          });
        }
      }

      contents.push({ role: 'user', parts: functionResponses });

      response = await generateContentWithRetry(ai, {
        model: "gemini-3-flash-preview",
        contents,
        config: {
          systemInstruction,
          tools: [{ functionDeclarations: [addMealDecl, deleteMealDecl, editMealDecl, saveRecipeDecl] }],
          toolConfig: { includeServerSideToolInvocations: true }
        }
      });
    }

    contents.push(response.candidates?.[0]?.content);

    res.json({
      text: response.text,
      history: contents,
      actions
    });

  } catch (error: any) {
    console.error("Error in chat:", error);
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
