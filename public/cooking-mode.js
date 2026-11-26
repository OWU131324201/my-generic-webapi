(function () {
    let dialog;
    let title;
    let progressLabel;
    let progress;
    let stepText;
    let previousButton;
    let nextButton;
    let timerDetails;
    let timerMinutesInput;
    let timerDisplay;
    let timerToggleButton;
    let timerStatus;
    let steps = [];
    let currentStep = 0;
    let returnFocus = null;
    let timerInterval = null;
    let timerDeadline = 0;
    let remainingSeconds = 300;

    function createDialog() {
        if (dialog) return;

        dialog = document.createElement('dialog');
        dialog.className = 'cooking-dialog';
        dialog.setAttribute('aria-labelledby', 'cookingModeTitle');

        const panel = document.createElement('div');
        panel.className = 'cooking-mode-panel';

        const header = document.createElement('header');
        header.className = 'cooking-dialog-header';
        title = document.createElement('h2');
        title.id = 'cookingModeTitle';
        title.textContent = '調理モード';

        const closeButton = document.createElement('button');
        closeButton.type = 'button';
        closeButton.className = 'cooking-close-button';
        closeButton.textContent = '閉じる';
        closeButton.setAttribute('aria-label', '調理モードを閉じる');
        closeButton.addEventListener('click', closeDialog);
        header.append(title, closeButton);

        const content = document.createElement('section');
        content.className = 'cooking-step-content';
        progressLabel = document.createElement('p');
        progressLabel.className = 'cooking-progress-label';
        progress = document.createElement('progress');
        progress.className = 'cooking-progress';
        progress.setAttribute('aria-label', '調理の進捗');
        stepText = document.createElement('p');
        stepText.className = 'cooking-step-text';
        stepText.setAttribute('aria-live', 'polite');

        timerDetails = document.createElement('details');
        timerDetails.className = 'cooking-timer';
        const timerSummary = document.createElement('summary');
        timerSummary.textContent = '⏱ タイマーを使う';

        const timerControls = document.createElement('div');
        timerControls.className = 'cooking-timer-controls';
        const timerLabel = document.createElement('label');
        timerLabel.className = 'cooking-timer-duration';
        timerLabel.textContent = '分数';
        timerMinutesInput = document.createElement('input');
        timerMinutesInput.type = 'number';
        timerMinutesInput.min = '1';
        timerMinutesInput.max = '180';
        timerMinutesInput.step = '1';
        timerMinutesInput.value = '5';
        timerMinutesInput.setAttribute('inputmode', 'numeric');
        timerMinutesInput.setAttribute('aria-label', 'タイマーの分数（1〜180分）');
        timerLabel.appendChild(timerMinutesInput);

        timerDisplay = document.createElement('output');
        timerDisplay.className = 'cooking-timer-display';
        timerDisplay.setAttribute('aria-label', '残り時間');

        const timerButtons = document.createElement('div');
        timerButtons.className = 'cooking-timer-buttons';
        timerToggleButton = document.createElement('button');
        timerToggleButton.type = 'button';
        timerToggleButton.className = 'cooking-timer-button is-primary';
        timerToggleButton.addEventListener('click', toggleTimer);
        const timerResetButton = document.createElement('button');
        timerResetButton.type = 'button';
        timerResetButton.className = 'cooking-timer-button';
        timerResetButton.textContent = 'リセット';
        timerResetButton.addEventListener('click', () => resetTimer(true));
        timerButtons.append(timerToggleButton, timerResetButton);
        timerControls.append(timerLabel, timerDisplay, timerButtons);

        timerStatus = document.createElement('p');
        timerStatus.className = 'cooking-timer-status';
        timerStatus.setAttribute('role', 'status');
        timerStatus.setAttribute('aria-live', 'assertive');
        timerDetails.append(timerSummary, timerControls, timerStatus);
        timerMinutesInput.addEventListener('input', () => {
            if (timerInterval) return;
            const minutes = Number(timerMinutesInput.value);
            if (Number.isInteger(minutes) && minutes >= 1 && minutes <= 180) {
                remainingSeconds = minutes * 60;
                timerStatus.textContent = '';
                timerToggleButton.textContent = '開始';
                renderTimer();
            }
        });

        content.append(progressLabel, progress, stepText, timerDetails);

        const controls = document.createElement('footer');
        controls.className = 'cooking-controls';
        previousButton = document.createElement('button');
        previousButton.type = 'button';
        previousButton.className = 'cooking-control-button cooking-previous-button';
        previousButton.textContent = '← 前へ';
        previousButton.addEventListener('click', () => {
            if (currentStep > 0) {
                currentStep -= 1;
                renderStep();
            }
        });

        nextButton = document.createElement('button');
        nextButton.type = 'button';
        nextButton.className = 'cooking-control-button cooking-next-button';
        nextButton.addEventListener('click', () => {
            if (currentStep < steps.length - 1) {
                currentStep += 1;
                renderStep();
            } else {
                closeDialog();
            }
        });
        controls.append(previousButton, nextButton);

        panel.append(header, content, controls);
        dialog.appendChild(panel);
        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) closeDialog();
        });
        dialog.addEventListener('close', () => {
            resetTimer(false);
            timerDetails.open = false;
            const trigger = returnFocus;
            returnFocus = null;
            if (trigger?.isConnected) trigger.focus();
        });
        document.body.appendChild(dialog);
    }

    function open(recipe, trigger) {
        steps = Array.isArray(recipe?.steps)
            ? recipe.steps.map((step) => String(step).trim()).filter(Boolean)
            : [];
        if (steps.length === 0) return;

        createDialog();
        if (dialog.open) dialog.close();
        returnFocus = trigger || document.activeElement;
        currentStep = 0;
        title.textContent = recipe.name || '調理モード';
        resetTimer(false);
        timerDetails.open = false;
        renderStep();
        dialog.showModal();
        dialog.querySelector('.cooking-close-button').focus();
    }

    function renderStep() {
        progress.max = steps.length;
        progress.value = currentStep + 1;
        progressLabel.textContent = `${currentStep + 1} / ${steps.length} 手順`;
        stepText.textContent = steps[currentStep];
        previousButton.disabled = currentStep === 0;
        nextButton.textContent = currentStep === steps.length - 1 ? '調理完了' : '次へ →';
    }

    function toggleTimer() {
        if (timerInterval) {
            remainingSeconds = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
            clearInterval(timerInterval);
            timerInterval = null;
            timerMinutesInput.disabled = false;
            timerToggleButton.textContent = remainingSeconds > 0 ? '再開' : '開始';
            timerStatus.textContent = '一時停止中です。';
            renderTimer();
            return;
        }

        if (remainingSeconds <= 0) {
            const minutes = Number(timerMinutesInput.value);
            if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
                timerStatus.textContent = '1〜180分で設定してください。';
                timerMinutesInput.focus();
                return;
            }
            remainingSeconds = minutes * 60;
        }

        timerDeadline = Date.now() + remainingSeconds * 1000;
        timerMinutesInput.disabled = true;
        timerToggleButton.textContent = '一時停止';
        timerStatus.textContent = 'タイマーを開始しました。';
        timerInterval = setInterval(updateTimer, 250);
        updateTimer();
    }

    function updateTimer() {
        remainingSeconds = Math.max(0, Math.ceil((timerDeadline - Date.now()) / 1000));
        renderTimer();
        if (remainingSeconds === 0) {
            clearInterval(timerInterval);
            timerInterval = null;
            timerMinutesInput.disabled = false;
            timerToggleButton.textContent = 'もう一度';
            timerStatus.textContent = '時間になりました。';
        }
    }

    function resetTimer(announce) {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = null;
        timerDeadline = 0;
        if (timerMinutesInput) timerMinutesInput.disabled = false;
        let minutes = Number(timerMinutesInput?.value || 5);
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) {
            minutes = 5;
            if (timerMinutesInput) timerMinutesInput.value = '5';
        }
        remainingSeconds = minutes * 60;
        if (timerToggleButton) timerToggleButton.textContent = '開始';
        if (timerStatus) timerStatus.textContent = announce ? 'タイマーをリセットしました。' : '';
        renderTimer();
    }

    function renderTimer() {
        if (!timerDisplay) return;
        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        timerDisplay.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function closeDialog() {
        if (dialog?.open) dialog.close();
    }

    window.CookingMode = { open };
})();
