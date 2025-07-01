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
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-full items-center justify-between px-6">
        {/* Logo and Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 text-white">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <h1 className="font-bold text-lg">SPIDERMAN</h1>
              <p className="text-xs text-muted-foreground">
                Intelligence Dashboard
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-border" />

          {/* View Toggle */}
          <Tabs
            value={currentView}
            onValueChange={(value) =>
              onViewChange(value as "network" | "geospatial")
            }
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="network" className="flex items-center gap-2">
                <Network className="h-4 w-4" />
                Network Graph
              </TabsTrigger>
              <TabsTrigger
                value="geospatial"
                className="flex items-center gap-2"
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
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm text-muted-foreground">System Active</span>
          </div>

          {/* Active Tasks Badge */}
          <Badge variant="secondary" className="gap-1">
            <span className="w-2 h-2 bg-blue-500 rounded-full" />3 Active Tasks
          </Badge>

          <div className="h-6 w-px bg-border" />

          {/* User Controls */}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Bell className="h-4 w-4" />
              <span className="sr-only">Notifications</span>
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <User className="h-4 w-4" />
                  <span className="sr-only">User menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Financial Analyst</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Profile Settings</DropdownMenuItem>
                <DropdownMenuItem>System Preferences</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
