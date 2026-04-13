import { useState } from "react";
import ExerciseLibrary from "./pages/ExerciseLibrary";
import PlanToday from "./pages/PlanToday";
import History from "./pages/History";
import ExerciseManager from "./pages/ExerciseManager";
import TemplateManager from "./pages/TemplateManager";

type Page =
  | "planner"
  | "library"
  | "history"
  | "exerciseManager"
  | "templateManager";

function App() {
  const [page, setPage] = useState<Page>("planner");

  return (
    <div style={{ fontFamily: "sans-serif" }}>
      <nav style={{ display: "flex", gap: 12, padding: 16, flexWrap: "wrap" }}>
        <button onClick={() => setPage("planner")}>Plan Today</button>
        <button onClick={() => setPage("library")}>Library</button>
        <button onClick={() => setPage("history")}>History</button>
        <button onClick={() => setPage("exerciseManager")}>Exercise Manager</button>
        <button onClick={() => setPage("templateManager")}>Template Manager</button>
      </nav>

      {page === "planner" && <PlanToday />}
      {page === "library" && <ExerciseLibrary />}
      {page === "history" && <History />}
      {page === "exerciseManager" && <ExerciseManager />}
      {page === "templateManager" && <TemplateManager />}
    </div>
  );
}

export default App;