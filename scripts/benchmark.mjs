import { runLighthouse } from "./lighthouse.mjs";
import { printTable, writeResults } from "./measure.mjs";

const baseUrl = process.argv[2] ?? "http://localhost:4321";
const STRATEGIES = ["naive", "manual", "auto", "pixel-perfect", "lqip"];

for (const s of STRATEGIES) {
  runLighthouse(s, baseUrl);
}
printTable();
writeResults();
