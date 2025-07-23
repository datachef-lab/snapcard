"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";

import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Download, User, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { IdCardIssue, Student } from "@/types"
import QRCode from "qrcode"
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { IdCardTemplate } from "@/lib/db/schema";
import { useAuth } from "@/hooks/use-auth";
import NextImage from 'next/image';


export default function Page() {
  const {user} = useAuth();
  const [value, setValue] = useState("");
  // const router = useRouter();
  // const pathname = usePathname();
  const params = useParams();

  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
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
  const [positions, setPositions] = useState<IdCardTemplate>({
    nameCoordinates: { x: 330, y: 580 },
    courseCoordinates: { x: 323, y: 620 },
    uidCoordinates: { x: 215, y: 680 },
    mobileCoordinates: { x: 240, y: 710 },
    bloodGroupCoordinates: { x: 210, y: 776 },
    sportsQuotaCoordinates: { x: 270, y: 776 },
    qrcodeCoordinates: { x: 375, y: 656 },
    validTillDateCoordinates: { x: 129, y: 845 },
    admissionYear: "",
    photoDimension: {},
    qrcodeSize: 190,
  });
  // const [qrcodeSize, setQrcodeSize] = useState(190);
  const [validTillDate, setValidTillDate] = useState("");
  // const [photoRect, setPhotoRect] = useState({ x: 240, y: 280, width: 200, height: 250 });
  const [issueType, setIssueType] = useState("ISSUED");
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
  }, [idCardIssues.length, issueType]);

  const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

  useEffect(() => {
    if (userDetails && templates.length > 0) {
      const tmpt =templates.find(ele => ele.admissionYear == (userDetails).academicYear);
      if (tmpt) {
        setSelectedTemplate(tmpt);
        setPositions(tmpt);

        setPreviewUrl(`${BASE_PATH}/api/id-card-template/${tmpt.id}`);
        setFile(null);
      }
    }
  }, [userDetails, templates, BASE_PATH, setSelectedTemplate, setPositions, setPreviewUrl, setFile]);

  useEffect(() => {
    const fetchStudent = async () => {
      if (!value) {
        setUserDetails(null);
        setNotFound(false);
        setLoading(false);
        return;
      }
      setLoading(true);
      setNotFound(false);
      try {
        const res = await fetch(`${BASE_PATH}/api/students?uid=${value}`);
        const data = await res.json();
        if (data.content && data.content.length > 0) {
          setUserDetails(data.content[0]);
           
          setNotFound(false);
          // Fetch template for this student's admission year
          const admissionYear = data.content[0].academicYear;
          if (admissionYear) {
            const templateRes = await fetch(`${BASE_PATH}/api/id-card-template?admissionYear=${admissionYear}`);
            if (templateRes.ok) {
              const template = await templateRes.json();
              if (template) {
                // setPositions({
                //   nameCoordinates: template.nameCoordinates,
                //   courseCoordinates: template.courseCoordinates,
                //   uidCoordinates: template.uidCoordinates,
                //   mobile: template.mobileCoordinates,
                //   bloodGroup: template.bloodGroupCoordinates,
                //   sequrityQ: template.sportsQuotaCoordinates, // or template.securityQCoordinates if exists
                //   qrcode: template.qrcodeCoordinates,
                //   validTillDate: template.validTillDateCoordinates || { x: 0, y: 0 },
                // });
                // setQrcodeSize(template.qrcodeSize);
                // setPhotoRect(template.photoDimension);
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
        setCapturedImage(null)
        setGeneratedCard(null)
        setLoading(false);
      }
    };
    fetchStudent();
  }, [value, BASE_PATH]);

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
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setCapturedImage(imageSrc)
      setShowWebcam(false)
    }
  }, [webcamRef])

  const generateIDCard = useCallback(async () => {
    if (!capturedImage || !canvasRef.current || !previewUrl) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions to match the clean template
    canvas.width = 600
    canvas.height = 900

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
          ctx.font = "bold 32px Arial"
          ctx.fillText(userDetails.name.toUpperCase(), positions.nameCoordinates.x, positions.nameCoordinates.y)
        }

        // Course
        if (userDetails && userDetails.courseName) {
          ctx.font = "24px Arial"
          ctx.fillText(userDetails.courseName, positions.courseCoordinates.x, positions.courseCoordinates.y)
        }

        // UID
        if (userDetails && userDetails.codeNumber) {
          ctx.font = "bold 20px Arial"
          ctx.fillText(`UID: ${userDetails.codeNumber}`, positions.uidCoordinates.x, positions.uidCoordinates.y)
        }

        // Mobile
        if (userDetails && userDetails.emrgnResidentPhNo) {
          ctx.font = "bold 20px Arial"
          ctx.fillText(`MOB NO.: ${userDetails.emrgnResidentPhNo}`, positions.mobileCoordinates.x, positions.mobileCoordinates.y)
        }

        // Blood Group
        if (userDetails && userDetails.bloodGroupName) {
          ctx.font = "bold 24px Arial"
          ctx.fillText(`${userDetails.bloodGroupName}`, positions.bloodGroupCoordinates.x, positions.bloodGroupCoordinates.y)
        }

        // SecurityQ (Security Question/Answer)
        if (userDetails && userDetails.securityQ) {
          ctx.font = "bold 24px Arial"
          ctx.textAlign = "left"
          ctx.fillText(String(userDetails.securityQ), positions.sportsQuotaCoordinates.x, positions.sportsQuotaCoordinates.y)
          ctx.textAlign = "center"
        }

        // Valid Till Date (optional, only if present)
        if (validTillDate) {
          ctx.font = "bold 16px Arial"
          ctx.textAlign = "left"
          ctx.fillText(`Valid Till: ${validTillDate}`, positions.validTillDateCoordinates.x, positions.validTillDateCoordinates.y)
          ctx.textAlign = "center"
        }

        // QR Code (containing UID)
        if (userDetails && userDetails.codeNumber) {
          try {
            const qrDataUrl = await QRCode.toDataURL(userDetails.codeNumber, { margin: 0, width: positions.qrcodeSize })
            const qrImg = new window.Image()
            qrImg.onload = () => {
              ctx.drawImage(qrImg, positions.qrcodeCoordinates.x, positions.qrcodeCoordinates.y,positions. qrcodeSize, positions.qrcodeSize)
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
  }, [capturedImage, userDetails, positions, positions.qrcodeSize, validTillDate, positions.photoDimension, previewUrl]);

  useEffect(() => {
    if (capturedImage && userDetails && userDetails.name && userDetails.courseName) {
      generateIDCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userDetails, capturedImage, positions, positions.qrcodeSize, validTillDate, positions.photoDimension]);

  const downloadCard = () => {
    if (!generatedCard && !userDetails) return
    if (!user?.isAdmin) return;

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
          name: userDetails?.name || '',
          blood_group_name: userDetails?.bloodGroupName || '',
          course_name: userDetails?.courseName || '',
          phone_mobile_no: userDetails?.phoneMobileNo || '',
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
  }, [userDetails?.id, BASE_PATH, userDetails]);

  useEffect(() => {
    if (userDetails?.academicYear && !validTillDate) {
      const year = Number(userDetails.academicYear) + 4;
      setValidTillDate(`31-07-${year}`);
    }
    // Optionally, reset validTillDate if userDetails changes
  }, [userDetails?.academicYear, validTillDate]);


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


  return (
    <div className="px-4 mt-4 ">

      <h2 className="scroll-m-20 py-2 mb-2 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
        Enter the UID
      </h2>

    {/* active: {JSON.stringify(userDetails?.active)} */}

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
                              <NextImage
                                src={`${BASE_PATH}/api/students/fetch-image?id_card_issue_id=${viewCardIssueId}`}
                                alt="Old ID Card"
                                width={400}
                                height={300}
                                className="w-full h-auto object-contain rounded-lg border mb-4"
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
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, nameCoordinates: { ...p.nameCoordinates, x: p.nameCoordinates.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, nameCoordinates: { ...p.nameCoordinates, x: p.nameCoordinates.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, nameCoordinates: { ...p.nameCoordinates, y: p.nameCoordinates.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, nameCoordinates: { ...p.nameCoordinates, y: p.nameCoordinates.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
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
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, courseCoordinates: { ...p.courseCoordinates, x: p.courseCoordinates.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, courseCoordinates: { ...p.courseCoordinates, x: p.courseCoordinates.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, courseCoordinates: { ...p.courseCoordinates, y: p.courseCoordinates.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, courseCoordinates: { ...p.courseCoordinates, y: p.courseCoordinates.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
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
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, uidCoordinates: { ...p.uidCoordinates, x: p.uidCoordinates.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, uidCoordinates: { ...p.uidCoordinates, x: p.uidCoordinates.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, uidCoordinates: { ...p.uidCoordinates, y: p.uidCoordinates.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, uidCoordinates: { ...p.uidCoordinates, y: p.uidCoordinates.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
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
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, mobileCoordinates: { ...p.mobileCoordinates, x: p.mobileCoordinates.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, mobileCoordinates: { ...p.mobileCoordinates, x: p.mobileCoordinates.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, mobileCoordinates: { ...p.mobileCoordinates, y: p.mobileCoordinates.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, mobileCoordinates: { ...p.mobileCoordinates, y: p.mobileCoordinates.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
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
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, bloodGroupCoordinates: { ...p.bloodGroupCoordinates, x: p.bloodGroupCoordinates.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, bloodGroupCoordinates: { ...p.bloodGroupCoordinates, x: p.bloodGroupCoordinates.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, bloodGroupCoordinates: { ...p.bloodGroupCoordinates, y: p.bloodGroupCoordinates.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, bloodGroupCoordinates: { ...p.bloodGroupCoordinates, y: p.bloodGroupCoordinates.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="w-48 font-semibold text-right mr-4">Sports Quota</span>
                            <div className="flex flex-1 items-center gap-1">
                              <Input
                                id="securityQ"
                                value={userDetails.securityQ || ""}
                                onChange={(e) => handleInputChange("securityQ", e.target.value)}
                                placeholder=""
                                className="min-w-[180px] flex-1"
                              />
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, sportsQuotaCoordinates: { ...p.sportsQuotaCoordinates, x: p.sportsQuotaCoordinates.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, sportsQuotaCoordinates: { ...p.sportsQuotaCoordinates, x: p.sportsQuotaCoordinates.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, sportsQuotaCoordinates: { ...p.sportsQuotaCoordinates, y: p.sportsQuotaCoordinates.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, sportsQuotaCoordinates: { ...p.sportsQuotaCoordinates, y: p.sportsQuotaCoordinates.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
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
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, validTillDateCoordinates: { ...p.validTillDateCoordinates, x: p.validTillDateCoordinates.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, validTillDateCoordinates: { ...p.validTillDateCoordinates, x: p.validTillDateCoordinates.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, validTillDateCoordinates: { ...p.validTillDateCoordinates, y: p.validTillDateCoordinates.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, validTillDateCoordinates: { ...p.validTillDateCoordinates, y: p.validTillDateCoordinates.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="w-48 font-semibold text-right mr-4">QR Code</span>
                            <div className="flex flex-1 items-center gap-1">
                              <span className="text-xs text-gray-500">X:</span>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, qrcodeCoordinates: { ...p.qrcodeCoordinates, x: p.qrcodeCoordinates.x - 1 } }))}><ChevronLeft className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, qrcodeCoordinates: { ...p.qrcodeCoordinates, x: p.qrcodeCoordinates.x + 1 } }))}><ChevronRight className="w-4 h-4" /></Button>
                              <span className="text-xs text-gray-500 ml-2">Y:</span>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, qrcodeCoordinates: { ...p.qrcodeCoordinates, y: p.qrcodeCoordinates.y - 1 } }))}><ChevronUp className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(p => ({ ...p, qrcodeCoordinates: { ...p.qrcodeCoordinates, y: p.qrcodeCoordinates.y + 1 } }))}><ChevronDown className="w-4 h-4" /></Button>
                              <span className="text-xs text-gray-500 ml-2">Size:</span>
                              <Button size="icon" variant="outline" onClick={() => setPositions(prev => ({...prev, qrcodeSize: Math.max(20, prev.qrcodeSize - 5)}))}>-</Button>
                              <span className="px-2">{positions.qrcodeSize}</span>
                              <Button size="icon" variant="outline" onClick={() => setPositions(prev => ({...prev, qrcodeSize: Math.min(300, prev.qrcodeSize + 5)}))}>+</Button>
                            </div>
                          </div>
                          <div className="flex items-center">
                            <span className="w-48 font-semibold text-right mr-4">Photo</span>
                            <div className="flex flex-1 items-center gap-1">
                              <span className="text-xs text-gray-500">X:</span>
                              <Button size="icon" variant="outline" onClick={() => setPositions(r => ({ ...r, photoDimension: {...r.photoDimension, x: r.photoDimension.x - 1} }))}><ChevronLeft className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(r => ({ ...r, photoDimension: {...r.photoDimension, x: r.photoDimension.x + 1} }))}><ChevronRight className="w-4 h-4" /></Button>
                              <span className="text-xs text-gray-500 ml-2">Y:</span>
                              <Button size="icon" variant="outline" onClick={() => setPositions(r => ({ ...r, photoDimension: {...r.photoDimension, y: r.photoDimension.y - 1} }))}><ChevronUp className="w-4 h-4" /></Button>
                              <Button size="icon" variant="outline" onClick={() => setPositions(r => ({ ...r, photoDimension: {...r.photoDimension, y: r.photoDimension.y + 1} }))}><ChevronDown className="w-4 h-4" /></Button>
                              <span className="text-xs text-gray-500 ml-2">Width:</span>
                              <Button size="icon" variant="outline" onClick={() => setPositions(r => ({ ...r, photoDimension:{ ...r.photoDimension, width: Math.max(20, r.photoDimension.width - 5)} }))}>-</Button>
                              <span className="px-2">{positions.photoDimension.width}</span>
                              <Button size="icon" variant="outline" onClick={() => setPositions(r => ({ ...r, photoDimension: {...r.photoDimension, width: Math.min(400, r.photoDimension.width + 5)} }))}>+</Button>
                              <span className="text-xs text-gray-500 ml-2">Height:</span>
                              <Button size="icon" variant="outline" onClick={() => setPositions(r => ({ ...r, photoDimension: {...r.photoDimension, height: Math.max(20, r.photoDimension.height - 5)} }))}>-</Button>
                              <span className="px-2">{positions.photoDimension.height}</span>
                              <Button size="icon" variant="outline" onClick={() => setPositions(r => ({ ...r, photoDimension: {...r.photoDimension, height: Math.min(600, r.photoDimension.height + 5)} }))}>+</Button>
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
                              <NextImage
                                src={generatedCard}
                                alt="Generated ID Card"
                                width={400}
                                height={300}
                                className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
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
                                  // Always enabled
                                />
                                <label htmlFor="issued" className="text-sm font-medium">ISSUED</label>
                              </div>
                              <div className="flex items-center space-x-2" title={idCardIssues.length === 0 ? "You must issue the first card before you can renew." : ""}>
                                <Checkbox
                                  id="renewed"
                                  checked={issueType === "RENEWED"}
                                  onCheckedChange={() => setIssueType("RENEWED")}
                                  disabled={idCardIssues.length === 0}
                                />
                                <label htmlFor="renewed" className="text-sm font-medium">RENEWED</label>
                              </div>
                              <div className="flex items-center space-x-2" title={idCardIssues.length === 0 ? "You must issue the first card before you can reissue." : ""}>
                                <Checkbox
                                  id="reissued"
                                  checked={issueType === "REISSUED"}
                                  onCheckedChange={() => setIssueType("REISSUED")}
                                  disabled={idCardIssues.length === 0}
                                />
                                <label htmlFor="reissued" className="text-sm font-medium">REISSUED</label>
                              </div>
                            </div>
                            {idCardIssues.length === 0 && (
                              <div className="text-xs text-gray-500 mt-1">You must issue the first card before you can renew or reissue.</div>
                            )}
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
                      <NextImage src={zoomImg} alt="Zoomed ID Card" width={800} height={600} className="w-full h-auto object-contain rounded-lg border" />
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
            </div>
          )
        )}
      </div>

    </div>
  );
}
