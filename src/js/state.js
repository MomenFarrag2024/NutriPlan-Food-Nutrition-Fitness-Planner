/**
 * NutriPlan - App State
 * Small in-memory store plus localStorage persistence for favorites and
 * the daily food log. Encapsulated in a class; other modules import the
 * singleton `state` instance (or the helper functions below) and use it
 * exactly like the old plain object.
 */

export class AppState {
  static STORAGE_KEYS = {
    FAVORITES: "nutriplan_favorites",
    FOODLOG: "nutriplan_foodlog",
  };

  static NUTRITION_GOALS = { calories: 2000, protein: 50, carbs: 250, fat: 65 };

  static todayKey() {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  constructor() {
    this.currentPage = "meals"; // 'meals' | 'products' | 'foodlog'
    this.viewMode = "grid"; // 'grid' | 'list'

    this.categories = [];
    this.allMeals = [];
    this.visibleMeals = [];
    this.activeCategory = "";
    this.activeArea = "";
    this.searchQuery = "";
    this.currentMeal = null;

    this.products = [];
    this.productQuery = "";
    this.productCategory = "";
    this.productGrade = "";

    this.favorites = this.#loadFavorites();
    this.foodlog = this.#loadFoodlog();
    this.goals = AppState.NUTRITION_GOALS;
  }

  #loadFavorites() {
    try {
      return new Set(JSON.parse(localStorage.getItem(AppState.STORAGE_KEYS.FAVORITES)) || []);
    } catch {
      return new Set();
    }
  }

  #loadFoodlog() {
    try {
      return JSON.parse(localStorage.getItem(AppState.STORAGE_KEYS.FOODLOG)) || {};
    } catch {
      return {};
    }
  }

  #saveFavorites() {
    localStorage.setItem(AppState.STORAGE_KEYS.FAVORITES, JSON.stringify(Array.from(this.favorites)));
  }

  #saveFoodlog() {
    localStorage.setItem(AppState.STORAGE_KEYS.FOODLOG, JSON.stringify(this.foodlog));
  }

  toggleFavorite(mealId) {
    if (this.favorites.has(mealId)) {
      this.favorites.delete(mealId);
    } else {
      this.favorites.add(mealId);
    }
    this.#saveFavorites();
    return this.favorites.has(mealId);
  }

  isFavorite(mealId) {
    return this.favorites.has(mealId);
  }

  addFoodLogEntry(entry) {
    const key = AppState.todayKey();
    if (!this.foodlog[key]) this.foodlog[key] = [];
    this.foodlog[key].push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      loggedAt: new Date().toISOString(),
      ...entry,
    });
    this.#saveFoodlog();
  }

  removeFoodLogEntry(entryId) {
    const key = AppState.todayKey();
    if (!this.foodlog[key]) return;
    this.foodlog[key] = this.foodlog[key].filter((e) => e.id !== entryId);
    this.#saveFoodlog();
  }

  clearTodayFoodLog() {
    this.foodlog[AppState.todayKey()] = [];
    this.#saveFoodlog();
  }

  getTodayEntries() {
    return this.foodlog[AppState.todayKey()] || [];
  }

  getTodayTotals() {
    return this.getTodayEntries().reduce(
      (totals, e) => ({
        calories: totals.calories + (e.calories || 0),
        protein: totals.protein + (e.protein || 0),
        carbs: totals.carbs + (e.carbs || 0),
        fat: totals.fat + (e.fat || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
  }

  /** Last 7 days (oldest -> newest) of { label, date, calories }. */
  getWeeklyCalories() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const entries = this.foodlog[key] || [];
      const calories = entries.reduce((sum, e) => sum + (e.calories || 0), 0);
      days.push({
        label: d.toLocaleDateString(undefined, { weekday: "short" }),
        date: key,
        calories,
      });
    }
    return days;
  }
}

// Singleton instance, same role the old plain `state` object played.
export const state = new AppState();

// Standalone helpers preserved so existing imports keep working unchanged;
// they simply delegate to the singleton instance above.
export function todayKey() {
  return AppState.todayKey();
}

export function toggleFavorite(mealId) {
  return state.toggleFavorite(mealId);
}

export function isFavorite(mealId) {
  return state.isFavorite(mealId);
}

export function addFoodLogEntry(entry) {
  return state.addFoodLogEntry(entry);
}

export function removeFoodLogEntry(entryId) {
  return state.removeFoodLogEntry(entryId);
}

export function clearTodayFoodLog() {
  return state.clearTodayFoodLog();
}

export function getTodayEntries() {
  return state.getTodayEntries();
}

export function getTodayTotals() {
  return state.getTodayTotals();
}

export function getWeeklyCalories() {
  return state.getWeeklyCalories();
}
