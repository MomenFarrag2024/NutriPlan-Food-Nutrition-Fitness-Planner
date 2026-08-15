/**
 * NutriPlan - Shared utilities
 */

export class Utils {
  static debounce(fn, delay = 350) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), delay);
    };
  }

  static escapeHtml(str = "") {
    const div = document.createElement("div");
    div.textContent = String(str);
    return div.innerHTML;
  }

  static capitalize(str = "") {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  static formatToday() {
    return new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  }

  /** Toast helper. Falls back to console if SweetAlert2 isn't loaded. */
  static toast(message, icon = "success") {
    if (window.Swal) {
      window.Swal.fire({
        toast: true,
        position: "top-end",
        showConfirmButton: false,
        timer: 2200,
        timerProgressBar: true,
        icon,
        title: message,
      });
    } else {
      console.log(`[${icon}]`, message);
    }
  }

  /**
   * TheMealDB carries no nutrition data, so we derive a rough per-serving
   * estimate from ingredient count. This is a stand-in, not a real
   * nutrition calculation, and is labeled as an estimate in the UI.
   */
  static estimateNutrition(ingredientCount) {
    const base = 220 + ingredientCount * 35;
    const calories = Math.round(base / 5) * 5;
    return {
      calories,
      protein: Math.round(calories * 0.18) / 4,
      carbs: Math.round((calories * 0.5) / 4),
      fat: Math.round((calories * 0.3) / 9),
      fiber: Math.max(2, Math.round(ingredientCount * 0.6)),
      sugar: Math.round(calories * 0.08) / 4,
    };
  }

  static clampPercent(value, max) {
    if (!max) return 0;
    return Math.min(100, Math.round((value / max) * 100));
  }
}

// Named exports preserved so existing imports (`import { debounce, ... }`)
// keep working unchanged; they simply delegate to the class above.
export const debounce = Utils.debounce;
export const escapeHtml = Utils.escapeHtml;
export const capitalize = Utils.capitalize;
export const formatToday = Utils.formatToday;
export const toast = Utils.toast;
export const estimateNutrition = Utils.estimateNutrition;
export const clampPercent = Utils.clampPercent;
