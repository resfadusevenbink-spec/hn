import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HennaNetlifyApp } from "./HennaNetlifyApp";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <HennaNetlifyApp />
  </StrictMode>,
);
