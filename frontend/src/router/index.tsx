import { createBrowserRouter } from "react-router-dom";
import { AppFrame } from "../components/layout/AppFrame";
import Dashboard from "../pages/Dashboard";
import ThreatDetection from "../pages/ThreatDetection";
import TrafficAnalysis from "../pages/TrafficAnalysis";
import Alerts from "../pages/Alerts";
import NetworkFlows from "../pages/NetworkFlows";
import AIIntelligence from "../pages/AIIntelligence";
import Reports from "../pages/Reports";
import Settings from "../pages/Settings";
import ThreatInvestigation from "../pages/ThreatInvestigation";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppFrame />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "detection", element: <ThreatDetection /> },
      { path: "traffic", element: <TrafficAnalysis /> },
      { path: "alerts", element: <Alerts /> },
      { path: "network", element: <NetworkFlows /> },
      { path: "ai", element: <AIIntelligence /> },
      { path: "reports", element: <Reports /> },
      { path: "settings", element: <Settings /> },
      { path: "investigation/:id", element: <ThreatInvestigation /> },
    ],
  },
]);
