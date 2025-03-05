import { useEffect } from 'react';
import GUI from 'lil-gui';

function ControlPanel() {
  useEffect(() => {
    // Create GUI
    const gui = new GUI();

    // Get the update function from the window object
    const updateShaderParams = (window as any).updateShaderParams;

    // Only proceed if the update function exists
    if (updateShaderParams) {
      // Add controls for shader parameters
      const params = {
        TEMPERATURE: 5.0,
        J: 1.0,
        EVOLUTION_SPEED: 2.0
      };

      // Add sliders for each parameter with sensible ranges
      gui.add(params, 'TEMPERATURE', 0, 10)
         .onChange((value: number) => updateShaderParams({ TEMPERATURE: value }))
         .name('Temperature');

      gui.add(params, 'J', 0, 5)
         .onChange((value: number) => updateShaderParams({ J: value }))
         .name('Coupling Strength');

      gui.add(params, 'EVOLUTION_SPEED', 0, 5)
         .onChange((value: number) => updateShaderParams({ EVOLUTION_SPEED: value }))
         .name('Evolution Speed');
    }

    // Cleanup
    return () => {
      gui.destroy(); // Prevent memory leaks
    };
  }, []);

  return null; // No visible UI from this component
}

export default ControlPanel;