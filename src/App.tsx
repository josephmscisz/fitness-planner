import { useState } from "react";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import PlanToday from "./pages/PlanToday";
import History from "./pages/History";

type Page = "planner" | "library" | "history";

function App() {
  const [page, setPage] = useState<Page>("planner");

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <nav style={{ display: "flex", gap: 12, padding: 16 }}>
        <button onClick={() => setPage("planner")}>Plan Today</button>
        <button onClick={() => setPage("library")}>Library</button>
        <button onClick={() => setPage("history")}>History</button>
      </nav>

      {page === "planner" && <PlanToday />}
      {page === "library" && <ExerciseLibrary />}
      {page === "history" && <History />}
    </div>
  );
}

export default App;