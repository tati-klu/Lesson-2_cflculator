(function (global) {
  function sanitizeFloat(value) {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n;
  }

  function sanitizeInt(value, min) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n) || n < min) return min;
    return n;
  }

  function clampPercent(value) {
    const n = Math.floor(Number(value));
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(100, n));
  }

  function clampProgress(value) {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(100, value));
  }

  function calculateTotals(input) {
    const period = input.period === "year" ? "year" : "month";
    const divisor = period === "year" ? 12 : 1;
    const incomes = Array.isArray(input.incomes) ? input.incomes : [];
    const expenses = Array.isArray(input.expenses) ? input.expenses : [];
    const adults = sanitizeInt(input.adults, 1);
    const children = sanitizeInt(input.children, 0);
    const minPercent = clampPercent(input.minPercent);
    const maxPercent = Math.max(minPercent, clampPercent(input.maxPercent));

    const totalIncome = incomes.reduce((acc, item) => acc + sanitizeFloat(item.amount), 0) / divisor;
    const totalExpense = expenses.reduce((acc, item) => acc + sanitizeFloat(item.amount), 0) / divisor;
    const balance = totalIncome - totalExpense;
    const members = adults + children;
    const perPerson = members > 0 ? balance / members : 0;
    const expensePerPerson = members > 0 ? totalExpense / members : 0;
    const savingsRate = totalIncome > 0 ? (balance / totalIncome) * 100 : 0;
    const targetMinAmount = totalIncome * (minPercent / 100);
    const targetMaxAmount = totalIncome * (maxPercent / 100);
    const minProgress = targetMinAmount > 0 ? (balance / targetMinAmount) * 100 : 0;
    const maxProgress = targetMaxAmount > 0 ? (balance / targetMaxAmount) * 100 : 0;

    return {
      totalIncome,
      totalExpense,
      balance,
      perPerson,
      expensePerPerson,
      savingsRate,
      targetMinAmount,
      targetMaxAmount,
      minProgress: clampProgress(minProgress),
      maxProgress: clampProgress(maxProgress)
    };
  }

  const api = {
    sanitizeFloat,
    sanitizeInt,
    clampPercent,
    clampProgress,
    calculateTotals
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    global.BudgetCore = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
