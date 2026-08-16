/**
 * TheMealDB API wrapper
 * Free API, no key required. Docs: https://www.themealdb.com/api.php
 */

export class MealDbApi {
  static BASE_URL = "https://www.themealdb.com/api/json/v1/1";

  async request(path) {
    const res = await fetch(`${MealDbApi.BASE_URL}${path}`);
    if (!res.ok) {
      throw new Error(
        `TheMealDB request failed: ${res.status} ${res.statusText}`,
      );
    }
    return res.json();
  }

  /** Get every meal category. Returns [] on failure. */
  async fetchCategories() {
    const data = await this.request("/categories.php");
    return data.categories || [];
  }

  /** Search meals by name. Returns [] if nothing matches. */
  async searchMealsByName(query) {
    const data = await this.request(
      `/search.php?s=${encodeURIComponent(query)}`,
    );
    return data.meals || [];
  }

  /** Get a single meal by its TheMealDB id. Returns null if not found. */
  async getMealById(id) {
    const data = await this.request(`/lookup.php?i=${encodeURIComponent(id)}`);
    return (data.meals && data.meals[0]) || null;
  }

  /** Filter meals by category (e.g. "Seafood"). Returns [] on no match. */
  async filterByCategory(category) {
    const data = await this.request(
      `/filter.php?c=${encodeURIComponent(category)}`,
    );
    return data.meals || [];
  }

  /** Filter meals by area/cuisine (e.g. "Italian"). Returns [] on no match. */
  async filterByArea(area) {
    const data = await this.request(
      `/filter.php?a=${encodeURIComponent(area)}`,
    );
    return data.meals || [];
  }

  /** Get one random meal. */
  async getRandomMeal() {
    const data = await this.request("/random.php");
    return (data.meals && data.meals[0]) || null;
  }

  /**
   * TheMealDB has no "get everything" endpoint. search.php?s= (empty string)
   * reliably returns the full meal catalog, but we fall back to merging a
   * handful of popular categories if that ever stops working.
   */
  async fetchAllMeals() {
    try {
      const meals = await this.searchMealsByName("");
      if (meals.length) return meals;
    } catch (err) {
      // fall through to the fallback strategy below
    }

    const fallbackCategories = [
      "Chicken",
      "Beef",
      "Seafood",
      "Dessert",
      "Vegetarian",
      "Pasta",
    ];
    const results = await Promise.allSettled(
      fallbackCategories.map((c) => this.filterByCategory(c)),
    );
    const seen = new Map();
    results.forEach((r) => {
      if (r.status === "fulfilled") {
        r.value.forEach((meal) => seen.set(meal.idMeal, meal));
      }
    });
    return Array.from(seen.values());
  }

  /**
   * Extract the list of ingredient/measure pairs from a meal object.
   * TheMealDB stores these as strIngredient1..20 / strMeasure1..20.
   */
  extractIngredients(meal) {
    const ingredients = [];
    for (let i = 1; i <= 20; i++) {
      const ingredient = meal[`strIngredient${i}`];
      const measure = meal[`strMeasure${i}`];
      if (ingredient && ingredient.trim()) {
        ingredients.push({
          name: ingredient.trim(),
          measure: measure ? measure.trim() : "",
        });
      }
    }
    return ingredients;
  }

  /**
   * Split a meal's instructions blob into an ordered list of steps.
   */
  extractInstructionSteps(meal) {
    if (!meal.strInstructions) return [];
    return meal.strInstructions
      .split(/\r?\n+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .flatMap((s) => (s.length > 220 ? s.split(/(?<=[.!?])\s+/) : [s]))
      .map((s) => s.trim())
      .filter(Boolean);
  }
}

// Singleton instance backing the standalone exports below.
const mealDbApi = new MealDbApi();

// Named exports preserved so existing imports (`import * as mealdb from
// "./mealdb.js"` / `import { fetchCategories } from "./mealdb.js"`) keep
// working unchanged; they simply delegate to the class instance above.
export async function fetchCategories() {
  return mealDbApi.fetchCategories();
}

export async function searchMealsByName(query) {
  return mealDbApi.searchMealsByName(query);
}

export async function getMealById(id) {
  return mealDbApi.getMealById(id);
}

export async function filterByCategory(category) {
  return mealDbApi.filterByCategory(category);
}

export async function filterByArea(area) {
  return mealDbApi.filterByArea(area);
}

export async function getRandomMeal() {
  return mealDbApi.getRandomMeal();
}

export async function fetchAllMeals() {
  return mealDbApi.fetchAllMeals();
}

export function extractIngredients(meal) {
  return mealDbApi.extractIngredients(meal);
}

export function extractInstructionSteps(meal) {
  return mealDbApi.extractInstructionSteps(meal);
}
