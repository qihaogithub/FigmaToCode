import { PluginSettings } from "types";
import FormField from "./CustomPrefixInput"; // Still importing from the same file

interface TailwindSettingsProps {
  settings: PluginSettings | null;
  onPreferenceChanged: (
    key: keyof PluginSettings,
    value: boolean | string | number | Record<string, string[]>,
  ) => void;
}

export const TailwindSettings: React.FC<TailwindSettingsProps> = ({
  settings,
  onPreferenceChanged,
}) => {
  if (!settings) return null;

  const handleCustomPrefixChange = (newValue: string) => {
    onPreferenceChanged("customTailwindPrefix", newValue);
  };
  const handleBaseFontSizeChange = (value: number) => {
    onPreferenceChanged("baseFontSize", value);
  };
  const handleThresholdPercentChange = (value: number) => {
    onPreferenceChanged("thresholdPercent", value);
  };
  const handleBaseFontFamilyChange = (newValue: string) => {
    onPreferenceChanged("baseFontFamily", newValue);
  };
  const handleFontFamilyCustomConfigChange = (newValue: string) => {
  try {
    // Check if the string is empty, use default empty object
    if (!newValue.trim()) {
      onPreferenceChanged("fontFamilyCustomConfig", {});
      return;
    }

    // parse the JSON
    const config = JSON.parse(newValue);

    onPreferenceChanged("fontFamilyCustomConfig", config);
  } catch (error) {
    // Handle parsing errors
    console.error("Invalid JSON configuration:", error);
  }
};

  return (
    <div className="mt-2">
      <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1">
        高级设置
      </p>

      {/* Advanced Settings Section */}
      <div className="ml-2 pl-2 border-l border-neutral-200 dark:border-neutral-700">
        {/* Class name prefix setting */}
        <div className="mb-3">
          <FormField
            label="自定义类前缀"
            initialValue={settings.customTailwindPrefix || ""}
            onValueChange={(d) => {
              handleCustomPrefixChange(d as any);
            }}
            placeholder="例如：tw-"
            helpText="为所有生成的 Tailwind 类添加前缀。有助于避免与现有 CSS 冲突。默认为空。"
            type="text"
            showPreview={true}
          />
          <p className="text-xs text-neutral-500 mt-1">
            为所有 Tailwind 类添加自定义前缀（例如 "tw-"）
          </p>
        </div>

        {/* Base font size setting */}
        <div className="mb-3">
          <FormField
            label="基准字体大小"
            initialValue={settings.baseFontSize || 16}
            onValueChange={(d) => {
              handleBaseFontSizeChange(d as any);
            }}
            placeholder="16"
            suffix="px"
            type="number"
            min={1}
            max={100}
          />
          <p className="text-xs text-neutral-500 mt-1">
            使用此值计算 rem 值（默认：16px）
          </p>
        </div>

        {/* Threshold percent setting */}
        <div className="mb-3">
          <FormField
            label="取整阈值"
            initialValue={settings.thresholdPercent || 15}
            onValueChange={(d) => {
              handleThresholdPercentChange(d as any);
            }}
            placeholder="15"
            suffix="%"
            type="number"
            min={0}
            max={50}
          />
          <p className="text-xs text-neutral-500 mt-1">
            取整时的最大允许差异（默认：15%）
          </p>
        </div>

        {/* Base font family setting */}
        <div className="mb-3">
          <FormField
            label="基准字体系列"
            initialValue={settings.baseFontFamily || ''}
            onValueChange={(d) => {
              handleBaseFontFamilyChange(String(d));
            }}
            placeholder="sans-serif"
            helpText="不会包含在生成类中的字体系列。"
            type="text"
          />
          <p className="text-xs text-neutral-500 mt-1">
            {`具有此字体的元素将不会添加 "font-[<value>]" 类`}
          </p>
        </div>
        <div className="mb-3">
          <FormField
            type="json"
            label="字体系列自定义配置"
            initialValue={settings.fontFamilyCustomConfig ? JSON.stringify(settings.fontFamilyCustomConfig) : ''}
            onValueChange={(d) => {
              handleFontFamilyCustomConfigChange(String(d));
            }}
            placeholder="您的自定义配置"
            helpText="粘贴您的 Tailwind 自定义字体系列配置"
          />
          <p className="text-xs text-neutral-500 mt-1">
            {`这允许覆盖自定义字体处理，例如 "font-comic"`}
            <pre>
              {`{
  "sans":["Arial","verdana"],
  "display":["Times","Roboto"],
  "comic":["Comic Sans MS"]
}`}
            </pre>
          </p>
        </div>
      </div>
    </div>
  );
};
