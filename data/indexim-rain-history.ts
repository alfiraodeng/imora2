export type HistoricalRainYear = { year: number; monthly: Array<number | null> };

// Source: KPP - CH Total Bulanan.xlsx. 2025 is available through August only.
export const indeximRainHistory: HistoricalRainYear[] = [
  { year: 2014, monthly: [240, 144.5, 27.2, 150.45, 167.6, 123.75, 166, 26.6, 75.7, 36, 102.8, 325.45] },
  { year: 2015, monthly: [281, 166.45, 216.9, 254.2, 239.5, 229.1, 49, 41, 3.5, 1, 43.5, 202.5] },
  { year: 2016, monthly: [279.6, 60.65, 120, 77.6, 249.65, 144.6, 174.1, 99.5, 410, 373, 269, 315] },
  { year: 2017, monthly: [138.3, 146.5, 206, 195.33, 60.3, 42, 276.9, 138.4, 116.2, 145, 145, 143.4] },
  { year: 2018, monthly: [305, 251.2, 137.5, 198.5, 274.9, 200.7, 106.5, 89.5, 225, 159.56, 161.09, 283.58] },
  { year: 2019, monthly: [429.35, 96.5, 292, 381.5, 246.6, 316.5, 147.7, 66.94, 47.5, 285.5, 162.4, 414.67] },
  { year: 2020, monthly: [234.82, 84.4, 281.6, 257.1, 267.1, 205.2, 167.55, 160.03, 204.51, 178.29, 164.5, 286.59] },
  { year: 2021, monthly: [413, 304.1, 259.03, 262.2, 210.6, 56.32, 67.7, 324.7, 143.6, 320, 330, 330] },
  { year: 2022, monthly: [144.2, 176.55, 341.3, 288.1, 437, 206.4, 197.31, 185.8, 146.9, 394.7, 234.8, 367.7] },
  { year: 2023, monthly: [228.2, 311.95, 333.9, 321.7, 336.7, 322.4, 179.7, 119.3, 313.6, 142.3, 240.3, 405.3] },
  { year: 2024, monthly: [198.9, 168.5, 211.9, 138.5, 285.9, 224.9, 163.2, 225.4, 76.9, 327.5, 499, 221] },
  { year: 2025, monthly: [607.4, 98, 392.4, 193.8, 280.2, 192.7, 213.5, 357.15, null, null, null, null] },
];

export const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const quantile = (values: number[], percentile: number) => {
  const sorted = [...values].sort((a, b) => a - b); const index = (sorted.length - 1) * percentile;
  const lower = Math.floor(index); const upper = Math.ceil(index); return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

export const indeximMonthlyStats = monthNames.map((month, index) => {
  const values = indeximRainHistory.map((row) => row.monthly[index]).filter((value): value is number => value !== null);
  const mean = values.reduce((total, value) => total + value, 0) / values.length;
  return { month, observations: values.length, mean, p50: quantile(values, .5), p80: quantile(values, .8), p95: quantile(values, .95), min: Math.min(...values), max: Math.max(...values) };
});
