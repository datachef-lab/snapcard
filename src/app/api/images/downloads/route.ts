import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { PassThrough } from "stream";
import sharp from "sharp";
import { getIdCardIssuesByDatePaginated } from "@/lib/services/id-card-issue.service";

const SNAPCARD_IMAGE_BASE_PATH =
  process.env.SNAPCARD_IMAGE_BASE_PATH || "./public";

// Helper to convert Node stream to Web ReadableStream
function nodeToWebReadable(nodeStream: NodeJS.ReadableStream): ReadableStream {
  const reader = nodeStream[Symbol.asyncIterator]();
  return new ReadableStream({
    async pull(controller) {
      const { value, done } = await reader.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    cancel() {
      reader.return?.();
    },
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const outputFormat = searchParams.get("format") || "png";
    const quality = parseInt(searchParams.get("quality") || "90");

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return new NextResponse("Invalid or missing date (expected YYYY-MM-DD)", {
        status: 400,
      });
    }

    const batchSize = 200;
    let offset = 0;
    let hasMore = true;

    const zipStream = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });

    archive.on("warning", (err) => console.warn("Archive warning:", err));
    archive.on("error", (err) => console.error("Archive error:", err));

    archive.pipe(zipStream); // Stream to PassThrough

    while (hasMore) {
      const idCardEntries = await getIdCardIssuesByDatePaginated(
        date,
        batchSize,
        offset
      );
      
      console.log(`Fetched ${idCardEntries.length} entries for date ${date} at offset ${offset}`);

      if (!idCardEntries || idCardEntries.length === 0) {
        return new NextResponse("No ID card issues found for the given date", {
          status: 404,
        });
      }

      let i = 0;
      for (const entry of idCardEntries) {
        const filePath = path.join(
          SNAPCARD_IMAGE_BASE_PATH,
          "idcards",
          `${entry.id}.png`
        );

        if (!fs.existsSync(filePath)) {
          console.warn(`File not found: ${filePath}`);
          continue;
        }

        try {
          const metadata = await sharp(filePath).metadata();
          if (!metadata.width || !metadata.height) continue;

          const imageStream = sharp(filePath)
            .extract({ left: 250, top: 307, width: 225, height: 250 }) // Crop area
            [outputFormat as "png" | "jpeg" | "webp"]({ quality }); // Convert format

          archive.append(imageStream, {
            name: `Student_Image_${entry.codeNumber}.jpg`,
          });

          console.log(`Done: ${++i}/${idCardEntries.length}, batchSize: ${batchSize}`)
        } catch (err) {
          console.warn(`Error processing image ID ${entry.id}:`, err);
        }
      }

      offset += batchSize;
      hasMore = idCardEntries.length === batchSize;
    }

    archive.finalize(); // Finish the zip
    const readableWebStream = nodeToWebReadable(zipStream);

    return new NextResponse(readableWebStream, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="images_${date}.zip"`,
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
