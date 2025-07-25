// src/frontend/src/lib/api/report-api.ts - Batch report generation utility
import { config } from "@/lib/config";
import type { Entity } from "@/lib/types/entity";
import { useMutation, useQuery } from "@tanstack/react-query";

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

      // Show summary
      const successCount = results.filter((r) => r.success).length;
      const failCount = results.filter((r) => !r.success).length;

      if (failCount === 0) {
        alert(
          `Successfully generated ${successCount} batch report(s) for ${entities.length} selected entities`
        );
      } else {
        const failedBanks = results
          .filter((r) => !r.success)
          .map((r) => r.bankName)
          .join(", ");
        alert(
          `Generated ${successCount} reports successfully. Failed for: ${failedBanks}`
        );
      }
    } catch (error) {
      console.error("Error generating batch reports:", error);
      throw new Error("Failed to generate batch reports. Please try again.");
    }
  }
}

// Create singleton instance
export const reportApi = new ReportApiClient();

// React Query hooks
export const useSingleReport = () => {
  return useMutation({
    mutationFn: async (params: SingleReportParams) => {
      const blob = await reportApi.generateSingleReport(params);
      const timestamp = new Date().toISOString().split("T")[0];
      const filename = `Report_${params.nama_bank}_${params.nomor_rekening}_${timestamp}.pdf`;
      await reportApi.downloadBlob(blob, filename);
      return { success: true, filename };
    },
    onError: (error) => {
      console.error("Error generating single report:", error);
    },
    onSuccess: (data) => {
      console.log(`Single report generated: ${data.filename}`);
    },
  });
};

export const useBatchReport = () => {
  return useMutation({
    mutationFn: async (entities: Entity[]) => {
      await reportApi.generateBatchReportsFromEntities(entities);
      return { success: true, entitiesCount: entities.length };
    },
    onError: (error) => {
      console.error("Error generating batch reports:", error);
    },
    onSuccess: (data) => {
      console.log(`Batch reports generated for ${data.entitiesCount} entities`);
    },
  });
};

export const useBatchReportByBank = () => {
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
      };
    },
    onError: (error) => {
      console.error("Error generating batch report by bank:", error);
    },
    onSuccess: (data) => {
      console.log(
        `Batch report generated: ${data.filename} for ${data.accountsCount} accounts`
      );
    },
  });
};

export const useReportStatus = (reportId: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ["report-status", reportId],
    queryFn: () => reportApi.getReportStatus(reportId),
    enabled: enabled && !!reportId,
    refetchInterval: (query) => {
      // Stop polling when report is completed
      return query.state.data?.status === "completed" ? false : 2000;
    },
    staleTime: 1000, // Consider data stale after 1 second
  });
};
