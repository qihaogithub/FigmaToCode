import React, { useRef, useState, useEffect } from "react";
import { HTMLPreview } from "types";
import { replaceExternalImagesWithCanvas } from "../lib/utils";
import { Circle, Maximize2, Minimize2 } from "lucide-react";

const Preview: React.FC<{
  htmlPreview: HTMLPreview;
  bgColor: "white" | "black";
  setBgColor: React.Dispatch<React.SetStateAction<"white" | "black">>;
}> = ({ htmlPreview, bgColor, setBgColor }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const calculateScale = () => {
      if (!container) return;
      const { width, height } = container.getBoundingClientRect();
      const { width: contentWidth, height: contentHeight } = htmlPreview.size;

      if (contentWidth && contentHeight) {
        // Leave some padding
        const padding = 40;
        const availableWidth = Math.max(0, width - padding);
        const availableHeight = Math.max(0, height - padding);

        const safeScale = Math.min(
          availableWidth / contentWidth,
          availableHeight / contentHeight,
          1,
        );
        setScale(safeScale);
      }
    };

    // Initial calculation
    calculateScale();

    const observer = new ResizeObserver(() => {
      calculateScale();
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [htmlPreview.size]);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Top Toolbar (Background Color Toggle) */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 p-1 bg-background/80 backdrop-blur-sm rounded-md border border-border shadow-xs">
        <button
          onClick={() => setBgColor(bgColor === "white" ? "black" : "white")}
          className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground transition-colors"
          aria-label={`切换到${bgColor === "white" ? "黑色" : "白色"}背景`}
          title={`切换到${bgColor === "white" ? "黑色" : "白色"}背景`}
        >
          <Circle size={14} fill={bgColor} className="stroke-current" />
        </button>
      </div>

      {/* Main Preview Area */}
      <div
        ref={containerRef}
        className={`flex-1 w-full flex items-center justify-center overflow-hidden ${
          bgColor === "white" ? "bg-white" : "bg-neutral-950"
        }`}
      >
        <div
          style={{
            width: htmlPreview.size.width,
            height: htmlPreview.size.height,
            transform: `scale(${scale})`,
            transformOrigin: "center center",
            transition: "transform 0.2s ease-out",
          }}
          dangerouslySetInnerHTML={{
            __html: replaceExternalImagesWithCanvas(htmlPreview.content),
          }}
        />
      </div>

      {/* Bottom Status Bar (Size Info) */}
      <div className="absolute bottom-2 left-2 z-10 px-2 py-1 bg-background/80 backdrop-blur-sm rounded-md border border-border shadow-xs text-xs text-muted-foreground">
        {htmlPreview.size.width.toFixed(0)} ×{" "}
        {htmlPreview.size.height.toFixed(0)} px
      </div>
    </div>
  );
};

export default Preview;
