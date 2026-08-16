/**
 * NutriPlan - Main Entry Point
 */

import * as mealdb from "./api/mealdb.js";
import * as off from "./api/openfoodfacts.js";
import * as ui from "./components.js";
import {
  state,
  toggleFavorite,
  addFoodLogEntry,
  removeFoodLogEntry,
  clearTodayFoodLog,
  getTodayEntries,
  getTodayTotals,
  getWeeklyCalories,
} from "./state.js";
import {
  debounce,
  toast,
  formatToday,
  estimateNutrition,
  clampPercent,
} from "./utils.js";

const PAGE_META = {
  meals: {
    title: "Meals & Recipes",
    subtitle: "Discover delicious and nutritious recipes tailored for you",
  },
  products: {
    title: "Product Scanner",
    subtitle: "Search packaged foods or scan a barcode for nutrition info",
  },
  foodlog: {
    title: "Food Log",
    subtitle: "Track and monitor your daily nutrition intake",
  },
};

function getPageFromURL() {
  const hash = window.location.hash.replace("#", "");
  if (hash === "products") return "products";
  if (hash === "foodlog") return "foodlog";
  return "meals";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export class App {
  constructor() {
    this.el = {
      loadingOverlay: document.getElementById("app-loading-overlay"),

      sidebar: document.getElementById("sidebar"),
      sidebarOverlay: document.getElementById("sidebar-overlay"),
      headerMenuBtn: document.getElementById("header-menu-btn"),
      sidebarCloseBtn: document.getElementById("sidebar-close-btn"),
      navLinks: Array.from(document.querySelectorAll(".nav-link")),
      headerTitle: document.getElementById("header-title"),
      headerSubtitle: document.getElementById("header-subtitle"),

      // Meals page
      searchFiltersSection: document.getElementById("search-filters-section"),
      categoriesSection: document.getElementById("meal-categories-section"),
      recipesSection: document.getElementById("all-recipes-section"),
      mealDetailsSection: document.getElementById("meal-details"),
      searchInput: document.getElementById("search-input"),
      areaFilters: document.getElementById("area-filters"),
      categoriesGrid: document.getElementById("categories-grid"),
      recipesGrid: document.getElementById("recipes-grid"),
      recipesCount: document.getElementById("recipes-count"),
      gridViewBtn: document.getElementById("grid-view-btn"),
      listViewBtn: document.getElementById("list-view-btn"),
      backToMealsBtn: document.getElementById("back-to-meals-btn"),
      logMealBtn: document.getElementById("log-meal-btn"),

      heroImage: document.getElementById("hero-image"),
      heroBadges: document.getElementById("hero-badges"),
      heroTitle: document.getElementById("hero-title"),
      heroServings: document.getElementById("hero-servings"),
      heroCalories: document.getElementById("hero-calories"),
      ingredientsCount: document.getElementById("ingredients-count"),
      ingredientsList: document.getElementById("ingredients-list"),
      instructionsList: document.getElementById("instructions-list"),
      videoSection: document.getElementById("video-section"),
      videoIframe: document.getElementById("video-iframe"),

      // Product scanner page
      productsSection: document.getElementById("products-section"),
      productSearchInput: document.getElementById("product-search-input"),
      barcodeInput: document.getElementById("barcode-input"),
      searchProductBtn: document.getElementById("search-product-btn"),
      lookupBarcodeBtn: document.getElementById("lookup-barcode-btn"),
      productsGrid: document.getElementById("products-grid"),
      productsCount: document.getElementById("products-count"),
      nutriScoreFilters: Array.from(
        document.querySelectorAll(".nutri-score-filter"),
      ),
      productCategoryBtns: Array.from(
        document.querySelectorAll(".product-category-btn"),
      ),

      // Food log page
      foodlogSection: document.getElementById("foodlog-section"),
      foodlogDate: document.getElementById("foodlog-date"),
      loggedItemsList: document.getElementById("logged-items-list"),
      loggedItemsCount: document.getElementById("logged-items-count"),
      clearFoodlogBtn: document.getElementById("clear-foodlog"),
      quickLogBtns: Array.from(document.querySelectorAll(".quick-log-btn")),
      weeklyChart: document.getElementById("weekly-chart"),
    };
  }

  MEAL_EMPTY_STATE() {
    return ui.emptyStateHTML(
      "No recipes found",
      "Try searching for something else",
      "fa-search",
    );
  }

  // ---------------------------------------------------------------------------
  // Init
  // ---------------------------------------------------------------------------
  async init() {
    // style.css hides anything with the "loading" class by default; drop it
    // so the overlay is actually visible while we fetch initial data.
    this.el.loadingOverlay?.classList.remove("loading");
    this.setupNavigation();
    this.setupMealsPage();
    this.setupProductsPage();
    this.setupFoodLogPage();
    const initialPage = getPageFromURL();
    state.currentPage = initialPage;
    this.switchPage(initialPage);
    try {
      await Promise.all([this.loadCategories(), this.loadInitialRecipes()]);
    } catch (err) {
      console.error(err);
      this.el.recipesGrid.innerHTML = ui.errorStateHTML(
        "Couldn't load recipes right now.",
      );
    } finally {
      this.hideLoadingOverlay();
    }
  }

  hideLoadingOverlay() {
    if (!this.el.loadingOverlay) return;
    this.el.loadingOverlay.style.opacity = "0";
    setTimeout(() => {
      this.el.loadingOverlay.style.display = "none";
    }, 400);
  }

  // ---------------------------------------------------------------------------
  // Navigation / sidebar
  // ---------------------------------------------------------------------------
  setupNavigation() {
    this.el.navLinks.forEach((link, index) => {
      const page = ["meals", "products", "foodlog"][index];
      link.dataset.page = page;
      link.addEventListener("click", (e) => {
        e.preventDefault();
        this.switchPage(page);
        const path = page === "meals" ? "/home" : `/${page}`;
        window.history.pushState({ page }, "", path);
        this.closeMobileSidebar();
      });
    });

    this.el.headerMenuBtn?.addEventListener(
      "click",
      this.openMobileSidebar.bind(this),
    );
    this.el.sidebarCloseBtn?.addEventListener(
      "click",
      this.closeMobileSidebar.bind(this),
    );
    this.el.sidebarOverlay?.addEventListener(
      "click",
      this.closeMobileSidebar.bind(this),
    );

    // Back / Forward browser buttons
    window.addEventListener("popstate", () => {
      const page = getPageFromURL();
      this.switchPage(page);
    });
  }

  openMobileSidebar() {
    this.el.sidebar.classList.add("open");
    this.el.sidebarOverlay.classList.add("active");
  }

  closeMobileSidebar() {
    this.el.sidebar.classList.remove("open");
    this.el.sidebarOverlay.classList.remove("active");
  }

  switchPage(page) {
    state.currentPage = page;
    this.hideAllPagesExcept(page);
    this.el.navLinks.forEach((link) => {
      const active = link.dataset.page === page;
      link.classList.toggle("bg-emerald-50", active);
      link.classList.toggle("text-emerald-700", active);
      link.classList.toggle("text-gray-600", !active);
      const span = link.querySelector("span");
      span.classList.toggle("font-semibold", active);
      span.classList.toggle("font-medium", !active);
    });
    this.el.headerTitle.textContent = PAGE_META[page].title;
    this.el.headerSubtitle.textContent = PAGE_META[page].subtitle;
    if (page === "foodlog") this.renderFoodLogPage();
  }

  hideAllPagesExcept(page) {
    const mealsSections = [
      this.el.searchFiltersSection,
      this.el.categoriesSection,
      this.el.recipesSection,
    ];
    mealsSections.forEach(
      (s) => (s.style.display = page === "meals" ? "" : "none"),
    );
    this.el.mealDetailsSection.style.display = "none"; // only shown explicitly via openMealDetail
    this.el.productsSection.style.display = page === "products" ? "" : "none";
    this.el.foodlogSection.style.display = page === "foodlog" ? "" : "none";
  }

  // ---------------------------------------------------------------------------
  // Meals page
  // ---------------------------------------------------------------------------
  setupMealsPage() {
    this.el.searchInput.addEventListener(
      "input",
      debounce(this.handleSearch.bind(this), 400),
    );

    this.el.areaFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".area-filter-btn");
      if (!btn) return;
      this.setActiveAreaButton(btn);
      state.activeArea = btn.dataset.area;
      state.activeCategory = "";
      state.searchQuery = "";
      this.el.searchInput.value = "";
      this.setActiveCategoryCard(null);
      if (state.activeArea) {
        this.loadRecipesByArea(state.activeArea);
      } else {
        this.loadInitialRecipes();
      }
    });

    this.el.categoriesGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".category-card");
      if (!card) return;
      const category = card.dataset.category;
      this.setActiveCategoryCard(card);
      this.setActiveAreaButton(null);
      state.activeCategory = category;
      state.activeArea = "";
      state.searchQuery = "";
      this.el.searchInput.value = "";
      this.loadRecipesByCategory(category);
    });

    this.el.gridViewBtn.addEventListener("click", () =>
      this.setViewMode("grid"),
    );
    this.el.listViewBtn.addEventListener("click", () =>
      this.setViewMode("list"),
    );
    this.el.recipesGrid.addEventListener(
      "click",
      this.handleRecipeGridClick.bind(this),
    );
    this.el.backToMealsBtn.addEventListener(
      "click",
      this.closeMealDetail.bind(this),
    );
    this.el.logMealBtn.addEventListener(
      "click",
      this.handleLogMealClick.bind(this),
    );
  }

  async loadCategories() {
    this.el.categoriesGrid.innerHTML = ui.skeletonGridHTML(6);
    const categories = await mealdb.fetchCategories();
    state.categories = categories;
    this.el.categoriesGrid.innerHTML =
      categories.map(ui.categoryCardHTML).join("") ||
      ui.emptyStateHTML("No categories available");
  }

  async loadInitialRecipes() {
    this.el.recipesGrid.innerHTML = ui.skeletonGridHTML(8);
    const meals = await mealdb.fetchAllMeals();
    state.allMeals = meals;
    state.visibleMeals = meals;
    this.renderRecipes(meals);
  }

  async loadRecipesByCategory(category) {
    try {
      this.el.recipesGrid.innerHTML = ui.skeletonGridHTML(8);
      const meals = await mealdb.filterByCategory(category);
      const mealsWithCategory = meals.map((meal) => ({
        ...meal,
        strCategory: category,
      }));
      state.visibleMeals = mealsWithCategory;
      this.renderRecipes(
        mealsWithCategory,
        `Showing ${mealsWithCategory.length} ${category} recipes`,
      );
    } catch (err) {
      console.error(err);
      this.el.recipesGrid.innerHTML = ui.errorStateHTML(
        "Couldn't load that category.",
      );
    }
  }

  async loadRecipesByArea(area) {
    try {
      this.el.recipesGrid.innerHTML = ui.skeletonGridHTML(8);

      const meals = await mealdb.filterByArea(area);

      const mealsWithDetails = await Promise.all(
        meals.map(async (meal) => {
          const details = await mealdb.getMealById(meal.idMeal);

          return {
            ...meal,
            strArea: area,
            strCategory: details?.strCategory || "",
          };
        }),
      );

      state.visibleMeals = mealsWithDetails;

      this.renderRecipes(
        mealsWithDetails,
        `Showing ${mealsWithDetails.length} ${area} recipes`,
      );
    } catch (err) {
      console.error(err);
      this.el.recipesGrid.innerHTML = ui.errorStateHTML(
        "Couldn't load that cuisine.",
      );
    }
  }

  async handleSearch(e) {
    const query = e.target.value.trim();
    state.searchQuery = query;
    state.activeCategory = "";
    state.activeArea = "";
    this.setActiveCategoryCard(null);
    this.setActiveAreaButton(
      this.el.areaFilters.querySelector('[data-area=""]'),
    );
    if (!query) {
      this.renderRecipes(state.allMeals);
      return;
    }
    if (query.length < 2) return;
    try {
      this.el.recipesGrid.innerHTML = ui.skeletonGridHTML(8);
      const meals = await mealdb.searchMealsByName(query);
      state.visibleMeals = meals;
      this.renderRecipes(
        meals,
        `Showing ${meals.length} results for "${query}"`,
      );
    } catch (err) {
      console.error(err);
      this.el.recipesGrid.innerHTML = ui.errorStateHTML(
        "Search failed. Please try again.",
      );
    }
  }

  renderRecipes(meals, countLabel) {
    const render =
      state.viewMode === "list" ? ui.recipeListRowHTML : ui.recipeCardHTML;
    this.el.recipesGrid.innerHTML = meals.length
      ? meals.map(render).join("")
      : this.MEAL_EMPTY_STATE();
    this.el.recipesCount.textContent =
      countLabel || `Showing ${meals.length} recipes`;
  }

  setViewMode(mode) {
    state.viewMode = mode;
    const isGrid = mode === "grid";
    this.el.recipesGrid.classList.toggle("grid-cols-4", isGrid);
    this.el.recipesGrid.classList.toggle("grid-cols-2", !isGrid);

    this.el.gridViewBtn.classList.toggle("bg-white", isGrid);
    this.el.gridViewBtn.classList.toggle("shadow-sm", isGrid);
    this.el.gridViewBtn
      .querySelector("i")
      .classList.toggle("text-gray-700", isGrid);
    this.el.gridViewBtn
      .querySelector("i")
      .classList.toggle("text-gray-500", !isGrid);

    this.el.listViewBtn.classList.toggle("bg-white", !isGrid);
    this.el.listViewBtn.classList.toggle("shadow-sm", !isGrid);
    this.el.listViewBtn
      .querySelector("i")
      .classList.toggle("text-gray-700", !isGrid);
    this.el.listViewBtn
      .querySelector("i")
      .classList.toggle("text-gray-500", isGrid);

    this.renderRecipes(state.visibleMeals, this.el.recipesCount.textContent);
  }

  setActiveCategoryCard(card) {
    this.el.categoriesGrid
      .querySelectorAll(".category-card")
      .forEach((c) => c.classList.remove("ring-emerald-500"));
    card?.classList.add("ring-emerald-500");
  }

  setActiveAreaButton(btn) {
    this.el.areaFilters.querySelectorAll(".area-filter-btn").forEach((b) => {
      b.classList.remove("bg-emerald-600", "text-white");
      b.classList.add("bg-gray-100", "text-gray-700");
    });
    if (btn) {
      btn.classList.add("bg-emerald-600", "text-white");
      btn.classList.remove("bg-gray-100", "text-gray-700");
    }
  }

  handleRecipeGridClick(e) {
    const saveBtn = e.target.closest(".save-recipe-btn");
    if (saveBtn) {
      e.stopPropagation();
      const favorited = toggleFavorite(saveBtn.dataset.mealId);
      const icon = saveBtn.querySelector("i");
      icon.classList.toggle("text-red-500", favorited);
      icon.classList.toggle("text-gray-300", !favorited);
      toast(
        favorited ? "Added to favorites" : "Removed from favorites",
        "success",
      );
      return;
    }
    const card = e.target.closest(".recipe-card");
    if (card) this.openMealDetail(card.dataset.mealId);
  }

