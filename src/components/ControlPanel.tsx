import { useEffect } from "react";
import GUI from "lil-gui";

function ControlPanel() {
  useEffect(() => {
    // Create GUI
    const gui = new GUI();

    // Get the update function from the window object
    const updateShaderParams = (window as any).updateShaderParams;

    // Only proceed if the update function exists
    if (updateShaderParams) {
      // Define topology options with proper typing
      const topologyOptions = {
        "Regular grid (4 neighbors)": 0,
        "Triangular lattice (6 neighbors)": 1,
        "Hexagonal lattice (3 neighbors)": 2,
        "Small-world network (4 regular + 1 long-range connection)": 3,
        "Random graph (5 random connections)": 4,
      } as const;

      // Create a type for valid topology option keys
      type TopologyOptionKey = keyof typeof topologyOptions;

      // Add controls for shader parameters
      const params = {
        TEMPERATURE: 0.5,
        J: 1.0,
        EVOLUTION_SPEED: 0.5,
        TOPOLOGY: 0,
        // Use a separate property for the dropdown menu
        topologyOption: "Regular grid (4 neighbors)" as TopologyOptionKey,
      };

      // Add sliders for each parameter with sensible ranges
      gui
        .add(params, "TEMPERATURE", 0, 10)
        .onChange((value: number) => updateShaderParams({ TEMPERATURE: value }))
        .name("Temperature");

      gui
        .add(params, "J", 0, 5)
        .onChange((value: number) => updateShaderParams({ J: value }))
        .name("Coupling Strength");

      gui
        .add(params, "EVOLUTION_SPEED", 0, 5)
        .onChange((value: number) =>
          updateShaderParams({ EVOLUTION_SPEED: value })
        )
        .name("Evolution Speed");

      gui
        .add(params, "topologyOption", Object.keys(topologyOptions))
        .onChange((value: string) => {
          const optionKey = value as TopologyOptionKey;
          const numericValue = topologyOptions[optionKey];
          params.TOPOLOGY = numericValue;
          updateShaderParams({ TOPOLOGY: numericValue });
        })
        .name("Topology");
    }

    // Cleanup
    return () => {
      gui.destroy(); // Prevent memory leaks
    };
  }, []);

  return null; // No visible UI from this component
}

export default ControlPanel;
