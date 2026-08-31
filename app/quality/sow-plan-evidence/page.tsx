import { loadContractBuildings } from "../../../lib/sowContractLoader";
import { SowPlanEvidencePage } from "../../../components/patterns/SowPlanEvidencePage";

export default async function QualitySowPlanEvidencePage() {
  const contractBuildings = await loadContractBuildings();
  return <SowPlanEvidencePage contractBuildings={contractBuildings} />;
}
