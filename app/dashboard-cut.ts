export function latestCommonCut(dateGroups: string[][]): string | null {
  if (dateGroups.length === 0 || dateGroups.some((group) => group.length === 0)) return null;
  const [first, ...rest] = dateGroups.map((group) => new Set(group.filter(Boolean)));
  return [...first].filter((date) => rest.every((group) => group.has(date))).sort().at(-1) ?? null;
}

type BillingCut = {
  reportDate: string;
  daiAccumulatedCents: number;
  regulatoryAccumulatedCents: number;
  extrasAccumulatedCents: number;
};

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function latestValidBillingCut<T extends BillingCut>(snapshots: T[], maximumReportDate?: string): T | null {
  const isValid = (snapshot: T) => {
    const amounts = [
      snapshot.daiAccumulatedCents,
      snapshot.regulatoryAccumulatedCents,
      snapshot.extrasAccumulatedCents,
    ];
    return isCalendarDate(snapshot.reportDate)
      && (!maximumReportDate || snapshot.reportDate <= maximumReportDate)
      && amounts.every((amount) => Number.isSafeInteger(amount) && amount >= 0)
      && amounts.reduce((total, amount) => total + amount, 0) > 0;
  };

  return snapshots
    .filter(isValid)
    .slice()
    .sort((left, right) => right.reportDate.localeCompare(left.reportDate))[0] ?? null;
}
