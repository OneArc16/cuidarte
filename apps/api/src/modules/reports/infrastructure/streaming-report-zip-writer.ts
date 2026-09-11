import { createWriteStream } from "node:fs";
import { unlink } from "node:fs/promises";

import { Injectable } from "@nestjs/common";

import { type ReportArchiveEntry, type ReportArchiveWriter } from "../domain/report-archive-writer";

type CentralDirectoryRecord = {
  filenameBuffer: Buffer;
  crc32: number;
  size: number;
  offset: number;
};

@Injectable()
export class StreamingReportZipWriter implements ReportArchiveWriter {
  async writeZip(
    entries: AsyncIterable<ReportArchiveEntry>,
    destinationPath: string,
  ): Promise<number> {
    const stream = createWriteStream(destinationPath, { flags: "wx", mode: 0o640 });
    const centralDirectoryRecords: CentralDirectoryRecord[] = [];
    let offset = 0;
    let writtenEntries = 0;

    try {
      for await (const entry of entries) {
        const filenameBuffer = Buffer.from(entry.filename, "utf8");
        const crc32 = calculateCrc32(entry.buffer);
        const localHeader = buildLocalHeader(filenameBuffer, crc32, entry.buffer.byteLength);
        const entryOffset = offset;

        await writeChunk(stream, localHeader);
        await writeChunk(stream, entry.buffer);

        offset += localHeader.byteLength + entry.buffer.byteLength;
        centralDirectoryRecords.push({
          filenameBuffer,
          crc32,
          size: entry.buffer.byteLength,
          offset: entryOffset,
        });
        writtenEntries += 1;
      }

      const centralDirectoryOffset = offset;

      for (const record of centralDirectoryRecords) {
        const directoryHeader = buildCentralDirectoryHeader(record);

        await writeChunk(stream, directoryHeader);
        offset += directoryHeader.byteLength;
      }

      const centralDirectorySize = offset - centralDirectoryOffset;
      await writeChunk(
        stream,
        buildEndOfCentralDirectory(
          centralDirectoryRecords.length,
          centralDirectorySize,
          centralDirectoryOffset,
        ),
      );
      await closeStream(stream);

      return writtenEntries;
    } catch (error) {
      stream.destroy();
      await unlink(destinationPath).catch(() => undefined);
      throw error;
    }
  }
}

function buildLocalHeader(filenameBuffer: Buffer, crc32: number, size: number): Buffer {
  const header = Buffer.alloc(30 + filenameBuffer.byteLength);

  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(crc32, 14);
  header.writeUInt32LE(size, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(filenameBuffer.byteLength, 26);
  header.writeUInt16LE(0, 28);
  filenameBuffer.copy(header, 30);

  return header;
}

function buildCentralDirectoryHeader(record: CentralDirectoryRecord): Buffer {
  const header = Buffer.alloc(46 + record.filenameBuffer.byteLength);

  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(record.crc32, 16);
  header.writeUInt32LE(record.size, 20);
  header.writeUInt32LE(record.size, 24);
  header.writeUInt16LE(record.filenameBuffer.byteLength, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(record.offset, 42);
  record.filenameBuffer.copy(header, 46);

  return header;
}

function buildEndOfCentralDirectory(
  entries: number,
  centralDirectorySize: number,
  centralDirectoryOffset: number,
): Buffer {
  const header = Buffer.alloc(22);

  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(entries, 8);
  header.writeUInt16LE(entries, 10);
  header.writeUInt32LE(centralDirectorySize, 12);
  header.writeUInt32LE(centralDirectoryOffset, 16);
  header.writeUInt16LE(0, 20);

  return header;
}

function calculateCrc32(buffer: Buffer): number {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff]! ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

const CRC32_TABLE = Array.from({ length: 256 }, (_, index) => {
  let crc = index;

  for (let bit = 0; bit < 8; bit += 1) {
    crc = (crc & 1) === 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
  }

  return crc >>> 0;
});

async function writeChunk(stream: NodeJS.WritableStream, chunk: Buffer): Promise<void> {
  if (stream.write(chunk)) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    stream.once("drain", resolve);
    stream.once("error", reject);
  });
}

async function closeStream(stream: NodeJS.WritableStream): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    stream.end((error?: Error | null) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}
