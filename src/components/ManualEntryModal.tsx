import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ManualEntryModalProps {
  onSave: (meal: { name: string; calories: number; protein: number; fat: number; carbs: number }) => void;
  onClose: () => void;
}

export function ManualEntryModal({ onSave, onClose }: ManualEntryModalProps) {
  const [name, setName] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [fat, setFat] = useState('');
  const [carbs, setCarbs] = useState('');

  const handleSave = () => {
    if (!name.trim() || !calories) return;
    onSave({
      name: name.trim(),
      calories: parseInt(calories) || 0,
      protein: parseFloat(protein) || 0,
      fat: parseFloat(fat) || 0,
      carbs: parseFloat(carbs) || 0,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-sm p-6 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-800">Ручной ввод</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Название блюда</label>
            <input 
              type="text" 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
              placeholder="Например: Овсянка с бананом"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Калории (ккал)</label>
            <input 
              type="number" 
              value={calories} 
              onChange={e => setCalories(e.target.value)} 
              className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Белки (г)</label>
              <input 
                type="number" 
                value={protein} 
                onChange={e => setProtein(e.target.value)} 
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Жиры (г)</label>
              <input 
                type="number" 
                value={fat} 
                onChange={e => setFat(e.target.value)} 
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Углеводы (г)</label>
              <input 
                type="number" 
                value={carbs} 
                onChange={e => setCarbs(e.target.value)} 
                className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all" 
              />
            </div>
          </div>
          
          <button 
            onClick={handleSave} 
            disabled={!name.trim() || !calories}
            className="w-full bg-emerald-500 text-white py-3 rounded-lg font-medium mt-6 hover:bg-emerald-600 transition-colors shadow-sm disabled:opacity-50"
          >
            Добавить
          </button>
        </div>
      </div>
    </div>
  );
}
