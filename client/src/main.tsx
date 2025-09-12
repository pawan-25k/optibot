import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setupMockWallet } from "./lib/mockEthereum";

// Setup mock wallet for testing/development if needed
setupMockWallet();

createRoot(document.getElementById("root")!).render(<App />);
