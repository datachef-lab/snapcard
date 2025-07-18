"use client";

import { useState, useContext, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { AuthContext } from "@/providers/auth-provider";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

const ILLUSTRATION_MAIL = (
  <svg
    width="90"
    height="90"
    viewBox="0 0 90 90"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="90" height="90" rx="20" fill="#FFF8E1" />
    <path
      d="M20 30L45 50L70 30"
      stroke="#FFC107"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <rect x="20" y="30" width="50" height="30" rx="8" fill="#FFD54F" />
    <path
      d="M20 30L45 50L70 30"
      stroke="#FFF8E1"
      strokeWidth="4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
const ILLUSTRATION_LOCK = (
  <svg
    width="90"
    height="90"
    viewBox="0 0 90 90"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect width="90" height="90" rx="20" fill="#FFF8E1" />
    <rect x="25" y="40" width="40" height="30" rx="8" fill="#FFD54F" />
    <circle cx="45" cy="55" r="4" fill="#FFF8E1" />
    <path
      d="M45 59V55"
      stroke="#FFC107"
      strokeWidth="2"
      strokeLinecap="round"
    />
    <path
      d="M35 40V32C35 26.4772 39.4772 22 45 22C50.5228 22 55 26.4772 55 32V40"
      stroke="#FFC107"
      strokeWidth="4"
      strokeLinecap="round"
    />
  </svg>
);

export default function Home() {
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [contact, setContact] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(180); // 3 minutes in seconds
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();
  const auth = useContext(AuthContext);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOtpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isOtpSent, timer]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  if (!auth) {
    throw new Error("AuthContext must be used within an AuthProvider");
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const response = await fetch(`${BASE_PATH}/api/auth/otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: contact }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        setIsOtpSent(true);
        setTimer(180);
        setCanResend(false);
        toast.success("OTP sent successfully!");
      } else {
        if (data.message === "Active OTP already exists") {
          setIsOtpSent(true);
          setTimer(180);
          setCanResend(false);
          toast.info(
            "Please use the existing OTP or wait for the timer to expire"
          );
        } else {
          toast.error(data.message || "Failed to send OTP");
        }
      }
    } catch (err) {
      console.error("Error sending OTP:", err);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';
      const response = await fetch(`${BASE_PATH}/api/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: contact, code: otp }),
      });
      const data = await response.json();

      if (response.ok) {
        auth.login(data.accessToken, data.user);
        toast.success("Login successful!");
        router.push("/dashboard");
      } else {
        toast.error(data.message || "Invalid OTP");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      toast.error("Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#e5dfc6]">
      
    <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight first:mt-0">
      ID Card Generation
    </h2>
  
      <Card className="w-full max-w-lg rounded-3xl shadow-xl border-0 bg-[#f7f7f2] p-2">
        <CardContent className="flex flex-col items-center justify-center px-8 py-8">
          {!isOtpSent ? (
            <>
              <div className="flex flex-col items-center w-full">
                {ILLUSTRATION_MAIL}
                <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-1 text-center">
                  Enter Phone or Email
                </h2>
                <p className="text-gray-400 text-center mb-6 text-base">
                  Please enter your WhatsApp number or email address to receive
                  a login code.
                </p>
                <form
                  onSubmit={handleSendOtp}
                  className="w-full flex flex-col gap-4 items-center"
                >
                  <Input
                    id="contact"
                    type="text"
                    placeholder="Enter phone or email"
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    required
                    className="w-full rounded-full shadow-sm border border-gray-200 px-4 py-3 text-lg placeholder:text-gray-300 bg-white"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    className="w-full rounded-full bg-[#8BC34A] text-white text-lg font-bold py-3 mt-2 shadow-md hover:bg-[#7cb342] transition-all"
                    disabled={isLoading}
                  >
                    {isLoading ? "Sending..." : "Send Code"}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center w-full">
              {ILLUSTRATION_LOCK}
              <h2 className="text-2xl font-bold text-gray-800 mt-6 mb-1 text-center">
                Enter OTP Code
              </h2>
              <p className="text-gray-400 text-center mb-6 text-base">
                We&apos;ve sent a 6-digit code to your phone or email. Please
                enter it below to continue.
              </p>
              <form
                onSubmit={handleVerifyOtp}
                className="w-full flex flex-col gap-4 items-center"
              >
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  disabled={isLoading}
                  className="justify-center mb-2"
                >
                  <InputOTPGroup>
                    {[...Array(6)].map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="rounded-xl border-2 border-gray-200 focus:border-[#8BC34A] focus:ring-2 focus:ring-[#c5e1a5] bg-gray-100 text-2xl text-center w-14 h-14 mx-1"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
                <div className="w-full flex justify-between items-center mt-2">
                  <button
                    type="button"
                    className={`font-semibold text-base transition-all ${
                      canResend
                        ? "text-[#8BC34A] underline hover:text-[#689f38]"
                        : "text-gray-400"
                    }`}
                    onClick={() => {
                      if (canResend) {
                        setIsOtpSent(false);
                        setOtp("");
                      }
                    }}
                    disabled={isLoading || !canResend}
                  >
                    {canResend
                      ? "Resend Code"
                      : `Resend in ${formatTime(timer)}`}
                  </button>
                  <Button
                    type="submit"
                    className="rounded-full bg-[#8BC34A] text-white text-lg font-bold px-8 py-3 shadow-md hover:bg-[#7cb342] transition-all"
                    disabled={isLoading || otp.length !== 6}
                  >
                    {isLoading ? "Verifying..." : "Verify Code"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}