"use client";

import { Bell, Moon, Sun, User, Network, Map, Shield } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface TopBarProps {
  currentView: "network" | "geospatial";
  onViewChange: (view: "network" | "geospatial") => void;
}

export function TopBar({ currentView, onViewChange }: TopBarProps) {
  const { setTheme, theme } = useTheme();

  return (
    <header className="h-16 border-b border-gray-800 bg-black/95 backdrop-blur supports-[backdrop-filter]:bg-black/90">
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-800 text-white">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">SPIDERMAN</h1>
              <p className="text-xs text-gray-400">Intelligence Dashboard</p>
            </div>
          </div>

          <div className="h-6 w-px bg-gray-700" />

          {/* View Toggle */}
          <Tabs
            value={currentView}
            onValueChange={(value) =>
              onViewChange(value as "network" | "geospatial")
            }
          >
            <TabsList className="grid w-full grid-cols-2 bg-gray-900 border-gray-700">
              <TabsTrigger
                value="network"
                className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
              >
                <Network className="h-4 w-4" />
                Network Graph
              </TabsTrigger>
              <TabsTrigger
                value="geospatial"
                className="flex items-center gap-2 data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
              >
                <Map className="h-4 w-4" />
                Geospatial Map
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Status and Controls */}
        <div className="flex items-center gap-4">
          {/* System Status */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <span className="text-sm text-gray-300">System Active</span>
          </div>

          {/* Active Tasks Badge */}
          <Badge
            variant="secondary"
            className="gap-1 bg-gray-800 text-gray-300 border-gray-700"
          >
            <span className="w-2 h-2 bg-red-500 rounded-full" />3 Active Tasks
          </Badge>

          <div className="h-6 w-px bg-gray-700" />

          {/* User Controls */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
                >
                  <User className="h-4 w-4" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="bg-gray-900 border-gray-700"
              >
                <DropdownMenuLabel className="text-gray-300">
                  Financial Analyst
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem className="text-gray-300 hover:bg-gray-800">
                  Profile Settings
                </DropdownMenuItem>
                <DropdownMenuItem className="text-gray-300 hover:bg-gray-800">
                  System Preferences
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-gray-700" />
                <DropdownMenuItem className="text-gray-300 hover:bg-gray-800">
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
