# src/backend/src/graph_database.py
import logging
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from .database import db_handler
from .graph_schema import (
    EntityType, GraphFilters, NodeCreate, TransactionCreate,
    EntityNode, Transaction, WebsiteCluster, GraphResponse,
    NodeDetailResponse, TransactionDirection
)

logger = logging.getLogger(__name__)

class GraphDatabaseHandler:
    def __init__(self):
        self.db = db_handler
    
    def _get_node_label_and_identifier_field(self, entity_type: EntityType) -> Tuple[str, str]:
        """Map entity type to Neo4j node label and identifier field"""
        mapping = {
            EntityType.BANK_ACCOUNT: ("AkunMencurigakan", "nomor_rekening"),
            EntityType.CRYPTO_WALLET: ("CryptoWallet", "alamat_wallet"),
            EntityType.E_WALLET: ("EWallet", "wallet_number"),
            EntityType.PHONE_NUMBER: ("PhoneNumber", "phone_number"),
            EntityType.QRIS: ("QRISCode", "qris_code")
        }
        return mapping.get(entity_type, ("UnknownEntity", "identifier"))
    
    def _build_filter_conditions(self, filters: GraphFilters) -> Tuple[str, Dict[str, Any]]:
        """Build Neo4j WHERE conditions from filters"""
        conditions = []
        params = {}
        
        if filters.entity_types:
            entity_labels = []
            for entity_type in filters.entity_types:
                label, _ = self._get_node_label_and_identifier_field(entity_type)
                entity_labels.append(label)
            
            if len(entity_labels) == 1:
                conditions.append(f"entity:{entity_labels[0]}")
            else:
                label_conditions = " OR ".join([f"entity:{label}" for label in entity_labels])
                conditions.append(f"({label_conditions})")
        
        # Bank name filter
        if filters.banks:
            conditions.append("(entity.nama_bank IN $banks OR entity.bank_name IN $banks)")
            params["banks"] = filters.banks
        
        # E-wallet filter
        if filters.e_wallets:
            conditions.append("entity.wallet_type IN $e_wallets")
            params["e_wallets"] = filters.e_wallets
        
        # Cryptocurrency filter
        if filters.cryptocurrencies:
            conditions.append("entity.cryptocurrency IN $cryptocurrencies")
            params["cryptocurrencies"] = filters.cryptocurrencies
        
        # Phone provider filter
        if filters.phone_providers:
            conditions.append("entity.phone_provider IN $phone_providers")
            params["phone_providers"] = filters.phone_providers
        
        # Priority score filter
        if filters.priority_score_min is not None or filters.priority_score_max is not None:
            if filters.priority_score_min is not None:
                conditions.append("coalesce(entity.priority_score, 0) >= $priority_min")
                params["priority_min"] = filters.priority_score_min
            if filters.priority_score_max is not None:
                conditions.append("coalesce(entity.priority_score, 0) <= $priority_max")
                params["priority_max"] = filters.priority_score_max
        
        # Search query filter
        if filters.search_query:
            search_conditions = [
                "entity.nomor_rekening CONTAINS $search",
                "entity.alamat_wallet CONTAINS $search", 
                "entity.wallet_number CONTAINS $search",
                "entity.phone_number CONTAINS $search",
                "entity.qris_code CONTAINS $search",
                "entity.pemilik_rekening CONTAINS $search",
                "entity.account_holder CONTAINS $search"
            ]
            conditions.append(f"({' OR '.join(search_conditions)})")
            params["search"] = filters.search_query
        
        where_clause = " AND ".join(conditions) if conditions else "true"
        return where_clause, params
    
    def _calculate_aggregated_fields(self, entity_id: str) -> Dict[str, Any]:
        """Calculate connections, transactions, and total_amount for an entity"""
        if not self.db._check_connection():
            return {"connections": 0, "transactions": 0, "total_amount": 0.0}
        
        query = """
        MATCH (entity)
        WHERE elementId(entity) = $entity_id
        OPTIONAL MATCH (entity)-[t:TRANSFERS_TO]-(other)
        WITH entity, 
             count(DISTINCT other) as connections,
             count(t) as transactions,
             sum(coalesce(t.amount, 0)) as total_amount
        RETURN connections, transactions, total_amount
        """
        
        try:
            with self.db.driver.session() as session:
                result = session.run(query, {"entity_id": entity_id})
                record = result.single()
                if record:
                    return {
                        "connections": record["connections"] or 0,
                        "transactions": record["transactions"] or 0, 
                        "total_amount": record["total_amount"] or 0.0
                    }
                return {"connections": 0, "transactions": 0, "total_amount": 0.0}
        except Exception as e:
            logger.error(f"Error calculating aggregated fields: {e}")
            return {"connections": 0, "transactions": 0, "total_amount": 0.0}
    
    def _node_to_entity(self, node_record, calculate_aggregates=True) -> EntityNode:
        """Convert Neo4j node record to EntityNode"""
        node = node_record["entity"]
        node_props = dict(node)
        node_id = str(node.element_id)
        
        # Determine entity type based on node labels
        labels = list(node.labels)
        entity_type = EntityType.BANK_ACCOUNT  # default
        
        if "CryptoWallet" in labels:
            entity_type = EntityType.CRYPTO_WALLET
        elif "EWallet" in labels:
            entity_type = EntityType.E_WALLET
        elif "PhoneNumber" in labels:
            entity_type = EntityType.PHONE_NUMBER
        elif "QRISCode" in labels:
            entity_type = EntityType.QRIS
        
        # Get identifier based on entity type
        identifier_fields = {
            EntityType.BANK_ACCOUNT: ["nomor_rekening", "account_number"],
            EntityType.CRYPTO_WALLET: ["alamat_wallet", "wallet_address"],
            EntityType.E_WALLET: ["wallet_number", "account_number"],
            EntityType.PHONE_NUMBER: ["phone_number", "nomor_telepon"],
            EntityType.QRIS: ["qris_code", "code"]
        }
        
        identifier = ""
        for field in identifier_fields.get(entity_type, []):
            if field in node_props and node_props[field]:
                identifier = node_props[field]
                break
        
        # Get account holder
        account_holder = (node_props.get("account_holder") or 
                         node_props.get("pemilik_rekening") or 
                         node_props.get("wallet_name") or "Unknown")
        
        # Calculate aggregated fields if needed
        aggregated = {"connections": 0, "transactions": 0, "total_amount": 0.0}
        if calculate_aggregates:
            aggregated = self._calculate_aggregated_fields(node_id)
        
        # Determine specific information based on entity type
        specific_information = None
        if entity_type == EntityType.BANK_ACCOUNT:
            specific_information = node_props.get("nama_bank") or node_props.get("bank_name")
        elif entity_type == EntityType.E_WALLET:
            specific_information = node_props.get("wallet_type")
        elif entity_type == EntityType.CRYPTO_WALLET:
            specific_information = node_props.get("cryptocurrency")
        elif entity_type == EntityType.PHONE_NUMBER:
            specific_information = node_props.get("phone_provider") or node_props.get("provider")
        elif entity_type == EntityType.QRIS:
            specific_information = "QRIS"
        
        return EntityNode(
            id=node_id,
            identifier=identifier,
            entity_type=entity_type,
            account_holder=account_holder,
            priority_score=node_props.get("priority_score", 0),
            connections=aggregated["connections"],
            transactions=aggregated["transactions"],
            total_amount=aggregated["total_amount"],
            last_activity=node_props.get("terakhir_update"),
            created_at=node_props.get("created_at"),
            specific_information=specific_information,
            oss_key=node_props.get("oss_key")
        )
    
    def get_whole_graph(self, filters: GraphFilters) -> GraphResponse:
        """Get all entities in the graph with optional filtering and clustering by websites"""
        if not self.db._check_connection():
            logger.error("Cannot query - database not connected")
            return GraphResponse(clusters=[], standalone_entities=[], transactions=[], total_entities=0, total_transactions=0)
        
        where_clause, params = self._build_filter_conditions(filters)
        
        # Query for entities grouped by their associated sites (using relationships)
        clustered_query = f"""
        MATCH (site:SitusJudi)-[rel]->(entity)
        WHERE {where_clause}
        WITH site, collect(DISTINCT entity) as entities
        WHERE size(entities) > 0
        RETURN site.url as website_url, 
               site.url as website_name,
               entities
        ORDER BY site.url
        """
        
        # Query for standalone entities (not associated with any site)
        standalone_query = f"""
        MATCH (entity)
        WHERE {where_clause}
        AND NOT EXISTS((:SitusJudi)-[]->(entity))
        RETURN entity
        ORDER BY elementId(entity)
        """
        
        clusters = []
        standalone_entities = []
        transactions = []
        
        try:
            with self.db.driver.session() as session:
                # Get clustered entities
                result = session.run(clustered_query, params)
                for record in result:
                    entities = []
                    for entity_node in record["entities"]:
                        entity_record = {"entity": entity_node}
                        entities.append(self._node_to_entity(entity_record))
                    
                    if entities:  # Only add clusters with entities
                        clusters.append(WebsiteCluster(
                            website_url=record["website_url"],
                            website_name=record["website_name"] or "Unknown Site",
                            entities=entities
                        ))
                
                # Get standalone entities
                result = session.run(standalone_query, params)
                for record in result:
                    standalone_entities.append(self._node_to_entity(record))
                
                # Get all TRANSFERS_TO relationships between entities in our filtered dataset
                all_entity_ids = []
                for cluster in clusters:
                    all_entity_ids.extend([entity.id for entity in cluster.entities])
                all_entity_ids.extend([entity.id for entity in standalone_entities])
                
                if all_entity_ids:
                    # Query for all TRANSFERS_TO relationships between our entities
                    transaction_query = """
                    MATCH (from_entity)-[t:TRANSFERS_TO]->(to_entity)
                    WHERE elementId(from_entity) IN $entity_ids 
                    AND elementId(to_entity) IN $entity_ids
                    RETURN elementId(from_entity) as from_id,
                           elementId(to_entity) as to_id,
                           t.amount as amount,
                           t.timestamp as timestamp,
                           t.reference as reference
                    ORDER BY t.timestamp DESC
                    """
                    
                    tx_result = session.run(transaction_query, {"entity_ids": all_entity_ids})
                    for tx_record in tx_result:
                        transactions.append(Transaction(
                            from_node=tx_record["from_id"],
                            to_node=tx_record["to_id"],
                            amount=tx_record["amount"] or 0.0,
                            timestamp=tx_record["timestamp"] or datetime.now().isoformat(),
                            transaction_type="transfer",  # Default type since we removed explicit types
                            reference=tx_record["reference"],
                            direction=TransactionDirection.OUTGOING  # Default, will be corrected in frontend
                        ))
                
                # Calculate totals
                total_entities = sum(len(cluster.entities) for cluster in clusters) + len(standalone_entities)
                
                # Get total transaction count - handle case where no TRANSFERS_TO relationships exist
                try:
                    total_tx_query = "MATCH ()-[r:TRANSFERS_TO]->() RETURN count(r) as total_transactions"
                    tx_result = session.run(total_tx_query)
                    total_transactions = tx_result.single()["total_transactions"] or 0
                except Exception:
                    total_transactions = 0
                
                return GraphResponse(
                    clusters=clusters,
                    standalone_entities=standalone_entities,
                    transactions=transactions,
                    total_entities=total_entities,
                    total_transactions=total_transactions
                )
                
        except Exception as e:
            logger.error(f"Error getting whole graph: {e}")
            return GraphResponse(clusters=[], standalone_entities=[], transactions=[], total_entities=0, total_transactions=0)
    
    def get_node_detail(self, node_id: str) -> Optional[NodeDetailResponse]:
        """Get detailed information about a specific node"""
        if not self.db._check_connection():
            logger.error("Cannot query - database not connected")
            return None
        
        query = """
        MATCH (entity)
        WHERE elementId(entity) = $node_id
        
        OPTIONAL MATCH (entity)-[out:TRANSFERS_TO]->(target)
        OPTIONAL MATCH (source)-[in:TRANSFERS_TO]->(entity)
        OPTIONAL MATCH (site:SitusJudi)-[rel]->(entity)
        
        RETURN entity,
               collect(DISTINCT {
                   target: target,
                   amount: out.amount,
                   timestamp: out.timestamp,
                   reference: out.reference
               }) as outgoing,
               collect(DISTINCT {
                   source: source, 
                   amount: in.amount,
                   timestamp: in.timestamp,
                   reference: in.reference
               }) as incoming,
               collect(DISTINCT target) + collect(DISTINCT source) as connected,
               collect(DISTINCT site.url) as gambling_sites
        """
        
        try:
            with self.db.driver.session() as session:
                result = session.run(query, {"node_id": node_id})
                record = result.single()
                
                if not record or not record["entity"]:
                    return None
                
                entity = self._node_to_entity(record)
                
                # Process transactions
                incoming_transactions = []
                for tx in record["incoming"]:
                    if tx["source"]:  # Filter out null sources
                        incoming_transactions.append(Transaction(
                            from_node=str(tx["source"].element_id),
                            to_node=node_id,
                            amount=tx["amount"] or 0.0,
                            timestamp=tx["timestamp"] or datetime.now().isoformat(),
                            transaction_type="transfer",  # Default type since we removed explicit types
                            reference=tx["reference"],
                            direction=TransactionDirection.INCOMING
                        ))
                
                outgoing_transactions = []
                for tx in record["outgoing"]:
                    if tx["target"]:  # Filter out null targets
                        outgoing_transactions.append(Transaction(
                            from_node=node_id,
                            to_node=str(tx["target"].element_id),
                            amount=tx["amount"] or 0.0,
                            timestamp=tx["timestamp"] or datetime.now().isoformat(),
                            transaction_type="transfer",  # Default type since we removed explicit types
                            reference=tx["reference"],
                            direction=TransactionDirection.OUTGOING
                        ))
                
                # Process connected entities
                connected_entities = []
                for connected_node in record["connected"]:
                    if connected_node:  # Filter out null nodes
                        connected_record = {"entity": connected_node}
                        connected_entities.append(self._node_to_entity(connected_record, calculate_aggregates=False))
                
                return NodeDetailResponse(
                    entity=entity,
                    incoming_transactions=incoming_transactions,
                    outgoing_transactions=outgoing_transactions,
                    connected_entities=connected_entities,
                    gambling_sites=record["gambling_sites"] or []
                )
                
        except Exception as e:
            logger.error(f"Error getting node detail: {e}")
            return None
    
    def create_or_update_node(self, node_data: NodeCreate) -> Dict[str, Any]:
        """Create or update a node (upsert functionality)"""
        if not self.db._check_connection():
            logger.error("Cannot create node - database not connected")
            return {"success": False, "error": "Database not connected"}
        
        label, identifier_field = self._get_node_label_and_identifier_field(node_data.entity_type)
        
        # Prepare node properties
        properties = {
            identifier_field: node_data.identifier,
            "account_holder": node_data.account_holder,
            "priority_score": 0,  # Default as requested
            "created_at": datetime.now().isoformat(),
            "terakhir_update": datetime.now().isoformat()
        }
        
        # Add specific information based on entity type
        if node_data.specific_information:
            # Store in the appropriate field based on entity type for backward compatibility
            if node_data.entity_type == EntityType.BANK_ACCOUNT:
                properties["nama_bank"] = node_data.specific_information
                properties["bank_name"] = node_data.specific_information
            elif node_data.entity_type == EntityType.CRYPTO_WALLET:
                properties["cryptocurrency"] = node_data.specific_information
            elif node_data.entity_type == EntityType.E_WALLET:
                properties["wallet_type"] = node_data.specific_information
            elif node_data.entity_type == EntityType.PHONE_NUMBER:
                properties["phone_provider"] = node_data.specific_information
                properties["provider"] = node_data.specific_information  # Alternative field name
        
        # Build property string for query
        prop_assignments = []
        for key, value in properties.items():
            if isinstance(value, str):
                prop_assignments.append(f"n.{key} = ${key}")
            else:
                prop_assignments.append(f"n.{key} = ${key}")
        
        query = f"""
        MERGE (n:{label} {{{identifier_field}: $identifier}})
        ON CREATE SET {', '.join(prop_assignments)}, n.created = true
        ON MATCH SET {', '.join(['n.' + key + ' = $' + key for key in properties.keys() if key != 'created_at'])}, 
                     n.terakhir_update = $terakhir_update, n.created = false
        RETURN n, n.created as was_created
        """
        
        try:
            with self.db.driver.session() as session:
                result = session.run(query, {**properties, "identifier": node_data.identifier})
                record = result.single()
                
                if record:
                    node_record = {"entity": record["n"]}
                    entity = self._node_to_entity(node_record)
                    
                    return {
                        "success": True,
                        "id": entity.id,
                        "entity": entity,
                        "created": record["was_created"]
                    }
                else:
                    return {"success": False, "error": "Failed to create/update node"}
                    
        except Exception as e:
            logger.error(f"Error creating/updating node: {e}")
            return {"success": False, "error": str(e)}
    
    def create_transaction(self, transaction_data: TransactionCreate) -> Dict[str, Any]:
        """Create a transaction edge between two entities"""
        if not self.db._check_connection():
            logger.error("Cannot create transaction - database not connected")
            return {"success": False, "error": "Database not connected"}
        
        query = """
        MATCH (from_entity), (to_entity)
        WHERE (
            from_entity.nomor_rekening = $from_identifier OR
            from_entity.alamat_wallet = $from_identifier OR  
            from_entity.wallet_number = $from_identifier OR
            from_entity.phone_number = $from_identifier OR
            from_entity.qris_code = $from_identifier
        ) AND (
            to_entity.nomor_rekening = $to_identifier OR
            to_entity.alamat_wallet = $to_identifier OR
            to_entity.wallet_number = $to_identifier OR  
            to_entity.phone_number = $to_identifier OR
            to_entity.qris_code = $to_identifier
        )
        
        CREATE (from_entity)-[t:TRANSFERS_TO {
            amount: $amount,
            timestamp: $timestamp,
            reference: $reference
        }]->(to_entity)
        
        RETURN from_entity, to_entity, t
        """
        
        timestamp = transaction_data.timestamp or datetime.now()
        
        try:
            with self.db.driver.session() as session:
                result = session.run(query, {
                    "from_identifier": transaction_data.from_identifier,
                    "to_identifier": transaction_data.to_identifier,
                    "amount": transaction_data.amount,
                    "timestamp": timestamp.isoformat(),
                    "reference": transaction_data.reference
                })
                
                record = result.single()
                if record:
                    from_entity = self._node_to_entity({"entity": record["from_entity"]})
                    to_entity = self._node_to_entity({"entity": record["to_entity"]})
                    
                    transaction = Transaction(
                        from_node=from_entity.id,
                        to_node=to_entity.id,
                        amount=transaction_data.amount,
                        timestamp=timestamp.isoformat(),
                        transaction_type="transfer",  # Default type since we removed explicit types
                        reference=transaction_data.reference,
                        direction=TransactionDirection.OUTGOING
                    )
                    
                    return {
                        "success": True,
                        "from_entity": from_entity,
                        "to_entity": to_entity,
                        "transaction": transaction
                    }
                else:
                    return {"success": False, "error": "Could not find both entities"}
                    
        except Exception as e:
            logger.error(f"Error creating transaction: {e}")
            return {"success": False, "error": str(e)}

# Create global instance
graph_db = GraphDatabaseHandler()