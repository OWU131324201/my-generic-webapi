(function () {
    const key = 'recipe-shopping-list-v1';

    function load() {
        try {
            const saved = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(saved)
                ? saved.filter((item) => item && typeof item.text === 'string').map((item) => ({
                    id: typeof item.id === 'string' ? item.id : createId(),
                    text: item.text,
                    checked: item.checked === true,
                    recipes: Array.isArray(item.recipes) ? item.recipes.filter((name) => typeof name === 'string') : []
                }))
                : [];
        } catch {
            return [];
        }
    }

    function save(items) {
        try {
            localStorage.setItem(key, JSON.stringify(items));
            return true;
        } catch {
            return false;
        }
    }

    function createItem(text, recipes = []) {
        return { id: createId(), text: String(text).trim(), checked: false, recipes };
    }

    function addRecipe(recipe) {
        return addRecipes([recipe]);
    }

    function addRecipes(recipes) {
        const items = load();
        let added = 0;
        let changed = false;

        (Array.isArray(recipes) ? recipes : []).forEach((recipe) => {
            const recipeName = String(recipe?.name || 'レシピ').trim();
            const ingredients = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];

            ingredients.forEach((ingredient) => {
                const text = String(ingredient).trim();
                if (!text) return;

                const existing = items.find((item) => item.text.toLocaleLowerCase('ja') === text.toLocaleLowerCase('ja'));
                if (existing) {
                    if (!existing.recipes.includes(recipeName)) {
                        existing.recipes.push(recipeName);
                        changed = true;
                    }
                    return;
                }

                items.unshift(createItem(text, [recipeName]));
                added += 1;
                changed = true;
            });
        });

        return {
            ok: !changed || save(items),
            added,
            count: items.length
        };
    }

    function countPending() {
        return load().filter((item) => !item.checked).length;
    }

    function createId() {
        return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    }

    window.RecipeShoppingList = { key, load, save, createItem, countPending, addRecipe, addRecipes };
})();
