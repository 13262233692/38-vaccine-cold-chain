import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Home from "@/pages/Home";
import Alerts from "@/pages/Alerts";
import Audit from "@/pages/Audit";

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/audit" element={<Audit />} />
      </Routes>
    </Router>
  );
}
