"use client";

import { useState } from "react";
import {
  User,
  CreditCard,
  Phone,
  MapPin,
  Calendar,
  AlertTriangle,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PriorityLevel, type Entity } from "@/lib/types/entity";

interface LeftSidebarProps {
  selectedEntity: Entity | null;
  currentView: "network" | "geospatial";
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export function LeftSidebar({
  selectedEntity,
  collapsed,
  onToggleCollapse,
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState("details");

  const getEntityStatus = (priorityScore: number) => {
    if (priorityScore >= 80) {
      return PriorityLevel.HIGH;
    }
    if (priorityScore >= 70) {
      return PriorityLevel.MEDIUM;
    }
    return PriorityLevel.LOW;
  };

  // Use mock data if no entity is selected
  const entity = selectedEntity;

  return (
    <div
      className={`absolute left-4 top-4 bottom-4 z-20 transition-all duration-300 ${collapsed ? "w-12" : "w-96"}`}
    >
      <div className="h-full flex">
        <div
          className={`bg-black/95 border border-gray-700 backdrop-blur rounded-lg flex flex-col transition-all duration-300 ${collapsed ? "w-0 overflow-auto opacity-0" : "w-full opacity-100"}`}
        >
          {!collapsed && (
            <div className="h-full">
              {entity ? (
                <>
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3 mb-3 text-start">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 text-white">
                        <CreditCard className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-white font-mono">
                          {entity.id}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {entity.type.toUpperCase()}
                          {entity.type !== "qris" &&
                            ` - ${entity.specificInformation}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant="destructive"
                        className="text-xs bg-red-600 text-white"
                      >
                        Priority: {entity.priorityScore}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs border-gray-600 text-gray-400"
                      >
                        {getEntityStatus(entity.priorityScore)}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Jumlah Koneksi:</span>
                        <span className="font-medium text-white">
                          {entity.connections}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">
                          Aktivitas Terakhir:
                        </span>
                        <span className="font-medium text-white">
                          {entity.lastActivity}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tabs */}
                  <Tabs
                    value={activeTab}
                    onValueChange={setActiveTab}
                    className="flex-1"
                  >
                    <div className="px-4 pt-4">
                      <TabsList className="grid w-full grid-cols-3 bg-gray-900 border-gray-700">
                        <TabsTrigger
                          value="details"
                          className="text-xs data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
                        >
                          Details
                        </TabsTrigger>
                        <TabsTrigger
                          value="network"
                          className="text-xs data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
                        >
                          Network
                        </TabsTrigger>
                        <TabsTrigger
                          value="activity"
                          className="text-xs data-[state=active]:bg-gray-700 data-[state=active]:text-white text-gray-400"
                        >
                          Activity
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="p-4">
                        <TabsContent
                          value="details"
                          className="space-y-4 mt-0 text-start"
                        >
                          <Card className="bg-gray-900/50 border-gray-700 gap-0">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm text-gray-400">
                                Informasi Entitas
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">
                                    {entity.accountHolder}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Pemegang Akun
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white font-mono">
                                    {entity.phoneNumber}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Nomor Telepon
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <MapPin className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">
                                    {entity.location}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Lokasi
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white">
                                    {entity.createdAt}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Dibuat
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card className="bg-gray-900/50 border-gray-700">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm text-gray-400">
                                Priority Assessment
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm text-gray-400">
                                    Overall Priority
                                  </span>
                                  <span className="text-sm font-medium text-white">
                                    {entity.priorityScore}/100
                                  </span>
                                </div>
                                <Progress
                                  value={entity.priorityScore}
                                  className="h-2 bg-gray-800"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="text-sm text-red-500">
                                  High-priority patterns detected
                                </span>
                              </div>

                              <Separator className="bg-gray-700" />

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">
                                    Transactions:
                                  </span>
                                  <span className="font-medium text-white">
                                    {entity.transactions}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">
                                    Total Amount:
                                  </span>
                                  <span className="font-medium text-white">
                                    {entity.totalAmount}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <div className="flex gap-2">
                            <Button
                              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white"
                              size="sm"
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              Full Profile
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-gray-600 text-gray-400 hover:bg-gray-800 bg-transparent"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TabsContent>

                        <TabsContent value="network" className="space-y-4 mt-0">
                          <Card className="bg-gray-900/50 border-gray-700">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm text-gray-400">
                                Entitas Terkait
                              </CardTitle>
                              <CardDescription className="text-xs text-gray-500">
                                Entities yang bertranksi dengan akun ini
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {entity.linkedEntities.map(
                                  (linkedEntity, index) => (
                                    <div
                                      key={index}
                                      className="flex items-center justify-between p-2 border border-gray-700 rounded bg-gray-800/30"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate text-white font-mono">
                                          {linkedEntity.id}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                          {linkedEntity.accountHolder} -{" "}
                                          {linkedEntity.type}
                                        </p>
                                      </div>
                                      <Badge
                                        variant={
                                          linkedEntity.priorityScore >= 80
                                            ? "destructive"
                                            : linkedEntity.priorityScore >= 60
                                              ? "secondary"
                                              : "outline"
                                        }
                                        className="text-xs"
                                      >
                                        {linkedEntity.priorityScore}
                                      </Badge>
                                    </div>
                                  )
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>

                        <TabsContent
                          value="activity"
                          className="space-y-4 mt-0"
                        >
                          <Card className="bg-gray-900/50 border-gray-700">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm text-gray-400">
                                Recent Activity
                              </CardTitle>
                              <CardDescription className="text-xs text-gray-500">
                                Latest events and transactions
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-3">
                                {entity.recentActivity.map(
                                  (activity, index) => (
                                    <div key={index} className="flex gap-3">
                                      <div
                                        className={`w-2 h-2 rounded-full mt-2 ${
                                          activity.severity === "High Priority"
                                            ? "bg-red-500"
                                            : activity.severity ===
                                                "Medium Priority"
                                              ? "bg-yellow-500"
                                              : "bg-green-500"
                                        }`}
                                      />
                                      <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                          <p className="text-sm font-medium text-white">
                                            {activity.event}
                                          </p>
                                          <span className="text-xs text-gray-400">
                                            {activity.time}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  )
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                      </div>
                    </ScrollArea>
                  </Tabs>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                      <CreditCard className="h-8 w-8 text-gray-500" />
                    </div>
                    <h3 className="text-lg font-medium text-white mb-2">
                      Belum ada entitas yang dipilih
                    </h3>
                    <p className="text-sm text-gray-400 max-w-xs">
                      Klik pada node di grafik jaringan untuk melihat detail
                      entitas.
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    Pilih entitas untuk melihat:
                    <ul className="mt-2 space-y-1 text-left">
                      <li>• Detail dan informasi entitas</li>
                      <li>• Entitas terkait dan hubungan</li>
                      <li>• Aktivitas terbaru dan transaksi</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Toggle Button */}
        <Button
          onClick={onToggleCollapse}
          variant="ghost"
          size="sm"
          className="ml-2 h-12 w-8 bg-black/90 border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800 backdrop-blur rounded-lg"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
