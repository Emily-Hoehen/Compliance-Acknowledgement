import type { Metadata } from "next";
import { MapPage } from "../../components/patterns/MapPage";
import { loadContractBuildings } from "../../lib/sowContractLoader";

export const metadata: Metadata = {
  title: "Manager Shift Report",
};

export default async function Map() {
  const contractBuildings = await loadContractBuildings();
  return <MapPage contractBuildings={contractBuildings} />;
}
