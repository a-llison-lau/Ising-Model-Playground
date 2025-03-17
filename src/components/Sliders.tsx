import React, { useState, useEffect } from "react";

interface SlidersProps {
  onParameterChange?: (params: {
    temperature: number;
    field: number;
    coupling: number;
    speed: number;
  }) => void;
  initialTemperature?: number;
  initialField?: number;
  initialCoupling?: number;
  initialSpeed?: number;
}

function Sliders({
  onParameterChange,
  initialTemperature = 2.27,
  initialField = 0.0,
  initialCoupling = 1.0,
  initialSpeed = 0.5,
}: SlidersProps) {
  const [temperature, setTemperature] = useState(initialTemperature);
  const [field, setField] = useState(initialField);
  const [coupling, setCoupling] = useState(initialCoupling);
  const [speed, setSpeed] = useState(initialSpeed);

  useEffect(() => {
    if (onParameterChange) {
      onParameterChange({ temperature, field, coupling, speed });
    }
  }, [temperature, field, coupling, speed, onParameterChange]);

  return (
    <div className="absolute bottom-0 right-0 flex flex-col w-full md:w-5/7 pb-7 p-4 bg-white">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Temperature Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <label
              htmlFor="temperature"
              className="text-sm font-medium text-gray-700"
            >
              Temperature (T)
            </label>
            <span className="text-sm text-gray-500">
              {temperature.toFixed(2)}
            </span>
          </div>
          <input
            id="temperature"
            type="range"
            min="0.1"
            max="5"
            step="0.01"
            value={temperature}
            onChange={(e) => setTemperature(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.1</span>
            <span className="text-blue-500 font-medium">
              T<sub>c</sub>≈2.27
            </span>
            <span>5.0</span>
          </div>
        </div>

        {/* Magnetic Field Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <label
              htmlFor="field"
              className="text-sm font-medium text-gray-700"
            >
              Magnetic Field (H)
            </label>
            <span className="text-sm text-gray-500">{field.toFixed(2)}</span>
          </div>
          <input
            id="field"
            type="range"
            min="-2"
            max="2"
            step="0.01"
            value={field}
            onChange={(e) => setField(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>-2.0</span>
            <span>0.0</span>
            <span>+2.0</span>
          </div>
        </div>

        {/* Coupling Strength Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <label
              htmlFor="coupling"
              className="text-sm font-medium text-gray-700"
            >
              Coupling Strength (J)
            </label>
            <span className="text-sm text-gray-500">{coupling.toFixed(2)}</span>
          </div>
          <input
            id="coupling"
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={coupling}
            onChange={(e) => setCoupling(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>0.0</span>
            <span>1.0</span>
            <span>2.0</span>
          </div>
        </div>

        {/* Simulation Speed Slider */}
        <div className="flex flex-col gap-1">
          <div className="flex justify-between">
            <label
              htmlFor="speed"
              className="text-sm font-medium text-gray-700"
            >
              Simulation Speed
            </label>
            <span className="text-sm text-gray-500">{speed.toFixed(1)}x</span>
          </div>
          <input
            id="speed"
            type="range"
            min="0.1"
            max="5"
            step="0.1"
            value={speed}
            onChange={(e) => setSpeed(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Slow</span>
            <span>Fast</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Sliders;
