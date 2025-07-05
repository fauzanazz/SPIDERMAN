"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";

interface FilterOption {
  id: string;
  label: string;
}

interface FilterGroup {
  id: string;
  label: string;
  options?: FilterOption[];
}

const filterGroups: FilterGroup[] = [
  {
    id: "banks",
    label: "Akun Bank",
    options: [
      { id: "BCA", label: "BCA" },
      { id: "BNI", label: "BNI" },
      { id: "BRI", label: "BRI" },
      { id: "BSI", label: "BSI" },
      { id: "CIMB_Niaga", label: "CIMB Niaga" },
      { id: "Danamon", label: "Danamon" },
      { id: "Jago", label: "Jago" },
      { id: "Mandiri", label: "Mandiri" },
      { id: "Panin", label: "Panin" },
      { id: "Permata", label: "Permata" },
      { id: "Seabank", label: "Seabank" },
    ],
  },
  {
    id: "ewallets",
    label: "E-Wallet",
    options: [
      { id: "DANA", label: "DANA" },
      { id: "Gopay", label: "Gopay" },
      { id: "LinkAja", label: "LinkAja" },
      { id: "OVO", label: "OVO" },
    ],
  },
  {
    id: "phones",
    label: "Nomor Telepon",
    options: [
      { id: "Simpati", label: "Simpati" },
      { id: "XL", label: "XL" },
    ],
  },
  {
    id: "qris",
    label: "QRIS",
    // No options - acts as single toggle
  },
];

interface MultiSelectFilterProps {
  onFiltersChange?: (filters: Record<string, string[]>) => void;
}

export function MultiSelectFilter({ onFiltersChange }: MultiSelectFilterProps) {
  // State to track selected filters
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string[]>
  >({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(
    {}
  );

  // Helper function to get current URL search params
  const getCurrentSearchParams = () => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search);
    }
    return new URLSearchParams();
  };

  // Helper function to update URL
  const updateURL = (params: URLSearchParams) => {
    if (typeof window !== "undefined") {
      const newUrl = params.toString()
        ? `${window.location.pathname}?${params.toString()}`
        : window.location.pathname;
      window.history.pushState({}, "", newUrl);
    }
  };

  // Initialize filters from URL on mount
  useEffect(() => {
    const searchParams = getCurrentSearchParams();
    const initialFilters: Record<string, string[]> = {};

    filterGroups.forEach((group) => {
      const paramValue = searchParams.get(group.id);
      if (paramValue) {
        if (paramValue === "all") {
          // If "all" is selected, select all options for this group
          initialFilters[group.id] = group.options?.map((opt) => opt.id) || [];
        } else {
          initialFilters[group.id] = paramValue.split(",");
        }
      } else {
        initialFilters[group.id] = [];
      }
    });

    setSelectedFilters(initialFilters);
  }, []); // Empty dependency array - only run on mount

  // Toggle expansion of filter groups
  const toggleGroupExpansion = (groupId: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Handle parent checkbox change
  const handleParentChange = (groupId: string, checked: boolean) => {
    const group = filterGroups.find((g) => g.id === groupId);

    setSelectedFilters((prev) => ({
      ...prev,
      [groupId]: checked
        ? group?.options?.map((opt) => opt.id) || [groupId]
        : [],
    }));
  };

  // Handle child checkbox change
  const handleChildChange = (
    groupId: string,
    optionId: string,
    checked: boolean
  ) => {
    setSelectedFilters((prev) => {
      const currentSelections = prev[groupId] || [];

      if (checked) {
        return {
          ...prev,
          [groupId]: [...currentSelections, optionId],
        };
      } else {
        return {
          ...prev,
          [groupId]: currentSelections.filter((id) => id !== optionId),
        };
      }
    });
  };

  // Check if parent should be checked (all children selected)
  const isParentChecked = (groupId: string) => {
    const group = filterGroups.find((g) => g.id === groupId);
    const selectedOptions = selectedFilters[groupId] || [];

    if (!group?.options) {
      // For groups without options (like QRIS), check if the group itself is selected
      return selectedOptions.includes(groupId);
    }

    return (
      group.options.length > 0 &&
      selectedOptions.length === group.options.length
    );
  };

  // Check if parent should be indeterminate (some but not all children selected)
  const isParentIndeterminate = (groupId: string) => {
    const group = filterGroups.find((g) => g.id === groupId);
    const selectedOptions = selectedFilters[groupId] || [];

    if (!group?.options) return false;

    return (
      selectedOptions.length > 0 &&
      selectedOptions.length < group.options.length
    );
  };

  // Apply filters and update URL
  const applyFilters = () => {
    const params = new URLSearchParams();

    Object.entries(selectedFilters).forEach(([groupId, selections]) => {
      if (selections.length > 0) {
        const group = filterGroups.find((g) => g.id === groupId);

        // Check if all options are selected for this group
        if (group?.options && selections.length === group.options.length) {
          params.set(groupId, "all");
        } else if (!group?.options && selections.includes(groupId)) {
          // For groups without options (like QRIS)
          params.set(groupId, "all");
        } else {
          params.set(groupId, selections.join(","));
        }
      }
    });

    // Update URL
    updateURL(params);

    // Call callback if provided
    onFiltersChange?.(selectedFilters);
  };

  // Reset all filters
  const resetFilters = () => {
    setSelectedFilters({});
    updateURL(new URLSearchParams());
    onFiltersChange?.({});
  };

  return (
    <div className="space-y-4">
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
                  checked={isParentChecked(group.id)}
                  onCheckedChange={(checked) =>
                    handleParentChange(group.id, checked as boolean)
                  }
                  className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                  style={{
                    // Handle indeterminate state
                    ...(isParentIndeterminate(group.id) && {
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
                      {group.options.map((option) => (
                        <div
                          key={option.id}
                          className="flex items-center space-x-2"
                        >
                          <Checkbox
                            id={`${group.id}-${option.id}`}
                            checked={(selectedFilters[group.id] || []).includes(
                              option.id
                            )}
                            onCheckedChange={(checked) =>
                              handleChildChange(
                                group.id,
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
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-2 pt-4">
        <Button
          variant={"outline"}
          onClick={applyFilters}
          className="flex-1  text-white"
        >
          Apply Filters
        </Button>
        <Button
          variant="outline"
          onClick={resetFilters}
          className="flex-1 border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
        >
          Reset
        </Button>
      </div>
      {/* Debug info - remove in production
      {process.env.NODE_ENV === "development" && (
        <div className="mt-4 p-3 bg-gray-900/50 rounded border border-gray-700">
          <p className="text-xs text-gray-400 mb-2">
            Debug - Selected Filters:
          </p>
          <pre className="text-xs text-gray-300 overflow-auto">
            {JSON.stringify(selectedFilters, null, 2)}
          </pre>
        </div>
      )}
    */}
    </div>
  );
}
