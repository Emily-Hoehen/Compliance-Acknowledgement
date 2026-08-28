import { readFile } from "fs/promises";
import path from "path";
import { parseCsv, toRosterPeople } from "../../../lib/csv";
import { SowPage } from "../../../components/patterns/SowPage";

async function loadRoster(fileName: string) {
  const filePath = path.join(process.cwd(), "data", fileName);
  const text = await readFile(filePath, "utf-8");
  return toRosterPeople(parseCsv(text));
}

export default async function QualitySowPage() {
  const [associates, managers] = await Promise.all([
    loadRoster("associates.csv"),
    loadRoster("managers.csv"),
  ]);

  return <SowPage associates={associates} managers={managers} />;
}
