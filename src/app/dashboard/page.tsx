"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, User } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { IdCardIssue, Student } from "@/types"
import QRCode from "qrcode"
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { IdCardTemplate } from "@/lib/db/schema";
// import { useAuth } from "@/hooks/use-auth";
import NextImage from 'next/image';
import * as faceapi from 'face-api.js';
import { toast } from "sonner";
import { Toaster } from "@/components/ui/sonner";

export default function Page() {
  // const {user} = useAuth();
  const [value, setValue] = useState("");
  // const router = useRouter();
  // const pathname = usePathname();
  const params = useParams();

  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const faceCanvasRef = useRef<HTMLCanvasElement>(null); // For face box overlay
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [idCardIssues, setIdCardIssues] = useState<IdCardIssue[]>([]);
  const [generatedCard, setGeneratedCard] = useState<string | null>(null)
  const [showWebcam, setShowWebcam] = useState(false)
  const [userDetails, setUserDetails] = useState<Student | null>(null);
  const [showBack, setShowBack] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  // Scaling factors for new canvas size (old: 600x900, new: 638x1004)
  const SCALE_X = 638 / 600;
  const SCALE_Y = 1004 / 900;

  const [positions, setPositions] = useState<IdCardTemplate>({
    nameCoordinates: { x: Math.round(330 * SCALE_X), y: Math.round(580 * SCALE_Y) },
    courseCoordinates: { x: Math.round(323 * SCALE_X), y: Math.round(620 * SCALE_Y) },
    uidCoordinates: { x: Math.round(215 * SCALE_X), y: Math.round(680 * SCALE_Y) },
    mobileCoordinates: { x: Math.round(240 * SCALE_X), y: Math.round(710 * SCALE_Y) },
    bloodGroupCoordinates: { x: Math.round(210 * SCALE_X), y: Math.round(776 * SCALE_Y) },
    sportsQuotaCoordinates: { x: Math.round(270 * SCALE_X), y: Math.round(776 * SCALE_Y) },
    qrcodeCoordinates: { x: Math.round(375 * SCALE_X), y: Math.round(656 * SCALE_Y) },
    validTillDateCoordinates: { x: Math.round(129 * SCALE_X), y: Math.round(845 * SCALE_Y) },
    admissionYear: "",
    photoDimension: {
      x: Math.round(240 * SCALE_X),
      y: Math.round(280 * SCALE_Y),
      width: Math.round(200 * SCALE_X),
      height: Math.round(250 * SCALE_Y)
    },
    qrcodeSize: Math.round(190 * SCALE_X),
  });
  // const [qrcodeSize, setQrcodeSize] = useState(190);
  const [validTillDate, setValidTillDate] = useState("");
  // const [photoRect, setPhotoRect] = useState({ x: 240, y: 280, width: 200, height: 250 });
  const issueType = "ISSUED";
  const [remarks, setRemarks] = useState("First card issued");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewCardIssueId, setViewCardIssueId] = useState<number | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteIssueId, setDeleteIssueId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [templates, setTemplates] = useState<IdCardTemplate[]>([]);
  const setSelectedTemplate = useState<IdCardTemplate | null>(null)[1];
  const [notFound, setNotFound] = useState(false);
  const setFile = useState<File | null>(null)[1];
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const setFaceDetected = useState(false)[1]; // For face detection
  const setNumFaces = useState(0)[1]; // For face detection
  const [modelsLoaded, setModelsLoaded] = useState(false); // Face-api.js models

  // Update remarks when issueType changes
  useEffect(() => {
    if (issueType === "ISSUED") setRemarks("First card issued");
    else if (issueType === "RENEWED") setRemarks("Renewed the card.");
    else if (issueType === "REISSUED") setRemarks("Reissued due to lost/update card");
  }, [issueType]);

  // Auto-switch type if current selection is disabled
  // (Removed: issueType is now always 'ISSUED')

  const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

  useEffect(() => {
    if (userDetails && templates.length > 0) {
      // const tmpt =templates.find(ele => ele.admissionYear == (userDetails).academicYear);
      // if (tmpt) {
        setSelectedTemplate(templates[0]);
        setPositions(templates[0]);
        // setQrcodeSize(templates[0].qrcodeSize);
        // setPhotoRect(templates[0].photoDimension);

        setPreviewUrl(`${BASE_PATH}/api/id-card-template/${templates[0].id}`);
        // setFile(null);
      // }
    }
  }, [userDetails, templates, BASE_PATH, setSelectedTemplate, setPositions, setPreviewUrl, setFile]);

  // Remove auto-search on input change. Add form with submit button for UID search.

  const [searchValue, setSearchValue] = useState("");

  // Remove useEffect that fetches student on value change
  // Instead, add a handleSearchSubmit function
  const handleSearchSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setUserDetails(null);
    setNotFound(false);
    setLoading(true);
    try {
      const res = await fetch(`${BASE_PATH}/api/students?uid=${searchValue}`);
      const data = await res.json();
      if (data.content && data.content.length > 0) {
        setUserDetails({...data.content[0], courseName: data.content[0].courseName ?? '', phoneMobileNo: data.content[0].phoneMobileNo ?? ''});
        setNotFound(false);
        // Fetch template for this student's admission year (same as before)
        const admissionYear = data.content[0].academicYear;
        if (admissionYear) {
          const templateRes = await fetch(`${BASE_PATH}/api/id-card-template?admissionYear=${admissionYear}`);
          if (templateRes.ok) {
            const template = await templateRes.json();
            if (template) {
              // setPositions, etc. (same as before)
            }
          }
        }
      } else {
        setUserDetails(null);
        setNotFound(true);
      }
    } catch {
      setUserDetails(null);
      setNotFound(true);
    } finally {
      setCapturedImage(null); 
      setGeneratedCard(null);
      setLoading(false);
    }
  };

  const fetchTemplates = useCallback(async () => {
    const res = await fetch(`${BASE_PATH}/api/id-card-template`);
    if (res.ok) {
      const data = await res.json();
      console.log(data)
      setTemplates(Array.isArray(data.data) ? data.data : []);
    }
  }, [BASE_PATH]);

  useEffect(() => {
    if (templates.length > 0) return;
    fetchTemplates();
  }, [templates, fetchTemplates]);
  


  const capture = useCallback(() => {
    // Always enable capture, crop to green box
    const video = webcamRef.current?.video;
    if (video) {
      // Create a canvas to crop the center 420x420 region
      const cropWidth = 420;
      const cropHeight = 420;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      const cropX = (videoWidth - cropWidth) / 2;
      const cropY = (videoHeight - cropHeight) / 2;
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cropWidth;
      tempCanvas.height = cropHeight;
      const tempCtx = tempCanvas.getContext('2d');
      if (tempCtx) {
        tempCtx.drawImage(video, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        const croppedImage = tempCanvas.toDataURL('image/jpeg');
        setCapturedImage(croppedImage);
        setShowWebcam(false);
      }
    }
  }, [webcamRef]);

  const generateIDCard = useCallback(async () => {
    console.log("Generating ID card")
    console.log("Captured image:", capturedImage)
    console.log("Canvas:", canvasRef.current)
    console.log("Preview URL:", previewUrl)
    if (!capturedImage || !canvasRef.current || !previewUrl) {
      console.log("No captured image or canvas or preview URL")
      return;
    }

    // Guard for photoDimension
    if (!positions.photoDimension || positions.photoDimension.x === undefined || positions.photoDimension.y === undefined || positions.photoDimension.width === undefined || positions.photoDimension.height === undefined) {
      console.log("Invalid photoDimension", positions.photoDimension);
      return;
    }

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      console.log("No context")
      return;
    }

    // Set canvas dimensions to match the real-world ID card size at 300 DPI (5.4cm x 8.5cm)
    // 1 inch = 2.54 cm, so 5.4cm = 2.126in, 8.5cm = 3.346in
    // 2.126 * 300 = 638px, 3.346 * 300 = 1004px
    canvas.width = 638;
    canvas.height = 1004;

    // Load the clean template image
    const templateImg = typeof window !== 'undefined' ? new window.Image() : new Image();
    templateImg.crossOrigin = "anonymous"

    templateImg.onload = async () => {
      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw the clean template background
      ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height)

      // Load and draw the captured photo
      const userImg = typeof window !== 'undefined' ? new window.Image() : new Image();

      userImg.onload = async () => {
        // Photo placement coordinates for the clean template
        const photoX = positions.photoDimension.x //  photoRect.x // X position of photo area
        const photoY = positions.photoDimension.y // photoRect.y // Y position of photo area
        const photoWidth = positions.photoDimension.width // photoRect.width // Width of photo area
        const photoHeight = positions.photoDimension.height // photoRect.height // Height of photo area

        // Save context for clipping
        ctx.save()

        // Create clipping path for photo area
        ctx.beginPath()
        ctx.rect(photoX, photoY, photoWidth, photoHeight)
        ctx.clip()

        // Calculate aspect ratio to fit photo properly
        const imgAspect = userImg.width / userImg.height
        const areaAspect = photoWidth / photoHeight

        let drawWidth, drawHeight, drawX, drawY

        if (imgAspect > areaAspect) {
          // Image is wider, fit to height
          drawHeight = photoHeight
          drawWidth = photoHeight * imgAspect
          drawX = photoX - (drawWidth - photoWidth) / 2
          drawY = photoY
        } else {
          // Image is taller, fit to width
          drawWidth = photoWidth
          drawHeight = photoWidth / imgAspect
          drawX = photoX
          drawY = photoY - (drawHeight - photoHeight) / 2
        }

        // Draw the user photo
        ctx.drawImage(userImg, drawX, drawY, drawWidth, drawHeight)

        // Restore context
        ctx.restore()

        // Add user details text with proper positioning for the clean template
        ctx.fillStyle = "#000000"
        ctx.textAlign = "center"

        // Name
        if (userDetails && userDetails.name) {
          const blueBarWidth = Math.round(80 * SCALE_X); // width of the blue bar with logo
          const rightMargin = Math.round(20 * SCALE_X);
          const whiteAreaWidth = canvas.width - blueBarWidth - rightMargin;
          const centerX = blueBarWidth + whiteAreaWidth / 2;
          ctx.save();
          ctx.beginPath();
          ctx.rect(blueBarWidth, positions.nameCoordinates.y - Math.round(40 * SCALE_Y), whiteAreaWidth, Math.round(50 * SCALE_Y));
          ctx.clip();
          ctx.font = `bold ${Math.round(30 * SCALE_Y)}px Calibri`;
          ctx.textAlign = "center";
          ctx.fillText(userDetails.name.toUpperCase(), centerX, positions.nameCoordinates.y, whiteAreaWidth);
          ctx.restore();
        }
        // UID (centered in white area, with label)
        if (userDetails && userDetails.codeNumber) {
          const blueBarWidth = Math.round(80 * SCALE_X);
          const rightMargin = Math.round(20 * SCALE_X);
          const whiteAreaWidth = canvas.width - blueBarWidth - rightMargin;
          const centerX = blueBarWidth + whiteAreaWidth / 2;
          ctx.save();
          ctx.beginPath();
          ctx.rect(blueBarWidth, positions.uidCoordinates.y - Math.round(20 * SCALE_Y), whiteAreaWidth, Math.round(40 * SCALE_Y));
          ctx.clip();
          ctx.font = `bold ${Math.round(34 * SCALE_Y)}px Calibri`;
          ctx.textAlign = "center";
          ctx.fillText(`${userDetails.codeNumber}`, centerX, positions.uidCoordinates.y, whiteAreaWidth);
          ctx.restore();
        }
        // Valid Till Date (centered in white area)
        if (validTillDate) {
          const blueBarWidth = Math.round(80 * SCALE_X);
          const rightMargin = Math.round(24 * SCALE_X);
          const whiteAreaWidth = canvas.width - blueBarWidth - rightMargin;
          const centerX = blueBarWidth + whiteAreaWidth / 2;
          ctx.save();
          ctx.beginPath();
          ctx.rect(blueBarWidth, positions.validTillDateCoordinates.y - Math.round(20 * SCALE_Y), whiteAreaWidth, Math.round(40 * SCALE_Y));
          ctx.clip();
          ctx.font = `bold ${Math.round(20 * SCALE_Y)}px Calibri`;
          ctx.textAlign = "center";
          ctx.fillText(`Valid Till: ${validTillDate}`, centerX, positions.validTillDateCoordinates.y, whiteAreaWidth);
          ctx.restore();
        }

        // Course (left-aligned with yellow arrow)
        let courseText = userDetails && userDetails.courseName ? `${userDetails.courseName}${userDetails.shiftName ? ` ${userDetails.shiftName}` : ''}` : '';
        if (courseText.toUpperCase().trim().includes("B.A. JOURNALISM AND MASS COMM (H)")) {
          courseText = `B.A. JMC (H) ${userDetails?.shiftName ? `${userDetails.shiftName}` : ''}`;
        }
        if (courseText.toUpperCase().trim().includes("B.A. POLITICAL SCIENCE (H)")) {
          courseText = `B.A. Pol. Sci. (H) ${userDetails?.shiftName ? `${userDetails.shiftName}` : ''}`;  
        }
        if (courseText.toUpperCase().trim().includes("B.SC. COMPUTER SCIENCE (H)")) {
          courseText = `B.Sc. Comp. Sci. (H) ${userDetails?.shiftName ? `${userDetails.shiftName}` : ''}`;
        }
        else if (courseText.toUpperCase().trim().includes("B.SC. ECONOMICS (H)")) {
          courseText = `B.Sc. Eco. (H) ${userDetails?.shiftName ? `${userDetails.shiftName}` : ''}`;
        }
        else if (courseText.toUpperCase().trim().includes("B.SC. MATHEMATICS (H)")) {
          courseText = `B.Sc. Maths. (H) ${userDetails?.shiftName ? `${userDetails.shiftName}` : ''}`;
        } 
        else if (courseText.toUpperCase().trim().includes("B.A. SOCIOLOGY (H)")) {
          courseText = `B.A. Sociology (H) ${userDetails?.shiftName ? `${userDetails.shiftName}` : ''}`;
        }
        
        if (courseText) {
          const arrowLeftX = Math.round(110 * SCALE_X); // Adjust this value to match the yellow arrow's left edge in the template
          ctx.font = `bold ${Math.round(29 * SCALE_Y)}px Calibri`;
          ctx.textAlign = "left";
          ctx.fillText(courseText, arrowLeftX, positions.courseCoordinates.y);
        }

        // Mobile (left-aligned with yellow arrow)
        if (userDetails) {
          const arrowLeftX = Math.round(110 * SCALE_X); // Same as above
          ctx.font = `bold ${Math.round(29 * SCALE_Y)}px Calibri`;
          ctx.textAlign = "left";
          ctx.fillText(`${userDetails.contactNo ?? ''}`, arrowLeftX, positions.mobileCoordinates.y);
        }

        // Blood Group
        if (userDetails && userDetails.bloodGroupName) {
          ctx.font = `bold ${Math.round(31 * SCALE_Y)}px Calibri`
          ctx.fillText(`${userDetails.bloodGroupName}`, positions.bloodGroupCoordinates.x, positions.bloodGroupCoordinates.y)
        }

        // Sports Quota
        if (userDetails && userDetails.quotatype && userDetails.quotatype.toLowerCase().includes("sports")) {
          ctx.font = `bold ${Math.round(31 * SCALE_Y)}px Calibri`
          ctx.textAlign = "left"
          ctx.fillText("SQ", positions.sportsQuotaCoordinates.x, positions.sportsQuotaCoordinates.y)
          ctx.textAlign = "center"
        }

        // QR Code (containing UID)
        if (userDetails && userDetails.codeNumber) {
          try {
            const qrDataUrl = await QRCode.toDataURL(userDetails.codeNumber, { margin: 0, width: positions.qrcodeSize })
            const qrImg = new window.Image()
            qrImg.onload = () => {
              ctx.drawImage(qrImg, positions.qrcodeCoordinates.x, positions.qrcodeCoordinates.y, positions.qrcodeSize, positions.qrcodeSize)
              // Convert canvas to image and set it
              const generatedImageUrl = canvas.toDataURL("image/png", 1.0)
              setGeneratedCard(generatedImageUrl)
            }
            qrImg.src = qrDataUrl
            return // Wait for QR to load before setting image
          } catch (err) {
            console.error("Failed to generate QR code", err)
          }
        }

        // Convert canvas to image and set it (if no QR code)
        const generatedImageUrl = canvas.toDataURL("image/png", 1.0)
        setGeneratedCard(generatedImageUrl)
      }

      userImg.onerror = () => {
        console.error("Failed to load user image")
      }

      userImg.src = capturedImage
    }

    templateImg.onerror = () => {
      console.error("Failed to load template image")
    }

    // Use the clean template image
    // templateImg.src = `${process.env.NEXT_PUBLIC_BASE_PATH}/id-template-new-frontend.jpeg`
    templateImg.src = previewUrl;
  }, [capturedImage, userDetails, previewUrl, validTillDate,
      positions.photoDimension,
      positions.nameCoordinates,
      positions.courseCoordinates,
      positions.uidCoordinates,
      positions.mobileCoordinates,
      positions.bloodGroupCoordinates,
      positions.sportsQuotaCoordinates,
      positions.validTillDateCoordinates,
      positions.qrcodeCoordinates,
      positions.qrcodeSize
  ]);

  useEffect(() => {
    if (capturedImage && userDetails && userDetails.name) {
      generateIDCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDetails, capturedImage, positions, positions.qrcodeSize, validTillDate, positions.photoDimension]);

//   const handleInputChange = (field: keyof Student, value: string) => {
//     setUserDetails((prev) => {
//       if (!prev) return null;
//       return { ...prev, [field]: value };
//     });
//   }

  const handleSaveImage = async () => {
    if (!generatedCard || !userDetails!.codeNumber) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      // 1. Create new id card issue entry first
      const lastIssueId = idCardIssues.length > 0 ? idCardIssues[0].id : null;
      const renewedFromId = null;
      const issueRes = await fetch(`${BASE_PATH}/api/id-card-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id_fk: userDetails!.id!,
          issue_date: new Date().toISOString().slice(0, 10),
          expiry_date: (() => {
            const ymd = formatDateToYYYYMMDD(validTillDate);
            console.log("Saving with valid_to:", validTillDate, "->", ymd);
            return new Date(ymd).toISOString().slice(0, 10);
          })(),
          issue_status: issueType,
          renewed_from_id: renewedFromId,
          remarks,
          name: userDetails?.name || '',
          blood_group_name: userDetails?.bloodGroupName || '',
          course_name: userDetails?.courseName || '',
          phone_mobile_no: userDetails?.contactNo || '',
          security_q: userDetails?.securityQ || '',
          sports_quota: userDetails?.securityQ || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as IdCardIssue),
      });
      let newIssueId: number | null = null;
      if (issueRes.ok) {
        const issueData = await issueRes.json();
        newIssueId = issueData.data?.id;
      }
      if (!newIssueId) {
        setSaveStatus("error");
        setSaving(false);
        toast.error("Failed to save photo. Try again.");
        return;
      }
      // 2. Upload the generated ID card image using id_card_issue_id
      const blob = await (await fetch(generatedCard)).blob();
      const formData = new FormData();
      formData.append("file", blob, `${newIssueId}.png`);
      formData.append("id_card_issue_id", String(newIssueId));
      const res = await fetch(`${BASE_PATH}/api/students/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        // Refresh issues
        fetch(`${BASE_PATH}/api/id-card-issue?student_id=${userDetails!.id!}`)
          .then(res => res.json())
          .then(data => setIdCardIssues(data.data || []));
        setSaveStatus("success");
        toast.success("Photo saved successfully!");
      } else {
        setSaveStatus("error");
        toast.error("Failed to save photo. Try again.");
      }
    } catch (error) {
      console.log(error)
      setSaveStatus("error");
      toast.error("Failed to save photo. Try again.");
    }
    setSaving(false);
  };

  // When fetching the image, use the latest id-card-issue id
  useEffect(() => {
    if (saveStatus === "success") {
      const timer = setTimeout(() => setSaveStatus("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // Fetch all issues for the student when UID changes
  useEffect(() => {
    if (!userDetails || !userDetails.id) return;
    fetch(`${BASE_PATH}/api/id-card-issue?student_id=${userDetails.id!}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) setIdCardIssues(data.data || []);
        else setIdCardIssues([]);
      })
      .catch(() => setIdCardIssues([]));
  }, [userDetails?.id, BASE_PATH, userDetails]);

  // Set default valid till date if not present
  useEffect(() => {
    if (!validTillDate) {
      setValidTillDate('31-07-2028');
    }
  }, [userDetails, validTillDate]);


  // Sync input value with current UID param
  useEffect(() => {
    if (params?.uid && value !== params.uid) {
      setValue(params.uid as string);
    }
    if (!params?.uid && value !== "") {
      setValue("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params?.uid]);

  // Helper to format date as dd-mm-yyyy
  function formatDateToYYYYMMDD(dateStr: string) {
    // Accepts dd-mm-yyyy or yyyy-mm-dd, returns yyyy-mm-dd for input value
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const [dd, mm, yyyy] = dateStr.split('-');
    if (yyyy && mm && dd) return `${yyyy}-${mm}-${dd}`;
    return dateStr;
  }

  // Load face-api.js models when webcam modal opens
  useEffect(() => {
    if (!showWebcam) return;
    let isMounted = true;
    const loadModels = async () => {
      try {
        await faceapi.nets.tinyFaceDetector.loadFromUri(`${BASE_PATH}/models`);
        if (isMounted) setModelsLoaded(true);
      } catch (err) {
        console.error('Failed to load face-api.js models', err);
      }
    };
    loadModels();
    return () => { isMounted = false; setModelsLoaded(false); };
  }, [showWebcam, BASE_PATH]);

  // Face detection loop
  useEffect(() => {
    if (!showWebcam || !modelsLoaded) return;
    const detect = async () => {
      if (webcamRef.current && webcamRef.current.video && modelsLoaded) {
        const options = new faceapi.TinyFaceDetectorOptions({
          inputSize: 416, // more accurate, but slower
          scoreThreshold: 0.2 // more sensitive
        });
        const detections = await faceapi.detectAllFaces(
          webcamRef.current.video as HTMLVideoElement,
          options
        );
        setNumFaces(detections.length);
        // Fixed frame in center
        const frameWidth = 420;
        const frameHeight = 420;
        const frameX = (900 - frameWidth) / 2;
        const frameY = (600 - frameHeight) / 2;
        const margin = 50; // Allow 10px margin
        let faceInFrame = false;
        for (const det of detections) {
          const { x, y, width, height } = det.box;
          if (
            x >= frameX - margin &&
            y >= frameY - margin &&
            x + width <= frameX + frameWidth + margin &&
            y + height <= frameY + frameHeight + margin
          ) {
            faceInFrame = true;
            break;
          }
        }
        setFaceDetected(faceInFrame);
        // Draw overlay
        const canvas = faceCanvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Draw only the fixed green frame
            ctx.strokeStyle = '#00FF00';
            ctx.lineWidth = 3;
            ctx.strokeRect(frameX, frameY, frameWidth, frameHeight);
          }
        }
      }
    };
    const intervalId = setInterval(detect, 400); // Check every 400ms
    return () => clearInterval(intervalId);
  }, [showWebcam, modelsLoaded, setNumFaces, setFaceDetected]);


  return (
    <>
      <Toaster />
      <div className="px-4">

        <h2 className="scroll-m-20 py-2 mb-2 border-b  text-3xl font-semibold tracking-tight first:mt-0">
          Enter the UID
        </h2>

      {/* active: {JSON.stringify(userDetails?.active)} */}

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 mb-4">
          <Input
            placeholder="Enter student UID or code number"
            value={searchValue}
            onChange={e => setSearchValue(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full max-w-xs"
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <Button type="submit" className="h-10 px-6 bg-blue-600 text-white rounded-lg">Load</Button>
        </form>
        <div className="mt-4">
          {/* {JSON.stringify(userDetails)} */}
          {loading && (
            <div className="flex justify-center items-center h-32">
              <span>Loading...</span>
            </div>
          )}
          {notFound && !loading && (
            <div className="flex justify-center items-center h-32 text-red-500">
              Student not found.
            </div>
          )}
          {userDetails && !loading && !notFound && (
            userDetails.active === false ? (
              <div className="flex justify-center items-center h-32 text-xl text-red-500">
                Student is not active
              </div>
            ) : (
              <div className="">
                <div className="">
                  <div className="flex gap-4">
                    {/* Left: Editable Form */}
                    <div className="w-[66%]">
                      <Card className="p-6 bg-blue-50 rounded-xl shadow-md flex flex-col h-full">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2 justify-between">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={`${process.env.NEXT_PUBLIC_STUDENT_PROFILE_URL}/Student_Image_${userDetails.codeNumber}.jpg`} alt={userDetails.name} />
                                <AvatarFallback>{ }</AvatarFallback>
                              </Avatar>
                              {/* <span className="truncate" title={userDetails.name}>{userDetails.name}</span> */}
                            </div>
                            <span className="flex items-center gap-2"><User className="w-5 h-5" />Personal Details</span>
                            <div>
                              <Button size="sm" variant="outline" onClick={() => setHistoryOpen(true)}>
                                History
                              </Button>
                            </div>
                          </CardTitle>
                          
                        </CardHeader>
                        <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
                          <SheetContent side="right">
                            <SheetHeader>
                              <SheetTitle>ID Card Issue History</SheetTitle>
                            </SheetHeader>
                            <div className="mt-4 max-h-[70vh] overflow-y-auto">
                              {idCardIssues.length === 0 ? (
                                <div className="text-gray-500 p-2">No ID card issue history.</div>
                              ) : (
                                <ul className="space-y-3 p-3">
                                  {idCardIssues.map((issue, idx) => (
                                    <li key={issue.id || idx} className="bg-white rounded-md border p-3 flex flex-col gap-1 shadow-sm">
                                      <div className="flex items-center justify-between">
                                        <span className="font-semibold text-base">#{idCardIssues.length - idx} Type: {issue.issue_status}</span>
                                        <div className="flex gap-1">
                                          <Button size="sm" variant="outline" className="px-2 py-1 text-xs h-7" onClick={() => {
                                            setViewCardIssueId(issue.id ?? null);
                                            setViewDialogOpen(true);
                                          }}>
                                            View
                                          </Button>
                                          <Button size="sm" variant="destructive" className="px-2 py-1 text-xs h-7 rounded-full" onClick={() => {
                                            setDeleteIssueId(issue.id ?? null);
                                            setDeleteConfirmOpen(true);
                                          }}>
                                            <span className="font-semibold">✕</span>
                                          </Button>
                                        </div>
                                      </div>
                                      <div className="text-xs text-gray-700">Remarks: {issue.remarks}</div>
                                      <div className="text-xs text-gray-400">Date: {issue.issue_date ? String(issue.issue_date) : ''}</div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </SheetContent>
                        </Sheet>
                        {/* View Old ID Card Dialog */}
                        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                          <DialogContent className="h-[95vh] overflow-auto pt-10 flex flex-col items-center">
                            <DialogTitle className="mb-4">Old ID Card Preview</DialogTitle>
                            {viewCardIssueId && (
                              <>
                                <NextImage
                                  src={`${BASE_PATH}/api/students/fetch-image?id_card_issue_id=${viewCardIssueId}`}
                                  alt="Old ID Card"
                                  width={400}
                                  height={300}
                                  className="w-full h-auto object-contain rounded-lg border mb-4"
                                  onContextMenu={e => e.preventDefault()}
                                  draggable={false}
                                />
                                {/* Download button removed as requested */}
                              </>
                            )}
                          </DialogContent>
                        </Dialog>
                        <CardContent>
                    
                          <div className="grid grid-cols-1 gap-4">
                            <div className="flex items-center">
                              <span className="w-48 font-semibold text-left mr-4">Student Name</span>
                              <div className="flex flex-1 items-center gap-1">
                                <span>{userDetails?.name || '-'}</span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="w-48 font-semibold text-left mr-4">Course</span>
                              <div className="flex flex-1 items-center gap-1">
                                <span>{userDetails?.courseName || '-'}</span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="w-48 font-semibold text-left mr-4">Shift</span>
                              <div className="flex flex-1 items-center gap-1">
                                <span>{userDetails?.shiftName || '-'}</span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="w-48 font-semibold text-left mr-4">Mobile No.</span>
                              <div className="flex flex-1 items-center gap-1">
                                <span>{userDetails?.contactNo || '-'}</span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="w-48 font-semibold text-left mr-4">Blood Group</span>
                              <div className="flex flex-1 items-center gap-1">
                                <span>{userDetails?.bloodGroupName || '-'}</span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="w-48 font-semibold text-left mr-4">Quota Type</span>
                              <div className="flex flex-1 items-center gap-1">
                                <span>{userDetails?.quotatype || '-'}</span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="w-48 font-semibold text-left mr-4">Section</span>
                              <div className="flex flex-1 items-center gap-1">
                                <span>{userDetails?.sectionName || '-'}</span>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <span className="w-48 font-semibold text-left mr-4">Class Roll No.</span>
                              <div className="flex flex-1 items-center gap-1">
                                <span>{userDetails?.rollNumber || '-'}</span>
                              </div>
                            </div>
                           
                          </div>
{/* RFID input form below Personal Details row */}
<form
  className="flex items-center gap-2 mt-4"
  onSubmit={async e => {
    e.preventDefault();
    if (!userDetails?.codeNumber) return;
    try {
      const res = await fetch(`${BASE_PATH}/api/students/update-rfid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: userDetails.codeNumber, rfid: userDetails.rfidno === '' ? null : userDetails.rfidno })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.student) {
          setUserDetails({ ...userDetails, rfidno: data.student.rfidno });
          toast.success('RFID updated successfully!');
          // Also save the photo after RFID is saved
          await handleSaveImage();
          // Fetch id card issues again after saving photo
          if (userDetails?.id) {
            fetch(`${BASE_PATH}/api/id-card-issue?student_id=${userDetails.id}`)
              .then(res => res.json())
              .then(data => setIdCardIssues(data.data || []));
          }
        } else {
          toast.error('Failed to update RFID.');
        }
      } else {
        toast.error('Failed to update RFID.');
      }
    } catch {
      toast.error('Error updating RFID.');
    }
  }}
>
  <label htmlFor="rfid" className="font-semibold">RFID:</label>
  <Input
    id="rfid"
    value={userDetails?.rfidno as string}
    onChange={e => setUserDetails(prev => prev ? { ...prev, rfidno: e.target.value } : prev)}
    placeholder="Enter RFID"
    className="w-48"
  />
  <Button type="submit" className="h-9 px-4 bg-blue-600 text-white rounded-lg">Save</Button>
</form>

                          {/* <div className="flex flex-col gap-2 mt-6">
                    <Button
                      className="w-full rounded-lg bg-green-500 hover:bg-green-600 shadow text-white"
                      onClick={handleSaveImage}

                      size="lg"
                      disabled={!generatedCard || !userDetails.codeNumber || saving}
                    >
                      {saving ? "Saving..." : "Save Photo"}
                    </Button>
                    {saveStatus === "success" && (
                      <p className="text-green-600 text-center mt-2">Photo saved successfully!</p>
                    )}
                    {saveStatus === "error" && (
                      <p className="text-red-600 text-center mt-2">Failed to save photo. Try again.</p>
                    )}
                  </div> */}
                        </CardContent>
                      </Card>
                    </div>
                    {/* Right: ID Card Preview */}
                    <div className="w-[34%]">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            <span>Generated ID Card</span>
                            <Button
                              className="ml-2 bg-gray-200 text-gray-800 hover:bg-gray-300 rounded-lg shadow-none"
                              onClick={() => setShowBack((prev) => !prev)}
                              size="sm"
                              variant="outline"
                            >
                              {showBack ? "Show Front" : "Show Back"}
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div
                            className="w-full h-[380px] flex items-center justify-center bg-gray-100 rounded-lg cursor-zoom-in"
                            onClick={() => {
                              if (!showBack && generatedCard) { setZoomImg(generatedCard); setZoomOpen(true); }
                              if (showBack) { setZoomImg(`${process.env.NEXT_PUBLIC_BASE_PATH}/id-card-template-backside.jpeg`); setZoomOpen(true); }
                            }}
                          >
                            {!showBack ? (
                              generatedCard ? (
                                <NextImage
                                  src={generatedCard}
                                  alt="Generated ID Card"
                                  width={400}
                                  height={300}
                                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                                  onContextMenu={e => e.preventDefault()}
                                  draggable={false}
                                />
                              ) : (
                                <p className="text-gray-500 text-center">Your ID card will appear here after generation</p>
                              )
                            ) : (
                              <NextImage
                                src={`${process.env.NEXT_PUBLIC_BASE_PATH}/id-card-template-backside.jpeg`}
                                alt="ID Card Back"
                                width={400}
                                height={300}
                                className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                              />
                            )}
                          </div>
                          <div className="mt-4 flex gap-2">
                            <Button className="w-1/2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 shadow" onClick={() => setShowWebcam(true)} size="lg">
                              {capturedImage ? "Change Photo" : "Capture Photo"}
                            </Button>
                            <Button
                              onClick={() => {
                                if (!generatedCard || showBack) return;
                                const CARD_WIDTH_PX = 638;
                                const CARD_HEIGHT_PX = 1004;
                                const printWindow = window.open('', '_blank', `width=${CARD_WIDTH_PX},height=${CARD_HEIGHT_PX}`);
                                printWindow?.document.write(`
                                  <html>
                                    <head>
                                      <title>Print ID Card</title>
                                      <style>
                                        @page { margin: 0; }
                                        html, body {
                                          width: 100%;
                                          height: 100%;
                                          margin: 0;
                                          padding: 0;
                                          background: #fff;
                                        }
                                        body {
                                          width: 100vw;
                                          height: 100vh;
                                          overflow: hidden;
                                        }
                                        img {
                                          width: 100vw;
                                          height: 100vh;
                                          max-width: 100vw;
                                          max-height: 100vh;
                                          display: block;
                                          margin: 0;
                                          padding: 0;
                                        }
                                      </style>
                                    </head>
                                    <body>
                                      <img src="${generatedCard}" alt="ID Card" onload="window.print();window.close();" />
                                    </body>
                                  </html>
                                `);
                                printWindow?.document.close();
                              }}
                              className={`w-1/2 rounded-lg ${showBack || !generatedCard ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                              size="lg"
                              disabled={showBack || !generatedCard}
                            >
                              {(!showBack && generatedCard) ? (
                                <>
                                  <Camera className="w-4 h-4 mr-2" />
                                  Print ID Card
                                </>
                              ) : (
                                <span className="opacity-0">Print ID Card</span>
                              )}
                            </Button>
                          </div>
                          {/* New section for Type and Remarks */}
                          {/* <div className="mt-8 max-w-lg mx-auto bg-white rounded-xl shadow p-6">
                            <div className="mb-4">
                              <label className="block font-semibold mb-1">Type</label>
                              <div className="flex gap-6">
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="issued"
                                    checked={true}
                                    disabled
                                    
                                  />
                                  <label htmlFor="issued" className="text-sm font-medium">ISSUED</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="renewed"
                                    checked={false}
                                    disabled
                                  />
                                  <label htmlFor="renewed" className="text-sm font-medium">RENEWED</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Checkbox
                                    id="reissued"
                                    checked={false}
                                    disabled
                                  />
                                  <label htmlFor="reissued" className="text-sm font-medium">REISSUED</label>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="block font-semibold mb-1">Remarks</label>
                              <Textarea
                                value={remarks}
                                onChange={e => setRemarks(e.target.value)}
                                placeholder="Enter remarks"
                              />
                            </div>
                          </div> */}
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                  
                  {/* Webcam Modal */}
                  <Dialog open={showWebcam} onOpenChange={setShowWebcam}>
                    <DialogContent
                      style={{
                        width: 'auto',
                        maxWidth: '98vw',
                        height: 'auto',
                        maxHeight: '98vh',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: 16,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
                        padding: 0,
                        overflow: 'auto',
                      }}
                    >
                      <div
                        style={{
                          position: 'relative',
                          width: 900,
                          height: 600,
                          background: '#fff',
                          borderRadius: 12,
                          overflow: 'hidden',
                          margin: 24,
                          boxShadow: '0 2px 12px rgba(0,0,0,0.10)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Webcam
                          ref={webcamRef}
                          audio={false}
                          screenshotFormat="image/jpeg"
                          style={{ width: 900, height: 600, borderRadius: 12, background: '#000' }}
                          videoConstraints={{
                            width: 900,
                            height: 600,
                            facingMode: "user",
                          }}
                        />
                        <canvas
                          ref={faceCanvasRef}
                          width={900}
                          height={600}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            pointerEvents: 'none',
                            width: 900,
                            height: 600,
                          }}
                        />
                      </div>
                      <div className="w-full flex flex-col items-center" style={{ marginBottom: 24 }}>
                        <Button
                          onClick={capture}
                          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                          size="lg"
                          disabled={!modelsLoaded}
                          style={{ maxWidth: 400 }}
                        >
                          <Camera className="w-4 h-4 mr-2" />
                          {modelsLoaded ? "Capture Photo" : "Loading..."}
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                  {/* Canvas for Image Processing - hidden */}
                  <div style={{ display: "none" }}>
                    <canvas ref={canvasRef} />
                  </div>
                  {/* Zoom Modal */}
                  <Dialog open={zoomOpen} onOpenChange={setZoomOpen}>
                    <DialogContent className="h-[95vh] overflow-auto pt-10">
                      <DialogTitle className="sr-only">Zoomed ID Card Preview</DialogTitle>
                      {zoomImg && (
                        <NextImage
                          src={zoomImg}
                          alt="Zoomed ID Card"
                          width={800}
                          height={600}
                          className="w-full h-auto object-contain rounded-lg border"
                          onContextMenu={e => e.preventDefault()}
                          draggable={false}
                        />
                      )}
                    </DialogContent>
                  </Dialog>
                  {/* Delete Confirmation Dialog */}
                  <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                    <DialogContent className="max-w-sm mx-auto">
                      <DialogTitle>Delete ID Card Issue</DialogTitle>
                      <div className="py-4">Are you sure you want to delete this ID card issue? This action cannot be undone.</div>
                      <div className="flex justify-end gap-2 mt-4">
                        <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={async () => {
                          if (!deleteIssueId || !userDetails?.id) { setDeleteConfirmOpen(false); return; }
                          try {
                            await fetch(`${BASE_PATH}/api/id-card-issue/${deleteIssueId}`, { method: "DELETE" });
                            setDeleteConfirmOpen(false);
                            setDeleteIssueId(null);
                            // Always refresh issues after delete
                            fetch(`${BASE_PATH}/api/id-card-issue?student_id=${userDetails.id}`)
                              .then(res => res.json())
                              .then(data => setIdCardIssues(data.data || []));
                            toast.success("ID card issue deleted.");
                          } catch {
                            toast.error("Failed to delete ID card issue.");
                          }
                        }}>Delete</Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )
          )}
        </div>

      </div>

    </>
  );
}
