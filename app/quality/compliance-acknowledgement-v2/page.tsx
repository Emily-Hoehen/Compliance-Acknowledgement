import { readFile } from "fs/promises";
import path from "path";
import { parseCsv, toRosterPeople } from "../../../lib/csv";
import { loadContractBuildings } from "../../../lib/sowContractLoader";
import { ComplianceAcknowledgementV2Page } from "../../../components/patterns/ComplianceAcknowledgementV2Page";

async function loadRoster(fileName: string) {
  const filePath = path.join(process.cwd(), "data", fileName);
  const text = await readFile(filePath, "utf-8");
  return toRosterPeople(parseCsv(text));
}

export default async function QualityComplianceAcknowledgementV2Page() {
  const [associates, managers, contractBuildings] = await Promise.all([
    loadRoster("associates.csv"),
    loadRoster("managers.csv"),
    loadContractBuildings(),
  ]);

  return <ComplianceAcknowledgementV2Page associates={associates} managers={managers} contractBuildings={contractBuildings} />;
}
