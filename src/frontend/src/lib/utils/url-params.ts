// src/frontend/src/lib/utils/url-params.ts - URL parameter management for filters
"use client";

import { type GraphFilters } from "@/lib/api/graph-api";

export interface UrlFilters
  extends Omit<
    GraphFilters,
    | "entity_types"
    | "banks"
    | "e_wallets"
    | "cryptocurrencies"
    | "phone_providers"
  > {
  entity_types?: string;
  banks?: string;
  e_wallets?: string;
  cryptocurrencies?: string;
  phone_providers?: string;
}

/**
 * Convert GraphFilters to URL search parameters
 */
export function filtersToUrlParams(filters: GraphFilters): URLSearchParams {
  const params = new URLSearchParams();

  // Convert array filters to comma-separated strings
  if (filters.entity_types?.length) {
    params.set("entity_types", filters.entity_types.join(","));
  }
  if (filters.banks?.length) {
    params.set("banks", filters.banks.join(","));
  }
  if (filters.e_wallets?.length) {
    params.set("e_wallets", filters.e_wallets.join(","));
  }
  if (filters.cryptocurrencies?.length) {
    params.set("cryptocurrencies", filters.cryptocurrencies.join(","));
  }
  if (filters.phone_providers?.length) {
    params.set("phone_providers", filters.phone_providers.join(","));
  }

  // Add scalar parameters
  if (filters.priority_score_min !== undefined) {
    params.set("priority_score_min", filters.priority_score_min.toString());
  }
  if (filters.priority_score_max !== undefined) {
    params.set("priority_score_max", filters.priority_score_max.toString());
  }
  if (filters.search_query) {
    params.set("search_query", filters.search_query);
  }

  return params;
}

/**
 * Convert URL search parameters to GraphFilters
 */
export function urlParamsToFilters(
  searchParams: URLSearchParams
): GraphFilters {
  const filters: GraphFilters = {
    entity_types: [],
    banks: [],
    e_wallets: [],
    cryptocurrencies: [],
    phone_providers: [],
    priority_score_min: undefined,
    priority_score_max: undefined,
    search_query: undefined,
  };

  // Parse array parameters from comma-separated strings
  const entityTypes = searchParams.get("entity_types");
  if (entityTypes) {
    filters.entity_types = entityTypes.split(",").filter(Boolean);
  }

  const banks = searchParams.get("banks");
  if (banks) {
    filters.banks = banks.split(",").filter(Boolean);
  }

  const eWallets = searchParams.get("e_wallets");
  if (eWallets) {
    filters.e_wallets = eWallets.split(",").filter(Boolean);
  }

  const cryptocurrencies = searchParams.get("cryptocurrencies");
  if (cryptocurrencies) {
    filters.cryptocurrencies = cryptocurrencies.split(",").filter(Boolean);
  }

  const phoneProviders = searchParams.get("phone_providers");
  if (phoneProviders) {
    filters.phone_providers = phoneProviders.split(",").filter(Boolean);
  }

  // Parse scalar parameters
  const priorityMin = searchParams.get("priority_score_min");
  if (priorityMin) {
    const num = parseInt(priorityMin, 10);
    if (!isNaN(num)) {
      filters.priority_score_min = num;
    }
  }

  const priorityMax = searchParams.get("priority_score_max");
  if (priorityMax) {
    const num = parseInt(priorityMax, 10);
    if (!isNaN(num)) {
      filters.priority_score_max = num;
    }
  }

  const searchQuery = searchParams.get("search_query");
  if (searchQuery) {
    filters.search_query = searchQuery;
  }

  return filters;
}

/**
 * Update URL with new filters without causing a page reload
 */
export function updateUrlWithFilters(
  filters: GraphFilters,
  replace: boolean = false
): void {
  if (typeof window === "undefined") return;

  const params = filtersToUrlParams(filters);
  const url = new URL(window.location.href);

  // Clear existing filter parameters
  const filterKeys = [
    "entity_types",
    "banks",
    "e_wallets",
    "cryptocurrencies",
    "phone_providers",
    "priority_score_min",
    "priority_score_max",
    "search_query",
  ];
  filterKeys.forEach((key) => url.searchParams.delete(key));

  // Add new parameters
  params.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  // Update URL without page reload
  if (replace) {
    window.history.replaceState({}, "", url.toString());
  } else {
    window.history.pushState({}, "", url.toString());
  }
}

/**
 * Get filters from current URL
 */
export function getFiltersFromUrl(): GraphFilters {
  if (typeof window === "undefined") {
    return {
      entity_types: [],
      banks: [],
      e_wallets: [],
      cryptocurrencies: [],
      phone_providers: [],
      priority_score_min: undefined,
      priority_score_max: undefined,
      search_query: undefined,
    };
  }

  const params = new URLSearchParams(window.location.search);
  return urlParamsToFilters(params);
}
