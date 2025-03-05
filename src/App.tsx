import "./App.css";
import { useState } from "react";
import TextPanel from "./components/TextPanel";
import Canvas from "./components/Canvas";
import Authors from "./components/Authors";
import ControlPanel from "./components/ControlPanel";

function App() {
  const [isTextPanelOpen, setIsTextPanelOpen] = useState(true);

  const handleTogglePanel = () => {
    setIsTextPanelOpen(!isTextPanelOpen);
  };

  return (
    <>
      <div>
        <div className="relative w-full h-full overflow-hidden">
          <TextPanel isOpen={isTextPanelOpen} onToggle={handleTogglePanel} />
          <Canvas />
          <Authors />
          <ControlPanel />
        </div>
      </div>
    </>
  );
}

export default App;
