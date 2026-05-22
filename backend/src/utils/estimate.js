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

function buildAmortizationSchedule({ amount, annualRate, durationMonths, monthlyPaymentValue }) {
  const schedule = [];
  const monthlyRate = annualRate / 12 / 100;
  let remaining = amount;
  const payment = monthlyPaymentValue || monthlyPayment(amount, annualRate, durationMonths);

  for (let i = 1; i <= durationMonths; i += 1) {
    const interest = monthlyRate === 0 ? 0 : remaining * monthlyRate;
    const principal = Math.max(payment - interest, 0);
    remaining = Math.max(remaining - principal, 0);
    schedule.push({
      month: i,
      payment: Number(payment.toFixed(2)),
      interest: Number(interest.toFixed(2)),
      principal: Number(principal.toFixed(2)),
      remaining: Number(remaining.toFixed(2)),
    });
  }

  return schedule;
}

function buildEstimation({ amount, annualRate, durationMonths, salary, existingMonthlyDebt = 0, maxDebtRatio = 0.35 }) {
  const installment = monthlyPayment(amount, annualRate, durationMonths);
  const totalRepayment = installment * durationMonths;
  const totalCost = totalRepayment - amount;
  const debtRatio = salary > 0 ? (existingMonthlyDebt + installment) / salary : 1;
  const acceptanceProbability = normalizeProbabilityFromDebtRatio(debtRatio, maxDebtRatio);
  const amortizationSchedule = buildAmortizationSchedule({ amount, annualRate, durationMonths, monthlyPaymentValue: installment });

  return {
    monthlyPayment: Number(installment.toFixed(2)),
    totalCost: Number(totalCost.toFixed(2)),
    debtRatio: Number(debtRatio.toFixed(4)),
    acceptanceProbability: Number(acceptanceProbability.toFixed(2)),
    amortizationSchedule,
  };
}

module.exports = {
  buildEstimation,
  buildAmortizationSchedule,
};
