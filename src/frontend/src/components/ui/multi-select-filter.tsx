// src/frontend/src/components/ui/multi-select-filter.tsx - Updated for backend integration
"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { type GraphFilters } from "@/lib/api/graph-api";

interface FilterOption {
  id: string;
  label: string;
}

interface FilterGroup {
  id: string;
  label: string;
  filterKey: keyof GraphFilters;
  options?: FilterOption[];
}

const filterGroups: FilterGroup[] = [
  {
    id: "banks",
    label: "Bank Accounts",
    filterKey: "banks",
    options: [
      { id: "BCA", label: "BCA" },
      { id: "BNI", label: "BNI" },
      { id: "BRI", label: "BRI" },
      { id: "BSI", label: "BSI" },
      { id: "CIMB Niaga", label: "CIMB Niaga" },
      { id: "Danamon", label: "Danamon" },
      { id: "Jago", label: "Jago" },
      { id: "Mandiri", label: "Mandiri" },
      { id: "Panin", label: "Panin" },
      { id: "Permata", label: "Permata" },
      { id: "Seabank", label: "Seabank" },
    ],
  },
  {
    id: "e_wallets",
    label: "E-Wallets",
    filterKey: "e_wallets",
    options: [
      { id: "DANA", label: "DANA" },
      { id: "Gopay", label: "Gopay" },
      { id: "LinkAja", label: "LinkAja" },
      { id: "OVO", label: "OVO" },
    ],
  },
  {
    id: "cryptocurrencies",
    label: "Cryptocurrencies",
    filterKey: "cryptocurrencies",
    options: [
      { id: "Bitcoin", label: "Bitcoin" },
      { id: "Ethereum", label: "Ethereum" },
      { id: "USDT", label: "USDT" },
      { id: "USDC", label: "USDC" },
      { id: "BNB", label: "BNB" },
    ],
  },
  {
    id: "phone_providers",
    label: "Phone Providers",
    filterKey: "phone_providers",
    options: [
      { id: "Simpati", label: "Simpati" },
      { id: "XL", label: "XL" },
      { id: "Indosat", label: "Indosat" },
      { id: "Tri", label: "3 (Tri)" },
    ],
  },
  {
    id: "entity_types",
    label: "Entity Types",
    filterKey: "entity_types",
    options: [
      { id: "bank_account", label: "Bank Accounts" },
      { id: "e_wallet", label: "E-Wallets" },
      { id: "crypto_wallet", label: "Crypto Wallets" },
      { id: "phone_number", label: "Phone Numbers" },
      { id: "qris", label: "QRIS Codes" },
    ],
  },
];

interface MultiSelectFilterProps {
  filters: GraphFilters; // Current applied filters
  onFiltersChange: (filters: GraphFilters) => void; // Called when search button is clicked
  draftFilters: GraphFilters; // Current draft filters (user edits)
  onDraftFiltersChange: (filters: GraphFilters) => void; // Called when user modifies filters without searching
}

