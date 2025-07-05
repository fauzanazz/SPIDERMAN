import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./App.css";
import { NetworkDashboard } from "./pages/network-dashboard-page";
import { NetworkGraphPage } from "./pages/network-graph-page";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<NetworkDashboard />} />
        <Route path="/network-graph" element={<NetworkGraphPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
