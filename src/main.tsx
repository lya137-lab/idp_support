import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "@/utils/envCheck"; // 환경변수 확인

createRoot(document.getElementById("root")!).render(<App />);
