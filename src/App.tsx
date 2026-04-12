import { useState } from "react";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import PlanToday from "./pages/PlanToday";

type Page = "library" | "planner";

function App() {
  const [page, setPage] = useState<Page>("planner");

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <nav
        style={{
          display: "flex",
          gap: 12,
          padding: 16,
          borderBottom: "1px solid #ddd",
        }}
      >
        <button onClick={() => setPage("planner")}>Plan Today</button>
        <button onClick={() => setPage("library")}>Exercise Library</button>
      </nav>

      {page === "planner" ? <PlanToday /> : <ExerciseLibrary />}
    </div>
  );
}

export default App;