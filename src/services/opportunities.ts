import type { Opportunity } from "../types";

export function filterOpportunitiesByName(
  opportunities: Opportunity[],
  query: string,
): Opportunity[] {
  const normalizedQuery = query.trim().toLowerCase();

  if (!normalizedQuery) {
    return opportunities;
  }

  return opportunities.filter((opportunity) =>
    opportunity.productName.toLowerCase().includes(normalizedQuery),
  );
}
