import DistributorPractitionersHouse from "./house/DistributorPractitionersHouse"

type NetworkHubProps = {
  defaultTab?: "practitioners" | "territory"
}

/**
 * Distributor network: practitioners and regions. The house-style page is the
 * only one: the classic roster and territory bodies, with their sample rows,
 * were removed (house style W2a, "remove").
 */
export default function NetworkHub({ defaultTab = "practitioners" }: NetworkHubProps) {
  return <DistributorPractitionersHouse defaultTab={defaultTab} />
}
