# LGA Expected Services — Reference Data

`lga_expected_services.csv` defines the expected cleaning/service frequency
for every area type at LGA Terminal C, broken out by building and shift.
Each row is a **fully resolved (effective) rule** — inheritance and
overrides from 4Insite have already been applied, so no inheritance logic
needs to be re-implemented downstream.

## Columns

| Column | Meaning |
|---|---|
| `area_type` | Top-level category (e.g. "Baggage Carousels", "Restrooms") |
| `building` | Which building the rule applies to. `All Buildings` = the airport-wide default for that area_type; a named building (e.g. `Headhouse`, `Pavillion`, `Concourse D/E/F`, `Mainline`) = a building-specific override |
| `floor` | The floor/level within the building (e.g. `1 (Arrivals)`, `2 (Ticketing)`). Blank when the rule applies to the whole building or the whole area type |
| `area` | The specific named space (e.g. `Delta Sky Priority`, `HH 1.1`). `All` = applies to everything under that building/area_type combo, not one specific spot |
| `shift` | `Day`, `Swing`, or `Graveyard` |
| `service_type` | Currently always `Any Service` (no service-specific sub-rules found in the source data) |
| `expected_count` | How many times the service is expected during that shift |
| `frequency_unit` | Currently always `Daily` |

## How to look up the expected count for a real location + shift

Rules are already resolved, so this is a **specificity lookup, not an
inheritance walk**. For a given `(area_type, building, floor, area, shift)`,
check for a matching row in this order and use the first match:

1. Exact match on `area_type` + `building` + `floor` + `area` (most specific — a named area override)
2. `area_type` + `building`, `area` = `All` (a building-level override, no floor/area specificity)
3. `area_type`, `building` = `All Buildings` (the airport-wide default)

If no row exists at a given shift for a location that has *some* rows
(e.g. Fire Stairwells has no Day/Swing rule in some buildings), treat that
shift as having **no expected service** at that location — don't fall back
further down the specificity order for that shift.

## Known buildings at LGA Terminal C

`Headhouse`, `Pavillion`, `Mainline`, `Concourse D`, `Concourse E`, `Concourse F`
(6 buildings total, matching the airport's physical layout).

## Notes / caveats

- Source data is 4Insite's Space Rules configuration (screenshots of the
  admin UI), transcribed manually — not pulled via API.
- Only overrides that were actually shown were captured. If a building/area
  isn't listed for a given area_type, it's inheriting the `All Buildings`
  default — there is no explicit row for it in this file.
- `service_type` and `frequency_unit` are single-valued today but kept as
  columns in case 4Insite introduces service-specific rules later.
