import Preview from "./components/Preview";
import CodePanel from "./components/CodePanel";
import WarningsPanel from "./components/WarningsPanel";
import { Framework, HTMLPreview, PluginSettings, Warning } from "types";
import {
  preferenceOptions,
  selectPreferenceOptions,
} from "./codegenPreferenceOptions";
import Loading from "./components/Loading";
import { useState } from "react";
import { InfoIcon } from "lucide-react";
import React from "react";

type PluginUIProps = {
  code: string;
  htmlPreview: HTMLPreview;
  warnings: Warning[];
  selectedFramework: Framework;
  setSelectedFramework: (framework: Framework) => void;
  settings: PluginSettings | null;
  onPreferenceChanged: (
    _key: keyof PluginSettings,
    _value: boolean | string | number | Record<string, string[]>,
  ) => void;
  isLoading: boolean;
};

export const PluginUI = (props: PluginUIProps) => {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "about">(
    "preview",
  );

  const [previewBgColor, setPreviewBgColor] = useState<"white" | "black">(
    "black",
  );

  if (props.isLoading) return <Loading />;

  const isEmpty = props.code === "";
  const warnings = props.warnings ?? [];

  return (
    <div className="flex flex-col h-full dark:text-white">
      <div className="p-2 dark:bg-card">
        <div className="flex gap-1 bg-muted dark:bg-card rounded-lg p-1">
          <button
            className={`flex-1 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
              activeTab === "preview"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
            }`}
            onClick={() => setActiveTab("preview")}
          >
            预览
          </button>
          <button
            className={`flex-1 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
              activeTab === "code"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
            }`}
            onClick={() => setActiveTab("code")}
          >
            代码
          </button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${
              activeTab === "about"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
            }`}
            onClick={() => setActiveTab("about")}
            aria-label="关于"
          >
            <InfoIcon size={16} />
          </button>
        </div>
      </div>
      <div
        style={{
          height: 1,
          width: "100%",
          backgroundColor: "rgba(255,255,255,0.12)",
        }}
      ></div>
      <div className="flex flex-col h-full overflow-y-auto">
        {activeTab === "preview" ? (
          <div className="flex flex-col items-center justify-center h-full w-full overflow-hidden">
            {isEmpty === false && props.htmlPreview ? (
              <Preview
                htmlPreview={props.htmlPreview}
                bgColor={previewBgColor}
                setBgColor={setPreviewBgColor}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <p>暂无预览</p>
              </div>
            )}
          </div>
        ) : activeTab === "code" ? (
          <div className="flex flex-col items-center px-4 py-2 gap-2 dark:bg-transparent">
            {warnings.length > 0 && <WarningsPanel warnings={warnings} />}

            <CodePanel
              code={props.code}
              selectedFramework={props.selectedFramework}
              setSelectedFramework={props.setSelectedFramework}
              preferenceOptions={preferenceOptions}
              selectPreferenceOptions={selectPreferenceOptions}
              settings={props.settings}
              onPreferenceChanged={props.onPreferenceChanged}
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-muted-foreground">
            <p>关于页面暂未实现</p>
          </div>
        )}
      </div>
    </div>
  );
};
