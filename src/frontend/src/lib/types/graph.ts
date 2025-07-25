import type { Entity } from "./entity";

type NetworkGraphViewProps = {
  filters: Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  onEntitySelect: (entity: Entity) => void;
  selectedEntity: Entity | null;
};

type NetworkNode = Entity &
  d3.SimulationNodeDatum & {
    transactions: number;
    totalAmount: number;
  };

type NetworkEdge = {
  from: string;
  to: string;
  totalTransactions: number;
  totalAmount: number;
};

export type { NetworkGraphViewProps, NetworkNode, NetworkEdge };
