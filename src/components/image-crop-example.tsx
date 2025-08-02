"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cropImage, blobToDataURL, downloadCroppedImage } from "@/lib/utils/image-crop";
import { toast } from "sonner";

export function ImageCropExample() {
  const [imagePath, setImagePath] = useState("public/id-card-template.jpeg");
  const [x, setX] = useState(100);
  const [y, setY] = useState(100);
  const [width, setWidth] = useState(300);
  const [height, setHeight] = useState(400);
  const [outputFormat, setOutputFormat] = useState<"jpeg" | "png" | "webp">("jpeg");
  const [quality, setQuality] = useState(90);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleCrop = async () => {
    setIsLoading(true);
    try {
      const result = await cropImage({
        imagePath,
        x,
        y,
        width,
        height,
        outputFormat,
        quality,
      });

      if (result.success && result.imageBlob) {
        const dataUrl = await blobToDataURL(result.imageBlob);
        setCroppedImageUrl(dataUrl);
        toast.success("Image cropped successfully!");
      } else {
        toast.error(result.message || "Failed to crop image");
      }
    } catch (error) {
      console.error("Error cropping image:", error);
      toast.error("Error cropping image");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!croppedImageUrl) return;
    
    try {
      const response = await fetch(croppedImageUrl);
      const blob = await response.blob();
      downloadCroppedImage(blob, `cropped-image.${outputFormat}`);
      toast.success("Image downloaded!");
    } catch (error) {
      console.error("Error downloading image:", error);
      toast.error("Error downloading image");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Image Crop API Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Image Path</label>
              <Input
                value={imagePath}
                onChange={(e) => setImagePath(e.target.value)}
                placeholder="e.g., public/images/photo.jpg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Output Format</label>
              <select
                value={outputFormat}
                onChange={(e) => setOutputFormat(e.target.value as "jpeg" | "png" | "webp")}
                className="w-full p-2 border rounded-md"
              >
                <option value="jpeg">JPEG</option>
                <option value="png">PNG</option>
                <option value="webp">WebP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">X Coordinate</label>
              <Input
                type="number"
                value={x}
                onChange={(e) => setX(Number(e.target.value))}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Y Coordinate</label>
              <Input
                type="number"
                value={y}
                onChange={(e) => setY(Number(e.target.value))}
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Width</label>
              <Input
                type="number"
                value={width}
                onChange={(e) => setWidth(Number(e.target.value))}
                min="1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Height</label>
              <Input
                type="number"
                value={height}
                onChange={(e) => setHeight(Number(e.target.value))}
                min="1"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Quality (1-100)</label>
            <Input
              type="number"
              value={quality}
              onChange={(e) => setQuality(Number(e.target.value))}
              min="1"
              max="100"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={handleCrop} disabled={isLoading}>
              {isLoading ? "Cropping..." : "Crop Image"}
            </Button>
            {croppedImageUrl && (
              <Button onClick={handleDownload} variant="outline">
                Download Cropped Image
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {croppedImageUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Cropped Image Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <img
              src={croppedImageUrl}
              alt="Cropped image"
              className="max-w-full h-auto border rounded-lg"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
} 