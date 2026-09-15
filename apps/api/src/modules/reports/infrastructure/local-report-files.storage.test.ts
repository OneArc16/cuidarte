import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

import { LocalReportFilesStorage } from "./local-report-files.storage";

describe("LocalReportFilesStorage", () => {
  let previousReportsDir: string | undefined;
  let reportsDir: string;

  before(async () => {
    previousReportsDir = process.env.REPORTS_DIR;
    reportsDir = await mkdtemp(path.join(tmpdir(), "cuidarte-reports-"));
    process.env.REPORTS_DIR = reportsDir;
  });

  after(async () => {
    if (previousReportsDir === undefined) {
      delete process.env.REPORTS_DIR;
    } else {
      process.env.REPORTS_DIR = previousReportsDir;
    }

    await rm(reportsDir, { recursive: true, force: true });
  });

  it("deletes only temporary part files for the selected report", async () => {
    const storage = new LocalReportFilesStorage();
    const reportDir = path.join(reportsDir, "report-1");
    const otherReportDir = path.join(reportsDir, "report-2");

    await mkdir(reportDir, { recursive: true });
    await mkdir(otherReportDir, { recursive: true });
    await writeFile(path.join(reportDir, "valid.zip"), "zip");
    await writeFile(path.join(reportDir, "abandoned.zip.uuid.part"), "part");
    await writeFile(path.join(otherReportDir, "other.zip.uuid.part"), "part");

    const deleted = await storage.deleteTemporaryFiles("report-1");

    assert.equal(deleted, 1);
    assert.equal(await readFile(path.join(reportDir, "valid.zip"), "utf8"), "zip");
    assert.equal(await readFile(path.join(otherReportDir, "other.zip.uuid.part"), "utf8"), "part");
  });
});
