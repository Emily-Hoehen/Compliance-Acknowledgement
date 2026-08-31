/**
 * Server-only loader for the real SOW export (fs access) — kept
 * separate from sowContract.ts so no "use client" component ever
 * transitively pulls `fs` into its bundle. Import this only from
 * page.tsx server components, the same way lib/csv.ts's roster CSVs
 * are loaded.
 */

import { readFile } from "fs/promises";
import path from "path";
import { parseSowContractRows, buildContractBuildings, type ContractBuilding } from "./sowContract";

export async function loadContractBuildings(): Promise<ContractBuilding[]> {
  const filePath = path.join(process.cwd(), "data", "SOW_DeltaLGA.csv");
  const text = await readFile(filePath, "utf-8");
  return buildContractBuildings(parseSowContractRows(text));
}
