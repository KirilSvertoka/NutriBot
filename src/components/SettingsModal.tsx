import React, { useState } from 'react';
import { DailyGoal } from '../types';
import { X } from 'lucide-react';

interface SettingsModalProps {
  goals: DailyGoal;
  onSave: (goals: DailyGoal) => void;
  onClose: () => void;
  onResetProfile?: () => void;
}

export function SettingsModal({ goals, onSave, onClose, onResetProfile }: SettingsModalProps) {
  const [g, setG] = useState(goals);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Настройки</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 border-b pb-2">Ручная настройка КБЖУ</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Калории (ккал)</label>
              <input 
                type="number" 
                value={g.calories} 
                onChange={e => setG({...g, calories: +e.target.value})} 
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Белки (г)</label>
              <input 
                type="number" 
                value={g.protein} 
                onChange={e => setG({...g, protein: +e.target.value})} 
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Жиры (г)</label>
              <input 
                type="number" 
                value={g.fat} 
                onChange={e => setG({...g, fat: +e.target.value})} 
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Углеводы (г)</label>
              <input 
                type="number" 
                value={g.carbs} 
                onChange={e => setG({...g, carbs: +e.target.value})} 
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
              />
            </div>
            
            <button 
              onClick={() => onSave(g)} 
              className="w-full bg-emerald-500 text-white py-3 rounded-lg font-medium hover:bg-emerald-600 transition-colors shadow-sm"
            >
              Сохранить цели
            </button>
          </div>

          {onResetProfile && (
            <div className="pt-4 border-t border-gray-100">
              <button
                onClick={onResetProfile}
                className="w-full py-3 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg font-medium transition-colors"
              >
                Изменить анкету (рост, вес и др.)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
