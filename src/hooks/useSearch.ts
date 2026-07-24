import { useEffect, useState } from "react";
import { OpportunityService } from "../services/api/OpportunityService";
import type { Opportunity } from "../types";

const productService = OpportunityService.create();

export function useSearch() {
  const [searchValue, setSearchValue] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      try {
        setIsLoading(true);
        setError(null);
        const result = await productService.getProducts(submittedQuery);

        if (isMounted) {
          setOpportunities(result);
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Bilinmeyen bir hata oluştu.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, [submittedQuery]);

  return {
    searchValue,
    setSearchValue,
    setSubmittedQuery,
    opportunities,
    isLoading,
    error,
  };
}
