"use client";
import React, { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import jsPDF from "jspdf";
import * as domtoimage from "dom-to-image-more";

export default function StudentPage() {
  const { uid } = useParams();
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true); // Add this state
  // Webcam/capture states
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!uid || Array.isArray(uid)) return;
    setLoading(true);
    setError("");
    fetch(`/api/students?uid=${encodeURIComponent(uid)}`)
      .then(res => {
        if (!res.ok) throw new Error("Failed to fetch student");
        return res.json();
      })
      .then(data => {
        setStudent(data.content?.[0] || null);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Unknown error");
        setLoading(false);
      });
  }, [uid]);

  // Student data and image URLs
  const name = student?.name || "";
  const codeNumber = student?.codeNumber || "";
  const courseName = student?.courseName || "";
  const bloodGroupName = student?.bloodGroupName || "";
  const imgUrl = codeNumber ? `${process.env.NEXT_PUBLIC_STUDENT_PROFILE_URL}/Student_Image_${codeNumber}.jpg` : "";
  const templateUrl = "/id-card-template.jpeg";
  const mobile = student?.emrgnResidentPhNo || student?.emrgnFatherMobno || student?.emrgnMotherMobNo || "-";

  // Start webcam stream when modal opens
  useEffect(() => {
    if (showWebcam && videoRef.current) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(stream => {
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        })
        .catch(err => {
          alert("Could not access webcam: " + err.message);
          setShowWebcam(false);
        });
    }
    // Cleanup on close
    return () => {
      if (!showWebcam && streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [showWebcam]);

  // Use captured image if present, else fallback to imgUrl
  const effectiveImgUrl = capturedImage || imgUrl;

  useEffect(() => {
    if (!student) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setImageLoading(true); // Start loading

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw template image
    const templateImg = new window.Image();
    templateImg.src = templateUrl;
    templateImg.onload = () => {
      ctx.drawImage(templateImg, 0, 0, 340, 540);

      // Draw student photo
      const photoImg = new window.Image();
      photoImg.crossOrigin = "anonymous";
      console.log("Student image URL:", effectiveImgUrl); // Log image URL
      photoImg.src = effectiveImgUrl;
      photoImg.onload = () => {
        ctx.save();
        ctx.beginPath();
        ctx.rect(120, 120, 100, 100); // centered in frame
        ctx.clip();
        // Crop to center square
        const sWidth = photoImg.width;
        const sHeight = photoImg.height;
        const side = Math.min(sWidth, sHeight);
        const sx = (sWidth - side) / 2;
        let sy;
        const isCaptured = effectiveImgUrl.startsWith('data:');
        // If the image is wider than tall (webcam), use center crop
        if (isCaptured && sWidth > sHeight) {
          sy = (sHeight - side) / 2;
        } else {
          // For portrait or student images, crop from 40px down
          sy = 40;
        }
        // Estimated photo box position and size on the template
        const PHOTO_X = 100;
        const PHOTO_Y = 90;
        const PHOTO_W = 90;
        const PHOTO_H = 90;
        ctx.save();
        ctx.beginPath();
        ctx.rect(PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);
        ctx.clip();
        ctx.drawImage(photoImg, sx, sy, side, side, PHOTO_X, PHOTO_Y, PHOTO_W, PHOTO_H);
        ctx.restore();
        setImageLoading(false); // Image loaded
        // Name (bold, centered)
        ctx.font = "bold 20px Arial";
        ctx.fillStyle = "#111";
        ctx.textAlign = "center";
        ctx.fillText(name, 170, 250);
        // Course (regular, centered)
        ctx.font = "16px Arial";
        ctx.fillStyle = "#222";
        ctx.fillText(courseName, 170, 275);
        // UID label/value
        ctx.font = "16px Arial";
        ctx.fillStyle = "#222";
        ctx.textAlign = "left";
        ctx.fillText("UID:", 60, 310);
        ctx.font = "bold 16px Arial";
        ctx.fillText(codeNumber, 110, 310);
        // Mobile label/value
        ctx.font = "16px Arial";
        ctx.fillStyle = "#222";
        ctx.fillText("MOB NO.:", 70, 400);
        ctx.font = "bold 16px Arial";
        ctx.fillText(mobile, 150, 400);
        // Blood group badge (draw inside yellow arrow)
        ctx.font = "bold 18px Arial";
        ctx.fillStyle = "#2563eb";
        ctx.textAlign = "left";
        ctx.fillText(bloodGroupName, 180, 480);
        ctx.font = "20px Arial";
        ctx.fillStyle = "#dc2626";
        // ctx.fillText("🩸", 150, 480);
        setCardImage(canvas.toDataURL("image/png"));
      };
      photoImg.onerror = (e) => {
        setImageLoading(false); // Image failed
        console.error("Failed to load student image", effectiveImgUrl, e); // Log error
        // Draw initials if photo fails, centered in photo box
        ctx.save();
        ctx.beginPath();
        // ctx.rect(120, 120, 100, 100); // centered in frame
        ctx.clip();
        ctx.font = "bold 48px Arial";
        ctx.fillStyle = "#888";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(), 170, 170); // initials centered in frame
        ctx.restore();
        // Name
        ctx.font = "bold 20px Arial";
        ctx.fillStyle = "#111";
        ctx.textAlign = "center";
        ctx.fillText(name, 200, 280);
        // Course
        ctx.font = "16px Arial";
        ctx.fillStyle = "#222";
        ctx.fillText(courseName, 200, 300);
        // UID
        ctx.font = "16px Arial";
        ctx.fillStyle = "#222";
        ctx.textAlign = "left";
        ctx.fillText("UID:", 75, 375);
        ctx.font = "bold 16px Arial";
        ctx.fillText(codeNumber, 110, 375);
        // Mobile
        ctx.font = "16px Arial";
        ctx.fillStyle = "#222";
        ctx.fillText("MOB NO.:", 75, 400);
        ctx.font = "bold 16px Arial";
        ctx.fillText(mobile, 155, 400);
        // Blood group badge
        ctx.font = "bold 18px Arial";
        ctx.fillStyle = "#2563eb";
        ctx.textAlign = "left";
        ctx.fillText(bloodGroupName, 150, 467);
        ctx.font = "20px Arial";
        ctx.fillStyle = "#dc2626";
        // ctx.fillText("🩸", 150, 480);
        setCardImage(canvas.toDataURL("image/png"));
      };
    };
  }, [student, effectiveImgUrl, name, courseName, codeNumber, mobile, bloodGroupName, templateUrl]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="text-red-500">{error}</div>;
  if (!student) return <div>No student found.</div>;

  const handleDownload = async () => {
    console.log('Download clicked');
    if (!cardRef.current) {
      console.log('cardRef is null');
      return;
    }
    try {
      domtoimage.toPng(cardRef.current as Node)
        .then((dataUrl: string) => {
          const link = document.createElement('a');
          link.download = `${codeNumber}_idcard.png`;
          link.href = dataUrl;
          link.click();
          console.log('Download triggered');
        })
        .catch((error: unknown) => {
          console.error('dom-to-image error:', error);
        });
    } catch (err) {
      console.error('dom-to-image error:', err);
    }
  };

  const handlePrint = () => {
    console.log('Print clicked');
    if (!cardRef.current) {
      console.log('cardRef is null');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write('<html><head><title>Print</title>');
      // Optionally add your CSS here for print styling
      printWindow.document.write('<style>body{margin:0;} .rounded-lg{border-radius:0.5rem;} .shadow{box-shadow:0 1px 3px rgba(0,0,0,0.1);} .bg-gray-100{background:#f3f4f6;} img{max-width:100%;height:auto;display:block;}</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(cardRef.current.outerHTML);
      printWindow.document.write('</body></html>');
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
      console.log('Print window opened (HTML only)');
    }
  };

  const handleDownloadPDF = async () => {
    if (!frontRef.current || !backRef.current) return;
    try {
      const [frontDataUrl, backDataUrl] = await Promise.all([
        domtoimage.toPng(frontRef.current as Node),
        domtoimage.toPng(backRef.current as Node),
      ]);
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [680, 540], // 340*2 width, 540 height
      });
      pdf.addImage(frontDataUrl, "PNG", 0, 0, 340, 540);
      pdf.addImage(backDataUrl, "PNG", 340, 0, 340, 540);
      pdf.save(`${codeNumber}_idcard.pdf`);
    } catch (err) {
      console.error('PDF download error:', err);
    }
  };

  return (
    <div className="flex gap-8 mt-8 px-4">
      {/* Left panel: Student details (always visible) */}
      <div className="w-full max-w-xs flex-shrink-0">
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <Avatar className="h-24 w-24 mb-4">
            <AvatarImage src={`${process.env.NEXT_PUBLIC_STUDENT_PROFILE_URL}/Student_Image_${codeNumber}.jpg`} alt={name} className="object-cover object-center w-full h-full" />
            <AvatarFallback className="text-2xl">{name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <button
            className="mt-2 mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
            onClick={() => setShowWebcam(true)}
          >
            Photo Capture
          </button>
          <h2 className="text-xl font-bold mb-2 text-center">{name}</h2>
          <div className="grid grid-cols-1 gap-y-1 text-sm w-full">
            <div><span className="font-medium text-muted-foreground">Code Number:</span> {codeNumber}</div>
            <div><span className="font-medium text-muted-foreground">Course:</span> {courseName}</div>
            <div><span className="font-medium text-muted-foreground">Blood Group:</span> {bloodGroupName}</div>
            <div><span className="font-medium text-muted-foreground">Mobile:</span> {mobile}</div>
          </div>
        </div>
        {/* Download/Print buttons */}
        <div className="flex gap-4 mt-4 justify-center">
          <button
            onClick={handleDownload}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            Download
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            Download PDF
          </button>
        </div>
        {/* Webcam Modal */}
        {showWebcam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                onClick={() => {
                  setShowWebcam(false);
                  setTimeout(() => setCapturedImage(null), 100); // Optionally clear captured image
                }}
              >
                ✕
              </button>
              <video ref={videoRef} width={320} height={240} autoPlay className="rounded border mb-4" />
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition mb-2"
                onClick={() => {
                  if (videoRef.current) {
                    const video = videoRef.current;
                    const canvas = document.createElement('canvas');
                    canvas.width = video.videoWidth || 320;
                    canvas.height = video.videoHeight || 240;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                      const dataUrl = canvas.toDataURL('image/jpeg');
                      setCapturedImage(dataUrl);
                      setShowWebcam(false);
                    }
                  }
                }}
              >
                Capture
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Right panel: Card previews */}
      <div className="flex-1 flex flex-row items-center justify-center gap-8">
        {/* HTML/CSS overlay ID card preview */}
        <div ref={el => { cardRef.current = el; frontRef.current = el; }} style={{ position: 'relative', width: 340, height: 540 }} className="rounded-lg shadow bg-gray-100 flex items-center justify-center">
          {/* Template background */}
          <img
            src="/id-card-template.jpeg"
            alt="ID Card Template"
            style={{ width: '100%', height: '100%', display: 'block', borderRadius: 8, position: 'absolute', left: 0, top: 0, zIndex: 1 }}
          />
          {/* Student photo */}
          <img
            src={effectiveImgUrl}
            alt="Student"
            style={{
              position: 'absolute',
              left: 150, // adjust as needed
              top: 175,   // adjust as needed
              width: 90,
              height: 90,
              objectFit: 'cover',
              borderRadius: 8,
              zIndex: 2,
              background: '#fff',
            }}
          />
          {/* Name */}
          <div
            style={{
              position: 'absolute',
              left: 25,
              top: 271, // adjust as needed
              width: '100%',
              textAlign: 'center',
              fontWeight: 'bold',
              fontSize: 18,
              color: '#111',
              zIndex: 3,
              letterSpacing: 2,
            }}
          >
            {name}
          </div>
          {/* Course */}
          <div
            style={{
              position: 'absolute',
              left: 23,
              top: 295, // adjust as needed
              width: '100%',
              textAlign: 'center',
              fontSize: 15,
              color: '#222',
              zIndex: 3,
            }}
          >
            {courseName}
          </div>
          {/* UID */}
          <div
            style={{
              position: 'absolute',
              left: 74,
              top: 367, // adjust as needed
              fontSize: 14,
              color: '#222',
              zIndex: 3,
            }}
          >
            <span style={{ fontWeight: 600 }}>UID:</span> <span style={{ fontWeight: 700 }}>{codeNumber}</span>
          </div>
          {/* Mobile */}
          <div
            style={{
              position: 'absolute',
              left: 74,
              top: 391, // adjust as needed
              fontSize: 14,
              color: '#222',
              zIndex: 3,
            }}
          >
            <span style={{ fontWeight: 600 }}>MOB NO.:</span> <span style={{ fontWeight: 700 }}>{mobile}</span>
          </div>
          {/* Blood group badge */}
          <div
            style={{
              position: 'absolute',
              left: 149, // adjust as needed
              top: 447, // adjust as needed
              fontSize: 18,
              color: '#2563eb',
              fontWeight: 'bold',
              zIndex: 3,
            }}
          >
            {bloodGroupName}
          </div>
        </div>
        {/* Backside preview remains as image */}
        <div ref={backRef} style={{ width: 340, height: 540 }} className="rounded-lg shadow bg-gray-100 flex items-center justify-center ml-8 overflow-hidden">
          <img
            src="/id-card-template-backside.jpeg"
            alt="ID Card Backside"
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
          />
        </div>
      </div>
    </div>
  );
}
