import React, { useMemo } from 'react';
import { X } from 'lucide-react';
import { format, subDays, startOfToday, isSameDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
  AreaChart, Area,
  PieChart, Pie, Cell
} from 'recharts';
import { Meal, DailyGoal } from '../types';

interface StatisticsModalProps {
  meals: Meal[];
  goals: DailyGoal;
  onClose: () => void;
}

const COLORS = ['#3b82f6', '#f59e0b', '#a855f7']; // Protein (blue), Fat (amber), Carbs (purple)

export function StatisticsModal({ meals, goals, onClose }: StatisticsModalProps) {
  const data = useMemo(() => {
    const days = Array.from({ length: 7 }).map((_, i) => subDays(startOfToday(), 6 - i));
    return days.map(date => {
      const dayMeals = meals.filter(m => isSameDay(new Date(m.timestamp), date));
      const totals = dayMeals.reduce((acc, meal) => ({
        calories: acc.calories + meal.calories,
        protein: acc.protein + meal.protein,
        fat: acc.fat + meal.fat,
        carbs: acc.carbs + meal.carbs,
      }), { calories: 0, protein: 0, fat: 0, carbs: 0 });

      return {
        date: format(date, 'd MMM', { locale: ru }),
        ...totals
      };
    });
  }, [meals]);

  const avgMacros = useMemo(() => {
    const totals = data.reduce((acc, day) => ({
      protein: acc.protein + day.protein,
      fat: acc.fat + day.fat,
      carbs: acc.carbs + day.carbs,
    }), { protein: 0, fat: 0, carbs: 0 });

    const sum = totals.protein + totals.fat + totals.carbs;
    if (sum === 0) return [];

    return [
      { name: 'Белки', value: totals.protein },
      { name: 'Жиры', value: totals.fat },
      { name: 'Углеводы', value: totals.carbs },
    ];
  }, [data]);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl p-6 max-h-[90vh] flex flex-col shadow-xl">
        <div className="flex justify-between items-center mb-6 shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Статистика (последние 7 дней)</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto no-scrollbar space-y-8 pb-4">
          {/* Chart 1: Calories */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Потребление калорий</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip cursor={{ fill: '#f3f4f6' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <ReferenceLine y={goals.calories} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'Цель', fill: '#ef4444', fontSize: 12 }} />
                  <Bar dataKey="calories" name="Калории" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Macros Trend */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Динамика макронутриентов (г)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="protein" name="Белки" stackId="1" stroke="#3b82f6" fill="#3b82f6" />
                  <Area type="monotone" dataKey="fat" name="Жиры" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                  <Area type="monotone" dataKey="carbs" name="Углеводы" stackId="1" stroke="#a855f7" fill="#a855f7" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: Average Macros Pie */}
          <div>
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Среднее соотношение БЖУ</h3>
            <div className="h-64 w-full bg-gray-50 rounded-xl flex items-center justify-center">
              {avgMacros.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={avgMacros}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {avgMacros.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${Math.round(value / 7)} г/день`, 'В среднем']} 
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} 
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-gray-400">
                  Нет данных за этот период
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
