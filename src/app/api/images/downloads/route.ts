// import { NextRequest, NextResponse } from "next/server";
// import path from "path";
// import fs from "fs";
// import archiver from "archiver";
// import { Readable } from "stream";
// import { getIdCardIssuesByDate } from "@/lib/services/id-card-issue.service";
// import sharp from "sharp";

// const SNAPCARD_IMAGE_BASE_PATH =
//   process.env.SNAPCARD_IMAGE_BASE_PATH || "./public";

// // Helper: Convert Node stream to Web ReadableStream
// function nodeToWebReadable(nodeStream: NodeJS.ReadableStream): ReadableStream {
//   const reader = nodeStream[Symbol.asyncIterator]();
//   return new ReadableStream({
//     async pull(controller) {
//       const { value, done } = await reader.next();
//       if (done) controller.close();
//       else controller.enqueue(value);
//     },
//     cancel() {
//       reader.return?.();
//     },
//   });
// }

// export async function GET(request: NextRequest) {
//   try {
//     const { searchParams } = new URL(request.url);
//     const date = searchParams.get("date");

//     if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
//       return new NextResponse("Invalid or missing date (expected YYYY-MM-DD)", {
//         status: 400,
//       });
//     }

//     const idCardEntries = await getIdCardIssuesByDate(date);
//     if (!idCardEntries || idCardEntries.length === 0) {
//       return new NextResponse("No records found for the given date", {
//         status: 404,
//       });
//     }

//     // Create archive
//     const archive = archiver("zip", { zlib: { level: 9 } });
//     const archiveStream = new Readable().wrap(archive);

//     // Add images to archive
//     for (const entry of idCardEntries) {
//       const filePath = path.join(
//         SNAPCARD_IMAGE_BASE_PATH,
//         "idcards",
//         `${entry.id}.png`
//       );
//       const outputFormat = searchParams.get("format") || "png";
//       const quality = parseInt(searchParams.get("quality") || "90");

//       // Get image metadata
//       const metadata = await sharp(filePath).metadata();

//       if (!metadata.width || !metadata.height) {
//         return new NextResponse("Unable to read image dimensions", {
//           status: 400,
//         });
//       }

//       // Define fixed crop area
//       const x = 200;
//       const y = 265;
//       const width = 260;
//       const height = 265;

//       // Process the image with sharp
//       let processedImage = sharp(filePath).extract({
//         left: x,
//         top: y,
//         width,
//         height,
//       });

//       // Set output format and quality
//       switch (outputFormat.toLowerCase()) {
//         case "jpeg":
//         case "jpg":
//           processedImage = processedImage.jpeg({ quality });
//           break;
//         case "png":
//           processedImage = processedImage.png({ quality });
//           break;
//         case "webp":
//           processedImage = processedImage.webp({ quality });
//           break;
//         default:
//           return new NextResponse("Unsupported output format", { status: 400 });
//       }

//       // Convert to buffer
//       const croppedImageBuffer = await processedImage.toBuffer();
//       if (fs.existsSync(filePath)) {
//         archive.file(croppedImageBuffer, {
//           name: `Student_Image_${entry.codeNumber}.jpg`,
//         });
//       }
//     }

//     archive.finalize();

//     // Convert to Web ReadableStream and return
//     const webStream = nodeToWebReadable(archiveStream);

//     return new NextResponse(webStream, {
//       status: 200,
//       headers: {
//         "Content-Type": "application/zip",
//         "Content-Disposition": `attachment; filename="images_${date}.zip"`,
//       },
//     });
//   } catch (err) {
//     console.error("Download error:", err);
//     return new NextResponse("Internal Server Error", { status: 500 });
//   }
// }

import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { PassThrough } from "stream";
import sharp from "sharp";
import { getIdCardIssuesByDate } from "@/lib/services/id-card-issue.service";

const SNAPCARD_IMAGE_BASE_PATH =
  process.env.SNAPCARD_IMAGE_BASE_PATH || "./public";

// Converts Node.js stream to Web ReadableStream
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

    const idCardEntries = await getIdCardIssuesByDate(date);
    if (!idCardEntries || idCardEntries.length === 0) {
      return new NextResponse("No records found for the given date", {
        status: 404,
      });
    }

    const zipStream = new PassThrough();
    const archive = archiver("zip", { zlib: { level: 9 } });

    // Pipe archive into PassThrough
    archive.pipe(zipStream);

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

        // Crop and convert image
        const croppedBuffer = await sharp(filePath)
          .extract({ left: 200, top: 265, width: 260, height: 265 })
          [outputFormat as "png" | "jpeg" | "webp"]({ quality })
          .toBuffer();

        // Append to archive
        archive.append(croppedBuffer, {
          name: `Student_Image_${entry.codeNumber}.jpg`,
        });
      } catch (e) {
        console.warn(`Error processing image for ID ${entry.id}:`, e);
      }
    }

    archive.finalize();

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
