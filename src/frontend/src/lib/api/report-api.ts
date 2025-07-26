// src/frontend/src/lib/api/report-api.ts - Batch report generation utility
import { config } from "@/lib/config";
import type { Entity } from "@/lib/types/entity";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useEffect } from "react";

export interface BatchReportRequest {
  nama_bank: string;
  accounts: {
    nomor_rekening: string;
    pemilik_rekening: string;
    oss_key: string;
  }[];
}

export interface SingleReportParams {
  oss_key: string;
  nomor_rekening: string;
  pemilik_rekening: string;
  nama_bank: string;
}

export class ReportApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiURL;
  }

  async generateSingleReport(params: SingleReportParams): Promise<Blob> {
    const queryParams = new URLSearchParams({
      oss_key: params.oss_key,
      nomor_rekening: params.nomor_rekening,
      pemilik_rekening: params.pemilik_rekening,
      nama_bank: params.nama_bank,
    });

    const response = await fetch(
      `${this.baseUrl}/report?${queryParams.toString()}`,
      {
        method: "GET",
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to generate single report: ${error}`);
    }

    return response.blob();
  }

  async generateBatchReport(request: BatchReportRequest): Promise<Blob> {
    const response = await fetch(`${this.baseUrl}/report/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to generate batch report: ${error}`);
    }

    return response.blob();
  }

  async getReportStatus(
    reportId: string
  ): Promise<{ status: string; progress: number }> {
    const response = await fetch(`${this.baseUrl}/report/status/${reportId}`, {
      method: "GET",
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get report status: ${error}`);
    }

    return response.json();
  }

  async downloadBlob(blob: Blob, filename: string): Promise<void> {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  async generateBatchReportsFromEntities(entities: Entity[]): Promise<void> {
    try {
      // Show initial loading toast
      const loadingToast = toast.loading("Generating Batch Reports", {
        description: `Processing ${entities.length} entities...`,
      });

      // Group entities by bank name for batch reports
      const entitiesByBank = entities.reduce(
        (acc, entity) => {
          const bankName =
            entity.bank_name || entity.specificInformation || "Unknown";
          if (!acc[bankName]) {
            acc[bankName] = [];
          }
          acc[bankName].push(entity);
          return acc;
        },
        {} as Record<string, Entity[]>
      );

      const results: { bankName: string; success: boolean; error?: string }[] =
        [];

      // Generate reports for each bank
      for (const [bankName, bankEntities] of Object.entries(entitiesByBank)) {
        try {
          const reportData: BatchReportRequest = {
            nama_bank: bankName,
            accounts: bankEntities.map((entity) => ({
              nomor_rekening: entity.identifier,
              pemilik_rekening: entity.accountHolder,
              // Try to get OSS key from various possible locations in the entity data
              oss_key: (() => {
                const ossKey = entity.additional_info?.oss_key;
                if (typeof ossKey === "string") return ossKey;
                if (Array.isArray(ossKey) && ossKey.length > 0)
                  return ossKey[0];
                return ""; // Fallback to empty string if no OSS key available
              })(),
            })),
          };

          const blob = await this.generateBatchReport(reportData);
          const timestamp = new Date().toISOString().split("T")[0];
          const filename = `Batch_Report_${bankName}_${timestamp}.pdf`;

          await this.downloadBlob(blob, filename);

          results.push({ bankName, success: true });
          console.log(
            `Generated batch report for ${bankName} with ${bankEntities.length} entities`
          );
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Unknown error";
          results.push({ bankName, success: false, error: errorMessage });
          console.error(
            `Failed to generate batch report for ${bankName}:`,
            error
          );
        }
      }

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      // Show summary results
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        toast.success("All Batch Reports Generated", {
          description: `Successfully generated ${successCount} batch report(s) for ${entities.length} selected entities`,
          duration: 6000,
        });
      } else {
        const failedBanks = results
          .filter((r) => !r.success)
          .map((r) => r.bankName)
          .join(", ");

        toast.warning("Partial Batch Report Success", {
          description: `Generated ${successCount} reports successfully. Failed for: ${failedBanks}`,
          duration: 8000,
        });

        // Show detailed error for failed reports
        results
          .filter((r) => !r.success)
          .forEach((result) => {
            toast.error(`Failed: ${result.bankName}`, {
              description: result.error || "Unknown error occurred",
              duration: 5000,
            });
          });
      }
    } catch (error) {
      console.error("Error generating batch reports:", error);
      toast.error("Batch Report Generation Failed", {
        description: "Failed to generate batch reports. Please try again.",
        duration: 7000,
      });
      throw new Error("Failed to generate batch reports. Please try again.");
    }
  }
}

// Create singleton instance
export const reportApi = new ReportApiClient();

// React Query hooks
export const useSingleReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SingleReportParams) => {
      const blob = await reportApi.generateSingleReport(params);
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `Report_${params.nama_bank}_${params.nomor_rekening}_${timestamp}.pdf`;
      await reportApi.downloadBlob(blob, filename);
      return { success: true, filename, params };
    },
    onSuccess: (data) => {
      toast.success("Report Generated Successfully", {
        description: `Single report for ${data.params.nama_bank} - ${data.params.nomor_rekening} has been downloaded as ${data.filename}`,
        duration: 5000,
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error: Error) => {
      toast.error("Report Generation Failed", {
        description: `Failed to generate single report: ${error.message}`,
        duration: 7000,
      });
      console.error("Error generating single report:", error);
    },
  });
};

