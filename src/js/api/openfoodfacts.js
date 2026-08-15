/**
 * OpenFoodFacts API wrapper
 * Free API, no key required. Docs: https://world.openfoodfacts.org/data
 */

export class OpenFoodFactsApi {
  static SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl";
  static PRODUCT_URL = "https://world.openfoodfacts.org/api/v2/product";

  /**
   * Search products by name, optionally narrowed by category and/or
   * Nutri-Score grade.
   * @param {{query?: string, category?: string, grade?: string, pageSize?: number}} opts
   */
  async searchProducts({ query = "", category = "", grade = "", pageSize = 24 } = {}) {
    const params = new URLSearchParams({
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: String(pageSize),
    });

    if (query) params.set("search_terms", query);

    if (category) {
      params.set("tagtype_0", "categories");
      params.set("tag_contains_0", "contains");
      params.set("tag_0", category);
    }

    if (grade) {
      params.set("nutrition_grades_tags", grade.toLowerCase());
    }

    const res = await fetch(`${OpenFoodFactsApi.SEARCH_URL}?${params.toString()}`);
    if (!res.ok) throw new Error(`OpenFoodFacts search failed: ${res.status}`);
    const data = await res.json();
    return (data.products || []).filter((p) => p.product_name);
  }

  /** Look up a single product by its barcode. Returns null if not found. */
  async getProductByBarcode(barcode) {
    const res = await fetch(`${OpenFoodFactsApi.PRODUCT_URL}/${encodeURIComponent(barcode)}.json`);
    if (!res.ok) throw new Error(`OpenFoodFacts lookup failed: ${res.status}`);
    const data = await res.json();
    if (data.status !== 1 || !data.product) return null;
    return data.product;
  }

  /** Normalize an OpenFoodFacts product into the shape our UI expects. */
  normalizeProduct(product) {
    const n = product.nutriments || {};
    return {
      barcode: product.code || product._id || "",
      name: product.product_name || product.product_name_en || "Unnamed product",
      brand: (product.brands || "").split(",")[0].trim() || "Unknown brand",
      image: product.image_front_small_url || product.image_url || product.image_small_url || "",
      nutriScore: (product.nutrition_grades || product.nutriscore_grade || "").toLowerCase(),
      novaGroup: product.nova_group || null,
      quantity: product.quantity || "",
      caloriesPer100g: Math.round(n["energy-kcal_100g"] ?? n["energy-kcal"] ?? 0),
      proteinPer100g: this.#round1(n.proteins_100g),
      carbsPer100g: this.#round1(n.carbohydrates_100g),
      fatPer100g: this.#round1(n.fat_100g),
      sugarPer100g: this.#round1(n.sugars_100g),
    };
  }

  #round1(value) {
    return typeof value === "number" ? Math.round(value * 10) / 10 : 0;
  }
}

// Singleton instance backing the standalone exports below.
const openFoodFactsApi = new OpenFoodFactsApi();

// Named exports preserved so existing imports (`import * as off from
// "./openfoodfacts.js"`) keep working unchanged; they simply delegate to
// the class instance above.
export async function searchProducts(opts) {
  return openFoodFactsApi.searchProducts(opts);
}

export async function getProductByBarcode(barcode) {
  return openFoodFactsApi.getProductByBarcode(barcode);
}

export function normalizeProduct(product) {
  return openFoodFactsApi.normalizeProduct(product);
}
