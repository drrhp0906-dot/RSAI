export interface StepT {
  id: string;
  key: string;
  title: string;
  status: string;
  detail: string | null;
  order: number;
}

export interface EvidenceT {
  id: string;
  title: string;
  url: string;
  domain: string;
  tier: number;
  year: number | null;
  snippet: string;
  trust: number;
  inRange: boolean;
  kept: boolean;
}

export interface ImageT {
  id: string;
  url: string;
  sourceDomain: string | null;
  caption: string | null;
  trustScore: number;
  kept: boolean;
  reason: string | null;
}

export interface ReportT {
  id: string;
  kind: string;
  version: number;
  content: string;
  verifyStatus: string | null;
  missingJson: string | null;
  createdAt: string;
}

export interface FlagT {
  id: string;
  claim: string;
  standardView: string;
  alternateView: string;
  note: string | null;
}

export interface RunT {
  id: string;
  query: string;
  yearFrom: number | null;
  yearTo: number | null;
  includeDatasheets: boolean;
  status: string;
  currentStep: string | null;
  error: string | null;
  revisedQuery: string | null;
  platformsJson: string;
  steps: StepT[];
  evidences: EvidenceT[];
  images: ImageT[];
  flags: FlagT[];
  reports: ReportT[];
  createdAt: string;
}

export interface RunSummaryT {
  id: string;
  query: string;
  status: string;
  yearFrom: number | null;
  yearTo: number | null;
  currentStep: string | null;
  createdAt: string;
  _count: { evidences: number; images: number; flags: number; reports: number };
}

export interface DatasheetT {
  id: string;
  fieldName: string;
  value: string;
  unit: string | null;
  year: number | null;
  source: string | null;
  note: string | null;
  createdAt: string;
}

export interface ChosenPlatformT {
  domain: string;
  reason: string;
}

export function trustBadgeClass(score: number): string {
  if (score >= 90) return "bg-emerald-100 text-emerald-800 border-emerald-300";
  if (score >= 70) return "bg-amber-100 text-amber-800 border-amber-300";
  return "bg-red-100 text-red-700 border-red-300";
}
