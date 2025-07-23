"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import Webcam from "react-webcam"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, Download, User, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from "lucide-react"
import { useParams } from "next/navigation"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Student } from "@/types"
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export default function WebcamIDGenerator() {
  const webcamRef = useRef<Webcam>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [generatedCard, setGeneratedCard] = useState<string | null>(null)
  const [showWebcam, setShowWebcam] = useState(false)
  const [userDetails, setUserDetails] = useState<Student | null>(null);
  const [showBack, setShowBack] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [positions, setPositions] = useState({
    name: { x: 320, y: 580 },
    course: { x: 320, y: 620 },
    uid: { x: 215, y: 680 },
    mobile: { x: 240, y: 710 },
    bloodGroup: { x: 270, y: 774 },
  });

  const params = useParams()
  const uidParam = params?.uid

  useEffect(() => {
    const fetchStudent = async () => {
      if (!uidParam) {
        setUserDetails(null);
        return;
      }
      try {
        const res = await fetch(`${BASE_PATH}/api/students?uid=${uidParam}`);
        const data = await res.json();
        if (data.content && data.content.length > 0) {
          setUserDetails(data.content[0]);
        } else {
          setUserDetails(null);
        }
      } catch {
        setUserDetails(null);
      }
    };
    fetchStudent();
  }, [uidParam]);

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot()
    if (imageSrc) {
      setCapturedImage(imageSrc)
      setShowWebcam(false)
    }
  }, [webcamRef])

  // const retakePhoto = () => {
  //   setCapturedImage(null)
  //   setGeneratedCard(null)
  //   setShowWebcam(true)
  // }

  const generateIDCard = useCallback(() => {
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

    templateImg.onload = () => {
      // Clear canvas first
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw the clean template background
      ctx.drawImage(templateImg, 0, 0, canvas.width, canvas.height)

      // Load and draw the captured photo
      const userImg = new Image()
      userImg.crossOrigin = "anonymous"

      userImg.onload = () => {
        // Photo placement coordinates for the clean template
        // The photo area is in the center-upper portion of the card
        const photoX = 220 // X position of photo area
        const photoY = 280 // Y position of photo area
        const photoWidth = 200 // Width of photo area
        const photoHeight = 250 // Height of photo area

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
        if (userDetails?.name) {
          ctx.font = "bold 32px Arial"
          ctx.fillText(userDetails.name.toUpperCase(), positions.name.x, positions.name.y)
        }

        // Course
        if (userDetails?.courseName) {
          ctx.font = "24px Arial"
          ctx.fillText(userDetails.courseName, positions.course.x, positions.course.y)
        }

        // UID
        if (userDetails?.codeNumber) {
        ctx.font = "bold 20px Arial"
          ctx.fillText(`UID: ${userDetails.codeNumber}`, positions.uid.x, positions.uid.y)
        }

        // Mobile
        if (userDetails?.emrgnResidentPhNo) {
          ctx.font = "bold 20px Arial"
          ctx.fillText(`MOB NO.: ${userDetails.emrgnResidentPhNo}`, positions.mobile.x, positions.mobile.y)
        }

        // Blood Group
        if (userDetails?.bloodGroupName) {
          ctx.font = "bold 24px Arial"
          ctx.fillText(`${userDetails.bloodGroupName}`, positions.bloodGroup.x, positions.bloodGroup.y)
        }

        // Convert canvas to image and set it
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
    templateImg.src = "/id-card-template.jpeg"
  }, [capturedImage, userDetails, positions])

  useEffect(() => {
    if (
      capturedImage &&
      userDetails?.name &&
      userDetails?.courseName &&
      userDetails?.codeNumber &&
      userDetails?.emrgnResidentPhNo &&
      userDetails?.bloodGroupName
    ) {
      generateIDCard();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    capturedImage,
    userDetails?.name,
    userDetails?.courseName,
    userDetails?.codeNumber,
    userDetails?.emrgnResidentPhNo,
    userDetails?.bloodGroupName,
    positions.name.x, positions.name.y,
    positions.course.x, positions.course.y,
    positions.uid.x, positions.uid.y,
    positions.mobile.x, positions.mobile.y,
    positions.bloodGroup.x, positions.bloodGroup.y,
  ]);

  const downloadCard = () => {
    if (!generatedCard) return

    const link = document.createElement("a")
    link.download = `${userDetails?.name || "ID"}_card.png`
    link.href = generatedCard
    link.click()
  }

  const handleInputChange = (field: keyof Student, value: string) => {
    setUserDetails((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  }

  const handleSaveImage = async () => {
    if (!capturedImage || !userDetails?.codeNumber) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const blob = await (await fetch(capturedImage)).blob();
      const formData = new FormData();
      formData.append("file", blob, `${userDetails?.codeNumber}.png`);
      formData.append("uid", userDetails?.codeNumber);
      const res = await fetch(`${BASE_PATH}/api/students/upload-image`, {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
    setSaving(false);
  };

  useEffect(() => {
    if (!userDetails?.codeNumber) return;
    const imgUrl = `${BASE_PATH}/api/students/fetch-image?uid=${userDetails?.codeNumber}`;
    fetch(imgUrl, { method: "HEAD" }).then(res => {
      if (res.ok) setCapturedImage(imgUrl);
    });
  }, [userDetails?.codeNumber]);

  useEffect(() => {
    if (saveStatus === "success") {
      const timer = setTimeout(() => setSaveStatus("idle"), 2000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  return (
    <div className="">
      <div className="">
        {userDetails && (
          <div className="flex gap-4">
            {/* Left: Editable Form */}
            <div className="w-[66%]">
              <Card className="p-6 bg-blue-50 rounded-xl shadow-md flex flex-col justify-center h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={`${process.env.NEXT_PUBLIC_STUDENT_PROFILE_URL}/Student_Image_${userDetails.codeNumber}.jpg`} alt={userDetails.name} />
                        <AvatarFallback>{}</AvatarFallback>
                      </Avatar>
                      {/* <span className="truncate" title={userDetails.name}>{userDetails.name}</span> */}
                    </div>
                    <span className="flex items-center gap-2"><User className="w-5 h-5" />Personal Details</span>
                    {/* Empty span for alignment with right card's toggle */}
                    <span></span>
                  </CardTitle>
                </CardHeader>
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
                  </div>
                  <div className="flex flex-col gap-2 mt-6">
                    <Button className="w-full rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 shadow" onClick={() => setShowWebcam(true)} size="lg">
                      {capturedImage ? "Change Photo" : "Capture Photo"}
                    </Button>
                    <Button
                      className="w-full rounded-lg bg-green-500 hover:bg-green-600 shadow text-white"
                      onClick={handleSaveImage}
                      size="lg"
                      disabled={!capturedImage || !userDetails?.codeNumber || saving}
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
                      if (showBack) { setZoomImg('/id-card-template-backside.jpeg'); setZoomOpen(true); }
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
                        src="/id-card-template-backside.jpeg"
                        alt="ID Card Back"
                        className="max-h-full max-w-full object-contain rounded-lg shadow-lg"
                      />
                    )}
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={downloadCard}
                      className={`w-full rounded-lg ${showBack || !generatedCard ? "bg-gray-200 text-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 text-white"}`}
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
                </CardContent>
              </Card>
            </div>
                  </div>
                )}
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
              <img src={zoomImg} alt="Zoomed ID Card" className="w-full h-auto object-contain rounded-lg" />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}