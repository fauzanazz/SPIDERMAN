// src/frontend/src/components/bars/left-sidebar.tsx - Updated with backend integration
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  User,
  CreditCard,
  Phone,
  Calendar,
  AlertTriangle,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  ArrowDownLeft,
  Globe,
  Loader2,
  Network,
  Activity,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PriorityLevel,
  type Entity,
  convertBackendEntityToFrontend,
  type BackendEntity,
} from "@/lib/types/entity";
import { graphApi, type EntityNode } from "@/lib/api/graph-api";

interface LeftSidebarProps {
  selectedEntity: Entity | null;
  currentView: "network" | "geospatial";
  collapsed: boolean;
  onToggleCollapse: () => void;
  onEntitySelect?: (entity: Entity) => void;
}

// Helper function to convert EntityNode to BackendEntity format
const entityNodeToBackendEntity = (entityNode: EntityNode): BackendEntity => ({
  ...entityNode,
  entity_type: entityNode.entity_type,
  account_holder: entityNode.account_holder,
  connected_entities: [], // EntityNode doesn't have this, so we provide empty array
  connections: entityNode.connections || 0,
  specific_information: entityNode.specific_information || "Unknown",
  id: entityNode.id,
  identifier: entityNode.identifier,
  priority_score: entityNode.priority_score,
  total_amount: entityNode.total_amount || 0,
  transactions: entityNode.transactions || 0,
});

