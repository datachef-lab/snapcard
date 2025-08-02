import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import path from "path";
import fs from "fs";
import { getIdCardIssuesByUid } from "@/lib/services/id-card-issue.service";

const SNAPCARD_IMAGE_BASE_PATH = process.env.SNAPCARD_IMAGE_BASE_PATH || "./public";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    const crop = searchParams.get("crop");

    if (!uid) {
      return new NextResponse("Missing uid parameter", { status: 400 });
    }

    const foundIdCards = await getIdCardIssuesByUid(uid);
console.log(foundIdCards);
    if (!foundIdCards || foundIdCards.length === 0) { // Added check for empty array
      return new NextResponse("No id card found for the given uid", { status: 404 });
    }
    
    // Construct image path for student profile
    const imagePath = path.join(SNAPCARD_IMAGE_BASE_PATH, "idcards", `${foundIdCards[0].id}.png`);



    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return new NextResponse("Image not found", { status: 404 });
    }

    // If crop is 'true', process the image with cropping
    if (crop === "true") {
      const outputFormat = searchParams.get("format") || "png";
      const quality = parseInt(searchParams.get("quality") || "90");

      // Get image metadata
      const metadata = await sharp(imagePath).metadata();
      
      if (!metadata.width || !metadata.height) {
        return new NextResponse("Unable to read image dimensions", { status: 400 });
      }

      // Define fixed crop area
      const x = 200;
      const y = 265;
      const width = 260;
      const height = 265;

      // Process the image with sharp
      let processedImage = sharp(imagePath)
        .extract({ left: x, top: y, width, height });

      // Set output format and quality
      switch (outputFormat.toLowerCase()) {
        case "jpeg":
        case "jpg":
          processedImage = processedImage.jpeg({ quality });
          break;
        case "png":
          processedImage = processedImage.png({ quality });
          break;
        case "webp":
          processedImage = processedImage.webp({ quality });
          break;
        default:
          return new NextResponse("Unsupported output format", { status: 400 });
      }

      // Convert to buffer
      const croppedImageBuffer = await processedImage.toBuffer();

      // Return the cropped image
      return new NextResponse(croppedImageBuffer, {
        status: 200,
        headers: {
          "Content-Type": `image/${outputFormat.toLowerCase()}`,
          "Content-Length": croppedImageBuffer.length.toString(),
          "Cache-Control": "public, max-age=3600", // Cache for 1 hour
        },
      });
    } else {
      // Return the original image without cropping
      const imageBuffer = await fs.promises.readFile(imagePath);
      
      return new NextResponse(imageBuffer, {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Disposition": `inline; filename=Student_Image_${uid}.jpg`,
        },
      });
    }
  } catch (error) {
    console.error("Error processing image:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
} 