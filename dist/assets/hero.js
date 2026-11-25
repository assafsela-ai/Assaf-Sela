const workflow = document.querySelector(".workflow");
const visual = workflow.querySelector(".workflow-visual");
const canvas = workflow.querySelector(".workflow-canvas");

async function loadWorkflowScene() {
  try {
    const context = canvas.getContext("webgl2", { alpha: true, antialias: true });
    if (!context) return;

    const { mountWorkflowScene } = await import("./workflow-scene.js");
    if (!context.isContextLost()) mountWorkflowScene(workflow, visual, canvas, context);
  } catch (error) {
    console.warn("The 3D workflow could not start.", error);
  }
}

if ("IntersectionObserver" in window && "ResizeObserver" in window) {
  const observer = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    void loadWorkflowScene();
  }, { rootMargin: "120px" });
  observer.observe(visual);
}
