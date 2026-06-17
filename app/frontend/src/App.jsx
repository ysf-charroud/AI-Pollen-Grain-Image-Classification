import { useEffect, useState } from "react";
import TopBar from "./components/TopBar.jsx";
import Hero from "./components/Hero.jsx";
import Predictor from "./components/Predictor.jsx";
import Dataset from "./components/Dataset.jsx";
import Footer from "./components/Footer.jsx";
import { getClasses, getStats } from "./api.js";

export default function App() {
  const [classes, setClasses] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsError, setStatsError] = useState(false);

  async function refreshStats() {
    try {
      setStats(await getStats());
      setStatsError(false);
    } catch {
      setStatsError(true);
    }
  }

  useEffect(() => {
    getClasses().then(setClasses).catch(() => setClasses([]));
    refreshStats();
  }, []);

  return (
    <div className="page">
      <TopBar />
      <Hero />
      <Predictor classes={classes} onSaved={refreshStats} />
      <Dataset stats={stats} error={statsError} />
      <Footer />
    </div>
  );
}
