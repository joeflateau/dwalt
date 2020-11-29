#!/usr/bin/env node

import { program } from "commander";
import { ECR } from "aws-sdk";
import { exec } from "child-process-promise";

export function run() {
  program
    .option("-f, --file", "file to build", "./Dockerfile")
    .option("-r, --repository", "ECR Repository")
    .option("-n, --name", "name of built image")
    .option("-t, --tag", "tag of built image")
    .option(
      "--build-arg",
      "build args",
      (value, prev) => {
        prev.push(value);
        return prev;
      },
      [] as string[]
    );

  program.parse(process.argv);

  const { file, repository, name, tag, buildArg } = program.opts();

  buildAndCache(file, repository, name, tag, buildArg);
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

  const { password } = decodeAuthToken(
    authTokenResponse.authorizationData?.[0].authorizationToken ?? ""
  );

  await exec(`docker login -u AWS -p ${password} ${repository}`);

  await exec(
    `
    docker build
      -t ${name}-${tag}
      --cache-from ${repository}:${name}-${tag}
      --build-arg BUILDKIT_INLINE_CACHE=1
      ${buildArgs.map((arg) => `--build-arg ${arg}`)}
      -f ${file}
      .
  `,
    {
      env: {
        DOCKER_BUILDKIT: "1",
      },
    }
  );

  await exec(`docker tag ${name}-${tag} ${repository}:${name}-${tag}`);
  await exec(`docker push ${repository}:${name}-${tag}`);
}

if (require.main === module) {
  console.log(run());
}

export function decodeAuthToken(
  encoded: string
): { username: string; password: string } {
  const text = Buffer.from(encoded, "base64").toString("utf8");
  const match = text.match(/^(.*?)\:(.*)$/);
  if (match == null) {
    throw new Error("invalid auth token");
  }
  const [, username, password] = match;
  return { username, password };
}
