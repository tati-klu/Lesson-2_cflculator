const assert = require("node:assert/strict");
const core = require("../assets/js/calculator-core.js");

function runTests() {
  assert.equal(core.sanitizeFloat(-5), 0, "sanitizeFloat: отрицательные -> 0");
  assert.equal(core.sanitizeFloat("12.5"), 12.5, "sanitizeFloat: строка-число");

  assert.equal(core.sanitizeInt("4.9", 1), 4, "sanitizeInt: округление вниз");
  assert.equal(core.sanitizeInt(-2, 1), 1, "sanitizeInt: минимум");

  assert.equal(core.clampPercent(130), 100, "clampPercent: верхняя граница");
  assert.equal(core.clampPercent(-20), 0, "clampPercent: нижняя граница");

  const result = core.calculateTotals({
    period: "month",
    incomes: [{ amount: 100000 }],
    expenses: [{ amount: 40000 }, { amount: 10000 }],
    adults: 2,
    children: 1,
    minPercent: 10,
    maxPercent: 20
  });

  assert.equal(result.totalIncome, 100000, "totalIncome");
  assert.equal(result.totalExpense, 50000, "totalExpense");
  assert.equal(result.balance, 50000, "balance");
  assert.equal(Math.round(result.savingsRate), 50, "savingsRate");
  assert.equal(result.targetMinAmount, 10000, "targetMinAmount");
  assert.equal(result.targetMaxAmount, 20000, "targetMaxAmount");
  assert.equal(result.minProgress, 100, "minProgress clamp to 100");
  assert.equal(result.maxProgress, 100, "maxProgress clamp to 100");

  const yearly = core.calculateTotals({
    period: "year",
    incomes: [{ amount: 1200000 }],
    expenses: [{ amount: 600000 }],
    adults: 2,
    children: 0,
    minPercent: 10,
    maxPercent: 20
  });

  assert.equal(yearly.totalIncome, 100000, "year->month income");
  assert.equal(yearly.totalExpense, 50000, "year->month expense");
}

runTests();
console.log("OK: все тесты калькулятора пройдены");
