(function () {
  const core = window.BudgetCore || {};
  const sanitizeFloat = core.sanitizeFloat || function (value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  };
  const sanitizeInt = core.sanitizeInt || function (value, min) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n < min) return min;
    return n;
  };
  const clampPercent = core.clampPercent || function (value) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  };
  const clampProgress = core.clampProgress || function (value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
  };

  const pageMarker = document.getElementById("incomeRows");
  if (!pageMarker) return;

  const STORAGE_KEY = "family_budget_calculator_ru_rub_v3";

  const defaultState = {
    incomes: [
      { id: crypto.randomUUID(), title: "Зарплата", amount: 80000 },
      { id: crypto.randomUUID(), title: "Дополнительный доход", amount: 10000 }
    ],
    expenses: [
      { id: crypto.randomUUID(), title: "Аренда / Ипотека", amount: 30000 },
      { id: crypto.randomUUID(), title: "Продукты", amount: 18000 },
      { id: crypto.randomUUID(), title: "Транспорт", amount: 5000 }
    ],
    family: { adults: 2, children: 1 },
    period: "month",
    targets: { minPercent: 10, maxPercent: 20 }
  };

  let state = loadState();

  const incomeRowsEl = document.getElementById("incomeRows");
  const expenseRowsEl = document.getElementById("expenseRows");
  const addIncomeBtn = document.getElementById("addIncomeBtn");
  const addExpenseBtn = document.getElementById("addExpenseBtn");
  const resetBtn = document.getElementById("resetBtn");
  const adultsCountEl = document.getElementById("adultsCount");
  const childrenCountEl = document.getElementById("childrenCount");
  const periodSelectEl = document.getElementById("periodSelect");
  const targetMinPercentEl = document.getElementById("targetMinPercent");
  const targetMaxPercentEl = document.getElementById("targetMaxPercent");
  const totalIncomeEl = document.getElementById("totalIncome");
  const totalExpenseEl = document.getElementById("totalExpense");
  const balanceEl = document.getElementById("balance");
  const savingsRateEl = document.getElementById("savingsRate");
  const perPersonEl = document.getElementById("perPerson");
  const expensePerPersonEl = document.getElementById("expensePerPerson");
  const targetMinAmountEl = document.getElementById("targetMinAmount");
  const targetMaxAmountEl = document.getElementById("targetMaxAmount");
  const targetMinProgressTextEl = document.getElementById("targetMinProgressText");
  const targetMaxProgressTextEl = document.getElementById("targetMaxProgressText");
  const targetMinProgressLabelEl = document.getElementById("targetMinProgressLabel");
  const targetMaxProgressLabelEl = document.getElementById("targetMaxProgressLabel");
  const targetMinProgressBarEl = document.getElementById("targetMinProgressBar");
  const targetMaxProgressBarEl = document.getElementById("targetMaxProgressBar");
  const targetAdviceEl = document.getElementById("targetAdvice");
  const expenseChartEl = document.getElementById("expenseChart");
  const exportBtn = document.getElementById("exportBtn");
  const importInput = document.getElementById("importInput");

  init();

  function init() {
    adultsCountEl.value = state.family.adults;
    childrenCountEl.value = state.family.children;
    periodSelectEl.value = state.period;
    targetMinPercentEl.value = state.targets.minPercent;
    targetMaxPercentEl.value = state.targets.maxPercent;

    renderRows("income");
    renderRows("expense");
    calculateAndRenderSummary();

    addIncomeBtn.addEventListener("click", () => {
      state.incomes.push({ id: crypto.randomUUID(), title: "", amount: 0 });
      persistAndRefresh();
    });
    addExpenseBtn.addEventListener("click", () => {
      state.expenses.push({ id: crypto.randomUUID(), title: "", amount: 0 });
      persistAndRefresh();
    });

    adultsCountEl.addEventListener("input", () => {
      const adults = sanitizeInt(adultsCountEl.value, 1);
      state.family.adults = adults;
      adultsCountEl.value = adults;
      persistAndRefresh(false);
    });
    childrenCountEl.addEventListener("input", () => {
      const children = sanitizeInt(childrenCountEl.value, 0);
      state.family.children = children;
      childrenCountEl.value = children;
      persistAndRefresh(false);
    });
    periodSelectEl.addEventListener("change", () => {
      state.period = periodSelectEl.value === "year" ? "year" : "month";
      persistAndRefresh(false);
    });

    targetMinPercentEl.addEventListener("input", () => {
      state.targets.minPercent = clampPercent(targetMinPercentEl.value);
      if (state.targets.minPercent > state.targets.maxPercent) {
        state.targets.maxPercent = state.targets.minPercent;
        targetMaxPercentEl.value = state.targets.maxPercent;
      }
      targetMinPercentEl.value = state.targets.minPercent;
      persistAndRefresh(false);
    });
    targetMaxPercentEl.addEventListener("input", () => {
      state.targets.maxPercent = clampPercent(targetMaxPercentEl.value);
      if (state.targets.maxPercent < state.targets.minPercent) {
        state.targets.minPercent = state.targets.maxPercent;
        targetMinPercentEl.value = state.targets.minPercent;
      }
      targetMaxPercentEl.value = state.targets.maxPercent;
      persistAndRefresh(false);
    });

    resetBtn.addEventListener("click", () => {
      if (!confirm("Очистить все данные калькулятора?")) return;
      state = structuredClone(defaultState);
      persistAndRefresh();
    });

    exportBtn.addEventListener("click", exportToJson);
    importInput.addEventListener("change", importFromJson);
  }

  function renderRows(type) {
    const isIncome = type === "income";
    const list = isIncome ? state.incomes : state.expenses;
    const rootEl = isIncome ? incomeRowsEl : expenseRowsEl;
    rootEl.innerHTML = "";

    if (list.length === 0) {
      const empty = document.createElement("p");
      empty.className = "small";
      empty.textContent = isIncome
        ? "Пока нет доходов. Добавьте первую статью."
        : "Пока нет расходов. Добавьте первую статью.";
      rootEl.appendChild(empty);
      return;
    }

    list.forEach((item) => {
      const row = document.createElement("div");
      row.className = "row";

      const titleInput = document.createElement("input");
      titleInput.type = "text";
      titleInput.placeholder = isIncome ? "Источник дохода" : "Статья расхода";
      titleInput.value = item.title;
      titleInput.addEventListener("input", () => {
        item.title = titleInput.value;
        saveState(state);
      });

      const amountInput = document.createElement("input");
      amountInput.type = "number";
      amountInput.min = "0";
      amountInput.step = "100";
      amountInput.placeholder = "Сумма, ₽";
      amountInput.value = item.amount;
      amountInput.addEventListener("input", () => {
        item.amount = sanitizeFloat(amountInput.value);
        calculateAndRenderSummary();
        saveState(state);
      });

      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-danger";
      removeBtn.type = "button";
      removeBtn.textContent = "Удалить";
      removeBtn.addEventListener("click", () => {
        if (isIncome) state.incomes = state.incomes.filter((x) => x.id !== item.id);
        else state.expenses = state.expenses.filter((x) => x.id !== item.id);
        persistAndRefresh();
      });

      row.appendChild(titleInput);
      row.appendChild(amountInput);
      row.appendChild(removeBtn);
      rootEl.appendChild(row);
    });
  }

  function calculateAndRenderSummary() {
    const divisor = state.period === "year" ? 12 : 1;
    const totalIncome = state.incomes.reduce((acc, x) => acc + sanitizeFloat(x.amount), 0) / divisor;
    const totalExpense = state.expenses.reduce((acc, x) => acc + sanitizeFloat(x.amount), 0) / divisor;
    const balance = totalIncome - totalExpense;

    const members = sanitizeInt(state.family.adults, 1) + sanitizeInt(state.family.children, 0);
    const perPerson = members > 0 ? balance / members : 0;
    const expensePerPerson = members > 0 ? totalExpense / members : 0;
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;

    totalIncomeEl.textContent = formatCurrency(totalIncome);
    totalExpenseEl.textContent = formatCurrency(totalExpense);
    balanceEl.textContent = formatCurrency(balance);
    savingsRateEl.textContent = formatPercent(savingsRate);
    perPersonEl.textContent = formatCurrency(perPerson);
    expensePerPersonEl.textContent = formatCurrency(expensePerPerson);

    balanceEl.className = "stat-value " + (balance > 0 ? "good" : balance < 0 ? "bad" : "neutral");
    savingsRateEl.className = "stat-value " + (savingsRate >= state.targets.maxPercent ? "good" : savingsRate >= state.targets.minPercent ? "neutral" : "bad");

    const targetMinAmount = totalIncome * (state.targets.minPercent / 100);
    const targetMaxAmount = totalIncome * (state.targets.maxPercent / 100);
    targetMinAmountEl.textContent = formatCurrency(targetMinAmount);
    targetMaxAmountEl.textContent = formatCurrency(targetMaxAmount);

    const minProgress = targetMinAmount > 0 ? (balance / targetMinAmount) * 100 : 0;
    const maxProgress = targetMaxAmount > 0 ? (balance / targetMaxAmount) * 100 : 0;
    const minProgressClamped = clampProgress(minProgress);
    const maxProgressClamped = clampProgress(maxProgress);

    targetMinProgressTextEl.textContent = formatPercent(minProgressClamped);
    targetMaxProgressTextEl.textContent = formatPercent(maxProgressClamped);
    targetMinProgressLabelEl.textContent = formatPercent(minProgressClamped);
    targetMaxProgressLabelEl.textContent = formatPercent(maxProgressClamped);
    targetMinProgressBarEl.style.width = minProgressClamped + "%";
    targetMaxProgressBarEl.style.width = maxProgressClamped + "%";

    if (totalIncome <= 0) {
      targetAdviceEl.textContent = "Нет дохода для расчета цели сбережений. Добавьте хотя бы один источник дохода.";
      targetAdviceEl.className = "advice bad";
      targetMinProgressTextEl.textContent = "0%";
      targetMaxProgressTextEl.textContent = "0%";
      targetMinProgressLabelEl.textContent = "0%";
      targetMaxProgressLabelEl.textContent = "0%";
      targetMinProgressBarEl.style.width = "0%";
      targetMaxProgressBarEl.style.width = "0%";
      return;
    }

    if (balance >= targetMaxAmount) {
      targetAdviceEl.textContent = "Отлично: вы достигаете комфортной цели по сбережениям.";
      targetAdviceEl.className = "advice good";
    } else if (balance >= targetMinAmount) {
      const delta = targetMaxAmount - balance;
      targetAdviceEl.textContent = "Минимальная цель выполнена. До комфортной цели не хватает " + formatCurrency(delta) + ".";
      targetAdviceEl.className = "advice neutral";
    } else {
      const delta = targetMinAmount - balance;
      targetAdviceEl.textContent = "Пока ниже минимальной цели. Чтобы выйти на минимум, нужно увеличить остаток на " + formatCurrency(delta) + ".";
      targetAdviceEl.className = "advice bad";
    }

    renderExpenseChart(totalExpense);
  }

  function exportToJson() {
    const payload = {
      exportedAt: new Date().toISOString(),
      приложение: "Калькулятор семейного бюджета",
      версия: 3,
      данные: state
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "family-budget-data-ru.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importFromJson(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || "{}"));
        const raw = parsed && (parsed.данные || parsed.data || parsed);
        if (!raw || typeof raw !== "object") throw new Error("Некорректный формат файла.");
        state = normalizeImportedState(raw);
        persistAndRefresh();
        alert("Импорт выполнен успешно.");
      } catch (err) {
        alert("Ошибка импорта: " + err.message);
      } finally {
        importInput.value = "";
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function normalizeImportedState(raw) {
    const safeRows = (arr) => Array.isArray(arr) ? arr.map((x) => ({
      id: x && x.id ? x.id : crypto.randomUUID(),
      title: String((x && x.title) || ""),
      amount: sanitizeFloat(x && x.amount)
    })) : [];
    return {
      incomes: safeRows(raw.incomes),
      expenses: safeRows(raw.expenses),
      family: {
        adults: sanitizeInt(raw && raw.family && raw.family.adults, 1),
        children: sanitizeInt(raw && raw.family && raw.family.children, 0)
      },
      period: raw && raw.period === "year" ? "year" : "month",
      targets: {
        minPercent: clampPercent(raw && raw.targets && raw.targets.minPercent),
        maxPercent: clampPercent(raw && raw.targets && raw.targets.maxPercent)
      }
    };
  }

  function persistAndRefresh(needRerenderRows = true) {
    if (needRerenderRows) {
      renderRows("income");
      renderRows("expense");
    }
    calculateAndRenderSummary();
    saveState(state);
  }

  function saveState(nextState) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
  }

  function loadState() {
    try {
      const fromStorage = localStorage.getItem(STORAGE_KEY);
      if (!fromStorage) return structuredClone(defaultState);
      const parsed = JSON.parse(fromStorage);
      const normalized = normalizeImportedState(parsed);
      if (normalized.targets.minPercent > normalized.targets.maxPercent) {
        normalized.targets.maxPercent = normalized.targets.minPercent;
      }
      return normalized;
    } catch {
      return structuredClone(defaultState);
    }
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("ru-RU", {
      style: "currency",
      currency: "RUB",
      maximumFractionDigits: 0
    }).format(value || 0);
  }

  function formatPercent(value) {
    return new Intl.NumberFormat("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1
    }).format(value || 0) + "%";
  }

  function renderExpenseChart(totalExpense) {
    if (!expenseChartEl) return;
    expenseChartEl.innerHTML = "";

    if (totalExpense <= 0) {
      const empty = document.createElement("p");
      empty.className = "small";
      empty.textContent = "Добавьте расходы, чтобы увидеть график категорий.";
      expenseChartEl.appendChild(empty);
      return;
    }

    const divisor = state.period === "year" ? 12 : 1;
    const topExpenses = [...state.expenses]
      .map((item) => ({
        title: item.title || "Без названия",
        amount: sanitizeFloat(item.amount) / divisor
      }))
      .filter((item) => item.amount > 0)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    for (const item of topExpenses) {
      const percent = (item.amount / totalExpense) * 100;

      const row = document.createElement("div");
      row.className = "expense-row";

      const label = document.createElement("div");
      label.className = "expense-label";
      label.textContent = item.title;

      const track = document.createElement("div");
      track.className = "expense-bar-track";
      const fill = document.createElement("div");
      fill.className = "expense-bar-fill";
      fill.style.width = clampProgress(percent) + "%";
      track.appendChild(fill);

      const value = document.createElement("div");
      value.className = "expense-value";
      value.textContent = formatPercent(percent) + " / " + formatCurrency(item.amount);

      row.appendChild(label);
      row.appendChild(track);
      row.appendChild(value);
      expenseChartEl.appendChild(row);
    }
  }
})();
