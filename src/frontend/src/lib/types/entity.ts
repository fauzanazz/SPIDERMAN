const EntityType = {
  BANK_ACCOUNT: "bank_account",
  E_WALLET: "e_wallet",
  QRIS: "qris",
  PHONE_NUMBER: "phone_number",
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
  location: string;
  name: string;
  accountHolder: string;
  type: EntityType;
  specificInformation:
    | BankAccountProvider
    | EWalletProvider
    | PhoneProvider
    | QRISProvider;
  priorityScore: number;
  connections: number;
  lastActivity: string;
  createdAt: string;
  phoneNumber: string;
  transactions: number;
  totalAmount: number;
  linkedEntities: Entity[];
  recentActivity: Activity[];
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

export {
  type Entity,
  EntityType,
  PriorityLevel,
  SpecificEntityInformation,
  type BankAccountProvider,
  type EWalletProvider,
  type PhoneProvider,
  type QRISProvider,
  type SpecificEntityInformationType,
};