export const useBatchReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entities: Entity[]) => {
      await reportApi.generateBatchReportsFromEntities(entities);
      return { success: true, entitiesCount: entities.length };
    },
    onSuccess: (data) => {
      toast.success("Batch Reports Generated", {
        description: `Successfully generated batch reports for ${data.entitiesCount} entities`,
        duration: 5000,
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      queryClient.invalidateQueries({ queryKey: ["graph-data"] });
    },
    onError: (error: Error) => {
      toast.error("Batch Report Generation Failed", {
        description: `Failed to generate batch reports: ${error.message}`,
        duration: 7000,
      });
      console.error("Error generating batch reports:", error);
    },
  });
};

export const useBatchReportByBank = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (request: BatchReportRequest) => {
      const blob = await reportApi.generateBatchReport(request);
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `Batch_Report_${request.nama_bank}_${timestamp}.pdf`;
      await reportApi.downloadBlob(blob, filename);
      return {
        success: true,
        filename,
        accountsCount: request.accounts.length,
        bankName: request.nama_bank,
      };
    },
    onSuccess: (data) => {
      toast.success("Bank Report Generated", {
        description: `Batch report for ${data.bankName} with ${data.accountsCount} accounts has been downloaded as ${data.filename}`,
        duration: 5000,
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error: Error) => {
      toast.error("Bank Report Generation Failed", {
        description: `Failed to generate bank batch report: ${error.message}`,
        duration: 7000,
      });
      console.error("Error generating batch report by bank:", error);
    },
  });
};

export const useReportStatus = (reportId: string, enabled: boolean = true) => {
  const query = useQuery({
    queryKey: ["report-status", reportId],
    queryFn: () => reportApi.getReportStatus(reportId),
    enabled: enabled && !!reportId,
    refetchInterval: (query) => {
      // Stop polling when report is completed
      return query.state.data?.status === "completed" ? false : 2000;
    },
    staleTime: 1000, // Consider data stale after 1 second
  });

  // Handle success/error notifications using useEffect pattern
  useEffect(() => {
    if (query.data?.status === "completed" && query.isSuccess) {
      toast.success("Report Processing Complete", {
        description: `Report ${reportId} has been completed successfully`,
        duration: 4000,
      });
    }
  }, [query.data?.status, query.isSuccess, reportId]);

  useEffect(() => {
    if (query.error) {
      toast.error("Report Status Error", {
        description: `Failed to get status for report ${reportId}: ${query.error.message}`,
        duration: 5000,
      });
    }
  }, [query.error, reportId]);

  return query;
};

// New hook for getting all reports history
export const useReportsHistory = () => {
  return useQuery({
    queryKey: ["reports-history"],
    queryFn: async () => {
      // This would need to be implemented in the backend
      const response = await fetch(`${config.apiURL}/reports/history`);
      if (!response.ok) {
        throw new Error("Failed to fetch reports history");
      }
      return response.json();
    },
    staleTime: 30000, // 30 seconds
    retry: 3,
  });
};

// New hook for getting available report templates
export const useReportTemplates = () => {
  return useQuery({
    queryKey: ["report-templates"],
    queryFn: async () => {
      // This would need to be implemented in the backend
      const response = await fetch(`${config.apiURL}/reports/templates`);
      if (!response.ok) {
        throw new Error("Failed to fetch report templates");
      }
      return response.json();
    },
    staleTime: 300000, // 5 minutes - templates don't change often
    retry: 2,
  });
};

// Hook for getting report queue status
export const useReportQueue = () => {
  return useQuery({
    queryKey: ["report-queue"],
    queryFn: async () => {
      const response = await fetch(`${config.apiURL}/reports/queue`);
      if (!response.ok) {
        throw new Error("Failed to fetch report queue");
      }
      return response.json();
    },
    staleTime: 5000, // 5 seconds
    refetchInterval: 10000, // Poll every 10 seconds
    retry: 2,
  });
};

// Hook for canceling a report
export const useCancelReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(
        `${config.apiURL}/reports/${reportId}/cancel`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to cancel report");
      }
      return response.json();
    },
    onSuccess: (_data, reportId) => {
      toast.success("Report Cancelled", {
        description: `Report ${reportId} has been cancelled successfully`,
        duration: 4000,
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["report-status", reportId] });
      queryClient.invalidateQueries({ queryKey: ["report-queue"] });
      queryClient.invalidateQueries({ queryKey: ["reports-history"] });
    },
    onError: (error: Error, reportId) => {
      toast.error("Cancel Report Failed", {
        description: `Failed to cancel report ${reportId}: ${error.message}`,
        duration: 5000,
      });
    },
  });
};

// Hook for retrying a failed report
export const useRetryReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reportId: string) => {
      const response = await fetch(
        `${config.apiURL}/reports/${reportId}/retry`,
        {
          method: "POST",
        }
      );
      if (!response.ok) {
        throw new Error("Failed to retry report");
      }
      return response.json();
    },
    onSuccess: (_data, reportId) => {
      toast.success("Report Retried", {
        description: `Report ${reportId} has been queued for retry`,
        duration: 4000,
      });
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["report-status", reportId] });
      queryClient.invalidateQueries({ queryKey: ["report-queue"] });
      queryClient.invalidateQueries({ queryKey: ["reports-history"] });
    },
    onError: (error: Error, reportId) => {
      toast.error("Retry Report Failed", {
        description: `Failed to retry report ${reportId}: ${error.message}`,
        duration: 5000,
      });
    },
  });
};
