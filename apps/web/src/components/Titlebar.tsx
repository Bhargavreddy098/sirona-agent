import React from "react";

export const Titlebar: React.FC = () => {
  return (
    <header
      data-slot="titlebar-v2"
      data-tauri-drag-region=""
      className="shrink-0 relative flex flex-row h-9 bg-v2-background-bg-deep overflow-visible"
      style={{
        height: "calc(28px + max(8px, env(safe-area-inset-top, 0px)))",
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "0px",
        paddingLeft: "0px",
      }}
    >
      <div className="h-full flex-1 overflow-hidden flex flex-row items-center gap-1.5 px-2 md:pe-3 pt-[max(0px,calc(8px-env(safe-area-inset-top,0px)))]">
        <div className="flex-1" />
      </div>
    </header>
  );
};
