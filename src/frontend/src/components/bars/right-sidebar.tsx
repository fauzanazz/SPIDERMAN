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

interface RightSidebarProps {
  selectedEntity: Entity;
  currentView: "network" | "geospatial";
}

const mockEntityDetails = {
  id: "BCA-7829****1234",
  type: "Bank Account",
  riskScore: 85,
  status: "High Risk",
  accountHolder: "John Doe",
  phoneNumber: "+62812****5678",
  registrationLocation: "Jakarta Selatan",
  createdAt: "2024-01-10",
  lastActivity: "2024-01-15 14:30",
  connections: 12,
  transactions: 247,
  totalAmount: "Rp 2,450,000,000",
};

const linkedEntities = [
  {
    id: "OVO-081234****89",
    type: "E-Wallet",
    relationship: "Same Phone",
    riskScore: 72,
  },
  {
    id: "QRIS-MRC001234",
    type: "QRIS Code",
    relationship: "Transaction",
    riskScore: 91,
  },
  {
    id: "+62812****5678",
    type: "Phone Number",
    relationship: "Registration",
    riskScore: 68,
  },
];

const recentActivity = [
  { time: "14:30", event: "High-risk transaction", severity: "high" },
  { time: "13:45", event: "Multiple small transfers", severity: "medium" },
  { time: "12:15", event: "Account verification", severity: "low" },
  { time: "11:30", event: "Login from new device", severity: "medium" },
];

export function RightSidebar({
  selectedEntity,
  currentView,
}: RightSidebarProps) {
  const [activeTab, setActiveTab] = useState("details");

  // Use mock data if no entity is selected
  const entity = selectedEntity || mockEntityDetails;

  return (
    <div className="w-80 border-l bg-background/50 backdrop-blur">
      <div className="h-full flex flex-col">
        {/* Entity Header */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900">
              <CreditCard className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{entity.id}</h3>
              <p className="text-sm text-muted-foreground">{entity.type}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 mb-3">
            <Badge variant="destructive" className="text-xs">
              Risk: {entity.riskScore}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {entity.status}
            </Badge>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Connections:</span>
              <span className="font-medium">{entity.connections}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Activity:</span>
              <span className="font-medium">2h ago</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1">
          <div className="px-4 pt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details" className="text-xs">
                Details
              </TabsTrigger>
              <TabsTrigger value="network" className="text-xs">
                Network
              </TabsTrigger>
              <TabsTrigger value="activity" className="text-xs">
                Activity
              </TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4">
              <TabsContent value="details" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Entity Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {entity.accountHolder}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Account Holder
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {entity.phoneNumber}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Phone Number
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {entity.registrationLocation}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Location
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          {entity.createdAt}
                        </p>
                        <p className="text-xs text-muted-foreground">Created</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Risk Assessment</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm">Overall Risk</span>
                        <span className="text-sm font-medium">
                          {entity.riskScore}/100
                        </span>
                      </div>
                      <Progress value={entity.riskScore} className="h-2" />
                    </div>

                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">
                        High-risk patterns detected
                      </span>
                    </div>

                    <Separator />

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Transactions:
                        </span>
                        <span className="font-medium">
                          {entity.transactions}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Total Amount:
                        </span>
                        <span className="font-medium">
                          {entity.totalAmount}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button className="flex-1" size="sm">
                    <Eye className="mr-2 h-4 w-4" />
                    Full Profile
                  </Button>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="network" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Connected Entities
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Entities linked to this account
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {linkedEntities.map((linkedEntity, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {linkedEntity.id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {linkedEntity.relationship}
                            </p>
                          </div>
                          <Badge
                            variant={
                              linkedEntity.riskScore >= 80
                                ? "destructive"
                                : linkedEntity.riskScore >= 60
                                  ? "secondary"
                                  : "outline"
                            }
                            className="text-xs"
                          >
                            {linkedEntity.riskScore}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">
                      Network Statistics
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Direct Connections:
                      </span>
                      <span className="font-medium">12</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">2nd Degree:</span>
                      <span className="font-medium">47</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Cluster Size:
                      </span>
                      <span className="font-medium">156</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-4 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Recent Activity</CardTitle>
                    <CardDescription className="text-xs">
                      Latest events and transactions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentActivity.map((activity, index) => (
                        <div key={index} className="flex gap-3">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 ${
                              activity.severity === "high"
                                ? "bg-red-500"
                                : activity.severity === "medium"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">
                                {activity.event}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                {activity.time}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Activity Trends</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Today:</span>
                        <span className="font-medium">23 events</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          This Week:
                        </span>
                        <span className="font-medium">156 events</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          High Risk:
                        </span>
                        <span className="font-medium text-red-600">
                          12 events
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </div>
    </div>
  );
}
