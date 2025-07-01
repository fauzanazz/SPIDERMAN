const EntityType = {
  BANK_ACCOUNT: "bank_account",
  E_WALLET: "e_wallet",
  QRIS: "qris",
  PHONE_NUMBER: "phone_number",
} as const;
type EntityType = (typeof EntityType)[keyof typeof EntityType];

const RiskLevel = {
  CRITICAL: "critical",
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
} as const;
type RiskLevel = (typeof RiskLevel)[keyof typeof RiskLevel];

type Entity = {
  id: string;
  name: string;
  accountHolder: string;
  type: EntityType;
  riskScore: number;
};

export { EntityType, RiskLevel, type Entity };