async openMealDetail(mealId) {
  try {
    const meal = await mealdb.getMealById(mealId);

    if (!meal) {
      toast("Recipe not found", "error");
      return;
    }

    state.currentMeal = meal;

    // Show details page first
    this.hideAllPagesExcept("__detail__");
    this.el.mealDetailsSection.style.display = "";

    // Render recipe + nutrition
    this.renderMealDetail(meal);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });

  } catch (err) {
    console.error(err);
    toast("Couldn't load that recipe", "error");
  }
}

  closeMealDetail() {
    this.hideAllPagesExcept("meals");
  }

renderMealDetail(meal) {
  const ingredients = mealdb.extractIngredients(meal);
  const steps = mealdb.extractInstructionSteps(meal);
  const servings = 4;

  // --------------------------------------------------
  // Log Meal Button - Loading State
  // --------------------------------------------------
  this.el.logMealBtn.disabled = true;
  this.el.logMealBtn.className =
    "flex items-center gap-2 px-6 py-3 bg-gray-300 text-gray-500 rounded-xl font-semibold cursor-not-allowed transition-all";
  this.el.logMealBtn.title = "Waiting for nutrition data...";
  this.el.logMealBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    <span>Calculating...</span>
  `;

  // --------------------------------------------------
  // Recipe Details
  // --------------------------------------------------
  this.el.heroImage.src = meal.strMealThumb;
  this.el.heroImage.alt = meal.strMeal;

  this.el.heroTitle.textContent = meal.strMeal;

  this.el.heroBadges.innerHTML = [meal.strCategory, meal.strArea]
    .filter(Boolean)
    .map(
      (label, i) =>
        `<span class="px-3 py-1 ${
          i === 0 ? "bg-emerald-500" : "bg-blue-500"
        } text-white text-sm font-semibold rounded-full">${label}</span>`,
    )
    .join("");

  this.el.heroServings.textContent = `${servings} servings`;

  this.el.ingredientsCount.textContent = `${ingredients.length} items`;

  this.el.ingredientsList.innerHTML = ingredients
    .map(ui.ingredientRowHTML)
    .join("");

  this.el.instructionsList.innerHTML = steps.length
    ? steps.map(ui.instructionStepHTML).join("")
    : `<p class="text-gray-500">
        No instructions provided for this recipe.
      </p>`;

  // --------------------------------------------------
  // YouTube
  // --------------------------------------------------
  if (meal.strYoutube) {
    this.el.videoSection.style.display = "";

    const videoId = new URL(meal.strYoutube).searchParams.get("v");

    this.el.videoIframe.src = videoId
      ? `https://www.youtube.com/embed/${videoId}`
      : "";
  } else {
    this.el.videoSection.style.display = "none";
  }

  // --------------------------------------------------
  // Nutrition Calculation
  // --------------------------------------------------
  const nutrition = estimateNutrition(ingredients.length);

  this.el.heroCalories.textContent =
    `~${nutrition.calories} cal/serving`;

  this.updateNutritionFacts(nutrition, servings);

  // --------------------------------------------------
  // Log Meal Button - Ready State
  // --------------------------------------------------
  this.el.logMealBtn.dataset.mealId = meal.idMeal;

  this.el.logMealBtn.disabled = false;

  this.el.logMealBtn.className =
    "flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all";

  this.el.logMealBtn.title = "";

  this.el.logMealBtn.innerHTML = `
    <i class="fa-solid fa-clipboard-list"></i>
    <span>Log This Meal</span>
  `;
}

  updateNutritionFacts(nutrition, servings) {
    document.getElementById("nutri-calories").textContent = nutrition.calories;
    document.getElementById("nutri-total-calories").textContent =
      `Total: ${nutrition.calories * servings} cal`;
    document.getElementById("nutri-protein").textContent =
      `${nutrition.protein}g`;
    document.getElementById("nutri-carbs").textContent = `${nutrition.carbs}g`;
    document.getElementById("nutri-fat").textContent = `${nutrition.fat}g`;
    document.getElementById("nutri-fiber").textContent = `${nutrition.fiber}g`;
    document.getElementById("nutri-sugar").textContent = `${nutrition.sugar}g`;
    document.getElementById("nutri-saturated-fat").textContent =
      `${nutrition.saturatedFat * servings}g`;
    document.getElementById("nutri-cholesterol").textContent =
      `${nutrition.cholesterol}mg`;
    document.getElementById("nutri-sodium").textContent =
      `${nutrition.sodium}mg`;
    document.getElementById("nutri-protein-bar").style.width =
      `${clampPercent(nutrition.protein, 50)}%`;
    document.getElementById("nutri-carbs-bar").style.width =
      `${clampPercent(nutrition.carbs, 250)}%`;
    document.getElementById("nutri-fat-bar").style.width =
      `${clampPercent(nutrition.fat, 65)}%`;
    document.getElementById("nutri-fiber-bar").style.width =
      `${clampPercent(nutrition.fiber, 30)}%`;
    document.getElementById("nutri-sugar-bar").style.width =
      `${clampPercent(nutrition.sugar, 50)}%`;
    document.getElementById("nutri-saturated-fat-bar").style.width =
      `${clampPercent(nutrition.saturatedFat, 50)}%`;
  }

  handleLogMealClick() {
    const meal = state.currentMeal;
    if (!meal) return;
    const ingredients = mealdb.extractIngredients(meal);
    const nutrition = estimateNutrition(ingredients.length);
    let servings = 1;
    const modal = document.createElement("div");
    modal.id = "log-meal-modal";
    modal.className =
      "fixed inset-0 z-50 bg-black/50 flex items-center justify-center";
    modal.innerHTML = `
    <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <img
          src="${escapeHtml(meal.strMealThumb)}"
          alt="${escapeHtml(meal.strMeal)}"
          class="w-16 h-16 rounded-xl object-cover"
        >
        <div>
          <h3 class="text-xl font-bold text-gray-900">
            Log This Meal
          </h3>
          <p class="text-gray-500 text-sm">
            ${escapeHtml(meal.strMeal)}
          </p>
        </div>
      </div>
      <!-- Servings -->
      <div class="mb-6">
        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Number of Servings
        </label>
        <div class="flex items-center gap-3">
          <button
            id="decrease-servings"
            class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <i class="fa-solid fa-minus text-gray-600"></i>
          </button>
          <input
            type="number"
            id="meal-servings"
            value="1"
            min="0.5"
            max="10"
            step="0.5"
            class="w-20 text-center text-xl font-bold border-2 border-gray-200 rounded-lg py-2"
          >
          <button
            id="increase-servings"
            class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <i class="fa-solid fa-plus text-gray-600"></i>
          </button>
        </div>
      </div>
      <!-- Nutrition -->
      <div class="bg-emerald-50 rounded-xl p-4 mb-6">
        <p class="text-sm text-gray-600 mb-2">
          Estimated nutrition per serving:
        </p>
        <div class="grid grid-cols-4 gap-2 text-center">
          <div>
            <p
              class="text-lg font-bold text-emerald-600"
              id="modal-calories"
            >
              ${nutrition.calories}
            </p>
            <p class="text-xs text-gray-500">
              Calories
            </p>
          </div>
          <div>
            <p
              class="text-lg font-bold text-blue-600"
              id="modal-protein"
            >
              ${nutrition.protein}g
            </p>
            <p class="text-xs text-gray-500">
              Protein
            </p>
          </div>
          <div>
            <p
              class="text-lg font-bold text-amber-600"
              id="modal-carbs"
            >
              ${nutrition.carbs}g
            </p>
            <p class="text-xs text-gray-500">
              Carbs
            </p>
          </div>
          <div>
            <p
              class="text-lg font-bold text-purple-600"
              id="modal-fat"
            >
              ${nutrition.fat}g
            </p>
            <p class="text-xs text-gray-500">
              Fat
            </p>
          </div>
        </div>
      </div>
      <!-- Buttons -->
      <div class="flex gap-3">
        <button
          id="cancel-log-meal"
          class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
        >
          Cancel
        </button>
        <button
          id="confirm-log-meal"
          class="flex-1 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-all"
        >
          <i class="fa-solid fa-clipboard-list mr-2"></i>
          Log Meal
        </button>
      </div>
    </div>
  `;
    document.body.appendChild(modal);
    const servingsInput = modal.querySelector("#meal-servings");
    const decreaseBtn = modal.querySelector("#decrease-servings");
    const increaseBtn = modal.querySelector("#increase-servings");
    const cancelBtn = modal.querySelector("#cancel-log-meal");
    const confirmBtn = modal.querySelector("#confirm-log-meal");
    function updateModalNutrition() {
      servings = Number(servingsInput.value);
      if (!servings || servings < 0.5) {
        servings = 0.5;
        servingsInput.value = 0.5;
      }
      if (servings > 10) {
        servings = 10;
        servingsInput.value = 10;
      }
      document.getElementById("modal-calories").textContent = Math.round(
        nutrition.calories * servings,
      );
      document.getElementById("modal-protein").textContent =
        `${Math.round(nutrition.protein * servings)}g`;
      document.getElementById("modal-carbs").textContent =
        `${Math.round(nutrition.carbs * servings)}g`;
      document.getElementById("modal-fat").textContent =
        `${Math.round(nutrition.fat * servings)}g`;
    }
    decreaseBtn.addEventListener("click", () => {
      let value = Number(servingsInput.value);
      if (value > 0.5) {
        value -= 0.5;
        servingsInput.value = value;
        updateModalNutrition();
      }
    });
    increaseBtn.addEventListener("click", () => {
      let value = Number(servingsInput.value);
      if (value < 10) {
        value += 0.5;
        servingsInput.value = value;
        updateModalNutrition();
      }
    });
    servingsInput.addEventListener("input", updateModalNutrition);
    cancelBtn.addEventListener("click", () => {
      modal.remove();
    });
    confirmBtn.addEventListener("click", () => {
      addFoodLogEntry({
        name: meal.strMeal,
        source: "meal",
        mealType: "meal",
        image: meal.strMealThumb,
        servings: servings,
        calories: nutrition.calories * servings,
        protein: nutrition.protein * servings,
        carbs: nutrition.carbs * servings,
        fat: nutrition.fat * servings,
        saturatedFat: nutrition.saturatedFat * servings,
      });
      modal.remove();
      window.Swal.fire({
        position: "center-center",
        icon: "success",
        title: "Meal Logged!",
        html: `
    <p>
      <strong>${escapeHtml(meal.strMeal)}</strong>
      (${servings} serving${servings === 1 ? "" : "s"})
      has been added to your daily log.
    </p>
    <p class="mt-2 font-bold text-emerald-600">
      +${Math.round(nutrition.calories * servings)} calories
    </p>
  `,
        showConfirmButton: false,
        timer: 2000,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Product scanner page
  // ---------------------------------------------------------------------------
  setupProductsPage() {
    this.el.searchProductBtn.addEventListener(
      "click",
      this.handleProductSearch.bind(this),
    );
    this.el.productSearchInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.handleProductSearch();
    });
    this.el.lookupBarcodeBtn.addEventListener(
      "click",
      this.handleBarcodeLookup.bind(this),
    );
    this.el.barcodeInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.handleBarcodeLookup();
    });
    this.el.nutriScoreFilters.forEach((btn) =>
      btn.addEventListener("click", () => {
        state.productGrade = btn.dataset.grade;
        this.setActiveNutriFilter(btn);
        this.handleProductSearch();
      }),
    );
    this.el.productCategoryBtns.forEach((btn) =>
      btn.addEventListener("click", () => {
        state.productCategory = btn.dataset.category;
        state.productQuery = "";
        this.el.productSearchInput.value = "";
        this.handleProductSearch();
      }),
    );
    this.el.productsGrid.addEventListener("click", (e) => {
      const card = e.target.closest(".product-card");
      if (card) this.openProductDetail(card.dataset.barcode);
    });
  }

  setActiveNutriFilter(activeBtn) {
    this.el.nutriScoreFilters.forEach((btn) =>
      btn.classList.remove("ring-gray-900"),
    );
    activeBtn.classList.add("ring-gray-900");
  }

  async handleProductSearch() {
    const query = this.el.productSearchInput.value.trim();
    state.productQuery = query;
    if (!query && !state.productCategory && !state.productGrade) {
      this.el.productsGrid.innerHTML = "";
      this.el.productsCount.textContent = "Search for products to see results";
      return;
    }
    try {
      this.el.productsGrid.innerHTML = ui.skeletonGridHTML(8);
      const raw = await off.searchProducts({
        query,
        category: state.productCategory,
        grade: state.productGrade,
      });
      const products = raw.map(off.normalizeProduct);
      state.products = products;
      this.renderProducts(products);
    } catch (err) {
      console.error("PRODUCT SEARCH ERROR:", err);
      this.el.productsGrid.innerHTML = ui.errorStateHTML(
        "Product search failed.",
      );
    }
  }

  async handleBarcodeLookup() {
    const barcode = this.el.barcodeInput.value.trim();
    if (!barcode) return;
    try {
      this.el.productsGrid.innerHTML = ui.skeletonGridHTML(4);
      const raw = await off.getProductByBarcode(barcode);
      if (!raw) {
        this.el.productsGrid.innerHTML = ui.emptyStateHTML(
          "No product found",
          `No match for barcode ${barcode}`,
          "fa-barcode",
        );
        this.el.productsCount.textContent = "0 results";
        return;
      }
      const product = off.normalizeProduct(raw);
      state.products = [product];
      this.renderProducts([product]);
    } catch (err) {
      console.error(err);
      this.el.productsGrid.innerHTML = ui.errorStateHTML(
        "Barcode lookup failed.",
      );
    }
  }

  renderProducts(products) {
    this.el.productsGrid.innerHTML = products.length
      ? products.map(ui.productCardHTML).join("")
      : ui.emptyStateHTML(
          "No products found",
          "Try a different search or filter",
          "fa-box-open",
        );
    this.el.productsCount.textContent = `${products.length} result${products.length === 1 ? "" : "s"}`;
  }

  openProductDetail(barcode) {
    const product = state.products.find((p) => p.barcode === barcode);
    if (!product) return;
    // Remove old modal if exists
    document.getElementById("product-detail-modal")?.remove();
    // Add Product Details Modal
    document.body.insertAdjacentHTML(
      "beforeend",
      ui.productDetailModalHTML(product),
    );
    const modal = document.getElementById("product-detail-modal");
    // Close buttons
    modal.querySelectorAll(".close-product-modal").forEach((btn) => {
      btn.addEventListener("click", () => {
        modal.remove();
      });
    });
    // Close by clicking outside
    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });
    // Log This Food
    const logBtn = modal.querySelector(".add-product-to-log");
    logBtn?.addEventListener("click", () => {
      addFoodLogEntry({
        name: product.name,
        source: "product",
        mealType: "snack",
        image: product.image || "",
        servings: 1,
        calories: product.caloriesPer100g || 0,
        protein: product.proteinPer100g || 0,
        carbs: product.carbsPer100g || 0,
        fat: product.fatPer100g || 0,
      });
      modal.remove();
      window.Swal.fire({
        position: "center",
        icon: "success",
        title: "Product Logged!",
        html: `
        <p>
          <strong>${escapeHtml(product.name)}</strong>
          has been added to your daily log.
        </p>
        <p class="mt-2 font-bold text-emerald-600">
          +${Math.round(product.caloriesPer100g || 0)} calories
        </p>
      `,
        showConfirmButton: false,
        timer: 2000,
      });
    });
  }

  openProductLogModal(product) {
    let servings = 1;

    const modal = document.createElement("div");

    modal.id = "log-product-modal";

    modal.className =
      "fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4";

    modal.innerHTML = `
    <div class="bg-white rounded-2xl p-6 max-w-md w-full mx-4">

      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">

        ${
          product.image
            ? `
              <img
                src="${escapeHtml(product.image)}"
                alt="${escapeHtml(product.name)}"
                class="w-16 h-16 rounded-xl object-cover"
              />
            `
            : `
              <div class="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center">
                <i class="fa-solid fa-box-open text-gray-300 text-2xl"></i>
              </div>
            `
        }

        <div>
          <h3 class="text-xl font-bold text-gray-900">
            Log This Product
          </h3>

          <p class="text-gray-500 text-sm">
            ${escapeHtml(product.name)}
          </p>

          ${
            product.brand
              ? `
                <p class="text-xs text-gray-400 mt-1">
                  ${escapeHtml(product.brand)}
                </p>
              `
              : ""
          }
        </div>

      </div>

      <!-- Servings -->
      <div class="mb-6">

        <label class="block text-sm font-semibold text-gray-700 mb-2">
          Number of Servings
        </label>

        <div class="flex items-center gap-3">

          <button
            id="decrease-product-servings"
            class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <i class="fa-solid fa-minus text-gray-600"></i>
          </button>

          <input
            type="number"
            id="product-servings"
            value="1"
            min="0.5"
            max="10"
            step="0.5"
            class="w-20 text-center text-xl font-bold border-2 border-gray-200 rounded-lg py-2"
          />

          <button
            id="increase-product-servings"
            class="w-10 h-10 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
          >
            <i class="fa-solid fa-plus text-gray-600"></i>
          </button>

        </div>
      </div>

      <!-- Nutrition -->
      <div class="bg-emerald-50 rounded-xl p-4 mb-6">

        <p class="text-sm text-gray-600 mb-2">
          Estimated nutrition per serving:
        </p>

        <div class="grid grid-cols-4 gap-2 text-center">

          <div>
            <p
              id="product-modal-calories"
              class="text-lg font-bold text-emerald-600"
            >
              ${Math.round(product.caloriesPer100g || 0)}
            </p>

            <p class="text-xs text-gray-500">
              Calories
            </p>
          </div>

          <div>
            <p
              id="product-modal-protein"
              class="text-lg font-bold text-blue-600"
            >
              ${Math.round(product.proteinPer100g || 0)}g
            </p>

            <p class="text-xs text-gray-500">
              Protein
            </p>
          </div>

          <div>
            <p
              id="product-modal-carbs"
              class="text-lg font-bold text-amber-600"
            >
              ${Math.round(product.carbsPer100g || 0)}g
            </p>

            <p class="text-xs text-gray-500">
              Carbs
            </p>
          </div>

          <div>
            <p
              id="product-modal-fat"
              class="text-lg font-bold text-purple-600"
            >
              ${Math.round(product.fatPer100g || 0)}g
            </p>

            <p class="text-xs text-gray-500">
              Fat
            </p>
          </div>

        </div>
      </div>

      <!-- Actions -->
      <div class="flex gap-3">

        <button
          id="cancel-log-product"
          class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all"
        >
          Cancel
        </button>

        <button
          id="confirm-log-product"
          class="flex-1 py-3 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-all"
        >
          <i class="fa-solid fa-clipboard-list mr-2"></i>
          Log Product
        </button>

      </div>

    </div>
  `;

    document.body.appendChild(modal);

    const servingsInput = modal.querySelector("#product-servings");
    const decreaseBtn = modal.querySelector("#decrease-product-servings");
    const increaseBtn = modal.querySelector("#increase-product-servings");
    const cancelBtn = modal.querySelector("#cancel-log-product");
    const confirmBtn = modal.querySelector("#confirm-log-product");

    // --------------------------------------------------
    // Update nutrition based on servings
    // --------------------------------------------------

    const updateProductNutrition = () => {
      let value = Number(servingsInput.value);

      if (!value || value < 0.5) {
        value = 0.5;
      }

      if (value > 10) {
        value = 10;
      }

      servings = value;

      servingsInput.value = value;

      modal.querySelector("#product-modal-calories").textContent = Math.round(
        (product.caloriesPer100g || 0) * servings,
      );

      modal.querySelector("#product-modal-protein").textContent = `${Math.round(
        (product.proteinPer100g || 0) * servings,
      )}g`;

      modal.querySelector("#product-modal-carbs").textContent = `${Math.round(
        (product.carbsPer100g || 0) * servings,
      )}g`;

      modal.querySelector("#product-modal-fat").textContent = `${Math.round(
        (product.fatPer100g || 0) * servings,
      )}g`;
    };

    // --------------------------------------------------
    // Decrease servings
    // --------------------------------------------------

    decreaseBtn.addEventListener("click", () => {
      const value = Number(servingsInput.value);

      if (value > 0.5) {
        servingsInput.value = value - 0.5;
        updateProductNutrition();
      }
    });

    // --------------------------------------------------
    // Increase servings
    // --------------------------------------------------

    increaseBtn.addEventListener("click", () => {
      const value = Number(servingsInput.value);

      if (value < 10) {
        servingsInput.value = value + 0.5;
        updateProductNutrition();
      }
    });

    // --------------------------------------------------
    // Manual input
    // --------------------------------------------------

    servingsInput.addEventListener("input", updateProductNutrition);

    // --------------------------------------------------
    // Close
    // --------------------------------------------------

    cancelBtn.addEventListener("click", () => {
      modal.remove();
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
      }
    });

    // --------------------------------------------------
    // Confirm
    // --------------------------------------------------

    confirmBtn.addEventListener("click", () => {
      addFoodLogEntry({
        name: product.name,
        source: "product",
        mealType: "snack",

        image: product.image || "",

        servings,

        calories: (product.caloriesPer100g || 0) * servings,

        protein: (product.proteinPer100g || 0) * servings,

        carbs: (product.carbsPer100g || 0) * servings,

        fat: (product.fatPer100g || 0) * servings,
      });

      modal.remove();

      window.Swal.fire({
        position: "center",
        icon: "success",
        title: "Product Logged!",
        html: `
        <p>
          <strong>${escapeHtml(product.name)}</strong>
          (${servings}
          serving${servings === 1 ? "" : "s"})
          has been added to your daily log.
        </p>

        <p class="mt-2 font-bold text-emerald-600">
          +${Math.round((product.caloriesPer100g || 0) * servings)}
          calories
        </p>
      `,
        showConfirmButton: false,
        timer: 2000,
      });
    });
  }

  // ---------------------------------------------------------------------------
  // Food log page
  // ---------------------------------------------------------------------------
  setupFoodLogPage() {
    this.el.clearFoodlogBtn.addEventListener("click", () => {
      if (!getTodayEntries().length) return;
      if (window.Swal) {
        window.Swal.fire({
          title: "Clear today's log?",
          text: "This can't be undone.",
          icon: "warning",
          showCancelButton: true,
          confirmButtonText: "Yes, clear it!",
          confirmButtonColor: "#dc2626",
        }).then((r) => {
          if (r.isConfirmed) {
            clearTodayFoodLog();
            this.renderFoodLogPage();
            toast("Food log cleared", "success");
          }
        });
      } else if (confirm("Clear today's log?")) {
        clearTodayFoodLog();
        this.renderFoodLogPage();
      }
    });
    this.el.loggedItemsList.addEventListener("click", (e) => {
      const btn = e.target.closest(".remove-entry-btn");
      if (!btn) return;
      removeFoodLogEntry(btn.dataset.entryId);
      this.renderFoodLogPage();
      // Toast Notification
      const notification = document.createElement("div");
      notification.className =
        "fixed bottom-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 toast-notification opacity-0 translate-y-2 transition-all duration-300";
      notification.textContent = "Item removed from log";
      document.body.appendChild(notification);
      // Fade In
      requestAnimationFrame(() => {
        notification.classList.remove("opacity-0", "translate-y-2");
        notification.classList.add("opacity-100", "translate-y-0");
      });
      // Fade Out after 2 seconds
      setTimeout(() => {
        notification.classList.remove("opacity-100", "translate-y-0");
        notification.classList.add("opacity-0", "translate-y-2");
        // Remove after animation
        setTimeout(() => {
          notification.remove();
        }, 2000);
      }, 2000);
    });
    this.el.quickLogBtns.forEach((btn) =>
      btn.addEventListener("click", () => {
        const action = btn.dataset.action;
        if (action === "log-meal") {
          this.switchPage("meals");
        } else if (action === "scan-product") {
          this.switchPage("products");
        } else if (action === "custom-entry") {
          this.openCustomEntryDialog();
        }
      }),
    );
  }

  openCustomEntryDialog() {
    if (!window.Swal) return;
    window.Swal.fire({
      title: "Custom Food Entry",
      html: `
      <input id="swal-food-name" class="swal2-input" placeholder="Food name">
      <input id="swal-food-cal" type="number" min="0" class="swal2-input" placeholder="Calories">
      <input id="swal-food-protein" type="number" min="0" class="swal2-input" placeholder="Protein (g)">
      <input id="swal-food-carbs" type="number" min="0" class="swal2-input" placeholder="Carbs (g)">
      <input id="swal-food-fat" type="number" min="0" class="swal2-input" placeholder="Fat (g)">
    `,
      focusConfirm: false,
      confirmButtonText: "Add entry",
      confirmButtonColor: "#059669",
      showCancelButton: true,
      preConfirm: () => {
        const name = document.getElementById("swal-food-name").value.trim();
        const calories =
          Number(document.getElementById("swal-food-cal").value) || 0;
        if (!name || !calories) {
          window.Swal.showValidationMessage("Name and calories are required");
          return false;
        }
        return {
          name,
          calories,
          protein:
            Number(document.getElementById("swal-food-protein").value) || 0,
          carbs: Number(document.getElementById("swal-food-carbs").value) || 0,
          fat: Number(document.getElementById("swal-food-fat").value) || 0,
        };
      },
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        addFoodLogEntry({
          ...result.value,
          source: "custom",
          mealType: "snack",
        });
        this.renderFoodLogPage();
        toast(`Logged "${result.value.name}"`, "success");
      }
    });
  }

  renderFoodLogPage() {
    this.el.foodlogDate.textContent = new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
    const totals = getTodayTotals();
    this.updateProgress(
      "calories",
      totals.calories,
      state.goals.calories,
      " kcal",
    );
    this.updateProgress("protein", totals.protein, state.goals.protein, " g");
    this.updateProgress("carbs", totals.carbs, state.goals.carbs, " g");
    this.updateProgress("fat", totals.fat, state.goals.fat, " g");
    const entries = getTodayEntries();
    this.el.loggedItemsCount.textContent = `Logged Items (${entries.length})`;
    this.el.clearFoodlogBtn.style.display = entries.length ? "" : "none";
    this.el.loggedItemsList.innerHTML = entries.length
      ? [...entries].reverse().map(ui.loggedItemHTML).join("")
      : `
      <div class="text-center py-8 text-gray-500">
        <i class="fa-solid fa-utensils text-4xl mb-3 text-gray-300"></i>
        <p class="font-medium">No meals logged today</p>
        <p class="text-sm">Add meals from the Meals page or scan products</p>
      </div>`;
    this.renderWeeklyChart();
    this.renderWeeklyStats();
  }

  updateProgress(key, value, goal, unit) {
    const rounded = Math.round(value);
    const percent = clampPercent(rounded, goal);
    // Current value
    const currentElement = document.getElementById(`progress-${key}-current`);
    // Percentage
    const percentElement = document.getElementById(`progress-${key}-percent`);
    // Goal
    const labelElement = document.getElementById(`progress-${key}-label`);
    // Progress bar
    const barElement = document.getElementById(`progress-${key}-bar`);
    // ------------------------------------------
    // Normal / Danger colors
    // ------------------------------------------
    const isExceeded = rounded >= goal;
    const colors = {
      calories: {
        normal: "emerald",
      },
      protein: {
        normal: "blue",
      },
      carbs: {
        normal: "amber",
      },
      fat: {
        normal: "purple",
      },
    };
    const normalColor = colors[key]?.normal || "emerald";
    if (isExceeded) {
      // Percentage → Red
      percentElement?.classList.remove(`text-${normalColor}-600`);
      percentElement?.classList.add("text-red-500");
      // Current value → Red
      currentElement?.classList.remove(`text-${normalColor}-600`);
      currentElement?.classList.add("text-red-600");
      // Progress bar → Red
      barElement?.classList.remove(`bg-${normalColor}-500`);
      barElement?.classList.add("bg-red-500");
    } else {
      // Percentage → Normal
      percentElement?.classList.remove("text-red-500");
      percentElement?.classList.add(`text-${normalColor}-600`);
      // Current value → Normal
      currentElement?.classList.remove("text-red-600");
      currentElement?.classList.add(`text-${normalColor}-600`);
      // Progress bar → Normal
      barElement?.classList.remove("bg-red-500");
      barElement?.classList.add(`bg-${normalColor}-500`);
    }

    // ------------------------------------------
    // Update values
    // ------------------------------------------
    if (currentElement) {
      currentElement.textContent = `${rounded}${unit}`;
    }
    if (percentElement) {
      percentElement.textContent = `${percent}%`;
    }
    if (labelElement) {
      labelElement.textContent = `/ ${goal}${unit}`;
    }
    if (barElement) {
      barElement.style.width = `${percent}%`;
    }
  }

  renderWeeklyChart() {
    if (!this.el.weeklyChart) return;
    const days = getWeeklyCalories();
    const today = new Date();
    const todayDate = today.toISOString().split("T")[0];
    this.el.weeklyChart.innerHTML = days
      .map((day) => {
        const isToday = day.date === todayDate;
        const dayNumber = new Date(day.date).getDate();
        const dayName = new Date(day.date).toLocaleDateString("en-US", {
          weekday: "short",
        });
        return `
        <div
          class="text-center rounded-xl p-2 ${isToday ? "bg-indigo-100" : ""}"
        >
          <p class="text-xs text-gray-500 mb-1">
            ${dayName}
          </p>
          <p class="text-sm font-medium text-gray-900">
            ${dayNumber}
          </p>
          <div
            class="mt-2 ${
              day.calories > 0 ? "text-emerald-600" : "text-gray-300"
            }"
          >
            <p class="text-lg font-bold">
              ${Math.round(day.calories)}
            </p>
            <p class="text-xs">
              kcal
            </p>
          </div>
        </div>
      `;
      })
      .join("");
  }

  renderWeeklyStats() {
  const days = getWeeklyCalories();
  // Weekly Average
  const totalCalories = days.reduce(
    (sum, day) => sum + day.calories,
    0
  );
  const weeklyAverage = Math.round(totalCalories / days.length);
  // Total Items This Week
  const totalItems = days.reduce((count, day) => {
    const entries = state.foodlog[day.date] || [];
    return count + entries.length;
  }, 0);
  // Days On Goal
  const goal = state.goals.calories;
  const daysOnGoal = days.filter(
    (day) => day.calories <= goal && day.calories > 0
  ).length;
  // Update UI
  const averageElement = document.getElementById("weekly-average");
  const itemsElement = document.getElementById("weekly-items");
  const goalElement = document.getElementById("days-on-goal");
  if (averageElement) {
    averageElement.textContent = `${weeklyAverage} kcal`;
  }
  if (itemsElement) {
    itemsElement.textContent = `${totalItems} ${
      totalItems === 1 ? "item" : "items"
    }`;
  }
  if (goalElement) {
    goalElement.textContent = `${daysOnGoal} / 7`;
  }
}
}

