#!/usr/bin/env node

import { program } from "commander";
import { ECR } from "aws-sdk";
import { spawnDocker } from "./spawnDocker";
import { decodeAuthToken } from "./decodeAuthToken";
import { exec } from "child-process-promise";

export async function run() {
  program
    .storeOptionsAsProperties(false)
    .option("-f, --file [file]", "file to build", "./Dockerfile")
    .option("-r, --repository <repository>", "ECR Repository")
    .option("-n, --name <name>", "name of built image")
    .option("-t, --tag <tag>", "tag of built image")
    .option("--build-arg [buildArgs...]", "build args");

  program.parse(process.argv);

  const { file, repository, name, tag, buildArg } = program.opts();

  const result = await buildAndCache(file, repository, name, tag, buildArg);

  console.log(result);
}

export async function buildAndCache(
  file: string,
  repository: string,
  name: string,
  tag: string,
  buildArgs: string[]
) {
  const ecr = new ECR();

  const authTokenResponse = await ecr.getAuthorizationToken({}).promise();

  const { username, password } = decodeAuthToken(
    authTokenResponse.authorizationData?.[0].authorizationToken ?? ""
  );

  await spawnDocker("login", [["-u", username], ["-p", password], repository]);

  const pulled = await spawnDocker(`pull`, [
    `${repository}:${name}-${tag}`,
  ]).then(
    () => true,
    () => false
  );

  const buildArgsArgs =
    (buildArgs && buildArgs.map((arg) => [`--build-arg`, arg])) || [];

  await spawnDocker("build", [
    "--rm=false",
    ...((pulled && ["--cache-from", `${repository}:${name}-${tag}`]) || []),
    [`-t`, `${repository}:${name}-${tag}`],
    ...buildArgsArgs,
    [`-f`, `${file}`],
    `.`,
  ]);

  await spawnDocker("push", [`${repository}:${name}-${tag}`]);

  const hash = await exec(
    `docker images --no-trunc --quiet ${repository}:${name}-${tag}`
  ).then((r) => r.stdout.trim().split(":")[1]);

  await spawnDocker("tag", [
    `${repository}:${name}-${tag}`,
    `${repository}:${name}-${hash}`,
  ]);

  await spawnDocker("push", [`${repository}:${name}-${hash}`]);

  return `${name}-${hash}`;
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
