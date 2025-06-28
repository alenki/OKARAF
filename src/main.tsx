import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import Dither from "./components/Dither.tsx";

createRoot(document.getElementById("background")!).render(
  <StrictMode>
    <div style={{ width: "100vw", height: "100vh", position: "relative" }}>
      <Dither
        waveColor={[0.5, 0.5, 0.5]}
        disableAnimation={false}
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