export function LeftSidebar({
  selectedEntity,
  collapsed,
  onToggleCollapse,
  onEntitySelect,
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState("details");

  // Fetch detailed node information when entity is selected
  const {
    data: nodeDetail,
    isLoading: isLoadingDetail,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ["node-detail", selectedEntity?.id],
    queryFn: () =>
      selectedEntity ? graphApi.getNodeDetail(selectedEntity.id) : null,
    enabled: !!selectedEntity?.id,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const getEntityStatus = (priorityScore: number) => {
    if (priorityScore >= 80) {
      return PriorityLevel.HIGH;
    }
    if (priorityScore >= 70) {
      return PriorityLevel.MEDIUM;
    }
    return PriorityLevel.LOW;
  };

  const getEntityIcon = (entityType: string) => {
    switch (entityType) {
      case "bank_account":
        return <CreditCard className="h-5 w-5" />;
      case "e_wallet":
        return <Phone className="h-5 w-5" />;
      case "crypto_wallet":
        return <Globe className="h-5 w-5" />;
      case "phone_number":
        return <Phone className="h-5 w-5" />;
      case "qris":
        return <CreditCard className="h-5 w-5" />;
      default:
        return <CreditCard className="h-5 w-5" />;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString("id-ID", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const entity = selectedEntity;

  return (
    <div
      className={`absolute left-4 top-4 bottom-4 z-20 transition-all duration-300 ${collapsed ? "w-12" : "w-96"}`}
    >
      <div className="h-full flex">
        <div
          className={`bg-black/95 border border-gray-700 backdrop-blur rounded-lg flex flex-col transition-all duration-300 ${collapsed ? "w-0 overflow-hidden opacity-0" : "w-full opacity-100"}`}
        >
          {!collapsed && (
            <div className="h-full">
              {entity ? (
                <>
                  <div className="p-4 border-b border-gray-700">
                    <div className="flex items-center gap-3 mb-3 text-start">
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-800 text-white">
                        {getEntityIcon(entity.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate text-white font-mono text-sm">
                          {entity.identifier || entity.id}
                        </h3>
                        <p className="text-sm text-gray-400">
                          {entity.type.toUpperCase().replace("_", " ")}
                          {entity.specificInformation &&
                            entity.type !== "qris" &&
                            ` - ${entity.specificInformation}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-3">
                      <Badge
                        variant={
                          entity.priorityScore >= 80
                            ? "destructive"
                            : entity.priorityScore >= 60
                              ? "secondary"
                              : "outline"
                        }
                        className="text-xs"
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
                        <span className="text-gray-400">Connections:</span>
                        <span className="font-medium text-white">
                          {entity.connections}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Transactions:</span>
                        <span className="font-medium text-white">
                          {entity.transactions}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Loading state for node details */}
                  {isLoadingDetail && (
                    <div className="p-4 flex items-center justify-center">
                      <div className="flex items-center space-x-2 text-gray-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading details...</span>
                      </div>
                    </div>
                  )}

                  {/* Error state */}
                  {detailError && (
                    <div className="p-4">
                      <Alert className="bg-red-900/50 border-red-700">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription className="text-red-300">
                          Failed to load entity details
                          <Button
                            onClick={() => refetchDetail()}
                            variant="outline"
                            size="sm"
                            className="mt-2 w-full border-red-600 text-red-400 hover:bg-red-800/20"
                          >
                            Retry
                          </Button>
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}

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
                          <Card className="bg-gray-900/50 border-gray-700">
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm text-gray-400">
                                Entity Information
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
                                    Account Holder
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-gray-400" />
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-white font-mono">
                                    {entity.identifier}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    Identifier
                                  </p>
                                </div>
                              </div>

                              {/* Type-specific information */}
                              {entity.bank_name && (
                                <div className="flex items-center gap-2">
                                  <CreditCard className="h-4 w-4 text-gray-400" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-white">
                                      {entity.bank_name}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      Bank
                                    </p>
                                  </div>
                                </div>
                              )}

                              {entity.cryptocurrency && (
                                <div className="flex items-center gap-2">
                                  <Globe className="h-4 w-4 text-gray-400" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-white">
                                      {entity.cryptocurrency}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      Cryptocurrency
                                    </p>
                                  </div>
                                </div>
                              )}

                              {entity.wallet_type && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-gray-400" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-white">
                                      {entity.wallet_type}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      E-Wallet Type
                                    </p>
                                  </div>
                                </div>
                              )}

                              {entity.phone_provider && (
                                <div className="flex items-center gap-2">
                                  <Phone className="h-4 w-4 text-gray-400" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-white">
                                      {entity.phone_provider}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      Provider
                                    </p>
                                  </div>
                                </div>
                              )}

                              {entity.createdAt && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-gray-400" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-white">
                                      {formatDate(entity.createdAt)}
                                    </p>
                                    <p className="text-xs text-gray-400">
                                      Created
                                    </p>
                                  </div>
                                </div>
                              )}
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

                              {entity.priorityScore >= 80 && (
                                <div className="flex items-center gap-2">
                                  <AlertTriangle className="h-4 w-4 text-red-500" />
                                  <span className="text-sm text-red-500">
                                    High-priority entity detected
                                  </span>
                                </div>
                              )}

                              <Separator className="bg-gray-700" />

                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">
                                    Transactions:
                                  </span>
                                  <span className="font-medium text-white">
                                    {entity.transactions.toLocaleString()}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-400">
                                    Total Amount:
                                  </span>
                                  <span className="font-medium text-white">
                                    {formatAmount(entity.totalAmount)}
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Gambling Sites */}
                          {nodeDetail?.gambling_sites &&
                            nodeDetail.gambling_sites.length > 0 && (
                              <Card className="bg-gray-900/50 border-gray-700">
                                <CardHeader className="pb-3">
                                  <CardTitle className="text-sm text-gray-400">
                                    Associated Gambling Sites
                                  </CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-2">
                                    {nodeDetail.gambling_sites.map(
                                      (site, index) => (
                                        <div
                                          key={index}
                                          className="p-2 border border-gray-700 rounded bg-gray-800/30"
                                        >
                                          <p className="text-sm font-medium text-white break-all">
                                            {site}
                                          </p>
                                        </div>
                                      )
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            )}

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
                                Connected Entities
                              </CardTitle>
                              <CardDescription className="text-xs text-gray-500">
                                Entities directly connected to this account
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {isLoadingDetail ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                </div>
                              ) : nodeDetail?.connected_entities &&
                                nodeDetail.connected_entities.length > 0 ? (
                                <div className="space-y-3">
                                  {nodeDetail.connected_entities.map(
                                    (connectedEntityNode, index) => {
                                      // Convert EntityNode to Entity
                                      const connectedEntity =
                                        convertBackendEntityToFrontend(
                                          entityNodeToBackendEntity(
                                            connectedEntityNode
                                          )
                                        );

                                      return (
                                        <div
                                          key={index}
                                          className="flex items-center justify-between p-2 border border-gray-700 rounded bg-gray-800/30 cursor-pointer hover:bg-gray-700/30 transition-colors"
                                          onClick={() =>
                                            onEntitySelect &&
                                            onEntitySelect(connectedEntity)
                                          }
                                        >
                                          <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate text-white font-mono">
                                              {connectedEntity.identifier}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                              {connectedEntity.accountHolder} -{" "}
                                              {connectedEntity.type.replace(
                                                "_",
                                                " "
                                              )}
                                            </p>
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <Badge
                                              variant={
                                                connectedEntity.priorityScore >=
                                                80
                                                  ? "destructive"
                                                  : connectedEntity.priorityScore >=
                                                      60
                                                    ? "secondary"
                                                    : "outline"
                                              }
                                              className="text-xs"
                                            >
                                              {connectedEntity.priorityScore}
                                            </Badge>
                                            <Network className="h-3 w-3 text-gray-500" />
                                          </div>
                                        </div>
                                      );
                                    }
                                  )}
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <Network className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                  <p className="text-sm text-gray-400">
                                    No connected entities found
                                  </p>
                                </div>
                              )}
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
                                Recent Transactions
                              </CardTitle>
                              <CardDescription className="text-xs text-gray-500">
                                Latest transaction activity
                              </CardDescription>
                            </CardHeader>
                            <CardContent>
                              {isLoadingDetail ? (
                                <div className="flex items-center justify-center py-4">
                                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                                </div>
                              ) : nodeDetail ? (
                                <div className="space-y-3">
                                  {/* Outgoing Transactions */}
                                  {nodeDetail.outgoing_transactions.length >
                                    0 && (
                                    <div>
                                      <h4 className="text-xs font-medium text-gray-300 mb-2">
                                        Outgoing (
                                        {
                                          nodeDetail.outgoing_transactions
                                            .length
                                        }
                                        )
                                      </h4>
                                      {nodeDetail.outgoing_transactions
                                        .slice(0, 5)
                                        .map((tx, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center gap-3 py-2"
                                          >
                                            <div className="flex-shrink-0">
                                              <ArrowUpRight className="h-4 w-4 text-red-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-white">
                                                  {formatAmount(tx.amount)}
                                                </p>
                                                <span className="text-xs text-gray-400">
                                                  {formatDate(tx.timestamp)}
                                                </span>
                                              </div>
                                              <p className="text-xs text-gray-500">
                                                To: {tx.to_node.substring(0, 8)}
                                                ...
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}

                                  {/* Incoming Transactions */}
                                  {nodeDetail.incoming_transactions.length >
                                    0 && (
                                    <div>
                                      <h4 className="text-xs font-medium text-gray-300 mb-2">
                                        Incoming (
                                        {
                                          nodeDetail.incoming_transactions
                                            .length
                                        }
                                        )
                                      </h4>
                                      {nodeDetail.incoming_transactions
                                        .slice(0, 5)
                                        .map((tx, index) => (
                                          <div
                                            key={index}
                                            className="flex items-center gap-3 py-2"
                                          >
                                            <div className="flex-shrink-0">
                                              <ArrowDownLeft className="h-4 w-4 text-green-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center justify-between">
                                                <p className="text-sm font-medium text-white">
                                                  {formatAmount(tx.amount)}
                                                </p>
                                                <span className="text-xs text-gray-400">
                                                  {formatDate(tx.timestamp)}
                                                </span>
                                              </div>
                                              <p className="text-xs text-gray-500">
                                                From:{" "}
                                                {tx.from_node.substring(0, 8)}
                                                ...
                                              </p>
                                            </div>
                                          </div>
                                        ))}
                                    </div>
                                  )}

                                  {nodeDetail.incoming_transactions.length ===
                                    0 &&
                                    nodeDetail.outgoing_transactions.length ===
                                      0 && (
                                      <div className="text-center py-4">
                                        <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                        <p className="text-sm text-gray-400">
                                          No transactions found
                                        </p>
                                      </div>
                                    )}
                                </div>
                              ) : (
                                <div className="text-center py-4">
                                  <Activity className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                  <p className="text-sm text-gray-400">
                                    No activity data available
                                  </p>
                                </div>
                              )}
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
                      No Entity Selected
                    </h3>
                    <p className="text-sm text-gray-400 max-w-xs">
                      Click on a node in the network graph to view detailed
                      entity information.
                    </p>
                  </div>
                  <div className="text-xs text-gray-500">
                    Select an entity to view:
                    <ul className="mt-2 space-y-1 text-left">
                      <li>• Detailed entity information</li>
                      <li>• Connected entities and relationships</li>
                      <li>• Recent transaction activity</li>
                      <li>• Associated gambling sites</li>
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
