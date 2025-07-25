# src/backend/src/graph_schema.py
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from enum import Enum
from datetime import datetime

class EntityType(str, Enum):
    BANK_ACCOUNT = "bank_account"
    CRYPTO_WALLET = "crypto_wallet" 
    E_WALLET = "e_wallet"
    PHONE_NUMBER = "phone_number"
    QRIS = "qris"

class TransactionDirection(str, Enum):
    INCOMING = "incoming"
    OUTGOING = "outgoing"

# Request Models
class GraphFilters(BaseModel):
    entity_types: Optional[List[EntityType]] = None
    banks: Optional[List[str]] = None  # For bank accounts
    e_wallets: Optional[List[str]] = None  # For e-wallets (OVO, DANA, etc)
    cryptocurrencies: Optional[List[str]] = None  # For crypto wallets
    phone_providers: Optional[List[str]] = None  # For phone numbers
    priority_score_min: Optional[int] = 0
    priority_score_max: Optional[int] = 100
    search_query: Optional[str] = None  # Search by identifier

class NodeCreate(BaseModel):
    identifier: str = Field(..., description="Account number, wallet address, phone number, etc.")
    entity_type: EntityType = Field(..., description="Type of entity")
    account_holder: str = Field(..., description="Name of account holder")
    custom_id: Optional[str] = None  # For upsert functionality
    # Optional fields based on entity type
    bank_name: Optional[str] = None  # For bank accounts
    cryptocurrency: Optional[str] = None  # For crypto wallets
    wallet_type: Optional[str] = None  # For e-wallets (OVO, DANA, etc)
    phone_provider: Optional[str] = None  # For phone numbers
    additional_info: Optional[Dict[str, Any]] = None

class TransactionCreate(BaseModel):
    from_identifier: str = Field(..., description="Source account identifier")
    to_identifier: str = Field(..., description="Destination account identifier")
    amount: float = Field(..., description="Transaction amount")
    timestamp: Optional[datetime] = None
    transaction_type: Optional[str] = "transfer"
    reference: Optional[str] = None

# Response Models
class EntityNode(BaseModel):
    id: str
    identifier: str
    entity_type: EntityType
    account_holder: str
    priority_score: int = 0
    connections: int = 0
    transactions: int = 0
    total_amount: float = 0.0
    last_activity: Optional[str] = None
    created_at: Optional[str] = None
    # Type-specific fields
    bank_name: Optional[str] = None
    cryptocurrency: Optional[str] = None
    wallet_type: Optional[str] = None
    phone_provider: Optional[str] = None
    additional_info: Optional[Dict[str, Any]] = None

class Transaction(BaseModel):
    from_node: str
    to_node: str
    amount: float
    timestamp: str
    transaction_type: str = "transfer"
    reference: Optional[str] = None
    direction: TransactionDirection  # From perspective of queried node

class WebsiteCluster(BaseModel):
    website_url: str
    website_name: str
    entities: List[EntityNode]

class GraphResponse(BaseModel):
    clusters: List[WebsiteCluster]
    standalone_entities: List[EntityNode]  # Entities not linked to any website
    total_entities: int
    total_transactions: int

class NodeDetailResponse(BaseModel):
    entity: EntityNode
    incoming_transactions: List[Transaction]
    outgoing_transactions: List[Transaction]
    connected_entities: List[EntityNode]
    gambling_sites: List[str]  # Sites where this entity appears

class NodeCreateResponse(BaseModel):
    id: str
    entity: EntityNode
    created: bool  # True if created, False if updated

class TransactionCreateResponse(BaseModel):
    success: bool
    from_entity: EntityNode
    to_entity: EntityNode
    transaction: Transaction