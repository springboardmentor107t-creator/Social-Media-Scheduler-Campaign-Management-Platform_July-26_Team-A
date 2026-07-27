"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import MapLoader from "@/components/MapLoader";

export default function BootPage() {
  const router = useRouter();
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1700);
    const navTimer = setTimeout(() => router.push("/login"), 2200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [router]);

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center transition-opacity duration-500 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
      style={{ background: "var(--bg-canvas)" }}
    >
      <div className="w-full max-w-3xl px-6">
        <MapLoader label="Connecting social accounts..." variant="full" />
      </div>
    </div>
  );
}
