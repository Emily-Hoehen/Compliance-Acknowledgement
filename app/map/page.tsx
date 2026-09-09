import { MapPage } from "../../components/patterns/MapPage";
import { loadContractBuildings } from "../../lib/sowContractLoader";

export default async function Map() {
  const contractBuildings = await loadContractBuildings();
  return <MapPage contractBuildings={contractBuildings} />;
}
