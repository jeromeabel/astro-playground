import { runLighthouse } from "./lighthouse.mjs";
import { printTable } from "./measure.mjs";

// Assumes `pnpm preview` is already running at http://localhost:4321.
const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip"];

for (const s of STRATEGIES) {
  runLighthouse(s);
}
printTable();
