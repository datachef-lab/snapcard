"use client";
import React, { useState, useEffect } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { Input } from "@/components/ui/input";

export default function PrintIDCardLayout({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();

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

  useEffect(() => {
    if (value === "") {
      if (pathname !== "/dashboard/print-id-card") {
        router.push("/dashboard/print-id-card");
      }
      return;
    }
    const handler = setTimeout(() => {
      if (!pathname.endsWith(value)) {
        router.push(`/dashboard/print-id-card/${encodeURIComponent(value)}`);
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [value, router, pathname]);

  return (
    <div className="px-4">
      <Input
        placeholder="Enter student UID or code number"
        value={value}
        onChange={e => setValue(e.target.value.replace(/[^0-9]/g, ""))}
        className="w-full max-w-xs"
        inputMode="numeric"
        pattern="[0-9]*"
      />
      <div className="mt-8">{children}</div>
    </div>
  );
}
