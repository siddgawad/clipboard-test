import { exec } from "child_process";
import * as path from "path";

const packageDir = path.resolve(__dirname, "../server");

async function runTopWorkplacesScript(): Promise<string> {
  return new Promise((resolve, reject) => {
    exec("npm run start:topWorkplaces --silent", { cwd: packageDir }, (error, stdout, stderr) => {
      if (error) {
        reject(`Error executing command: ${error}`);
        return;
      }
      if (stderr) {
        reject(`Error executing script: ${stderr}`);
        return;
      }
      resolve(stdout.toString());
    });
  });
}

describe("Basic Functionality", () => {
  it("should run the top-workplaces script successfully", async () => {
    const output = await runTopWorkplacesScript();
    expect(output).toBeDefined();
    expect(output.trim()).not.toBe("");
  }, 30000); // 30 second timeout

  it("should produce valid JSON output", async () => {
    const output = await runTopWorkplacesScript();

    // Test that we can parse the output as JSON
    let parsedOutput;
    expect(() => {
      parsedOutput = JSON.parse(output.trim());
    }).not.toThrow();

    // Basic validation that it's an array
    expect(Array.isArray(parsedOutput)).toBe(true);
  }, 30000);
});
