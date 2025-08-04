import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import archiver from "archiver";
import { Readable } from "stream";
import { getIdCardIssuesByDate } from "@/lib/services/id-card-issue.service";

const SNAPCARD_IMAGE_BASE_PATH = process.env.SNAPCARD_IMAGE_BASE_PATH || "./public";

// Helper: Convert Node stream to Web ReadableStream
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

        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return new NextResponse("Invalid or missing date (expected YYYY-MM-DD)", { status: 400 });
        }

        const idCardEntries = await getIdCardIssuesByDate(date);
        if (!idCardEntries || idCardEntries.length === 0) {
            return new NextResponse("No records found for the given date", { status: 404 });
        }

        // Create archive
        const archive = archiver("zip", { zlib: { level: 9 } });
        const archiveStream = new Readable().wrap(archive);

        // Add images to archive
        for (const entry of idCardEntries) {
            const filePath = path.join(SNAPCARD_IMAGE_BASE_PATH, "idcards", `${entry.id}.png`);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: `Student_Image_${entry.codeNumber}.jpg` });
            }
        }

        archive.finalize();

        // Convert to Web ReadableStream and return
        const webStream = nodeToWebReadable(archiveStream);

        return new NextResponse(webStream, {
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
