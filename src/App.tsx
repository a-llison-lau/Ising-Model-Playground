import "./App.css";
import TextPanel from "./components/TextPanel";
import Canvas from "./components/Canvas";
import Authors from "./components/Authors";

function App() {
  return (
    <>
      <div>
        <div className="relative w-full h-screen">
          <div className="flex w-full h-full">
            <TextPanel />
          </div>
          <Canvas />
          <Authors />
        </div>
      </div>
    </>
  );
}

export default App;
