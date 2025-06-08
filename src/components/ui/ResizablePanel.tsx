// components/ui/ResizablePanel.tsx
import React, { useRef, useState, useEffect } from "react";

interface ResizablePanelProps {
  side: "left" | "right";
  minWidth?: number;
  maxWidth?: number;
  initialWidth?: number;
  children: React.ReactNode;
}

export const ResizablePanel = ({
  side,
  minWidth = 280,
  maxWidth = 480,
  initialWidth = 320,
  children,
}: ResizablePanelProps) => {
  const [width, setWidth] = useState(initialWidth);
  const isResizing = useRef(false);

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing.current) return;
    const deltaX = e.movementX;
    setWidth((prev) => {
      const newWidth = side === "left" ? prev + deltaX : prev - deltaX;
      return Math.min(Math.max(newWidth, minWidth), maxWidth);
    });
  };

  const handleMouseUp = () => {
    isResizing.current = false;
    document.body.style.cursor = "default";
  };

  const handleMouseDown = () => {
    isResizing.current = true;
    document.body.style.cursor = "col-resize";
  };

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  return (
    <div
      className={`relative h-full flex-shrink-0 flex flex-col ${
        side === "left"
          ? "border-r border-gray-300"
          : "border-l border-gray-300"
      }`}
      style={{ width }}
    >
      {/* Drag handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute top-0 bottom-0 w-2 z-10 cursor-col-resize ${
          side === "left" ? "right-0" : "left-0"
        }`}
      />
      {children}
    </div>
  );
};
