"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";

import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Download, User, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { IdCardIssue, Student } from "@/types"
import QRCode from "qrcode"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { error } from "console";


export default function Page() {
  const [value, setValue] = useState("");
  // const router = useRouter();
  // const pathname = usePathname();
  const params = useParams();

  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [idCardIssues, setIdCardIssues] = useState<IdCardIssue[]>([]);
  const [idCardIssueRecent, setIdCardIssueRecent] = useState<IdCardIssue | null>(null);
  const [generatedCard, setGeneratedCard] = useState<string | null>(null)
  const [showWebcam, setShowWebcam] = useState(false)
  const [userDetails, setUserDetails] = useState<Student | null>(null);
  const [showBack, setShowBack] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [positions, setPositions] = useState({
    name: { x: 330, y: 580 },
    course: { x: 323, y: 620 },
    uid: { x: 215, y: 680 },
    mobile: { x: 240, y: 710 },
    bloodGroup: { x: 210, y: 776 },
    sequrityQ: { x: 270, y: 776 },
    qrcode: { x: 375, y: 656 },
    validTillDate: { x: 129, y: 845 },
  });
  const [qrcodeSize, setQrcodeSize] = useState(190);
  const [validTillDate, setValidTillDate] = useState("");
  const [photoRect, setPhotoRect] = useState({ x: 240, y: 280, width: 200, height: 250 });
  const [issueType, setIssueType] = useState("ISSUED");
  const [remarks, setRemarks] = useState("First card issued");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [viewCardIssueId, setViewCardIssueId] = useState<number | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteIssueId, setDeleteIssueId] = useState<number | null>(null);

  // Update remarks when issueType changes
  useEffect(() => {
    if (issueType === "ISSUED") setRemarks("First card issued");
    else if (issueType === "RENEWED") setRemarks("Renewed the card.");
    else if (issueType === "REISSUED") setRemarks("Reissued due to lost/update card");
  }, [issueType]);

  // Auto-switch type if current selection is disabled
  useEffect(() => {
    if (idCardIssues.length === 0 && issueType !== "ISSUED") {
      setIssueType("ISSUED");
    } else if (idCardIssues.length > 0 && issueType === "ISSUED") {
      setIssueType("RENEWED");
    }
  }, [idCardIssues.length]);

  const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

  useEffect(() => {
    const fetchStudent = async () => {
      if (!value) return;
      try {
        const res = await fetch(`${BASE_PATH}/api/students?uid=${value}`);
        const data = await res.json();
        if (data.content && data.content.length > 0) {
          setUserDetails(data.content[0]);
        } else {
          setUserDetails(null);
        }
      } catch {
        setUserDetails(null);
      } finally {
        setCapturedImage(null)
        setGeneratedCard(null)
      }
    };
    fetchStudent();
  }, [value]);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setCapturedImage(imageSrc)
      setShowWebcam(false)
    }
  }, [webcamRef])

  const retakePhoto = () => {
    setCapturedImage(null)
    setGeneratedCard(null)
    setShowWebcam(true)
  }

  const generateIDCard = useCallback(async () => {
    if (!capturedImage || !canvasRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions to match the clean template
    canvas.width = 600
    canvas.height = 900

    // Load the clean template image
    const templateImg = new Image()
    templateImg.crossOrigin = "anonymous"

    templateImg.onload = async () => {
      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw the clean template background
      ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height)

      // Load and draw the captured photo
      const userImg = new Image()
      userImg.crossOrigin = "anonymous"

      userImg.onload = async () => {
        // Photo placement coordinates for the clean template
        const photoX = photoRect.x // X position of photo area
        const photoY = photoRect.y // Y position of photo area
        const photoWidth = photoRect.width // Width of photo area
        const photoHeight = photoRect.height // Height of photo area

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
          ctx.font = "bold 32px Arial"
          ctx.fillText(userDetails.name.toUpperCase(), positions.name.x, positions.name.y)
        }

        // Course
        if (userDetails && userDetails.courseName) {
          ctx.font = "24px Arial"
          ctx.fillText(userDetails.courseName, positions.course.x, positions.course.y)
        }

        // UID
        if (userDetails && userDetails.codeNumber) {
          ctx.font = "bold 20px Arial"
          ctx.fillText(`UID: ${userDetails.codeNumber}`, positions.uid.x, positions.uid.y)
        }

        // Mobile
        if (userDetails && userDetails.emrgnResidentPhNo) {
          ctx.font = "bold 20px Arial"
          ctx.fillText(`MOB NO.: ${userDetails.emrgnResidentPhNo}`, positions.mobile.x, positions.mobile.y)
        }

        // Blood Group
        if (userDetails && userDetails.bloodGroupName) {
          ctx.font = "bold 24px Arial"
          ctx.fillText(`${userDetails.bloodGroupName}`, positions.bloodGroup.x, positions.bloodGroup.y)
        }

        // SecurityQ (Security Question/Answer)
        if (userDetails && userDetails.securityQ) {
          ctx.font = "bold 24px Arial"
          ctx.textAlign = "left"
          ctx.fillText(String(userDetails.securityQ), positions.sequrityQ.x, positions.sequrityQ.y)
          ctx.textAlign = "center"
        }

        // Valid Till Date (optional, only if present)
        if (validTillDate) {
          ctx.font = "bold 16px Arial"
          ctx.textAlign = "left"
          ctx.fillText(`Valid Till: ${validTillDate}`, positions.validTillDate.x, positions.validTillDate.y)
          ctx.textAlign = "center"
        }

        // QR Code (containing UID)
        if (userDetails && userDetails.codeNumber) {
          try {
            const qrDataUrl = await QRCode.toDataURL(userDetails.codeNumber, { margin: 0, width: qrcodeSize })
            const qrImg = new window.Image()
            qrImg.onload = () => {
              ctx.drawImage(qrImg, positions.qrcode.x, positions.qrcode.y, qrcodeSize, qrcodeSize)
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
    templateImg.src = `${process.env.NEXT_PUBLIC_BASE_PATH}/id-template-new-frontend.jpeg`
  }, [capturedImage, userDetails, positions, qrcodeSize, validTillDate, photoRect])

  useEffect(() => {
    if (capturedImage && userDetails && userDetails.name && userDetails.courseName) {
      generateIDCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDetails, capturedImage, positions, qrcodeSize, validTillDate, photoRect]);

  const downloadCard = () => {
    if (!generatedCard && !userDetails) return

    const link = document.createElement("a")
    link.download = `${userDetails!.name || "ID"}_card.png`
    link.href = generatedCard!
    link.click()
  }

  const handleInputChange = (field: keyof Student, value: string) => {
    setUserDetails((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });
  }

  const handleSaveImage = async () => {
    if (!generatedCard || !userDetails!.codeNumber) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      // 1. Create new id card issue entry first
      const lastIssueId = idCardIssues.length > 0 ? idCardIssues[0].id : null;
      const renewedFromId = (issueType === "RENEWED") ? lastIssueId : null;
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
      } else {
        setSaveStatus("error");
      }
    } catch (error) {
      console.log(error)
      setSaveStatus("error");
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
  }, [userDetails?.id]);

  useEffect(() => {
    if (userDetails?.academicYear && !validTillDate) {
      const year = Number(userDetails.academicYear) + 4;
      setValidTillDate(`31-07-${year}`);
    }
    // Optionally, reset validTillDate if userDetails changes
  }, [userDetails?.academicYear]);


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

  // Dummy data for idCardIssues
  const dummyIssues: { type: string; remarks: string; date: string }[] = [
    { type: "ISSUED", remarks: "First card issued", date: "2023-06-01" },
    { type: "RENEWED", remarks: "Renewed the card.", date: "2024-06-01" },
    { type: "REISSUED", remarks: "Reissued due to lost card", date: "2025-01-15" },
  ];

  // Helper to format date as dd-mm-yyyy
  function formatDateToDDMMYYYY(dateStr: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }
  function formatDateToYYYYMMDD(dateStr: string) {
    // Accepts dd-mm-yyyy or yyyy-mm-dd, returns yyyy-mm-dd for input value
    if (!dateStr) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
    const [dd, mm, yyyy] = dateStr.split('-');
    if (yyyy && mm && dd) return `${yyyy}-${mm}-${dd}`;
    return dateStr;
  }


  return (
    <div className="px-4 mt-4 ">

      <h2 className="scroll-m-20 py-2 mb-2 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Enter the UID
      </h2>



      <Input
        placeholder="Enter student UID or code number"
        value={value}
        onChange={e => setValue(e.target.value.replace(/[^0-9]/g, ""))}
        className="w-full max-w-xs"
        inputMode="numeric"
        pattern="[0-9]*"
      />
      <div className="mt-8">
        {/* {JSON.stringify(userDetails)} */}
        {userDetails && <div className="">
          <div className="">
            <div className="flex gap-4">
              {/* Left: Editable Form */}
              <div className="w-[66%]">
                <Card className="p-6 bg-blue-50 rounded-xl shadow-md flex flex-col justify-center h-full">
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
                          <img
                            src={`${BASE_PATH}/api/students/fetch-image?id_card_issue_id=${viewCardIssueId}`}
                            alt="Old ID Card"
                            className="w-full h-auto object-contain rounded-lg border mb-4"
                            style={{ maxWidth: 400 }}
                          />
                          <Button
                            className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white mt-2"
                            onClick={() => {
                              const url = `${BASE_PATH}/api/students/fetch-image?id_card_issue_id=${viewCardIssueId}`;
                              const link = document.createElement('a');
                              link.href = url;
                              link.download = `id_card_${viewCardIssueId}.png`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                          >
                            Download ID Card
                          </Button>
                        </>
                      )}
                    </DialogContent>
                  </Dialog>
                  <CardContent>
                    <div className="mb-4 p-3 rounded bg-blue-100 text-sm">

                      <div><b>Session:</b> {userDetails.sessionName || "-"}</div>
                      <div><b>Section:</b> {userDetails.sectionName || "-"}</div>
                      <div><b>Shift:</b> {userDetails.shiftName || "-"}</div>
                      <div className="mt-2"><b>Emergency Numbers:</b></div>
                      <ul className="ml-4 list-disc">
                        <li>Self: {userDetails.emrgnResidentPhNo || "-"}</li>
                        <li>Father: {userDetails.emrgnFatherMobno || "-"}</li>
                        <li>Mother: {userDetails.emrgnMotherMobNo || "-"}</li>
                      </ul>
                    </div>
                    <div className="grid grid-cols-1  gap-4">
                      <div className="flex items-center">
                        <span className="w-48 font-semibold text-right mr-4">Full Name</span>
                        <div className="flex flex-1 items-center gap-1">
                          <Input
                            id="name"
                            value={userDetails.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            placeholder="Enter your full name"
                            className="min-w-[180px] flex-1"
                          />
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, name: { ...p.name, x: p.name.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, name: { ...p.name, x: p.name.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, name: { ...p.name, y: p.name.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, name: { ...p.name, y: p.name.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="w-48 font-semibold text-right mr-4">Course</span>
                        <div className="flex flex-1 items-center gap-1">
                          <Input
                            id="course"
                            value={userDetails.courseName || ""}
                            onChange={(e) => handleInputChange("courseName", e.target.value)}
                            placeholder="Enter your course"
                            className="min-w-[180px] flex-1"
                          />
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, course: { ...p.course, x: p.course.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, course: { ...p.course, x: p.course.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, course: { ...p.course, y: p.course.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, course: { ...p.course, y: p.course.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="w-48 font-semibold text-right mr-4">UID</span>
                        <div className="flex flex-1 items-center gap-1">
                          <Input
                            id="uid"
                            value={userDetails.codeNumber || ""}
                            onChange={(e) => handleInputChange("codeNumber", e.target.value)}
                            placeholder="Enter your UID"
                            className="min-w-[180px] flex-1"
                          />
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, uid: { ...p.uid, x: p.uid.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, uid: { ...p.uid, x: p.uid.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, uid: { ...p.uid, y: p.uid.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, uid: { ...p.uid, y: p.uid.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="w-48 font-semibold text-right mr-4">Mobile Number</span>
                        <div className="flex flex-1 items-center gap-1">
                          <Input
                            id="mobile"
                            value={userDetails.emrgnResidentPhNo || ""}
                            onChange={(e) => handleInputChange("emrgnResidentPhNo", e.target.value)}
                            placeholder="Enter your mobile number"
                            className="min-w-[180px] flex-1"
                          />
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, mobile: { ...p.mobile, x: p.mobile.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, mobile: { ...p.mobile, x: p.mobile.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, mobile: { ...p.mobile, y: p.mobile.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, mobile: { ...p.mobile, y: p.mobile.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="w-48 font-semibold text-right mr-4">Blood Group</span>
                        <div className="flex flex-1 items-center gap-1">
                          <Input
                            id="bloodGroup"
                            value={userDetails.bloodGroupName || ""}
                            onChange={(e) => handleInputChange("bloodGroupName", e.target.value)}
                            placeholder="Enter your blood group"
                            className="min-w-[180px] flex-1"
                          />
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, bloodGroup: { ...p.bloodGroup, x: p.bloodGroup.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, bloodGroup: { ...p.bloodGroup, x: p.bloodGroup.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, bloodGroup: { ...p.bloodGroup, y: p.bloodGroup.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, bloodGroup: { ...p.bloodGroup, y: p.bloodGroup.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="w-48 font-semibold text-right mr-4">Security Question</span>
                        <div className="flex flex-1 items-center gap-1">
                          <Input
                            id="securityQ"
                            value={userDetails.securityQ || ""}
                            onChange={(e) => handleInputChange("securityQ", e.target.value)}
                            placeholder="Enter your security question"
                            className="min-w-[180px] flex-1"
                          />
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, sequrityQ: { ...p.sequrityQ, x: p.sequrityQ.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, sequrityQ: { ...p.sequrityQ, x: p.sequrityQ.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, sequrityQ: { ...p.sequrityQ, y: p.sequrityQ.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, sequrityQ: { ...p.sequrityQ, y: p.sequrityQ.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="w-48 font-semibold text-right mr-4">Valid Till Date</span>
                        <div className="flex flex-1 items-center gap-1">
                          <Input
                            id="validTillDate"
                            value={validTillDate}
                            onChange={e => {
                              // Allow only digits and dashes, and auto-insert dashes
                              let v = e.target.value.replace(/[^0-9-]/g, "");
                              if (v.length === 2 || v.length === 5) {
                                if (validTillDate.length < v.length) v += "-";
                              }
                              setValidTillDate(v.slice(0, 10));
                            }}
                            placeholder="dd-mm-yyyy"
                            pattern="^\d{2}-\d{2}-\d{4}$"
                            className="min-w-[180px] flex-1"
                            inputMode="numeric"
                            maxLength={10}
                          />
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, validTillDate: { ...p.validTillDate, x: p.validTillDate.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, validTillDate: { ...p.validTillDate, x: p.validTillDate.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, validTillDate: { ...p.validTillDate, y: p.validTillDate.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, validTillDate: { ...p.validTillDate, y: p.validTillDate.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="w-48 font-semibold text-right mr-4">QR Code</span>
                        <div className="flex flex-1 items-center gap-1">
                          <span className="text-xs text-gray-500">X:</span>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, qrcode: { ...p.qrcode, x: p.qrcode.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, qrcode: { ...p.qrcode, x: p.qrcode.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                          <span className="text-xs text-gray-500 ml-2">Y:</span>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, qrcode: { ...p.qrcode, y: p.qrcode.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, qrcode: { ...p.qrcode, y: p.qrcode.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
                          <span className="text-xs text-gray-500 ml-2">Size:</span>
                          <Button size="icon" variant="outline" onClick={() => setQrcodeSize(s => Math.max(20, s - 5))}>-</Button>
                          <span className="px-2">{qrcodeSize}</span>
                          <Button size="icon" variant="outline" onClick={() => setQrcodeSize(s => Math.min(300, s + 5))}>+</Button>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <span className="w-48 font-semibold text-right mr-4">Photo</span>
                        <div className="flex flex-1 items-center gap-1">
                          <span className="text-xs text-gray-500">X:</span>
                          <Button size="icon" variant="outline" onClick={() => setPhotoRect(r => ({ ...r, x: r.x - 1 }))}><ChevronLeft className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPhotoRect(r => ({ ...r, x: r.x + 1 }))}><ChevronRight className="w-4 h-4" /></Button>
                          <span className="text-xs text-gray-500 ml-2">Y:</span>
                          <Button size="icon" variant="outline" onClick={() => setPhotoRect(r => ({ ...r, y: r.y - 1 }))}><ChevronUp className="w-4 h-4" /></Button>
                          <Button size="icon" variant="outline" onClick={() => setPhotoRect(r => ({ ...r, y: r.y + 1 }))}><ChevronDown className="w-4 h-4" /></Button>
                          <span className="text-xs text-gray-500 ml-2">Width:</span>
                          <Button size="icon" variant="outline" onClick={() => setPhotoRect(r => ({ ...r, width: Math.max(20, r.width - 5) }))}>-</Button>
                          <span className="px-2">{photoRect.width}</span>
                          <Button size="icon" variant="outline" onClick={() => setPhotoRect(r => ({ ...r, width: Math.min(400, r.width + 5) }))}>+</Button>
                          <span className="text-xs text-gray-500 ml-2">Height:</span>
                          <Button size="icon" variant="outline" onClick={() => setPhotoRect(r => ({ ...r, height: Math.max(20, r.height - 5) }))}>-</Button>
                          <span className="px-2">{photoRect.height}</span>
                          <Button size="icon" variant="outline" onClick={() => setPhotoRect(r => ({ ...r, height: Math.min(600, r.height + 5) }))}>+</Button>
                        </div>
                      </div>
                    </div>

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
                          <img
                            src={generatedCard}
                            alt="Generated ID Card"
                            className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                          />
                        ) : (
                          <p className="text-gray-500 text-center">Your ID card will appear here after generation</p>
                        )
                      ) : (
                        <img
                          src={`${process.env.NEXT_PUBLIC_BASE_PATH}/id-card-template-backside.jpeg`}
                          alt="ID Card Back"
                          className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                        />
                      )}
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button className="w-1/2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 shadow" onClick={() => setShowWebcam(true)} size="lg">
                        {capturedImage ? "Change Photo" : "Capture Photo"}
                      </Button>
                      <Button
                        onClick={downloadCard}
                        className={`w-1/2 rounded-lg ${showBack || !generatedCard ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                        size="lg"
                        disabled={showBack || !generatedCard}
                      >
                        {(!showBack && generatedCard) ? (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Download ID Card
                          </>
                        ) : (
                          <span className="opacity-0">Download ID Card</span>
                        )}
                      </Button>
                    </div>
                    {/* New section for Type and Remarks */}
                    <div className="mt-8 max-w-lg mx-auto bg-white rounded-xl shadow p-6">
                      <div className="mb-4">
                        <label className="block font-semibold mb-1">Type</label>
                        <div className="flex gap-6">
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="issued"
                              checked={issueType === "ISSUED"}
                              onCheckedChange={() => setIssueType("ISSUED")}
                              disabled={idCardIssues.length > 0}
                            />
                            <label htmlFor="issued" className="text-sm font-medium">ISSUED</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="renewed"
                              checked={issueType === "RENEWED"}
                              onCheckedChange={() => setIssueType("RENEWED")}
                              disabled={idCardIssues.length === 0}
                            />
                            <label htmlFor="renewed" className="text-sm font-medium">RENEWED</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="reissued"
                              checked={issueType === "REISSUED"}
                              onCheckedChange={() => setIssueType("REISSUED")}
                              disabled={idCardIssues.length === 0}
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
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            <div className="flex flex-col gap-2 mt-6">
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
            </div>
            {/* Webcam Modal */}
            <Dialog open={showWebcam} onOpenChange={setShowWebcam}>
              <DialogContent>
                <div className="space-y-4">
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full"
                    videoConstraints={{
                      width: 640,
                      height: 480,
                      facingMode: "user",
                    }}
                  />
                  <Button onClick={capture} className="w-full bg-blue-600 hover:bg-blue-700 text-white" size="lg">
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Photo
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
                  <img src={zoomImg} alt="Zoomed ID Card" className="w-full h-auto object-contain rounded-lg border" />
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
                    await fetch(`${BASE_PATH}/api/id-card-issue/${deleteIssueId}`, { method: "DELETE" });
                    setDeleteConfirmOpen(false);
                    setDeleteIssueId(null);
                    // Always refresh issues after delete
                    fetch(`${BASE_PATH}/api/id-card-issue?student_id=${userDetails.id}`)
                      .then(res => res.json())
                      .then(data => setIdCardIssues(data.data || []));
                  }}>Delete</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>}
      </div>

    </div>
  );
}
