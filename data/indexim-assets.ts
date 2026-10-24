export type IndeximAsset = { name: string; kind: 'Pit' | 'Disposal'; lat: number; lon: number };

// Converted from the supplied WGS 84 / UTM Zone 50N (EPSG:32650) survey grid.
// This is the single source used by the map and the operational alert centre.
export const INDEXIM_SITE_CENTER: [number, number] = [1.043559, 117.657709];
export const INDEXIM_SITE_ASSETS: IndeximAsset[] = [
  { name: 'T2 - KPP', kind: 'Pit', lat: 1.059666, lon: 117.664794 }, { name: 'T3 - KPP', kind: 'Pit', lat: 1.071007, lon: 117.680372 },
  { name: 'T4 - KPP', kind: 'Pit', lat: 1.049639, lon: 117.638179 }, { name: 'Panel East - UDU', kind: 'Pit', lat: 1.022727, lon: 117.671760 },
  { name: 'T6 S33 - UDU', kind: 'Pit', lat: 1.014706, lon: 117.655069 }, { name: 'T6 - UDU', kind: 'Pit', lat: 1.036761, lon: 117.660691 },
  { name: 'JO South - MGE', kind: 'Pit', lat: 1.037472, lon: 117.675511 }, { name: 'IPD T4 - KPP', kind: 'Disposal', lat: 1.026804, lon: 117.641419 },
  { name: 'IPD T4 - UDU', kind: 'Disposal', lat: 1.021385, lon: 117.641472 }, { name: 'IPD S13 - KPP', kind: 'Disposal', lat: 1.022411, lon: 117.623191 },
  { name: 'WD 8 - KPP', kind: 'Disposal', lat: 1.031076, lon: 117.630689 }, { name: 'WD 9 - UDU', kind: 'Disposal', lat: 1.022633, lon: 117.645705 },
  { name: 'IPD T6 - KPP', kind: 'Disposal', lat: 1.049418, lon: 117.654393 }, { name: 'WD 7 Central - KPP', kind: 'Disposal', lat: 1.077103, lon: 117.686170 },
  { name: 'WD 3 - KPP', kind: 'Disposal', lat: 1.055175, lon: 117.680872 }, { name: 'IPD T2 - KPP', kind: 'Disposal', lat: 1.064471, lon: 117.657775 },
  { name: 'IPD T3 - KPP', kind: 'Disposal', lat: 1.078047, lon: 117.672985 },
  // Survey coordinates supplied in WGS 84 / UTM Zone 50N (EPSG:32650).
  { name: 'Pit Central', kind: 'Pit', lat: 1.122309098, lon: 117.653407324 },
  { name: 'Pit JO North', kind: 'Pit', lat: 1.160285161, lon: 117.674543504 },
];
