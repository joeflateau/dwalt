#!/usr/bin/env node

import { ECR } from "aws-sdk";
import { exec } from "child-process-promise";
import { program } from "commander";
import { decodeAuthToken } from "./decodeAuthToken";
import { spawnDocker } from "./spawnDocker";

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

  const result = await buildAndCache(repository, name, tag, buildArg, {
    cwd: process.cwd(),
    file,
  });

  console.log(result);
}

export async function buildAndCache(
  repository: string,
  name: string,
  tag: string,
  buildArgs: string[],
  { cwd, file }: { cwd: string; file: string }
) {
  const ecr = new ECR();

  const authTokenResponse = await ecr.getAuthorizationToken({}).promise();

  const { username, password } = decodeAuthToken(
    authTokenResponse.authorizationData?.[0].authorizationToken ?? ""
  );

  await spawnDocker(cwd, "login", [
    ["-u", username],
    ["-p", password],
    repository,
  ]);

  const pulled = await spawnDocker(cwd, `pull`, [
    `${repository}:${name}-${tag}`,
  ]).then(
    () => true,
    () => false
  );

  const buildArgsArgs =
    (buildArgs && buildArgs.map((arg) => [`--build-arg`, arg])) || [];

  await spawnDocker(cwd, "build", [
    "--rm=false",
    ...((pulled && ["--cache-from", `${repository}:${name}-${tag}`]) || []),
    [`-t`, `${repository}:${name}-${tag}`],
    ...buildArgsArgs,
    [`-f`, `${file}`],
    `.`,
  ]);

  await spawnDocker(cwd, "push", [`${repository}:${name}-${tag}`]);

  const hash = await exec(
    `docker images --no-trunc --quiet ${repository}:${name}-${tag}`
  ).then((r) => r.stdout.trim().split(":")[1]);

  await spawnDocker(cwd, "tag", [
    `${repository}:${name}-${tag}`,
    `${repository}:${name}-${hash}`,
  ]);

  await spawnDocker(cwd, "push", [`${repository}:${name}-${hash}`]);

  return `${name}-${hash}`;
}

if (require.main === module) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
