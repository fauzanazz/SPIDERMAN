
import { config } from "@/lib/config";

export interface GraphFilters {
  entity_types?: string[];
  banks?: string[];
  e_wallets?: string[];
  cryptocurrencies?: string[];
  phone_providers?: string[];
  priority_score_min?: number;
  priority_score_max?: number;
  search_query?: string;
}

export interface EntityNode {
  id: string;
  identifier: string;
  entity_type:
    | "bank_account"
    | "crypto_wallet"
    | "e_wallet"
    | "phone_number"
    | "qris";
  account_holder: string;
  priority_score: number;
  connections: number;
  transactions: number;
  total_amount: number;
  last_activity?: string;
  created_at?: string;
  bank_name?: string;
  cryptocurrency?: string;
  wallet_type?: string;
  phone_provider?: string;
  additional_info?: Record<string, any>;
}

export interface Transaction {
  from_node: string;
  to_node: string;
  amount: number;
  timestamp: string;
  transaction_type: string;
  reference?: string;
  direction: "incoming" | "outgoing";
}

export interface WebsiteCluster {
  website_url: string;
  website_name: string;
  entities: EntityNode[];
}

export interface GraphResponse {
  clusters: WebsiteCluster[];
  standalone_entities: EntityNode[];
  total_entities: number;
  total_transactions: number;
}

export interface NodeDetailResponse {
  entity: EntityNode;
  incoming_transactions: Transaction[];
  outgoing_transactions: Transaction[];
  connected_entities: EntityNode[];
  gambling_sites: string[];
}

export interface NodeCreate {
  identifier: string;
  entity_type:
    | "bank_account"
    | "crypto_wallet"
    | "e_wallet"
    | "phone_number"
    | "qris";
  account_holder: string;
  custom_id?: string;
  bank_name?: string;
  cryptocurrency?: string;
  wallet_type?: string;
  phone_provider?: string;
  additional_info?: Record<string, any>;
}

export interface TransactionCreate {
  from_identifier: string;
  to_identifier: string;
  amount: number;
  timestamp?: string;
  transaction_type?: string;
  reference?: string;
}

// API Client Class
export class GraphApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = config.apiURL;
  }

  private buildQueryParams(filters: GraphFilters): URLSearchParams {
    const params = new URLSearchParams();

    if (filters.entity_types?.length) {
      params.set("entity_types", filters.entity_types.join(","));
    }
    if (filters.banks?.length) {
      params.set("banks", filters.banks.join(","));
    }
    if (filters.e_wallets?.length) {
      params.set("e_wallets", filters.e_wallets.join(","));
    }
    if (filters.cryptocurrencies?.length) {
      params.set("cryptocurrencies", filters.cryptocurrencies.join(","));
    }
    if (filters.phone_providers?.length) {
      params.set("phone_providers", filters.phone_providers.join(","));
    }
    if (filters.priority_score_min !== undefined) {
      params.set("priority_score_min", filters.priority_score_min.toString());
    }
    if (filters.priority_score_max !== undefined) {
      params.set("priority_score_max", filters.priority_score_max.toString());
    }
    if (filters.search_query) {
      params.set("search_query", filters.search_query);
    }

    return params;
  }

  async getWholeGraph(filters: GraphFilters = {}): Promise<GraphResponse> {
    const params = this.buildQueryParams(filters);
    const url = `${this.baseUrl}/graph/entities?${params.toString()}`;

    const response = await fetch(url);
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch graph: ${error}`);
    }

    return response.json();
  }

  async getNodeDetail(nodeId: string): Promise<NodeDetailResponse> {
    const url = `${this.baseUrl}/graph/entities/${nodeId}`;

    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error("Node not found");
      }
      const error = await response.text();
      throw new Error(`Failed to fetch node details: ${error}`);
    }

    return response.json();
  }

  async createOrUpdateNode(nodeData: NodeCreate): Promise<any> {
    const url = `${this.baseUrl}/graph/entities`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(nodeData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create/update node: ${error}`);
    }

    return response.json();
  }

  async createTransaction(transactionData: TransactionCreate): Promise<any> {
    const url = `${this.baseUrl}/graph/transactions`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(transactionData),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create transaction: ${error}`);
    }

    return response.json();
  }
}

// Create singleton instance
export const graphApi = new GraphApiClient();

// Hook for React Query integration
export const useGraphData = (filters: GraphFilters) => {
  return {
    queryKey: ["graph-data", filters],
    queryFn: () => graphApi.getWholeGraph(filters),
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  };
};

export const useNodeDetail = (nodeId: string) => {
  return {
    queryKey: ["node-detail", nodeId],
    queryFn: () => graphApi.getNodeDetail(nodeId),
    enabled: !!nodeId,
    staleTime: 60000, // 1 minute
  };
};
