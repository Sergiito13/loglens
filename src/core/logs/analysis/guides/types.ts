/** Orientaciones técnicas; no sustituyen el análisis de la causa raíz. */
export interface NginxProblemGuide {
  title: string;
  category: string;
  summary: string;
  description: string;
  possibleCauses: readonly string[];
  checks: readonly string[];
}
