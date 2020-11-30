#!/usr/bin/env node

import { program } from "commander";
import { ECR } from "aws-sdk";
import { spawnDocker } from "./spawnDocker";
import { decodeAuthToken } from "./decodeAuthToken";

export function run() {
  program
    .storeOptionsAsProperties(false)
    .option("-f, --file [file]", "file to build", "./Dockerfile")
    .option("-r, --repository <repository>", "ECR Repository")
    .option("-t, --tag <tag>", "tag of built image")
    .option("--build-arg [buildArgs...]", "build args");

  program.parse(process.argv);

  const { file, repository, tag, buildArg } = program.opts();

  buildAndCache(file, repository, tag, buildArg);
}

export async function buildAndCache(
  file: string,
  repository: string,
  tag: string,
  buildArgs: string[]
) {
  const ecr = new ECR();

  const authTokenResponse = await ecr.getAuthorizationToken({}).promise();

  const { username, password } = decodeAuthToken(
    authTokenResponse.authorizationData?.[0].authorizationToken ?? ""
  );

  await spawnDocker("login", [["-u", username], ["-p", password], repository]);

  const pulled = await spawnDocker(`pull`, [`${repository}:${tag}`]).then(
    () => true,
    () => false
  );

  const buildArgsArgs =
    (buildArgs && buildArgs.map((arg) => `--build-arg ${arg}`)) || [];

  await spawnDocker("build", [
    "--rm=false",
    ...((pulled && ["--cache-from", `${repository}:${tag}`]) || []),
    [`-t`, `${repository}:${tag}`],
    ...buildArgsArgs,
    [`-f`, `${file}`],
    `.`,
  ]);

  await spawnDocker("push", [`${repository}:${tag}`]);
}

if (require.main === module) {
  run();
}
