export interface UserProfile {
  uid?: string;
  gender: 'male' | 'female';
  weight: number;
  height: number;
  age: number;
  targetWeight: number;
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  lastWeighInDate: number;
  goals?: DailyGoal;
}

export interface Meal {
  id: string;
  timestamp: number;
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  explanation?: string;
  image?: string;
}

export interface DailyGoal {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface CustomRecipe {
  id: string;
  name: string;
  ingredients: string;
  macrosPer100g: {
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
  };
}
