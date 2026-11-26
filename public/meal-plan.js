(function () {
    const bookmarksKey = 'recipe-bookmarks-v1';
    const plansKey = 'recipe-meal-plans-v1';
    const weekdays = ['月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日', '日曜日'];
    const meals = [
        { key: 'breakfast', label: '朝食' },
        { key: 'lunch', label: '昼食' },
        { key: 'dinner', label: '夕食' }
    ];

    const grid = document.getElementById('mealPlanGrid');
    const weekRange = document.getElementById('weekRange');
    const plannedCount = document.getElementById('plannedCount');
    const noSavedRecipes = document.getElementById('noSavedRecipes');
    const addPlanToShoppingButton = document.getElementById('addPlanToShoppingButton');
    const clearWeekButton = document.getElementById('clearWeekButton');
    const status = document.getElementById('status');
    const savedNavCount = document.getElementById('savedNavCount');
    const shoppingNavCount = document.getElementById('shoppingNavCount');
    let bookmarks = loadBookmarks();
    let plans = loadPlans();
    let currentWeek = getWeekStart(new Date());

    document.getElementById('previousWeekButton').addEventListener('click', () => changeWeek(-7));
    document.getElementById('nextWeekButton').addEventListener('click', () => changeWeek(7));
    document.getElementById('currentWeekButton').addEventListener('click', () => {
        currentWeek = getWeekStart(new Date());
        renderWeek();
    });
    addPlanToShoppingButton.addEventListener('click', addWeekToShoppingList);
    clearWeekButton.addEventListener('click', clearWeek);

    window.addEventListener('storage', (event) => {
        if (event.key === bookmarksKey) {
            bookmarks = loadBookmarks();
            renderWeek();
            renderNavCounts();
        }
        if (event.key === plansKey) {
            plans = loadPlans();
            renderWeek();
        }
        if (event.key === RecipeShoppingList.key) renderNavCounts();
    });

    renderWeek();
    renderNavCounts();

    function changeWeek(days) {
        currentWeek.setDate(currentWeek.getDate() + days);
        renderWeek();
    }

    function renderWeek() {
        const key = dateKey(currentWeek);
        const slots = plans[key]?.slots || {};
        const endOfWeek = new Date(currentWeek);
        endOfWeek.setDate(endOfWeek.getDate() + 6);
        weekRange.textContent = formatWeekRange(currentWeek, endOfWeek);
        grid.replaceChildren();

        let assignedCount = 0;
        weekdays.forEach((weekday, dayIndex) => {
            const date = new Date(currentWeek);
            date.setDate(date.getDate() + dayIndex);
            const dayCard = document.createElement('article');
            dayCard.className = 'meal-day-card';

            const heading = document.createElement('h3');
            heading.className = 'meal-day-heading';
            heading.textContent = `${weekday}・${date.getMonth() + 1}/${date.getDate()}`;
            dayCard.appendChild(heading);

            meals.forEach((meal) => {
                const slotId = `day-${dayIndex}-${meal.key}`;
                const savedSlot = slots[slotId];
                if (savedSlot?.recipe) assignedCount += 1;

                const field = document.createElement('div');
                field.className = 'meal-slot';
                const label = document.createElement('label');
                label.htmlFor = `${slotId}-select`;
                label.textContent = meal.label;

                const select = document.createElement('select');
                select.id = `${slotId}-select`;
                select.setAttribute('aria-label', `${weekday}の${meal.label}`);
                const emptyOption = document.createElement('option');
                emptyOption.value = '';
                emptyOption.textContent = 'レシピを選択';
                select.appendChild(emptyOption);

                bookmarks.forEach((bookmark) => {
                    const option = document.createElement('option');
                    option.value = bookmark.key;
                    option.textContent = `${bookmark.recipe.name || 'おすすめレシピ'}${bookmark.genre ? `（${bookmark.genre}）` : ''}`;
                    select.appendChild(option);
                });

                if (savedSlot?.key && !bookmarks.some((bookmark) => bookmark.key === savedSlot.key)) {
                    const orphanOption = document.createElement('option');
                    orphanOption.value = savedSlot.key;
                    orphanOption.textContent = `${savedSlot.name || '保存したレシピ'}（マイリスト外）`;
                    select.appendChild(orphanOption);
                }

                select.value = savedSlot?.key || '';
                select.addEventListener('change', () => saveSlot(key, slotId, select.value));
                field.append(label, select);
                dayCard.appendChild(field);
            });

            grid.appendChild(dayCard);
        });

        plannedCount.textContent = `${assignedCount}/21枠`;
        noSavedRecipes.hidden = bookmarks.length > 0;
        addPlanToShoppingButton.disabled = assignedCount === 0;
        clearWeekButton.disabled = assignedCount === 0;
    }

    function saveSlot(weekKey, slotId, bookmarkKey) {
        const nextPlans = { ...plans };
        const nextSlots = { ...(nextPlans[weekKey]?.slots || {}) };

        if (!bookmarkKey) {
            delete nextSlots[slotId];
        } else {
            const bookmark = bookmarks.find((item) => item.key === bookmarkKey);
            if (!bookmark) return;
            nextSlots[slotId] = {
                key: bookmark.key,
                name: bookmark.recipe.name || 'おすすめレシピ',
                recipe: bookmark.recipe
            };
        }

        nextPlans[weekKey] = { slots: nextSlots };
        if (!storePlans(nextPlans)) {
            showStatus('献立を保存できませんでした。ブラウザーの保存設定をご確認ください。');
            renderWeek();
            return;
        }
        hideStatus();
    }

    function addWeekToShoppingList() {
        const slots = plans[dateKey(currentWeek)]?.slots || {};
        const uniqueRecipes = new Map();
        Object.values(slots).forEach((slot) => {
            if (slot?.recipe && Array.isArray(slot.recipe.ingredients)) {
                uniqueRecipes.set(slot.key || slot.name, slot.recipe);
            }
        });
        const recipes = [...uniqueRecipes.values()];
        if (!recipes.length) return;

        const result = RecipeShoppingList.addRecipes(recipes);
        if (!result.ok) {
            showStatus('買い物リストに保存できませんでした。ブラウザーの保存設定をご確認ください。');
            return;
        }
        renderNavCounts();
        showStatus(result.added
            ? `今週の献立から材料を${result.added}件、買い物リストに追加しました。`
            : '今週の献立の材料は、すでに買い物リストにあります。');
    }

    function clearWeek() {
        const key = dateKey(currentWeek);
        if (!plans[key] || !window.confirm('表示中の週の献立をすべて消しますか？')) return;
        const nextPlans = { ...plans };
        delete nextPlans[key];
        if (!storePlans(nextPlans)) {
            showStatus('献立を更新できませんでした。ブラウザーの保存設定をご確認ください。');
            return;
        }
        showStatus('表示中の週の献立をクリアしました。');
    }

    function storePlans(nextPlans) {
        try {
            localStorage.setItem(plansKey, JSON.stringify(nextPlans));
            plans = nextPlans;
            renderWeek();
            return true;
        } catch {
            return false;
        }
    }

    function loadPlans() {
        try {
            const saved = JSON.parse(localStorage.getItem(plansKey) || '{}');
            return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
        } catch {
            return {};
        }
    }

    function loadBookmarks() {
        try {
            const saved = JSON.parse(localStorage.getItem(bookmarksKey) || '[]');
            return Array.isArray(saved)
                ? saved.filter((item) => item && item.recipe && typeof item.key === 'string')
                : [];
        } catch {
            return [];
        }
    }

    function renderNavCounts() {
        savedNavCount.textContent = String(bookmarks.length);
        shoppingNavCount.textContent = String(RecipeShoppingList.countPending());
    }

    function getWeekStart(date) {
        const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
        return monday;
    }

    function dateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    function formatWeekRange(start, end) {
        const startLabel = `${start.getFullYear()}年${start.getMonth() + 1}月${start.getDate()}日`;
        const endLabel = start.getFullYear() === end.getFullYear()
            ? `${end.getMonth() + 1}月${end.getDate()}日`
            : `${end.getFullYear()}年${end.getMonth() + 1}月${end.getDate()}日`;
        return `${startLabel} 〜 ${endLabel}`;
    }

    function showStatus(message) {
        status.textContent = message;
        status.hidden = false;
    }

    function hideStatus() {
        status.hidden = true;
    }
})();
