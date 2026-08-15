/**
 * NutriPlan - Component templates
 * Pure functions that return HTML strings. No DOM writes happen here;
 * callers are responsible for injecting the markup.
 */

import { escapeHtml, capitalize } from "./utils.js";
import { isFavorite } from "./state.js";

export class Components {
  // =========== Loading Spinner ============
  static loadingSpinnerHTML() {
    return `
    <div class="flex items-center justify-center py-12 col-span-full">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
    </div>`;
  }

  // =========== Skeleton Cards (for initial grid loads) ============
  static skeletonCardHTML() {
    return `
    <div class="bg-white rounded-xl overflow-hidden shadow-sm">
      <div class="h-48 skeleton"></div>
      <div class="p-4 space-y-2">
        <div class="h-4 w-3/4 rounded skeleton"></div>
        <div class="h-3 w-1/2 rounded skeleton"></div>
      </div>
    </div>`;
  }

  static skeletonGridHTML(count = 8) {
    return Array.from({ length: count }, Components.skeletonCardHTML).join("");
  }

  // =========== Empty State ============
  static emptyStateHTML(title = "Nothing found", subtitle = "Try a different search", icon = "fa-search") {
    return `
    <div class="empty-state flex flex-col items-center justify-center py-12 text-center col-span-full">
      <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <i class="fa-solid ${icon} text-gray-400 text-2xl"></i>
      </div>
      <p class="text-gray-500 text-lg">${escapeHtml(title)}</p>
      <p class="text-gray-400 text-sm mt-2">${escapeHtml(subtitle)}</p>
    </div>`;
  }

  // =========== Error State ============
  static errorStateHTML(message = "Something went wrong") {
    return `
    <div class="empty-state flex flex-col items-center justify-center py-12 text-center col-span-full">
      <div class="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
        <i class="fa-solid fa-triangle-exclamation text-red-400 text-2xl"></i>
      </div>
      <p class="text-gray-600 text-lg font-medium">${escapeHtml(message)}</p>
      <p class="text-gray-400 text-sm mt-2">Please try again in a moment.</p>
    </div>`;
  }

  // =========== Category Card ============
  static CATEGORY_ICONS = {
    Beef: "fa-drumstick-bite",
    Chicken: "fa-drumstick-bite",
    Dessert: "fa-cake-candles",
    Lamb: "fa-drumstick-bite",
    Miscellaneous: "fa-bowl-rice",
    Pasta: "fa-bowl-food",
    Pork: "fa-bacon",
    Seafood: "fa-fish",
    Side: "fa-plate-wheat",
    Starter: "fa-utensils",
    Vegan: "fa-leaf",
    Vegetarian: "fa-seedling",
    Breakfast: "fa-egg",
    Goat: "fa-drumstick-bite",
  };

  static CATEGORY_COLORS = {
    Beef: {
      bg: "from-red-50 to-rose-50",
      border: "border-red-200",
      hover: "hover:border-red-400",
      icon: "from-red-400 to-rose-500",
    },
    Chicken: {
      bg: "from-amber-50 to-orange-50",
      border: "border-amber-200",
      hover: "hover:border-amber-400",
      icon: "from-amber-400 to-orange-500",
    },
    Dessert: {
      bg: "from-pink-50 to-rose-50",
      border: "border-pink-200",
      hover: "hover:border-pink-400",
      icon: "from-pink-400 to-rose-500",
    },
    Lamb: {
      bg: "from-orange-50 to-amber-50",
      border: "border-orange-200",
      hover: "hover:border-orange-400",
      icon: "from-orange-400 to-amber-500",
    },
    Miscellaneous: {
      bg: "from-slate-50 to-gray-50",
      border: "border-slate-200",
      hover: "hover:border-slate-400",
      icon: "from-slate-400 to-gray-500",
    },
    Pasta: {
      bg: "from-yellow-50 to-amber-50",
      border: "border-yellow-200",
      hover: "hover:border-yellow-400",
      icon: "from-yellow-400 to-amber-500",
    },
    Pork: {
      bg: "from-rose-50 to-red-50",
      border: "border-rose-200",
      hover: "hover:border-rose-400",
      icon: "from-rose-400 to-red-500",
    },
    Seafood: {
      bg: "from-cyan-50 to-blue-50",
      border: "border-cyan-200",
      hover: "hover:border-cyan-400",
      icon: "from-cyan-400 to-blue-500",
    },
    Side: {
      bg: "from-green-50 to-emerald-50",
      border: "border-green-200",
      hover: "hover:border-green-400",
      icon: "from-green-400 to-emerald-500",
    },
    Starter: {
      bg: "from-teal-50 to-cyan-50",
      border: "border-teal-200",
      hover: "hover:border-teal-400",
      icon: "from-teal-400 to-cyan-500",
    },
    Vegan: {
      bg: "from-emerald-50 to-green-50",
      border: "border-emerald-200",
      hover: "hover:border-emerald-400",
      icon: "from-emerald-400 to-green-500",
    },
    Vegetarian: {
      bg: "from-lime-50 to-green-50",
      border: "border-lime-200",
      hover: "hover:border-lime-400",
      icon: "from-lime-400 to-green-500",
    },
    Breakfast: {
      bg: "from-orange-50 to-yellow-50",
      border: "border-orange-200",
      hover: "hover:border-orange-400",
      icon: "from-orange-400 to-yellow-500",
    },
    Goat: {
      bg: "from-red-50 to-orange-50",
      border: "border-red-200",
      hover: "hover:border-red-400",
      icon: "from-red-400 to-orange-500",
    },
  };

