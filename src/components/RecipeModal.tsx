import React, { useState, useEffect, useRef } from 'react';
import { CustomRecipe } from '../types';
import { X, Plus, Loader2, Trash2, Search, Check } from 'lucide-react';
import { analyzeIngredient } from '../lib/gemini';
import { COMMON_INGREDIENTS } from '../lib/commonIngredients';
import { cn } from '../lib/utils';

interface RecipeModalProps {
  recipes: CustomRecipe[];
  onSave: (recipe: CustomRecipe) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

interface IngredientRow {
  id: string;
  name: string;
  weight: string;
  macros: { calories: number; protein: number; fat: number; carbs: number } | null;
  isFetching: boolean;
  showSuggestions: boolean;
}

export function RecipeModal({ recipes, onSave, onDelete, onClose }: RecipeModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState('');
  const [ingredients, setIngredients] = useState<IngredientRow[]>([]);
  const [cookedWeight, setCookedWeight] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const addIngredientRow = () => {
    setIngredients(prev => [
      ...prev,
      { id: crypto.randomUUID(), name: '', weight: '', macros: null, isFetching: false, showSuggestions: false }
    ]);
  };

  const removeIngredientRow = (id: string) => {
    setIngredients(prev => prev.filter(ing => ing.id !== id));
  };

  const updateIngredient = (id: string, field: keyof IngredientRow, value: any) => {
    setIngredients(prev => prev.map(ing => ing.id === id ? { ...ing, [field]: value } : ing));
  };

  const handleIngredientBlur = async (id: string, currentName: string, currentMacros: any) => {
    // Hide suggestions
    setTimeout(() => updateIngredient(id, 'showSuggestions', false), 200);

    if (!currentName.trim() || currentMacros) return;

    // Check if it matches a common ingredient exactly (case-insensitive)
    const common = COMMON_INGREDIENTS.find(c => c.name.toLowerCase() === currentName.trim().toLowerCase());
    if (common) {
      updateIngredient(id, 'macros', { calories: common.calories, protein: common.protein, fat: common.fat, carbs: common.carbs });
      return;
    }

    // Otherwise, fetch from Gemini
    updateIngredient(id, 'isFetching', true);
    try {
      const macros = await analyzeIngredient(currentName);
      updateIngredient(id, 'macros', macros);
    } catch (e) {
      console.error("Failed to analyze ingredient", e);
      // Fallback to zero macros so user can at least proceed, or leave it null to force retry
      updateIngredient(id, 'macros', { calories: 0, protein: 0, fat: 0, carbs: 0 });
    } finally {
      updateIngredient(id, 'isFetching', false);
    }
  };

  const selectSuggestion = (id: string, suggestion: typeof COMMON_INGREDIENTS[0]) => {
    setIngredients(prev => prev.map(ing => {
      if (ing.id === id) {
        return {
          ...ing,
          name: suggestion.name,
          macros: { calories: suggestion.calories, protein: suggestion.protein, fat: suggestion.fat, carbs: suggestion.carbs },
          showSuggestions: false
        };
      }
      return ing;
    }));
  };

  // Calculate totals
  const totalRawWeight = ingredients.reduce((sum, ing) => sum + (parseFloat(ing.weight) || 0), 0);
  const finalWeight = parseFloat(cookedWeight) || totalRawWeight;

  const totalMacros = ingredients.reduce((acc, ing) => {
    const w = parseFloat(ing.weight) || 0;
    if (ing.macros && w > 0) {
      acc.calories += (ing.macros.calories * w) / 100;
      acc.protein += (ing.macros.protein * w) / 100;
      acc.fat += (ing.macros.fat * w) / 100;
      acc.carbs += (ing.macros.carbs * w) / 100;
    }
    return acc;
  }, { calories: 0, protein: 0, fat: 0, carbs: 0 });

  const macrosPer100g = finalWeight > 0 ? {
    calories: Math.round((totalMacros.calories / finalWeight) * 100),
    protein: Math.round((totalMacros.protein / finalWeight) * 100 * 10) / 10,
    fat: Math.round((totalMacros.fat / finalWeight) * 100 * 10) / 10,
    carbs: Math.round((totalMacros.carbs / finalWeight) * 100 * 10) / 10,
  } : { calories: 0, protein: 0, fat: 0, carbs: 0 };

  const handleSave = () => {
    if (!name.trim() || ingredients.length === 0) return;
    
    // Check if any ingredient is still fetching or missing macros
    if (ingredients.some(ing => ing.isFetching || !ing.macros)) {
      alert("Пожалуйста, дождитесь расчета всех ингредиентов.");
      return;
    }

    setIsSaving(true);
    
    const ingredientsText = ingredients
      .map(ing => `${ing.name} - ${ing.weight}г`)
      .join(', ');

    onSave({
      id: crypto.randomUUID(),
      name,
      ingredients: ingredientsText,
      macrosPer100g
    });

    setIsSaving(false);
    setIsCreating(false);
    setName('');
    setIngredients([]);
    setCookedWeight('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-lg p-6 max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Мои блюда</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {isCreating ? (
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Название блюда</label>
              <input 
                value={name} 
                onChange={e => setName(e.target.value)} 
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
                placeholder="Например: Домашний борщ" 
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-gray-700">Ингредиенты</label>
              </div>
              
              {ingredients.map((ing, index) => {
                const suggestions = COMMON_INGREDIENTS.filter(c => 
                  c.name.toLowerCase().includes(ing.name.toLowerCase()) && 
                  ing.name.length > 0 && 
                  c.name.toLowerCase() !== ing.name.toLowerCase()
                ).slice(0, 10); // Show up to 10 suggestions

                return (
                  <div key={ing.id} className="flex gap-2 items-start relative">
                    <div className="flex-1 relative">
                      <input 
                        value={ing.name} 
                        onChange={e => {
                          updateIngredient(ing.id, 'name', e.target.value);
                          updateIngredient(ing.id, 'macros', null); // Reset macros on change
                          updateIngredient(ing.id, 'showSuggestions', true);
                        }}
                        onFocus={() => updateIngredient(ing.id, 'showSuggestions', true)}
                        onBlur={() => handleIngredientBlur(ing.id, ing.name, ing.macros)}
                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
                        placeholder="Ингредиент (напр. Курица)" 
                      />
                      
                      {/* Suggestions Dropdown */}
                      {ing.showSuggestions && suggestions.length > 0 && (
                        <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl overflow-y-auto max-h-48">
                          {suggestions.map(s => (
                            <button
                              key={s.name}
                              className="w-full text-left px-4 py-2 hover:bg-emerald-50 text-sm text-gray-700 transition-colors border-b border-gray-50 last:border-0"
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent blur
                                selectSuggestion(ing.id, s);
                              }}
                            >
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                {s.calories} ккал | Б:{s.protein} Ж:{s.fat} У:{s.carbs}
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <div className="w-24 relative">
                      <input 
                        type="number"
                        value={ing.weight} 
                        onChange={e => updateIngredient(ing.id, 'weight', e.target.value)} 
                        className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all pr-6" 
                        placeholder="Вес" 
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">г</span>
                    </div>

                    <div className="w-10 h-11 flex items-center justify-center shrink-0">
                      {ing.isFetching ? (
                        <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
                      ) : ing.macros ? (
                        <Check className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-gray-200" />
                      )}
                    </div>

                    <button 
                      onClick={() => removeIngredientRow(ing.id)}
                      className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}

              <button 
                onClick={addIngredientRow}
                className="w-full py-3 border-2 border-dashed border-gray-200 text-gray-500 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-700 transition-all font-medium"
              >
                <Plus className="w-5 h-5" /> Добавить ингредиент
              </button>
            </div>

            {ingredients.length > 0 && (
              <div className="bg-gray-50 p-4 rounded-xl space-y-4 border border-gray-100">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Вес готового блюда (г) <span className="text-gray-400 font-normal">— опционально</span>
                  </label>
                  <input 
                    type="number"
                    value={cookedWeight} 
                    onChange={e => setCookedWeight(e.target.value)} 
                    className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
                    placeholder={`Сумма сырых: ${totalRawWeight}г`} 
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Укажите вес после варки/жарки для точного расчета на 100г.
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Итого на 100г готового блюда:</h4>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Ккал</div>
                      <div className="font-bold text-gray-800">{macrosPer100g.calories}</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Белки</div>
                      <div className="font-bold text-blue-600">{macrosPer100g.protein}</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Жиры</div>
                      <div className="font-bold text-amber-600">{macrosPer100g.fat}</div>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-gray-100 shadow-sm">
                      <div className="text-xs text-gray-500 mb-1">Углеводы</div>
                      <div className="font-bold text-purple-600">{macrosPer100g.carbs}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2 shrink-0">
              <button 
                onClick={() => {
                  setIsCreating(false);
                  setIngredients([]);
                  setName('');
                  setCookedWeight('');
                }} 
                className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
              <button 
                onClick={handleSave} 
                disabled={isSaving || !name.trim() || ingredients.length === 0} 
                className="flex-1 bg-emerald-500 text-white py-3 rounded-lg font-medium flex justify-center items-center hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Сохранить блюдо'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar">
            <button 
              onClick={() => {
                setIsCreating(true);
                if (ingredients.length === 0) addIngredientRow();
              }} 
              className="w-full border-2 border-dashed border-emerald-200 text-emerald-600 py-4 rounded-xl flex items-center justify-center gap-2 font-medium hover:bg-emerald-50 transition-colors"
            >
              <Plus className="w-5 h-5" /> Создать новое блюдо
            </button>
            
            {recipes.length > 0 ? (
              <div className="space-y-3 mt-4">
                <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Сохраненные блюда</h3>
                {recipes.map(r => (
                  <div key={r.id} className="p-4 bg-gray-50 border border-gray-100 rounded-xl flex justify-between items-center">
                    <div>
                      <div className="font-semibold text-gray-800">{r.name}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {r.macrosPer100g.calories} ккал | Б:{r.macrosPer100g.protein} Ж:{r.macrosPer100g.fat} У:{r.macrosPer100g.carbs} (на 100г)
                      </div>
                    </div>
                    <button 
                      onClick={() => onDelete(r.id)} 
                      className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-sm text-gray-500 mt-6">У вас пока нет сохраненных блюд.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
