import { describe, it } from "mocha";
import { expect } from "chai";
import { decodeAuthToken } from ".";

describe("decodeAuthToken", () => {
  it("should decode auth token", async () => {
    const { username, password } = decodeAuthToken("dXNlcjpwYXNz");
    expect(username).to.equal("user");
    expect(password).to.equal("pass");
  });
});