  static categoryCardHTML(category) {
    const name = category.strCategory;
    const icon = Components.CATEGORY_ICONS[name] || "fa-utensils";
    const colors = Components.CATEGORY_COLORS[name] || {
      bg: "from-emerald-50 to-teal-50",
      border: "border-emerald-200",
      hover: "hover:border-emerald-400",
      icon: "from-emerald-400 to-green-500",
    };
    return `
    <div
      class="category-card bg-gradient-to-br ${colors.bg} rounded-xl p-3 border ${colors.border} ${colors.hover} hover:shadow-md cursor-pointer transition-all group"
      data-category="${escapeHtml(name)}"
    >
      <div class="flex items-center gap-2.5">
        <div class="text-white w-9 h-9 bg-gradient-to-br ${colors.icon} rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm">
          <i class="fa-solid ${icon}"></i>
        </div>
        <div>
          <h3 class="text-sm font-bold text-gray-900">
            ${escapeHtml(name)}
          </h3>
        </div>
      </div>
    </div>
  `;
  }

  // =========== Recipe Card ============
  static recipeCardHTML(meal) {
    const favorited = isFavorite(meal.idMeal);
    return `
    <div
      class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group relative"
      data-meal-id="${escapeHtml(meal.idMeal)}"
    >
      <button
        class="save-recipe-btn absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
        data-meal-id="${escapeHtml(meal.idMeal)}"
        aria-label="Save recipe"
      >
        <i class="fa-solid fa-heart ${favorited ? "text-red-500" : "text-gray-300"}"></i>
      </button>
      <div class="relative h-48 overflow-hidden">
        <img
          class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          src="${escapeHtml(meal.strMealThumb)}"
          alt="${escapeHtml(meal.strMeal)}"
          loading="lazy"
        />
        <div class="absolute bottom-3 left-3 flex gap-2">
          ${meal.strCategory ? `<span class="px-2 py-1 bg-white/90 backdrop-blur-sm text-xs font-semibold rounded-full text-gray-700">${escapeHtml(meal.strCategory)}</span>` : ""}
          ${meal.strArea ? `<span class="px-2 py-1 bg-emerald-500 text-xs font-semibold rounded-full text-white">${escapeHtml(meal.strArea)}</span>` : ""}
        </div>
      </div>
      <div class="p-4">
        <h3 class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1">
          ${escapeHtml(meal.strMeal)}
        </h3>
        <p class="text-xs text-gray-600 mb-3 line-clamp-2">
          ${escapeHtml(meal.strCategory || "")} recipe${meal.strArea ? ` from ${escapeHtml(meal.strArea)} cuisine` : ""}.
        </p>
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-gray-900">
            <i class="fa-solid fa-utensils text-emerald-600 mr-1"></i>
            ${escapeHtml(meal.strCategory || "—")}
          </span>
          <span class="font-semibold text-gray-500">
            <i class="fa-solid fa-globe text-blue-500 mr-1"></i>
            ${escapeHtml(meal.strArea || "—")}
          </span>
        </div>
      </div>
    </div>`;
  }

