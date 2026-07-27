import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MapLoader from "../components/MapLoader";

export default function BootPage() {
  const navigate = useNavigate();
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 1700);
    const navTimer = setTimeout(() => navigate("/login"), 2200);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(navTimer);
    };
  }, [navigate]);

  return (
    <div
      className={`fixed inset-0 z-[999] flex items-center justify-center transition-opacity duration-500 bg-canvas-light dark:bg-canvas-dark ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-3xl px-6">
        <MapLoader label="Connecting social accounts..." variant="full" />
      </div>
    </div>
  );
}
