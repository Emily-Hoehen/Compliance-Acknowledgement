import { readFile } from "fs/promises";
import path from "path";
import { parseCsv, toRosterPeople } from "../../../lib/csv";
import { SowTimeFirstPage } from "../../../components/patterns/SowTimeFirstPage";

export default async function QualitySowTimeFirstPage() {
  const filePath = path.join(process.cwd(), "data", "associates.csv");
  const text = await readFile(filePath, "utf-8");
  const associates = toRosterPeople(parseCsv(text));

  return <SowTimeFirstPage associates={associates} />;
}
