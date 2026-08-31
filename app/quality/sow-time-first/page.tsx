import { readFile } from "fs/promises";
import path from "path";
import { parseCsv, toRosterPeople } from "../../../lib/csv";
import { loadContractBuildings } from "../../../lib/sowContractLoader";
import { SowTimeFirstPage } from "../../../components/patterns/SowTimeFirstPage";

export default async function QualitySowTimeFirstPage() {
  const associatesPath = path.join(process.cwd(), "data", "associates.csv");
  const managersPath = path.join(process.cwd(), "data", "managers.csv");
  const [associatesText, managersText, contractBuildings] = await Promise.all([
    readFile(associatesPath, "utf-8"),
    readFile(managersPath, "utf-8"),
    loadContractBuildings(),
  ]);
  const associates = toRosterPeople(parseCsv(associatesText));
  const managers = toRosterPeople(parseCsv(managersText));

  return <SowTimeFirstPage associates={associates} managers={managers} contractBuildings={contractBuildings} />;
}
