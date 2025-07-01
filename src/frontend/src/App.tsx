import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { NetworkDashboard } from "./pages/network-dashboard-page";
import { EntityProfilePage } from "./pages/entity-profile-page";
import { TaskMonitorPage } from "./pages/task-monitor-page";
import { NetworkGraphPage } from "./pages/network-graph-page";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NetworkDashboard />} />
        <Route path="/entity-profile" element={<EntityProfilePage />} />
        <Route path="/task-monitor" element={<TaskMonitorPage />} />
        <Route path="/network-graph" element={<NetworkGraphPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