export function MultiSelectFilter({
  filters,
  onFiltersChange,
  draftFilters,
  onDraftFiltersChange,
}: MultiSelectFilterProps) {
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );

  // Initialize expanded state for groups with selected items
  useEffect(() => {
    const initialExpanded: Record<string, boolean> = {};
    filterGroups.forEach((group) => {
      const filterValue = draftFilters[group.filterKey] as string[] | undefined;
      if (filterValue && filterValue.length > 0) {
        initialExpanded[group.id] = true;
      }
    });
    setExpandedGroups(initialExpanded);
  }, [draftFilters]);

  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const updateDraftFilters = (newFilters: GraphFilters) => {
    onDraftFiltersChange(newFilters);
  };

  const handleParentChange = (group: FilterGroup, checked: boolean) => {
    const newFilters = { ...draftFilters };

    if (checked && group.options) {
      // Select all options in this group
      (newFilters[group.filterKey] as string[]) = group.options.map(
        (opt) => opt.id
      );
    } else {
      // Deselect all options in this group
      (newFilters[group.filterKey] as string[]) = [];
    }

    updateDraftFilters(newFilters);
  };

  const handleChildChange = (
    group: FilterGroup,
    optionId: string,
    checked: boolean
  ) => {
    const newFilters = { ...draftFilters };
    const currentSelections = (draftFilters[group.filterKey] as string[]) || [];

    if (checked) {
      // Add option to selections
      (newFilters[group.filterKey] as string[]) = [
        ...currentSelections,
        optionId,
      ];
    } else {
      // Remove option from selections
      (newFilters[group.filterKey] as string[]) = currentSelections.filter(
        (id) => id !== optionId
      );
    }

    updateDraftFilters(newFilters);
  };

  const isParentChecked = (group: FilterGroup) => {
    if (!group.options) return false;
    const selectedOptions = (draftFilters[group.filterKey] as string[]) || [];
    return (
      group.options.length > 0 &&
      selectedOptions.length === group.options.length
    );
  };

  const isParentIndeterminate = (group: FilterGroup) => {
    if (!group.options) return false;
    const selectedOptions = (draftFilters[group.filterKey] as string[]) || [];
    return (
      selectedOptions.length > 0 &&
      selectedOptions.length < group.options.length
    );
  };

  const getSelectedCount = (group: FilterGroup) => {
    const selectedOptions = (draftFilters[group.filterKey] as string[]) || [];
    return selectedOptions.length;
  };

  const clearAllFilters = () => {
    const clearedFilters: GraphFilters = {
      entity_types: [],
      banks: [],
      e_wallets: [],
      cryptocurrencies: [],
      phone_providers: [],
      priority_score_min: undefined,
      priority_score_max: undefined,
      search_query: undefined,
    };
    updateDraftFilters(clearedFilters);
  };

  const hasActiveFilters = () => {
    return (
      filterGroups.some((group) => {
        const filterValue = draftFilters[group.filterKey] as
          | string[]
          | undefined;
        return filterValue && filterValue.length > 0;
      }) ||
      draftFilters.priority_score_min !== undefined ||
      draftFilters.priority_score_max !== undefined ||
      draftFilters.search_query
    );
  };

  const hasUnappliedChanges = () => {
    return JSON.stringify(filters) !== JSON.stringify(draftFilters);
  };

  const handleSearch = () => {
    onFiltersChange(draftFilters);
  };

  return (
    <div className="space-y-4">
      {/* Quick stats */}
      {hasActiveFilters() && (
        <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-300 mb-2">Filter Aktif:</div>
          <div className="space-y-1">
            {filterGroups.map((group) => {
              const count = getSelectedCount(group);
              if (count === 0) return null;
              return (
                <div key={group.id} className="text-xs text-gray-400">
                  {group.label}: {count} terpilih
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filterGroups.map((group) => (
          <div
            key={group.id}
            className="border border-gray-700 rounded-lg bg-gray-800/30"
          >
            <div className="p-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`parent-${group.id}`}
                  checked={isParentChecked(group)}
                  onCheckedChange={(checked) =>
                    handleParentChange(group, checked as boolean)
                  }
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  style={{
                    ...(isParentIndeterminate(group) && {
                      backgroundColor: "#3b82f6",
                      borderColor: "#3b82f6",
                    }),
                  }}
                />
                <Label
                  htmlFor={`parent-${group.id}`}
                  className="text-sm font-medium text-white cursor-pointer flex-1"
                >
                  {group.label}
                  {getSelectedCount(group) > 0 && (
                    <span className="ml-2 text-xs text-blue-400">
                      ({getSelectedCount(group)})
                    </span>
                  )}
                </Label>
                {group.options && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleGroupExpansion(group.id)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  >
                    {expandedGroups[group.id] ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>

              {group.options && (
                <Collapsible open={expandedGroups[group.id]}>
                  <CollapsibleContent className="mt-3">
                    <div className="space-y-2 pl-6">
                      {group.options.map((option) => {
                        const selectedOptions =
                          (draftFilters[group.filterKey] as string[]) || [];
                        return (
                          <div
                            key={option.id}
                            className="flex items-center space-x-2"
                          >
                            <Checkbox
                              id={`${group.id}-${option.id}`}
                              checked={selectedOptions.includes(option.id)}
                              onCheckedChange={(checked) =>
                                handleChildChange(
                                  group,
                                  option.id,
                                  checked as boolean
                                )
                              }
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                            <Label
                              htmlFor={`${group.id}-${option.id}`}
                              className="text-sm text-gray-300 cursor-pointer"
                            >
                              {option.label}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filter actions */}
      <div className="flex gap-2 pt-4">
        <Button
          onClick={handleSearch}
          disabled={!hasActiveFilters() && !hasUnappliedChanges()}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
        >
          <Search className="mr-2 h-4 w-4" />
          Cari
          {hasUnappliedChanges() && (
            <span className="ml-1 text-xs">(Perubahan)</span>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={clearAllFilters}
          disabled={!hasActiveFilters()}
          className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent disabled:opacity-50"
        >
          Hapus Semua
        </Button>
      </div>
    </div>
  );
}
