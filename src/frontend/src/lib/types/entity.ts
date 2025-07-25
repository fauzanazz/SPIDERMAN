// src/frontend/src/lib/types/entity.ts - Updated to match backend
const EntityType = {
  BANK_ACCOUNT: "bank_account",
  CRYPTO_WALLET: "crypto_wallet",
  E_WALLET: "e_wallet",
  PHONE_NUMBER: "phone_number",
  QRIS: "qris",
  OTHERS: "others",
} as const;
type EntityType = (typeof EntityType)[keyof typeof EntityType];

const PriorityLevel = {
  HIGH: "High Priority",
  MEDIUM: "Medium Priority",
  LOW: "Low Priority",
} as const;
type PriorityLevel = (typeof PriorityLevel)[keyof typeof PriorityLevel];

type Activity = {
  id: string;
  event: string;
  time: string;
  severity: PriorityLevel;
};

type Entity = {
  id: string;
  identifier: string; // This is the account number, wallet address, etc.
  location?: string; // Optional now since backend doesn't always have this
  name?: string; // Optional, can be derived from account_holder
  accountHolder: string;
  type: EntityType;
  specificInformation:
    | BankAccountProvider
    | EWalletProvider
    | PhoneProvider
    | QRISProvider
    | CryptoProvider
    | Others;
  priorityScore: number;
  connections: number;
  lastActivity?: string;
  createdAt?: string;
  phoneNumber?: string; // Optional since not all entities have phone numbers
  transactions: number;
  totalAmount: number;
  linkedEntities: Entity[]; // Will be populated from connected_entities
  recentActivity: Activity[]; // Will need to be derived from transaction history

  // Additional backend fields
  bank_name?: string;
  cryptocurrency?: string;
  wallet_type?: string;
  phone_provider?: string;
  additional_info?: Record<string, string | string[]>; // Any other backend-specific fields
};

const SpecificEntityInformation = {
  [EntityType.BANK_ACCOUNT]: [
    "BCA",
    "BNI",
    "BRI",
    "BSI",
    "CIMB Niaga",
    "Danamon",
    "Jago",
    "Mandiri",
    "Panin",
    "Permata",
    "Seabank",
  ],
  [EntityType.E_WALLET]: ["DANA", "Gopay", "LinkAja", "OVO"],
  [EntityType.PHONE_NUMBER]: ["Simpati", "XL"],
  [EntityType.QRIS]: ["QRIS"],
  [EntityType.CRYPTO_WALLET]: ["Bitcoin", "Ethereum", "USDT", "USDC", "BNB"],
  [EntityType.OTHERS]: ["Others"],
} as const;

type SpecificEntityInformationType = typeof SpecificEntityInformation;
type BankAccountProvider =
  SpecificEntityInformationType[typeof EntityType.BANK_ACCOUNT][number];
type EWalletProvider =
  SpecificEntityInformationType[typeof EntityType.E_WALLET][number];
type PhoneProvider =
  SpecificEntityInformationType[typeof EntityType.PHONE_NUMBER][number];
type QRISProvider =
  SpecificEntityInformationType[typeof EntityType.QRIS][number];
type CryptoProvider =
  SpecificEntityInformationType[typeof EntityType.CRYPTO_WALLET][number];
type Others = SpecificEntityInformationType[typeof EntityType.OTHERS][number];

export type BackendEntity = {
  id: string;
  identifier: string;
  entity_type: EntityType;
  account_holder: string;
  bank_name?: BankAccountProvider;
  cryptocurrency?: CryptoProvider;
  wallet_type?: EWalletProvider;
  phone_provider?: PhoneProvider;
  priority_score: number;
  connections: number;
  last_activity?: string;
  created_at?: string;
  transactions: number;
  total_amount: number;
  connected_entities: Entity[]; // Will be populated separately
  additional_info?: Record<string, string | string[]>; // Any other backend-specific fields
};
export function convertBackendEntityToFrontend(
  backendEntity: BackendEntity
): Entity {
  // Determine specificInformation based on entity type
  let specificInformation:
    | BankAccountProvider
    | EWalletProvider
    | PhoneProvider
    | QRISProvider
    | CryptoProvider
    | Others;

  switch (backendEntity.entity_type) {
    case "bank_account":
      specificInformation = (backendEntity.bank_name ||
        "Unknown") as BankAccountProvider;
      break;
    case "e_wallet":
      specificInformation = (backendEntity.wallet_type ||
        "Unknown") as EWalletProvider;
      break;
    case "phone_number":
      specificInformation = (backendEntity.phone_provider ||
        "Unknown") as PhoneProvider;
      break;
    case "qris":
      specificInformation = "QRIS" as QRISProvider;
      break;
    case "crypto_wallet":
      specificInformation = (backendEntity.cryptocurrency ||
        "Unknown") as CryptoProvider;
      break;
    default:
      specificInformation = "Others" as Others; // Default case for any other types
  }

  return {
    id: backendEntity.id,
    identifier: backendEntity.identifier,
    location: "Unknown", 
    name: backendEntity.account_holder,
    accountHolder: backendEntity.account_holder,
    type: backendEntity.entity_type,
    specificInformation,
    priorityScore: backendEntity.priority_score,
    connections: backendEntity.connections,
    lastActivity: backendEntity.last_activity,
    createdAt: backendEntity.created_at,
    phoneNumber:
      backendEntity.entity_type === "phone_number"
        ? backendEntity.identifier
        : undefined,
    transactions: backendEntity.transactions,
    totalAmount: backendEntity.total_amount,
    linkedEntities: [], // Will be populated separately
    recentActivity: [], // Will be populated from transaction history

    bank_name: backendEntity.bank_name,
    cryptocurrency: backendEntity.cryptocurrency,
    wallet_type: backendEntity.wallet_type,
    phone_provider: backendEntity.phone_provider,
    additional_info: backendEntity.additional_info,
  };
}

export {
  type Entity,
  EntityType,
  PriorityLevel,
  SpecificEntityInformation,
  type BankAccountProvider,
  type EWalletProvider,
  type PhoneProvider,
  type QRISProvider,
  type CryptoProvider,
  type SpecificEntityInformationType,
};
