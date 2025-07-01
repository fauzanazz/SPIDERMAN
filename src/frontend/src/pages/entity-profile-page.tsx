"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  Calendar,
  CreditCard,
  MapPin,
  Phone,
  User,
} from "lucide-react";

const entityData = {
  id: "BCA-7829****1234",
  type: "Bank Account",
  riskScore: 85,
  status: "High Risk",
  createdAt: "2024-01-10",
  lastActivity: "2024-01-15 14:30",
  details: {
    bankName: "Bank Central Asia",
    accountHolder: "John Doe",
    phoneNumber: "+62812****5678",
    registrationLocation: "Jakarta Selatan",
    kycStatus: "Verified",
  },
};

const linkedEntities = [
  {
    id: "OVO-081234****89",
    type: "E-Wallet",
    relationship: "Same Phone Number",
    riskScore: 72,
    lastSeen: "2024-01-14",
  },
  {
    id: "QRIS-MRC001234",
    type: "QRIS Code",
    relationship: "Transaction History",
    riskScore: 91,
    lastSeen: "2024-01-15",
  },
  {
    id: "+62812****5678",
    type: "Phone Number",
    relationship: "Registration",
    riskScore: 68,
    lastSeen: "2024-01-15",
  },
];

const timeline = [
  {
    date: "2024-01-15 14:30",
    event: "High-risk transaction detected",
    details: "Large transfer to unverified account",
    severity: "high",
  },
  {
    date: "2024-01-14 09:15",
    event: "Multiple small transactions",
    details: "Pattern consistent with structuring",
    severity: "medium",
  },
  {
    date: "2024-01-10 16:45",
    event: "Account created",
    details: "New account registration",
    severity: "low",
  },
];

export function EntityProfilePage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      {/* Entity Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900">
                <CreditCard className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-xl">{entityData.id}</CardTitle>
                <CardDescription>{entityData.type}</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="destructive" className="text-sm">
                Risk Score: {entityData.riskScore}
              </Badge>
              <Badge variant="outline">{entityData.status}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {entityData.details.accountHolder}
                </p>
                <p className="text-xs text-muted-foreground">Account Holder</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {entityData.details.phoneNumber}
                </p>
                <p className="text-xs text-muted-foreground">Phone Number</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {entityData.details.registrationLocation}
                </p>
                <p className="text-xs text-muted-foreground">Location</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">{entityData.createdAt}</p>
                <p className="text-xs text-muted-foreground">Created</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="relationships">Relationships</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="evidence">Raw Evidence</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Entity Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Bank Name:
                  </span>
                  <span className="text-sm font-medium">
                    {entityData.details.bankName}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    KYC Status:
                  </span>
                  <Badge variant="outline">
                    {entityData.details.kycStatus}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Last Activity:
                  </span>
                  <span className="text-sm font-medium">
                    {entityData.lastActivity}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Overall Risk</span>
                    <span className="text-sm font-medium">
                      {entityData.riskScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full"
                      style={{ width: `${entityData.riskScore}%` }}
                    ></div>
                  </div>
                  <div className="flex items-center gap-2 mt-4">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-600">
                      High-risk patterns detected
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="relationships" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Linked Entities</CardTitle>
              <CardDescription>
                Entities connected to this account through various relationships
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Entity ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Risk Score</TableHead>
                    <TableHead>Last Seen</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linkedEntities.map((entity, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{entity.id}</TableCell>
                      <TableCell>{entity.type}</TableCell>
                      <TableCell>{entity.relationship}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entity.riskScore >= 80
                              ? "destructive"
                              : entity.riskScore >= 60
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {entity.riskScore}
                        </Badge>
                      </TableCell>
                      <TableCell>{entity.lastSeen}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Chronological view of entity activities and events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {timeline.map((event, index) => (
                  <div
                    key={index}
                    className="flex gap-4 pb-4 border-b last:border-b-0"
                  >
                    <div
                      className={`w-3 h-3 rounded-full mt-1 ${
                        event.severity === "high"
                          ? "bg-red-500"
                          : event.severity === "medium"
                            ? "bg-yellow-500"
                            : "bg-green-500"
                      }`}
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{event.event}</h4>
                        <span className="text-sm text-muted-foreground">
                          {event.date}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Raw Evidence</CardTitle>
              <CardDescription>
                Screenshots and extracted data from OSINT sources
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Bank Website Screenshot</h4>
                  <div className="bg-muted aspect-video rounded flex items-center justify-center">
                    <span className="text-muted-foreground">
                      Screenshot placeholder
                    </span>
                  </div>
                </div>
                <div className="border rounded-lg p-4">
                  <h4 className="font-medium mb-2">Transaction Data</h4>
                  <div className="bg-muted aspect-video rounded flex items-center justify-center">
                    <span className="text-muted-foreground">
                      Data visualization placeholder
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