// ---------------------------------------------------------------------------
// NOTE: this duplicate of OpenFoodFacts' searchProducts was already present
// (and already dead/unused - it references an undefined SEARCH_URL) in the
// original procedural file. Kept exactly as-is, unchanged, so behavior stays
// identical.
export async function searchProducts({
  query = "",
  category = "",
  grade = "",
  pageSize = 24,
} = {}) {
  const params = new URLSearchParams({
    search_simple: "1",
    action: "process",
    json: "1",
    page: "1",
    page_size: String(pageSize),
  });
  if (query.trim()) {
    params.set("search_terms", query.trim());
  }
  if (category) {
    params.set("tagtype_0", "categories");
    params.set("tag_contains_0", "contains");
    params.set("tag_0", category);
  }
  if (grade) {
    params.set("nutrition_grades_tags", grade.toLowerCase());
  }
  const url = `${SEARCH_URL}?${params.toString()}`;
  console.log("OpenFoodFacts URL:", url);
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `OpenFoodFacts search failed: ${res.status} ${res.statusText}`,
    );
  }
  const data = await res.json();
  console.log("OpenFoodFacts response:", data);
  return (data.products || []).filter((product) => product.product_name);
}

// ---------------------------------------------------------------------------
const app = new App();
document.addEventListener("DOMContentLoaded", () => app.init());