  static recipeListRowHTML(meal) {
    const favorited = isFavorite(meal.idMeal);

    return `
    <div
      class="recipe-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group flex flex-row h-40"
      data-meal-id="${escapeHtml(meal.idMeal)}"
    >
      <!-- Image -->
      <div class="relative overflow-hidden w-48 h-full shrink-0">
        <img
          class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
          src="${escapeHtml(meal.strMealThumb)}"
          alt="${escapeHtml(meal.strMeal)}"
          loading="lazy"
        />
      </div>
      <!-- Content -->
      <div class="p-4 flex-1 min-w-0">
        <div class="flex items-start justify-between gap-3">
          <h3
            class="text-base font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors line-clamp-1"
          >
            ${escapeHtml(meal.strMeal)}
          </h3>
          <!-- Favorite -->
          <button
            class="save-recipe-btn w-9 h-9 rounded-full hover:bg-gray-50 flex items-center justify-center shrink-0"
            data-meal-id="${escapeHtml(meal.idMeal)}"
            aria-label="Save recipe"
          >
            <i
              class="fa-solid fa-heart ${
                favorited ? "text-red-500" : "text-gray-300"
              }"
            ></i>
          </button>
        </div>
        <!-- Instructions -->
        <p class="text-xs text-gray-600 mb-3 line-clamp-2">
          ${
            meal.strInstructions
              ? escapeHtml(meal.strInstructions)
              : "No instructions available."
          }
        </p>
        <!-- Footer -->
        <div class="flex items-center justify-between text-xs">
          <span class="font-semibold text-gray-900">
            <i class="fa-solid fa-utensils mr-1 text-emerald-600"></i>
            ${escapeHtml(meal.strCategory || "—")}
          </span>
          <span class="font-semibold text-gray-500">
            <i class="fa-solid fa-globe mr-1 text-blue-500"></i>
            ${escapeHtml(meal.strArea || "—")}
          </span>
        </div>
      </div>
    </div>
  `;
  }

  // =========== Ingredient row (meal detail) ============
  static ingredientRowHTML(ingredient, index) {
    return `
    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-emerald-50 transition-colors">
      <input type="checkbox" id="ingredient-${index}" class="ingredient-checkbox w-5 h-5 text-emerald-600 rounded border-gray-300" />
      <label for="ingredient-${index}" class="text-gray-700">
        ${ingredient.measure ? `<span class="font-medium text-gray-900">${escapeHtml(ingredient.measure)}</span>` : ""}
        ${escapeHtml(ingredient.name)}
      </label>
    </div>`;
  }

  // =========== Instruction step (meal detail) ============
  static instructionStepHTML(step, index) {
    return `
    <div class="flex gap-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
      <div class="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold shrink-0">
        ${index + 1}
      </div>
      <p class="text-gray-700 leading-relaxed pt-2">${escapeHtml(step)}</p>
    </div>`;
  }

  // =========== Product Card (Product Scanner page) ============
  static GRADE_COLORS = {
    a: "bg-green-500",
    b: "bg-lime-500",
    c: "bg-yellow-500",
    d: "bg-orange-500",
    e: "bg-red-500",
  };

