import {
  Framework,
  LocalCodegenPreferenceOptions,
  PluginSettings,
  SelectPreferenceOptions,
} from "types";
import { useMemo, useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { coldarkDark as theme } from "react-syntax-highlighter/dist/esm/styles/prism";
import { CopyButton } from "./CopyButton";
import EmptyState from "./EmptyState";
import SettingsGroup from "./SettingsGroup";
import { TailwindSettings } from "./TailwindSettings";

interface CodePanelProps {
  code: string;
  selectedFramework: Framework;
  setSelectedFramework: (framework: Framework) => void;
  settings: PluginSettings | null;
  preferenceOptions: LocalCodegenPreferenceOptions[];
  selectPreferenceOptions: SelectPreferenceOptions[];
  onPreferenceChanged: (
    _key: keyof PluginSettings,
    _value: boolean | string | number | Record<string, string[]>,
  ) => void;
}

const frameworks: Framework[] = ["Tailwind"];

const CodePanel = (props: CodePanelProps) => {
  const [syntaxHovered, setSyntaxHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const initialLinesToShow = 25;
  const {
    code,
    preferenceOptions,
    selectPreferenceOptions,
    selectedFramework,
    settings,
    onPreferenceChanged,
  } = props;
  const isCodeEmpty = code === "";

  // Helper function to add the prefix before every class (or className) in the code.
  // It finds every occurrence of class="..." or className="..." and, for each class,
  // prepends the custom prefix.
  const applyPrefixToClasses = (
    codeString: string,
    prefix: string | undefined,
  ) => {
    if (!prefix) {
      return codeString;
    }

    return codeString.replace(
      /(class(?:Name)?)="([^"]*)"/g,
      (match, attr, classes) => {
        const prefixedClasses = classes
          .split(/\s+/)
          .filter(Boolean)
          .map((cls: string) => prefix + cls)
          .join(" ");
        return `${attr}="${prefixedClasses}"`;
      },
    );
  };

  // Function to truncate code to a specific number of lines
  const truncateCode = (codeString: string, lines: number) => {
    const codeLines = codeString.split("\n");
    if (codeLines.length <= lines) {
      return codeString;
    }
    return codeLines.slice(0, lines).join("\n") + "\n...";
  };

  // If the selected framework is Tailwind and a prefix is provided then transform the code.
  const prefixedCode =
    selectedFramework === "Tailwind" &&
    settings?.customTailwindPrefix?.trim() !== ""
      ? applyPrefixToClasses(code, settings?.customTailwindPrefix)
      : code;

  // Memoize the line count calculation to improve performance for large code blocks
  const lineCount = useMemo(
    () => prefixedCode.split("\n").length,
    [prefixedCode],
  );

  // Determine if code should be truncated
  const shouldTruncate = !isExpanded && lineCount > initialLinesToShow;
  const displayedCode = shouldTruncate
    ? truncateCode(prefixedCode, initialLinesToShow)
    : prefixedCode;
  const showMoreButton = lineCount > initialLinesToShow;

  const handleButtonHover = () => setSyntaxHovered(true);
  const handleButtonLeave = () => setSyntaxHovered(false);

  // Memoized preference groups for better performance
  const {
    essentialPreferences,
    stylingPreferences,
    selectableSettingsFiltered,
  } = useMemo(() => {
    // Get preferences for the current framework
    const frameworkPreferences = preferenceOptions.filter((preference) =>
      preference.includedLanguages?.includes(selectedFramework),
    );

    // Define preference grouping based on property names
    const essentialPropertyNames = ["jsx"];
    const stylingPropertyNames = [
      "useTailwind4",
      "roundTailwindValues",
      "roundTailwindColors",
      "useColorVariables",
      "showLayerNames",
      "embedImages",
      "embedVectors",
    ];

    // Group preferences by category
    return {
      essentialPreferences: frameworkPreferences.filter((p) =>
        essentialPropertyNames.includes(p.propertyName),
      ),
      stylingPreferences: frameworkPreferences.filter((p) =>
        stylingPropertyNames.includes(p.propertyName),
      ),
      selectableSettingsFiltered: selectPreferenceOptions.filter((p) =>
        p.includedLanguages?.includes(selectedFramework),
      ),
    };
  }, [preferenceOptions, selectPreferenceOptions, selectedFramework]);

  return (
    <div className="w-full flex flex-col gap-2 mt-2">
      {/* Framework selector removed as requested */}

      {!isCodeEmpty && (
        <div className="flex flex-col p-3 bg-card border rounded-lg text-sm">
          {/* Essential settings always shown */}
          <SettingsGroup
            title=""
            settings={essentialPreferences}
            alwaysExpanded={true}
            selectedSettings={settings}
            onPreferenceChanged={onPreferenceChanged}
          />

          {/* Framework-specific options */}
          {selectableSettingsFiltered.length > 0 && (
            <div className="mt-1 mb-2 last:mb-0">
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
                {selectedFramework} 选项
              </p>
              {selectableSettingsFiltered.map((preference) => {
                const isModeSelector =
                  preference.propertyName === "tailwindGenerationMode";

                const buttons = (
                  <div
                    className={`flex gap-1 bg-muted dark:bg-card rounded-lg p-1 ${
                      isModeSelector ? "flex-1" : ""
                    }`}
                  >
                    {preference.options.map((option) => (
                      <button
                        key={option.value}
                        className={`flex-1 h-8 flex items-center justify-center rounded-md text-sm font-medium transition-colors ${
                          ((settings?.[preference.propertyName] ??
                            preference.options.find((o) => o.isDefault)
                              ?.value ??
                            "") as string) === option.value
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted hover:bg-primary/90 hover:text-primary-foreground"
                        }`}
                        onClick={() => {
                          onPreferenceChanged(
                            preference.propertyName,
                            option.value,
                          );
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                );

                if (isModeSelector) {
                  return (
                    <div
                      key={preference.propertyName}
                      className="flex items-center justify-between w-full gap-1"
                    >
                      {buttons}
                      {!isCodeEmpty && (
                        <CopyButton
                          value={prefixedCode}
                          onMouseEnter={handleButtonHover}
                          onMouseLeave={handleButtonLeave}
                        />
                      )}
                    </div>
                  );
                }

                return <div key={preference.propertyName}>{buttons}</div>;
              })}
            </div>
          )}

          {/* Styling preferences with custom prefix for Tailwind */}
          {(stylingPreferences.length > 0 ||
            selectedFramework === "Tailwind") && (
            <SettingsGroup
              title="样式选项"
              settings={stylingPreferences}
              selectedSettings={settings}
              onPreferenceChanged={onPreferenceChanged}
            >
              {selectedFramework === "Tailwind" && (
                <TailwindSettings
                  settings={settings}
                  onPreferenceChanged={onPreferenceChanged}
                />
              )}
            </SettingsGroup>
          )}
        </div>
      )}

      <div
        className={`rounded-lg ring-green-600 transition-all duration-200 overflow-clip ${
          syntaxHovered ? "ring-2" : "ring-0"
        }`}
      >
        {isCodeEmpty ? (
          <EmptyState />
        ) : (
          <>
            <SyntaxHighlighter
              language={
                settings?.tailwindGenerationMode === "jsx" ? "jsx" : "html"
              }
              style={theme}
              customStyle={{
                fontSize: 12,
                borderRadius: 8,
                marginTop: 0,
                marginBottom: 0,
                backgroundColor: syntaxHovered ? "#1E2B1A" : "#1B1B1B",
                transitionProperty: "all",
                transitionTimingFunction: "ease",
                transitionDuration: "0.2s",
              }}
            >
              {displayedCode}
            </SyntaxHighlighter>
            {showMoreButton && (
              <div className="flex justify-center dark:bg-[#1B1B1B] border-t dark:border-gray-700">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs w-full flex justify-center py-3 text-blue-500 hover:text-blue-400 transition-colors"
                  aria-label="显示更多代码。这可能会很慢或导致 Figma 卡顿几秒钟。"
                  title="显示更多代码。这可能会很慢或导致 Figma 卡顿几秒钟。"
                >
                  {isExpanded ? "收起" : "展开更多"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CodePanel;
