/** Normalize public impact snapshot titles for display (legacy seed used "Lighthouse Sanctuary"). */
export function displayImpactHeadline(headline: string | null | undefined): string {
  const h = (headline ?? 'Hiraya Haven Impact Update').trim();
  return h.replace(/Lighthouse Sanctuary/g, 'Hiraya Haven');
}
