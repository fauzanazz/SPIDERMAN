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
  const [reportId] = useState<string>("");

  // Prepare single report parameters
  const singleReportParams = selectedEntity
    ? {
        oss_key: selectedEntity.ossKey || "",
        nomor_rekening: selectedEntity.identifier,
        pemilik_rekening: selectedEntity.accountHolder,
        nama_bank:
          selectedEntity.bank_name ||
          selectedEntity.specificInformation ||
          "Unknown",
      }
    : undefined;

  // Use the hooks with proper parameters for useQuery pattern
  const singleReportQuery = useSingleReport(singleReportParams);
  const batchReportQuery = useBatchReport(selectedEntities);
  const batchReportByBankQuery = useBatchReportByBank();

  // Query for report status (only when reportId is available)
  const { data: reportStatus, isLoading: isStatusLoading } = useReportStatus(
    reportId,
    !!reportId && reportId.length > 0
  );

  // Handle single report generation
  const handleSingleReport = async () => {
    if (!selectedEntity) return;

    try {
      await singleReportQuery.generateReport();
    } catch (error) {
      console.error("Failed to generate single report:", error);
    }
  };

  // Handle batch report generation
  const handleBatchReport = async () => {
    if (selectedEntities.length === 0) return;

    try {
      await batchReportQuery.generateReport();
    } catch (error) {
      console.error("Failed to generate batch reports:", error);
    }
  };

  // Handle batch report by bank
  const handleBatchReportByBank = async () => {
    if (selectedEntities.length === 0) return;

    try {
      await batchReportByBankQuery.generateReport();
    } catch (error) {
      console.error("Failed to generate batch report by bank:", error);
    }
  };

  return (
    <Card className="bg-gray-900/50 border-gray-700">
      <CardHeader>
        <CardTitle className="text-sm text-gray-400">
          Pembuatan Laporan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Single Report */}
        <Button
          onClick={handleSingleReport}
          disabled={!selectedEntity || singleReportQuery.isPending}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          size="sm"
        >
          {singleReportQuery.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <FileText className="mr-2 h-4 w-4" />
          )}
          Single Report
        </Button>

        {/* Batch Report */}
        <Button
          onClick={handleBatchReport}
          disabled={selectedEntities.length === 0 || batchReportQuery.isPending}
          className="w-full bg-green-600 hover:bg-green-700 text-white"
          size="sm"
        >
          {batchReportQuery.isPending ? (
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
            selectedEntities.length === 0 || batchReportByBankQuery.isPending
          }
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          {batchReportByBankQuery.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Download className="mr-2 h-4 w-4" />
          )}
          Batch berdasarkan Bank
        </Button>

        {/* Report Status Display */}
        {reportId && (
          <div className="text-xs text-gray-400 mt-2">
            {isStatusLoading ? (
              <div className="flex items-center">
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Memeriksa status...
              </div>
            ) : reportStatus ? (
              <div>
                Status: {reportStatus.status} ({reportStatus.progress}%)
              </div>
            ) : null}
          </div>
        )}

        {/* Success/Error Messages */}
        {singleReportQuery.isSuccess && (
          <div className="text-xs text-green-400">
            Laporan tunggal berhasil dibuat!
          </div>
        )}
        {batchReportQuery.isSuccess && (
          <div className="text-xs text-green-400">
            Laporan batch berhasil dibuat!
          </div>
        )}
        {(singleReportQuery.isError ||
          batchReportQuery.isError ||
          batchReportByBankQuery.isError) && (
          <div className="text-xs text-red-400">
            Gagal membuat laporan. Silakan coba lagi.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
