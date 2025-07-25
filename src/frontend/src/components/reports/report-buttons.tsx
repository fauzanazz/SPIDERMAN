// src/frontend/src/components/reports/report-buttons.tsx - Example usage of React Query report hooks
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Download, FileText } from "lucide-react";
import {
  useSingleReport,
  useBatchReport,
  useBatchReportByBank,
  useReportStatus,
} from "@/lib/api/report-api";
import type { Entity } from "@/lib/types/entity";

interface ReportButtonsProps {
  selectedEntities: Entity[];
  selectedEntity?: Entity | null;
}

export function ReportButtons({
  selectedEntities,
  selectedEntity,
}: ReportButtonsProps) {
  const [reportId, ] = useState<string>("");

  const singleReportMutation = useSingleReport();
  const batchReportMutation = useBatchReport();
  const batchReportByBankMutation = useBatchReportByBank();

  // Query for report status (only when reportId is available)
  const { data: reportStatus, isLoading: isStatusLoading } = useReportStatus(
    reportId,
    !!reportId && reportId.length > 0
  );

  // Handle single report generation
  const handleSingleReport = async () => {
    if (!selectedEntity) return;

    const params = {
      oss_key: (selectedEntity.additional_info?.oss_key as string) || "",
      nomor_rekening: selectedEntity.identifier,
      pemilik_rekening: selectedEntity.accountHolder,
      nama_bank:
        selectedEntity.bank_name ||
        selectedEntity.specificInformation ||
        "Unknown",
    };

    try {
      await singleReportMutation.mutateAsync(params);
    } catch (error) {
      console.error("Failed to generate single report:", error);
    }
  };

  // Handle batch report generation
  const handleBatchReport = async () => {
    if (selectedEntities.length === 0) return;

    try {
      await batchReportMutation.mutateAsync(selectedEntities);
    } catch (error) {
      console.error("Failed to generate batch reports:", error);
    }
  };

  // Handle batch report by bank
  const handleBatchReportByBank = async () => {
    if (selectedEntities.length === 0) return;

    // Group by bank and generate report for first bank as example
    const entitiesByBank = selectedEntities.reduce(
      (acc, entity) => {
        const bankName =
          entity.bank_name || entity.specificInformation || "Unknown";
        if (!acc[bankName]) acc[bankName] = [];
        acc[bankName].push(entity);
        return acc;
      },
      {} as Record<string, Entity[]>
    );

    const firstBank = Object.keys(entitiesByBank)[0];
    const bankEntities = entitiesByBank[firstBank];

    const request = {
      nama_bank: firstBank,
      accounts: bankEntities.map((entity) => ({
        nomor_rekening: entity.identifier,
        pemilik_rekening: entity.accountHolder,
        oss_key: (entity.additional_info?.oss_key as string) || "",
      })),
    };

    try {
      await batchReportByBankMutation.mutateAsync(request);
    } catch (error) {
      console.error("Failed to generate batch report by bank:", error);
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-sm text-gray-400">
          Report Generation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Single Report */}
        <Button
          onClick={handleSingleReport}
          disabled={!selectedEntity || singleReportMutation.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          {singleReportMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Single Report
        </Button>

        {/* Batch Report */}
        <Button
          onClick={handleBatchReport}
          disabled={
            selectedEntities.length === 0 || batchReportMutation.isPending
          }
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          {batchReportMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Batch Report ({selectedEntities.length})
        </Button>

        {/* Batch Report by Bank */}
        <Button
          onClick={handleBatchReportByBank}
          disabled={
            selectedEntities.length === 0 || batchReportByBankMutation.isPending
          }
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          {batchReportByBankMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Batch by Bank
        </Button>

        {/* Report Status Display */}
        {reportId && (
          <div className="text-xs text-gray-400 mt-2">
            {isStatusLoading ? (
              <div className="flex items-center">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Checking status...
              </div>
            ) : reportStatus ? (
              <div>
                Status: {reportStatus.status} ({reportStatus.progress}%)
              </div>
            ) : null}
          </div>
        )}

        {/* Success/Error Messages */}
        {singleReportMutation.isSuccess && (
          <div className="text-xs text-green-400">
            Single report generated successfully!
          </div>
        )}
        {batchReportMutation.isSuccess && (
          <div className="text-xs text-green-400">
            Batch reports generated successfully!
          </div>
        )}
        {(singleReportMutation.isError ||
          batchReportMutation.isError ||
          batchReportByBankMutation.isError) && (
          <div className="text-xs text-red-400">
            Failed to generate report. Please try again.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
