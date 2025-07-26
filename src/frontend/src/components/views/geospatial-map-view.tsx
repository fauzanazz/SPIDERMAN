"use client";

import { useState } from "react";
import { Map, Layers, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Location = {
  id: number;
  name: string;
  lat: number;
  lng: number;
  count: number; // Number of entities in this location
  priorityLevel: "high" | "medium" | "low";
};
const mockLocations = [
  {
    id: 1,
    name: "Jakarta Selatan",
    lat: -6.2615,
    lng: 106.8106,
    count: 45,
    priorityLevel: "high",
  },
  {
    id: 2,
    name: "Jakarta Pusat",
    lat: -6.1944,
    lng: 106.8229,
    count: 32,
    priorityLevel: "medium",
  },
  {
    id: 3,
    name: "Bandung",
    lat: -6.9175,
    lng: 107.6191,
    count: 28,
    priorityLevel: "high",
  },
  {
    id: 4,
    name: "Surabaya",
    lat: -7.2575,
    lng: 112.7521,
    count: 23,
    priorityLevel: "medium",
  },
  {
    id: 5,
    name: "Medan",
    lat: 3.5952,
    lng: 98.6722,
    count: 19,
    priorityLevel: "low",
  },
  {
    id: 6,
    name: "Semarang",
    lat: -6.9667,
    lng: 110.4167,
    count: 15,
    priorityLevel: "low",
  },
] as Location[];

export function GeospatialMapView() {
  const [mapLayer, setMapLayer] = useState("heatmap");
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );

  const getLocationColor = (priorityLevel: string) => {
    switch (priorityLevel) {
      case "high":
        return "#ef4444";
      case "medium":
        return "#f59e0b";
      case "low":
        return "#10b981";
      default:
        return "#64748b";
    }
  };

  const getLocationSize = (count: number) => {
    return Math.max(20, Math.min(60, count * 1.2));
  };

  return (
    <div className="h-full relative bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-slate-900">
      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <Card className="p-2">
          <div className="flex gap-1">
            <Select value={mapLayer} onValueChange={setMapLayer}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="heatmap">Heatmap</SelectItem>
                <SelectItem value="clusters">Clusters</SelectItem>
                <SelectItem value="markers">Markers</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm">
              <Layers className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Map Stats */}
      <div className="absolute top-4 right-4 z-10">
        <Card className="p-3">
          <div className="text-sm space-y-1">
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Lokasi:</span>
              <span className="font-medium">{mockLocations.length}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">Total Entitas:</span>
              <span className="font-medium">
                {mockLocations.reduce((sum, loc) => sum + loc.count, 0)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                Area Prioritas Tinggi:
              </span>
              <span className="font-medium text-red-600">
                {
                  mockLocations.filter((loc) => loc.priorityLevel === "high")
                    .length
                }
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Map Area */}
      <div className="h-full w-full relative overflow-hidden">
        {/* Simplified Indonesia Map Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
          <svg className="w-full h-full" viewBox="0 0 800 600">
            {/* Simplified Indonesia outline */}
            <path
              d="M100 300 Q200 250 300 280 Q400 260 500 290 Q600 270 700 300 Q650 350 550 340 Q450 360 350 350 Q250 370 150 350 Z"
              fill="#e2e8f0"
              stroke="#cbd5e1"
              strokeWidth="2"
              className="dark:fill-slate-700 dark:stroke-slate-600"
            />

            {/* Location markers */}
            {mockLocations.map((location) => {
              const x = (location.lng + 95) * 4; // Simplified coordinate conversion
              const y = (15 - location.lat) * 25;

              return (
                <g key={location.id}>
                  {mapLayer === "heatmap" && (
                    <circle
                      cx={x}
                      cy={y}
                      r={getLocationSize(location.count)}
                      fill={getLocationColor(location.priorityLevel)}
                      fillOpacity={0.3}
                      className="animate-pulse"
                    />
                  )}

                  <circle
                    cx={x}
                    cy={y}
                    r={8}
                    fill={getLocationColor(location.priorityLevel)}
                    stroke="#ffffff"
                    strokeWidth="2"
                    className="cursor-pointer transition-all duration-200 hover:r-10"
                    onClick={() => {
                      setSelectedLocation(location);
                    }}
                  />

                  <text
                    x={x}
                    y={y - 15}
                    textAnchor="middle"
                    className="text-xs fill-slate-700 dark:fill-slate-300 pointer-events-none font-medium"
                    fontSize="10"
                  >
                    {location.count}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Location details popup */}
        {selectedLocation && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
            <Card className="p-4 min-w-64">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">{selectedLocation.name}</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedLocation(null)}
                  >
                    ×
                  </Button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Entitas:
                    </span>
                    <span className="text-sm font-medium">
                      {selectedLocation.count}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Tingkat Prioritas:
                    </span>
                    <Badge
                      variant={
                        selectedLocation.priorityLevel === "high"
                          ? "destructive"
                          : selectedLocation.priorityLevel === "medium"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {selectedLocation.priorityLevel}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">
                      Koordinat:
                    </span>
                    <span className="text-sm font-mono">
                      {selectedLocation.lat.toFixed(4)},{" "}
                      {selectedLocation.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
                <Button className="w-full" size="sm">
                  Lihat Detail
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10">
        <Card className="p-3">
          <div className="text-sm space-y-2">
            <div className="font-medium mb-2">Area Prioritas</div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500"></div>
              <span className="text-xs">Prioritas Tinggi</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <span className="text-xs">Prioritas Sedang</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs">Prioritas Rendah</span>
            </div>
          </div>
        </Card>
      </div>

      {/* Empty state */}
      {mockLocations.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Map className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Tidak ada data geospasial tersedia
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Terapkan filter untuk melihat analisis berbasis lokasi
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
