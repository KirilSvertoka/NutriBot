import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile, DailyGoal } from '../types';

interface OnboardingModalProps {
  onComplete: (profile: UserProfile, goals: DailyGoal) => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    gender: 'male',
    activityLevel: 'sedentary',
  });

  const handleChange = (field: keyof UserProfile, value: any) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const calculateGoals = (p: UserProfile): DailyGoal => {
    // Mifflin-St Jeor Equation
    let bmr = (10 * p.weight) + (6.25 * p.height) - (5 * p.age);
    bmr += p.gender === 'male' ? 5 : -161;

    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    let tdee = bmr * activityMultipliers[p.activityLevel];

    // Adjust for target weight
    if (p.targetWeight < p.weight) {
      tdee -= 500; // Weight loss
    } else if (p.targetWeight > p.weight) {
      tdee += 500; // Weight gain
    }

    // Ensure minimum healthy calories
    const minCalories = p.gender === 'male' ? 1500 : 1200;
    const calories = Math.max(Math.round(tdee), minCalories);

    // Macros: 2g protein per kg, 25% fat, rest carbs
    const protein = Math.round(p.weight * 2);
    const fat = Math.round((calories * 0.25) / 9);
    const carbs = Math.round((calories - (protein * 4) - (fat * 9)) / 4);

    return { calories, protein, fat, carbs };
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    const finalProfile = {
      ...profile,
      lastWeighInDate: Date.now(),
    } as UserProfile;

    const goals = calculateGoals(finalProfile);
    onComplete(finalProfile, goals);
  };

  const isStepValid = () => {
    if (step === 1) return profile.gender && profile.age;
    if (step === 2) return profile.weight && profile.height && profile.targetWeight;
    if (step === 3) return profile.activityLevel;
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
      >
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Добро пожаловать!</h2>
          <p className="text-gray-500 mb-6">Давайте настроим приложение под вас.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Пол</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleChange('gender', 'male')}
                      className={`py-2 px-4 rounded-lg border ${profile.gender === 'male' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-600'}`}
                    >
                      Мужской
                    </button>
                    <button
                      type="button"
                      onClick={() => handleChange('gender', 'female')}
                      className={`py-2 px-4 rounded-lg border ${profile.gender === 'female' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'border-gray-200 text-gray-600'}`}
                    >
                      Женский
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Возраст (лет)</label>
                  <input
                    type="number"
                    min="10"
                    max="120"
                    required
                    value={profile.age || ''}
                    onChange={(e) => handleChange('age', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Рост (см)</label>
                  <input
                    type="number"
                    min="100"
                    max="250"
                    required
                    value={profile.height || ''}
                    onChange={(e) => handleChange('height', parseInt(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Текущий вес (кг)</label>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    step="0.1"
                    required
                    value={profile.weight || ''}
                    onChange={(e) => handleChange('weight', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Желаемый вес (кг)</label>
                  <input
                    type="number"
                    min="30"
                    max="300"
                    step="0.1"
                    required
                    value={profile.targetWeight || ''}
                    onChange={(e) => handleChange('targetWeight', parseFloat(e.target.value))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Уровень активности</label>
                  <div className="space-y-2">
                    {[
                      { id: 'sedentary', label: 'Сидячий', desc: 'Минимум активности, сидячая работа' },
                      { id: 'light', label: 'Легкий', desc: 'Легкие тренировки 1-3 раза в неделю' },
                      { id: 'moderate', label: 'Умеренный', desc: 'Тренировки 3-5 раз в неделю' },
                      { id: 'active', label: 'Высокий', desc: 'Интенсивные тренировки 6-7 раз в неделю' },
                      { id: 'very_active', label: 'Очень высокий', desc: 'Тяжелая физическая работа или 2 тренировки в день' },
                    ].map((level) => (
                      <button
                        key={level.id}
                        type="button"
                        onClick={() => handleChange('activityLevel', level.id)}
                        className={`w-full text-left p-3 rounded-lg border ${profile.activityLevel === level.id ? 'bg-emerald-50 border-emerald-500' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className={`font-medium ${profile.activityLevel === level.id ? 'text-emerald-700' : 'text-gray-900'}`}>{level.label}</div>
                        <div className={`text-xs mt-1 ${profile.activityLevel === level.id ? 'text-emerald-600' : 'text-gray-500'}`}>{level.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            <div className="pt-4 flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 font-medium transition-colors"
                >
                  Назад
                </button>
              )}
              <button
                type="submit"
                disabled={!isStepValid()}
                className="flex-1 bg-emerald-500 text-white py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {step === 3 ? 'Завершить' : 'Далее'}
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
