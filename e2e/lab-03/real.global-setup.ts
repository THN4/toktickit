import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export default async function globalSetup() {
  await execAsync("npm.cmd run seed", {
    cwd: "server",
    env: { ...process.env, LAB3_RESET_E2E_FIXTURES: "true" },
  });
}
