import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const nextCli = fileURLToPath(
  new URL("../node_modules/next/dist/bin/next", import.meta.url),
);
const result = spawnSync(
  process.execPath,
  [nextCli, "start", "-p", process.env.PORT || "3000"],
  {
    stdio: "inherit",
    env: { ...process.env, MACOBSA_RUNTIME: "node" },
  },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
