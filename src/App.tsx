import React, { useState, useEffect, useRef } from 'react';
import { Camera, Send, Loader2, Sparkles, Trash2, Calendar as CalendarIcon, Settings, Barcode, ChefHat, PlusCircle, LogOut, BarChart3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, isSameDay, subDays, startOfToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { analyzeFood, getRecommendations } from './lib/gemini';
import { fileToBase64, cn } from './lib/utils';
import { Meal, DailyGoal, CustomRecipe, UserProfile } from './types';
import { ProgressBar } from './components/ProgressBar';
import { SettingsModal } from './components/SettingsModal';
import { RecipeModal } from './components/RecipeModal';
import { BarcodeModal } from './components/BarcodeModal';
import { OnboardingModal } from './components/OnboardingModal';
import { WeighInModal } from './components/WeighInModal';
import { ManualEntryModal } from './components/ManualEntryModal';
import { StatisticsModal } from './components/StatisticsModal';

const getUserDataKey = (uid: string) => `nutribot_data_${uid}`;

const loadUserData = (uid: string) => {
  const data = localStorage.getItem(getUserDataKey(uid));
  if (data) {
    try {
      return JSON.parse(data);
    } catch (e) {
      return { profile: null, meals: [], recipes: [] };
    }
  }
  return { profile: null, meals: [], recipes: [] };
};

const saveUserData = (uid: string, data: any) => {
  localStorage.setItem(getUserDataKey(uid), JSON.stringify(data));
};

const DEFAULT_GOALS: DailyGoal = {
  calories: 2000,
  protein: 150,
  fat: 70,
  carbs: 200,
};

export default function App() {
  const [user, setUser] = useState<{uid: string, email: string} | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    const saved = localStorage.getItem('nutribot_user');
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('nutribot_user');
      }
    }
    setIsAuthReady(true);
  }, []);

  const handleLocalLogin = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Attempting login with:', loginForm.username);
    const users = [
      { username: 'admin', password: 'admin123', uid: 'local-user-admin', email: 'admin@nutri.bot' },
      { username: 'user', password: 'user123', uid: 'local-user-regular', email: 'user@nutri.bot' }
    ];

    const found = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (found) {
      console.log('Login successful for:', found.username);
      const userData = { uid: found.uid, email: found.email };
      setUser(userData);
      localStorage.setItem('nutribot_user', JSON.stringify(userData));
      setLoginError('');
    } else {
      console.log('Login failed for:', loginForm.username);
      setLoginError('Неверный логин или пароль');
    }
  };

  const handleLocalLogout = () => {
    setUser(null);
    localStorage.removeItem('nutribot_user');
    setProfile(null);
    setMeals([]);
    setRecipes([]);
  };

  const [meals, setMeals] = useState<Meal[]>([]);
  const [goals, setGoals] = useState<DailyGoal>(DEFAULT_GOALS);
  const [recipes, setRecipes] = useState<CustomRecipe[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const [selectedDate, setSelectedDate] = useState<Date>(startOfToday());
  const [searchQuery, setSearchQuery] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isRecLoading, setIsRecLoading] = useState(false);
  
  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isRecipeOpen, setIsRecipeOpen] = useState(false);
  const [isBarcodeOpen, setIsBarcodeOpen] = useState(false);
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [isStatsOpen, setIsStatsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user || !isAuthReady) return;

    const data = loadUserData(user.uid);
    setProfile(data.profile);
    if (data.profile?.goals) {
      setGoals(data.profile.goals);
    } else {
      setGoals(DEFAULT_GOALS);
    }
    setMeals(data.meals || []);
    setRecipes(data.recipes || []);
  }, [user, isAuthReady]);

  useEffect(() => {
    if (calendarRef.current) {
      calendarRef.current.scrollLeft = calendarRef.current.scrollWidth;
    }
  }, []);

  // Filter meals for selected date
  const selectedMeals = meals.filter(m => isSameDay(new Date(m.timestamp), selectedDate));
  
  const totals = selectedMeals.reduce(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      protein: acc.protein + meal.protein,
      fat: acc.fat + meal.fat,
      carbs: acc.carbs + meal.carbs,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0 }
  );

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length > 0) {
      setImageFiles(prev => [...prev, ...files]);
      for (const file of files) {
        try {
          const base64 = await fileToBase64(file);
          setImagePreviews(prev => [...prev, `data:image/jpeg;base64,${base64}`]);
        } catch (error) {
          console.error("Failed to resize image", error);
        }
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setImagePreviews(prev => prev.filter((_, i) => i !== index));
  };

  const clearImages = () => {
    setImageFiles([]);
    setImagePreviews([]);
  };

  const saveMealToLocal = async (meal: Meal) => {
    if (!user) return;
    setMeals(prev => {
      const newMeals = [...prev, meal].sort((a, b) => b.timestamp - a.timestamp);
      const data = loadUserData(user.uid);
      saveUserData(user.uid, { ...data, meals: newMeals });
      return newMeals;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() && imageFiles.length === 0) return;

    setIsLoading(true);
    try {
      const processedImages = await Promise.all(
        imageFiles.map(async (file) => ({
          data: await fileToBase64(file),
          mimeType: file.type
        }))
      );

      const result = await analyzeFood(searchQuery, processedImages, recipes);
      
      const newMeal: Meal = {
        id: crypto.randomUUID(),
        timestamp: isSameDay(selectedDate, startOfToday()) 
          ? Date.now() 
          : new Date(selectedDate).setHours(12, 0, 0, 0),
        name: result.foodName,
        calories: result.calories,
        protein: result.protein,
        fat: result.fat,
        carbs: result.carbs,
        explanation: result.explanation,
        image: imagePreviews.length > 0 ? imagePreviews[0] : undefined,
      };

      await saveMealToLocal(newMeal);
      setSearchQuery('');
      clearImages();
      setRecommendation(null);
    } catch (error) {
      console.error('Error analyzing food:', error);
      alert('Не удалось проанализировать еду. Попробуйте еще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualEntry = async (mealData: { name: string; calories: number; protein: number; fat: number; carbs: number }) => {
    const newMeal: Meal = {
      id: crypto.randomUUID(),
      timestamp: isSameDay(selectedDate, startOfToday()) 
        ? Date.now() 
        : new Date(selectedDate).setHours(12, 0, 0, 0),
      ...mealData,
    };
    await saveMealToLocal(newMeal);
    setIsManualEntryOpen(false);
  };

  const handleBarcodeScan = async (barcode: string) => {
    setIsBarcodeOpen(false);
    setIsLoading(true);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
      const data = await res.json();
      if (data.status === 1) {
        const product = data.product;
        const name = product.product_name || product.generic_name || "Неизвестный продукт";
        const energy = product.nutriments?.['energy-kcal_100g'];
        const proteins = product.nutriments?.['proteins_100g'];
        const fat = product.nutriments?.['fat_100g'];
        const carbs = product.nutriments?.['carbohydrates_100g'];

        if (energy !== undefined) {
           setSearchQuery((prev) => prev + (prev ? ' + ' : '') + `Продукт: ${name} (${energy} ккал, Б:${proteins} Ж:${fat} У:${carbs} на 100г). Порция: 100г`);
        } else {
           setSearchQuery((prev) => prev + (prev ? ' + ' : '') + `${name}, 100г`);
        }
      } else {
        alert("Продукт не найден в базе данных.");
      }
    } catch (e) {
      alert("Ошибка при поиске продукта.");
    } finally {
      setIsLoading(false);
    }
  };

  const deleteMeal = async (id: string) => {
    if (!user) return;
    setMeals(prev => {
      const newMeals = prev.filter(m => m.id !== id);
      const data = loadUserData(user.uid);
      saveUserData(user.uid, { ...data, meals: newMeals });
      return newMeals;
    });
  };

  const saveRecipeToLocal = async (recipe: CustomRecipe) => {
    if (!user) return;
    setRecipes(prev => {
      const existing = prev.findIndex(r => r.id === recipe.id);
      let newRecipes;
      if (existing >= 0) {
        newRecipes = [...prev];
        newRecipes[existing] = recipe;
      } else {
        newRecipes = [...prev, recipe];
      }
      const data = loadUserData(user.uid);
      saveUserData(user.uid, { ...data, recipes: newRecipes });
      return newRecipes;
    });
  };

  const deleteRecipeFromLocal = async (id: string) => {
    if (!user) return;
    setRecipes(prev => {
      const newRecipes = prev.filter(r => r.id !== id);
      const data = loadUserData(user.uid);
      saveUserData(user.uid, { ...data, recipes: newRecipes });
      return newRecipes;
    });
  };

  const saveProfileToLocal = async (newProfile: UserProfile) => {
    if (!user) return;
    setProfile(newProfile);
    if (newProfile.goals) setGoals(newProfile.goals);
    const data = loadUserData(user.uid);
    saveUserData(user.uid, { ...data, profile: newProfile });
  };

  const fetchRecommendation = async () => {
    setIsRecLoading(true);
    try {
      const rec = await getRecommendations(selectedMeals, goals, profile);
      setRecommendation(rec);
    } catch (error) {
      console.error('Error getting recommendation:', error);
    } finally {
      setIsRecLoading(false);
    }
  };

  // Generate last 14 days
  const calendarDays = Array.from({ length: 14 }).map((_, i) => subDays(startOfToday(), 13 - i));

  const getCaloriesForDate = (date: Date) => {
    return meals
      .filter(m => isSameDay(new Date(m.timestamp), date))
      .reduce((sum, m) => sum + m.calories, 0);
  };

  const needsWeighIn = profile && (Date.now() - profile.lastWeighInDate > 7 * 24 * 60 * 60 * 1000);
  const [showWeighIn, setShowWeighIn] = useState(false);

  useEffect(() => {
    if (needsWeighIn) setShowWeighIn(true);
  }, [needsWeighIn]);

  const handleOnboardingComplete = async (newProfile: UserProfile, newGoals: DailyGoal) => {
    if (!user) return;
    const profileWithUid = { ...newProfile, uid: user.uid, goals: newGoals };
    await saveProfileToLocal(profileWithUid);
  };

  const handleWeighInComplete = async (newProfile: UserProfile, newGoals: DailyGoal) => {
    if (!user) return;
    const profileWithUid = { ...newProfile, uid: user.uid, goals: newGoals };
    await saveProfileToLocal(profileWithUid);
    setShowWeighIn(false);
  };

  const handleWeighInSkip = async () => {
    if (profile && user) {
      await saveProfileToLocal({ ...profile, lastWeighInDate: Date.now() });
    }
    setShowWeighIn(false);
  };

  if (!isAuthReady) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-6"
        >
          <div className="w-16 h-16 bg-emerald-100 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">НутриБот</h1>
            <p className="text-gray-500 mt-2 text-sm">Войдите в свой аккаунт</p>
          </div>

          <form onSubmit={handleLocalLogin} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 ml-1">Логин</label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="admin или user"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-1 ml-1">Пароль</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-800 focus:outline-none focus:border-emerald-500 transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            {loginError && (
              <p className="text-red-500 text-sm text-center bg-red-50 py-2 rounded-xl border border-red-100">
                {loginError}
              </p>
            )}

            <button
              id="login-button"
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] mt-4 flex items-center justify-center gap-2"
            >
              Войти
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-400 text-[10px] uppercase tracking-widest leading-relaxed">
              Тестовые данные:<br/>
              admin / admin123<br/>
              user / user123
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return <OnboardingModal onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-32">
      {showWeighIn && (
        <WeighInModal 
          profile={profile} 
          onComplete={handleWeighInComplete} 
          onSkip={handleWeighInSkip} 
        />
      )}
      {/* Header / Dashboard */}
      <header className="bg-white px-4 py-6 shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="text-emerald-500 w-5 h-5" />
              НутриБот
            </h1>
            <div className="flex gap-2">
              <button onClick={() => setIsStatsOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                <BarChart3 className="w-5 h-5" />
              </button>
              <button onClick={() => setIsRecipeOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                <ChefHat className="w-5 h-5" />
              </button>
              <button onClick={() => setIsSettingsOpen(true)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
                <Settings className="w-5 h-5" />
              </button>
              <button onClick={handleLocalLogout} className="p-2 text-gray-500 hover:bg-red-50 hover:text-red-500 rounded-full transition-colors">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          <div className="space-y-3">
            <ProgressBar 
              label="Калории" 
              value={totals.calories} 
              max={goals.calories} 
              colorClass="bg-emerald-500" 
              unit=" ккал" 
            />
            <div className="grid grid-cols-3 gap-4">
              <ProgressBar label="Белки" value={totals.protein} max={goals.protein} colorClass="bg-blue-500" unit="г" />
              <ProgressBar label="Жиры" value={totals.fat} max={goals.fat} colorClass="bg-amber-500" unit="г" />
              <ProgressBar label="Углеводы" value={totals.carbs} max={goals.carbs} colorClass="bg-purple-500" unit="г" />
            </div>
          </div>
        </div>
      </header>

      {/* Calendar */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div 
          ref={calendarRef}
          className="max-w-md mx-auto flex gap-2 overflow-x-auto no-scrollbar px-4 py-3"
        >
          {calendarDays.map(date => {
            const isSelected = isSameDay(date, selectedDate);
            const dayCals = getCaloriesForDate(date);
            const isOver = dayCals > goals.calories;
            
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  "flex flex-col items-center min-w-[64px] p-2 rounded-xl transition-colors shrink-0 border",
                  isSelected 
                    ? "bg-emerald-500 border-emerald-500 text-white shadow-md" 
                    : "bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100"
                )}
              >
                <span className={cn("text-xs font-medium capitalize", isSelected ? "text-emerald-100" : "text-gray-400")}>
                  {format(date, 'E', { locale: ru })}
                </span>
                <span className={cn("text-lg font-bold my-0.5", isSelected ? "text-white" : "text-gray-800")}>
                  {format(date, 'd')}
                </span>
                <span className={cn(
                  "text-[10px] font-bold",
                  isSelected ? "text-emerald-100" : (isOver ? "text-red-500" : "text-emerald-600")
                )}>
                  {dayCals > 0 ? dayCals : '-'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Recommendations Section */}
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <div className="flex justify-between items-center mb-2">
            <h2 className="font-semibold text-emerald-800 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> Совет от ИИ
            </h2>
            <button 
              onClick={fetchRecommendation}
              disabled={isRecLoading}
              className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md hover:bg-emerald-200 transition-colors disabled:opacity-50"
            >
              {isRecLoading ? 'Думаю...' : 'Получить совет'}
            </button>
          </div>
          {recommendation ? (
            <p className="text-sm text-emerald-900 leading-relaxed">{recommendation}</p>
          ) : (
            <p className="text-sm text-emerald-700/70 italic">Нажмите «Получить совет» для персональной рекомендации на день.</p>
          )}
        </div>

        {/* Meal List */}
        <div>
          <h2 className="font-semibold text-gray-700 mb-4">
            Приемы пищи за {format(selectedDate, 'd MMMM', { locale: ru })}
          </h2>
          <div className="space-y-4">
            <AnimatePresence>
              {selectedMeals.length === 0 ? (
                <motion.p 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="text-center text-gray-400 py-8"
                >
                  За этот день пока нет записей.
                </motion.p>
              ) : (
                selectedMeals.map((meal) => (
                  <motion.div
                    key={meal.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-white p-4 rounded-xl shadow-sm border border-gray-100"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold">{meal.name}</h3>
                        <span className="text-xs text-gray-400">{format(meal.timestamp, 'HH:mm')}</span>
                      </div>
                      <button 
                        onClick={() => deleteMeal(meal.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {meal.image && (
                      <div className="mb-3 pb-1">
                        <img 
                          src={meal.image} 
                          alt={meal.name} 
                          className="h-32 w-auto object-cover rounded-lg shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2 mb-3">
                      <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md font-medium">
                        {meal.calories} ккал
                      </span>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md font-medium">
                        Б: {meal.protein}г
                      </span>
                      <span className="px-2 py-1 bg-amber-50 text-amber-700 text-xs rounded-md font-medium">
                        Ж: {meal.fat}г
                      </span>
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded-md font-medium">
                        У: {meal.carbs}г
                      </span>
                    </div>
                    
                    {meal.explanation && (
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded-md">
                        {meal.explanation}
                      </p>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Input Area (Sticky Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 pb-safe">
        <div className="max-w-md mx-auto">
          {imagePreviews.length > 0 && (
            <div className="flex gap-2 overflow-x-auto no-scrollbar mb-3 pb-1">
              {imagePreviews.map((preview, idx) => (
                <div key={idx} className="relative inline-block shrink-0">
                  <img src={preview} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                  <button 
                    onClick={() => removeImage(idx)}
                    className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => setIsManualEntryOpen(true)}
              className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              disabled={isLoading}
              title="Ручной ввод"
            >
              <PlusCircle className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => setIsBarcodeOpen(true)}
              className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              disabled={isLoading}
              title="Сканировать штрихкод"
            >
              <Barcode className="w-6 h-6" />
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition-colors shrink-0"
              disabled={isLoading}
              title="Сделать фото"
            >
              <Camera className="w-6 h-6" />
            </button>
            <input 
              type="file" 
              accept="image/*" 
              multiple
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageChange}
            />
            
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Что вы съели?"
              className="flex-1 bg-gray-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-full px-4 py-3 outline-none transition-all"
              disabled={isLoading}
            />
            
            <button
              type="submit"
              disabled={isLoading || (!searchQuery.trim() && imageFiles.length === 0)}
              className="p-3 bg-emerald-500 text-white rounded-full hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </div>

      {/* Modals */}
      {isSettingsOpen && (
        <SettingsModal 
          goals={goals} 
          onSave={async (g) => { 
            setGoals(g); 
            if (profile && user) await saveProfileToLocal({ ...profile, goals: g });
            setIsSettingsOpen(false); 
          }} 
          onClose={() => setIsSettingsOpen(false)} 
          onResetProfile={async () => {
            if (user) {
              const data = loadUserData(user.uid);
              saveUserData(user.uid, { ...data, profile: null });
            }
            setProfile(null);
            setIsSettingsOpen(false);
          }}
        />
      )}
      
      {isRecipeOpen && (
        <RecipeModal 
          recipes={recipes} 
          onSave={saveRecipeToLocal} 
          onDelete={deleteRecipeFromLocal} 
          onClose={() => setIsRecipeOpen(false)} 
        />
      )}

      {isBarcodeOpen && (
        <BarcodeModal 
          onScan={handleBarcodeScan} 
          onClose={() => setIsBarcodeOpen(false)} 
        />
      )}

      {isManualEntryOpen && (
        <ManualEntryModal
          onSave={handleManualEntry}
          onClose={() => setIsManualEntryOpen(false)}
        />
      )}

      {isStatsOpen && (
        <StatisticsModal
          meals={meals}
          goals={goals}
          onClose={() => setIsStatsOpen(false)}
        />
      )}
    </div>
  );
}
