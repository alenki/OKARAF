import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import Dither from "./components/Dither.tsx";

const container = document.getElementById("background");

if (container) {
  const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;

  createRoot(container).render(
    <StrictMode>
      <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
        <Dither
          waveColor={[0.5, 0.5, 0.5]}
          disableAnimation={prefersReducedMotion}
          enableMouseInteraction={true}
          mouseRadius={0.3}
          colorNum={4}
          waveAmplitude={0.3}
          waveFrequency={3}
          waveSpeed={0.05}
        />
      </div>
    </StrictMode>
  );
}
