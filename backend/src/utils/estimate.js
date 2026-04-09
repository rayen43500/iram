function monthlyPayment(principal, annualRate, months) {
  const monthlyRate = annualRate / 12 / 100;
  if (monthlyRate === 0) {
    return principal / months;
  }
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
}

function normalizeProbabilityFromDebtRatio(debtRatio, maxDebtRatio) {
  if (debtRatio <= 0.2) return 0.95;
  if (debtRatio <= maxDebtRatio) return 0.75;
  if (debtRatio <= 0.45) return 0.45;
  return 0.15;
}

function buildEstimation({ amount, annualRate, durationMonths, salary, existingMonthlyDebt = 0, maxDebtRatio = 0.35 }) {
  const installment = monthlyPayment(amount, annualRate, durationMonths);
  const totalRepayment = installment * durationMonths;
  const totalCost = totalRepayment - amount;
  const debtRatio = salary > 0 ? (existingMonthlyDebt + installment) / salary : 1;
  const acceptanceProbability = normalizeProbabilityFromDebtRatio(debtRatio, maxDebtRatio);

  return {
    monthlyPayment: Number(installment.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    debtRatio: Number(debtRatio.toFixed(4)),
    acceptanceProbability: Number(acceptanceProbability.toFixed(2)),
  };
}

module.exports = {
  buildEstimation,
};
