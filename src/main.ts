import "./style.css";
import { setupEditor } from "./editor.ts";

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <div>
    <h5>a rich textarea for canvas</h5>
    <main style="display: flex;justify-content: center;">
    <div id="canvasEditor" style="position: relative;width: 200px;">
      <canvas id="canvasRef" style="border: 1px green solid;width: 200px; height: 105px;"></canvas>
    </div>
  </main>
  </div>
`;

setupEditor(document.querySelector<HTMLCanvasElement>("#canvasRef")!);
