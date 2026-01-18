import { useEffect, useState, useRef } from "react";
import { PluginUI } from "plugin-ui";
import {
  Framework,
  PluginSettings,
  ConversionMessage,
  Message,
  HTMLPreview,
  ErrorMessage,
  SettingsChangedMessage,
  Warning,
} from "types";
import { postUISettingsChangingMessage } from "./messaging";
import copy from "copy-to-clipboard";

interface AppState {
  code: string;
  selectedFramework: Framework;
  isLoading: boolean;
  htmlPreview: HTMLPreview;
  settings: PluginSettings | null;
  warnings: Warning[];
}

const emptyPreview = { size: { width: 0, height: 0 }, content: "" };

export default function App() {
  const [state, setState] = useState<AppState>({
    code: "",
    selectedFramework: "Tailwind",
    isLoading: false,
    htmlPreview: emptyPreview,
    settings: null,
    warnings: [],
  });

  const copyResolver = useRef<((code: string) => void) | null>(null);

  const rootStyles = getComputedStyle(document.documentElement);
  const figmaColorBgValue = rootStyles
    .getPropertyValue("--figma-color-bg")
    .trim();

  useEffect(() => {
    window.onmessage = (event: MessageEvent) => {
      const pluginMessage = (event.data as any)?.pluginMessage as
        | Message
        | undefined;
      if (!pluginMessage || typeof (pluginMessage as any).type !== "string") {
        return;
      }

      console.log("[ui] message received:", pluginMessage);

      switch (pluginMessage.type) {
        case "conversionStart":
          setState((prevState) => ({
            ...prevState,
            code: "",
            isLoading: true,
          }));
          break;

        case "code":
          const conversionMessage = pluginMessage as ConversionMessage;
          
          if (conversionMessage.triggerType === "copy" && copyResolver.current) {
            copyResolver.current(conversionMessage.code);
            copyResolver.current = null;
            // 重要修复：复制完成后必须重置 loading 状态
            setState((prevState) => ({
              ...prevState,
              isLoading: false,
            }));
          } else {
             // Normal selection update or other updates
             setState((prevState) => ({
              ...prevState,
              ...conversionMessage,
              selectedFramework: conversionMessage.settings.framework,
              isLoading: false,
            }));
          }
          break;

        case "pluginSettingChanged":
          const settingsMessage = pluginMessage as SettingsChangedMessage;
          setState((prevState) => ({
            ...prevState,
            settings: settingsMessage.settings,
            selectedFramework: settingsMessage.settings.framework,
          }));
          break;

        case "empty":
          // const emptyMessage = untypedMessage as EmptyMessage;
          setState((prevState) => ({
            ...prevState,
            code: "",
            htmlPreview: emptyPreview,
            warnings: [],
            isLoading: false,
          }));
          break;

        case "error":
          const errorMessage = pluginMessage as ErrorMessage;
          // 如果有正在进行的复制请求，需要结束 loading
          if (copyResolver.current) {
            // 可以 resolve 一个空字符串或者抛出错误，取决于 CopyButton 如何处理
            // 这里我们 resolve 空字符串，并在 UI 上显示错误
            copyResolver.current("");
            copyResolver.current = null;
          }

          setState((prevState) => ({
            ...prevState,
            code: `Error :(\n// ${errorMessage.error}`,
            isLoading: false,
          }));
          break;

        case "selection-json":
          const json = (pluginMessage as any).data;
          copy(JSON.stringify(json, null, 2));
          break;

        case "conversion-complete":
          // 有些情况下可能会发送 conversion-complete 但 success=false
          const completeMsg = pluginMessage as any;
          if (!completeMsg.success) {
            if (copyResolver.current) {
              copyResolver.current("");
              copyResolver.current = null;
            }
            setState((prevState) => ({
              ...prevState,
              isLoading: false,
            }));
          }
          break;
      }
    };

    return () => {
      window.onmessage = null;
    };
  }, []);

  const handleFrameworkChange = (updatedFramework: Framework) => {
    if (updatedFramework !== state.selectedFramework) {
      setState((prevState) => ({
        ...prevState,
        // code: "// Loading...",
        selectedFramework: updatedFramework,
      }));
      postUISettingsChangingMessage("framework", updatedFramework, {
        targetOrigin: "*",
      });
    }
  };
  const handlePreferencesChange = (
    key: keyof PluginSettings,
    value: boolean | string | number | Record<string, string[]>,
  ) => {
    if (state.settings && state.settings[key] === value) {
      // do nothing
    } else {
      postUISettingsChangingMessage(key, value, { targetOrigin: "*" });
    }
  };

  const handleCopyCodeRequest = async (): Promise<string> => {
    return new Promise((resolve) => {
      copyResolver.current = resolve;
      // Send message to plugin backend to request code for copy (force upload)
      parent.postMessage(
        {
          pluginMessage: {
            type: "copy-code-request",
          },
        },
        "*"
      );
    });
  };

  const darkMode = figmaColorBgValue !== "#ffffff";

  return (
    <div className={`${darkMode ? "dark" : ""}`}>
      <PluginUI
        isLoading={state.isLoading}
        code={state.code}
        warnings={state.warnings}
        selectedFramework={state.selectedFramework}
        setSelectedFramework={handleFrameworkChange}
        onPreferenceChanged={handlePreferencesChange}
        htmlPreview={state.htmlPreview}
        settings={state.settings}
        onCopyRequest={handleCopyCodeRequest}
      />
    </div>
  );
}
