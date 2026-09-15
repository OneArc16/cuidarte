import { afterEach, describe, expect, it, vi } from "vitest";

import { downloadReport } from "./reports-api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("downloadReport", () => {
  it("reports progress while reading a streamed ZIP response", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(new Uint8Array([1, 2]));
            controller.enqueue(new Uint8Array([3, 4, 5]));
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Disposition": "attachment; filename=report.zip",
            "Content-Length": "5",
            "Content-Type": "application/zip",
          },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const progress: Array<[number, number | null]> = [];

    const result = await downloadReport("00000000-0000-4000-8000-000000000001", {
      onProgress: (downloadedBytes, totalBytes) => {
        progress.push([downloadedBytes, totalBytes]);
      },
    });

    expect(result.filename).toBe("report.zip");
    expect(result.blob.size).toBe(5);
    expect(progress).toEqual([
      [0, 5],
      [2, 5],
      [5, 5],
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/reports/00000000-0000-4000-8000-000000000001/download"),
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("passes an AbortSignal to the download request", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();

    await expect(
      downloadReport("00000000-0000-4000-8000-000000000001", { signal: controller.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/reports/00000000-0000-4000-8000-000000000001/download"),
      expect.objectContaining({ signal: controller.signal }),
    );
  });
});