  static productCardHTML(product) {
    const gradeColor = Components.GRADE_COLORS[product.nutriScore] || "bg-gray-400";

    return `
    <div class="product-card bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-pointer group" data-barcode="${escapeHtml(product.barcode)}">
      <div class="relative h-40 bg-gray-100 flex items-center justify-center overflow-hidden">
        ${
          product.image
            ? `<img class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300" src="${escapeHtml(product.image)}" alt="${escapeHtml(product.name)}" loading="lazy" />`
            : `<i class="fa-solid fa-box-open text-gray-300 text-4xl"></i>`
        }
        ${
          product.nutriScore
            ? `<div class="none absolute top-2 left-2 ${gradeColor} text-white text-xs font-bold px-2 py-1 rounded uppercase">Nutri-Score ${escapeHtml(product.nutriScore)}</div>`
            : ""
        }
        ${
          product.novaGroup
            ? `<div class="none absolute top-2 right-2 bg-lime-500 text-white text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center" title="NOVA ${product.novaGroup}">${product.novaGroup}</div>`
            : ""
        }
      </div>
      <div class="p-4">
        <p class="text-xs text-emerald-600 font-semibold mb-1 truncate">${escapeHtml(product.brand)}</p>
        <h3 class="font-bold text-gray-900 mb-2 line-clamp-2 group-hover:text-emerald-600 transition-colors">${escapeHtml(product.name)}</h3>
        <div class="flex items-center gap-3 text-xs text-gray-500 mb-3">
          ${product.quantity ? `<span><i class="fa-solid fa-weight-scale mr-1"></i>${escapeHtml(product.quantity)}</span>` : ""}
          <span><i class="fa-solid fa-fire mr-1"></i>${product.caloriesPer100g} kcal/100g</span>
        </div>
        <div class="grid grid-cols-4 gap-1 text-center">
          <div class="bg-emerald-50 rounded p-1.5">
            <p class="text-xs font-bold text-emerald-700">${product.proteinPer100g}g</p>
            <p class="text-[10px] text-gray-500">Protein</p>
          </div>
          <div class="bg-blue-50 rounded p-1.5">
            <p class="text-xs font-bold text-blue-700">${product.carbsPer100g}g</p>
            <p class="text-[10px] text-gray-500">Carbs</p>
          </div>
          <div class="bg-purple-50 rounded p-1.5">
            <p class="text-xs font-bold text-purple-700">${product.fatPer100g}g</p>
            <p class="text-[10px] text-gray-500">Fat</p>
          </div>
          <div class="bg-orange-50 rounded p-1.5">
            <p class="text-xs font-bold text-orange-700">${product.sugarPer100g}g</p>
            <p class="text-[10px] text-gray-500">Sugar</p>
          </div>
        </div>
      </div>
    </div>`;
  }

  // =========== Food Log: logged item row ============
  static loggedItemHTML(entry) {
    const time = new Date(entry.loggedAt).toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
    const isProduct = entry.source === "product";
    return `
    <div
      class="flex items-center justify-between bg-gray-50 rounded-xl p-4 hover:bg-gray-100 transition-all"
      data-entry-id="${escapeHtml(entry.id)}"
    >
      <div class="flex items-center gap-4 min-w-0">
        <img
          src="${escapeHtml(entry.image || "")}"
          alt="${escapeHtml(entry.name)}"
          class="w-14 h-14 rounded-xl object-cover shrink-0"
        >
        <div class="min-w-0">
          <p class="font-semibold text-gray-900 truncate">
            ${escapeHtml(entry.name)}
          </p>
          <p class="text-sm text-gray-500">
            ${entry.servings || 1}
            serving${Number(entry.servings || 1) === 1 ? "" : "s"}
            <span class="mx-1">•</span>
            <span class="text-emerald-600">
              ${isProduct ? "Product" : "Recipe"}
            </span>
          </p>
          <p class="text-xs text-gray-400 mt-1">
            ${time}
          </p>
        </div>
      </div>
      <div class="flex items-center gap-4 shrink-0">
        <div class="text-right">
          <p class="text-lg font-bold text-emerald-600">
            ${Math.round(entry.calories)}
          </p>
          <p class="text-xs text-gray-500">
            kcal
          </p>
        </div>
        <div class="hidden md:flex gap-2 text-xs text-gray-500">
          <span class="px-2 py-1 bg-blue-50 rounded">
            ${Math.round(entry.protein || 0)}g P
          </span>
          <span class="px-2 py-1 bg-amber-50 rounded">
            ${Math.round(entry.carbs || 0)}g C
          </span>
          <span class="px-2 py-1 bg-purple-50 rounded">
            ${Math.round(entry.fat || 0)}g F
          </span>
        </div>
        <button
          class="remove-entry-btn text-gray-400 hover:text-red-500 transition-all p-2"
          data-entry-id="${escapeHtml(entry.id)}"
          aria-label="Remove entry"
        >
          <i class="fa-solid fa-trash-can"></i>
        </button>
      </div>
    </div>
  `;
  }
}

// Named exports preserved so existing imports (`import * as ui from
// "./components.js"`) keep working unchanged; they simply delegate to the
// class above.
export function loadingSpinnerHTML() {
  return Components.loadingSpinnerHTML();
}

export function skeletonCardHTML() {
  return Components.skeletonCardHTML();
}

export function skeletonGridHTML(count) {
  return Components.skeletonGridHTML(count);
}

export function emptyStateHTML(title, subtitle, icon) {
  return Components.emptyStateHTML(title, subtitle, icon);
}

export function errorStateHTML(message) {
  return Components.errorStateHTML(message);
}

export function categoryCardHTML(category) {
  return Components.categoryCardHTML(category);
}

export function recipeCardHTML(meal) {
  return Components.recipeCardHTML(meal);
}

export function recipeListRowHTML(meal) {
  return Components.recipeListRowHTML(meal);
}

export function ingredientRowHTML(ingredient, index) {
  return Components.ingredientRowHTML(ingredient, index);
}

export function instructionStepHTML(step, index) {
  return Components.instructionStepHTML(step, index);
}

export function productCardHTML(product) {
  return Components.productCardHTML(product);
}

export function loggedItemHTML(entry) {
  return Components.loggedItemHTML(entry);
}
