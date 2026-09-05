import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { GameApp } from "@/components/game/GameApp";
import "./styles.css";

const host = document.getElementById("app");
if (!host) throw new Error("Falta el contenedor #app");

createRoot(host).render(
  <StrictMode>
    <GameApp />
  </StrictMode>,
);
