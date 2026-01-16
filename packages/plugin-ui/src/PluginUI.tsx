import copy from "copy-to-clipboard";
import Preview from "./components/Preview";
import GradientsPanel from "./components/GradientsPanel";
import ColorsPanel from "./components/ColorsPanel";
import CodePanel from "./components/CodePanel";
import WarningsPanel from "./components/WarningsPanel";
import {
  Framework,
  HTMLPreview,
  LinearGradientConversion,
  PluginSettings,
  SolidColorConversion,
  Warning,
} from "types";
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
  colors: SolidColorConversion[];
  gradients: LinearGradientConversion[];
  isLoading: boolean;
};

export const PluginUI = (props: PluginUIProps) => {
  const [activeTab, setActiveTab] = useState<"preview" | "code" | "about">(
    "preview",
  );

  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewViewMode, setPreviewViewMode] = useState<
    "desktop" | "mobile" | "precision"
  >("precision");
  const [previewBgColor, setPreviewBgColor] = useState<"white" | "black">(
    "white",
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
            Preview
          </button>
          <button
            className={`flex-1 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
              activeTab === "code"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
            }`}
            onClick={() => setActiveTab("code")}
          >
            Code
          </button>
          <button
            className={`w-8 h-8 flex items-center justify-center rounded-md text-sm font-medium ${
              activeTab === "about"
                ? "bg-primary text-primary-foreground shadow-xs"
                : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
            }`}
            onClick={() => setActiveTab("about")}
            aria-label="About"
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
          <div className="flex flex-col items-center justify-center px-4 py-2 gap-2 dark:bg-transparent h-full">
            {isEmpty === false && props.htmlPreview ? (
              <Preview
                htmlPreview={props.htmlPreview}
                expanded={previewExpanded}
                setExpanded={setPreviewExpanded}
                viewMode={previewViewMode}
                setViewMode={setPreviewViewMode}
                bgColor={previewBgColor}
                setBgColor={setPreviewBgColor}
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <p>No preview available</p>
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

            {props.colors.length > 0 && (
              <ColorsPanel
                colors={props.colors}
                onColorClick={(value) => {
                  copy(value);
                }}
              />
            )}

            {props.gradients.length > 0 && (
              <GradientsPanel
                gradients={props.gradients}
                onColorClick={(value) => {
                  copy(value);
                }}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center px-4 py-8 text-center text-muted-foreground">
            <p>About 页面暂未实现</p>
          </div>
        )}
      </div>
    </div>
  );
};
