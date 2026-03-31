import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserProfile, DailyGoal } from '../types';

interface WeighInModalProps {
  profile: UserProfile;
  onComplete: (newProfile: UserProfile, newGoals: DailyGoal) => void;
  onSkip: () => void;
}

export function WeighInModal({ profile, onComplete, onSkip }: WeighInModalProps) {
  const [weight, setWeight] = useState<number>(profile.weight);

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
    const updatedProfile = {
      ...profile,
      weight,
      lastWeighInDate: Date.now(),
    };
    const newGoals = calculateGoals(updatedProfile);
    onComplete(updatedProfile, newGoals);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-xl"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Время взвешивания!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Прошла неделя с вашего последнего взвешивания. Внесите актуальный вес, чтобы мы могли скорректировать ваши цели.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Текущий вес (кг)</label>
              <input
                type="number"
                min="30"
                max="300"
                step="0.1"
                required
                value={weight || ''}
                onChange={(e) => setWeight(parseFloat(e.target.value))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-xl font-bold focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="submit"
                disabled={!weight}
                className="w-full bg-emerald-500 text-white py-3 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                Сохранить и обновить цели
              </button>
              <button
                type="button"
                onClick={onSkip}
                className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm font-medium transition-colors"
              >
                Пропустить в этот раз
              </button>
            </div>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
