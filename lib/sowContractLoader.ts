/**
 * Server-only loader for the real SOW export (fs access) — kept
 * separate from sowContract.ts so no "use client" component ever
 * transitively pulls `fs` into its bundle. Import this only from
 * page.tsx server components, the same way lib/csv.ts's roster CSVs
 * are loaded.
 *
 * Also loads the real expected-service reference data (data/Service
 * Count/lga_expected_services.csv) alongside the SOW export itself,
 * so every ContractArea buildContractBuildings returns already has
 * its real per-shift expected counts attached — callers never need
 * to load or thread the expected-services index themselves.
 */

import { readFile } from "fs/promises";
import path from "path";
import { parseSowContractRows, buildContractBuildings, type ContractBuilding } from "./sowContract";
import { parseExpectedServiceRows, buildExpectedServicesIndex } from "./expectedServices";

export async function loadContractBuildings(): Promise<ContractBuilding[]> {
  const [sowText, expectedServicesText] = await Promise.all([
    readFile(path.join(process.cwd(), "data", "SOW_DeltaLGA.csv"), "utf-8"),
    readFile(path.join(process.cwd(), "data", "Service Count", "lga_expected_services.csv"), "utf-8"),
  ]);
  const expectedIndex = buildExpectedServicesIndex(parseExpectedServiceRows(expectedServicesText));
  return buildContractBuildings(parseSowContractRows(sowText), expectedIndex);
}
