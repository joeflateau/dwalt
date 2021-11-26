import { spawn } from "child-process-promise";
import { flat } from "./flat";

export function spawnDocker(
  cwd: string,
  dockerCommand: string,
  dockerCommandArgs: Array<string | string[]>
) {
  return spawn("docker", flat([dockerCommand, ...dockerCommandArgs]), {
    cwd,
    stdio: [process.stdin, process.stderr, process.stderr],
  });
}
