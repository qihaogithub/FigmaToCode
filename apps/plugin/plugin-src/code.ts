import { tailwindCodeGenTextStyles, tailwindMain } from "backend";
import { run, postSettingsChanged } from "backend";
import { nodesToJSON } from "backend/src/altNodes/jsonNodeConversion";
import { retrieveGenericSolidUIColors } from "backend/src/common/retrieveUI/retrieveColors";
import { PluginSettings, SettingWillChangeMessage } from "types";

let userPluginSettings: PluginSettings;

export const defaultPluginSettings: PluginSettings = {
  framework: "Tailwind",
  showLayerNames: false,
  useOldPluginVersion2025: false,
  responsiveRoot: false,
  roundTailwindValues: true,
  roundTailwindColors: true,
  useColorVariables: true,
  customTailwindPrefix: "",
  embedImages: false,
  embedVectors: false,
  tailwindGenerationMode: "jsx",
  baseFontSize: 16,
  useTailwind4: false,
  thresholdPercent: 15,
  baseFontFamily: "",
  fontFamilyCustomConfig: {},
  // Asset Upload Settings
  enableAssetUpload: false,
  uploadEndpoint: "",
  cacheTTLHours: 24,
  maxConcurrentUploads: 5,
  bitmapStrategy: "upload",
  vectorStrategy: "upload",
};

// A helper type guard to ensure the key belongs to the PluginSettings type
function isKeyOfPluginSettings(key: string): key is keyof PluginSettings {
  return key in defaultPluginSettings;
}

const getUserSettings = async () => {
  console.log("[DEBUG] getUserSettings - Starting to fetch user settings");
  
  let possiblePluginSrcSettings = {};
  try {
    possiblePluginSrcSettings = (await figma.clientStorage.getAsync("userPluginSettings")) ?? {};
  } catch (err) {
    console.error("[DEBUG] getUserSettings - Failed to get clientStorage:", err);
    // 即使失败也继续使用空对象，避免阻塞
  }

  console.log(
    "[DEBUG] getUserSettings - Raw settings from storage:",
    possiblePluginSrcSettings,
  );

  const updatedPluginSrcSettings = {
    ...defaultPluginSettings,
    ...Object.keys(defaultPluginSettings).reduce((validSettings, key) => {
      // 这里的检查逻辑有问题，如果 defaultPluginSettings 中有新字段，而 storage 中没有
      // 且 storage 中的值类型 undefined (不存在)，那么 reduce 不会覆盖 default 值
      // 但是，之前的逻辑是：如果 key 存在于 storage 中 且 类型匹配，才覆盖。
      // 所以默认值应该被保留。
      
      // 让我们仔细检查 isKeyOfPluginSettings(key)
      if (
        isKeyOfPluginSettings(key) &&
        key in possiblePluginSrcSettings &&
        typeof possiblePluginSrcSettings[key] ===
          typeof defaultPluginSettings[key]
      ) {
        validSettings[key] = possiblePluginSrcSettings[key] as any;
      }
      return validSettings;
    }, {} as Partial<PluginSettings>),
  };

  // 配置迁移策略：强制迁移到 Tailwind，并补齐默认值
  if ((updatedPluginSrcSettings as any).framework !== "Tailwind") {
    (updatedPluginSrcSettings as any).framework = "Tailwind";
  }

  // 强制确保 enableAssetUpload 的类型正确 (boolean)
  // 并且如果是 undefined (可能因为某种原因未正确合并)，则使用默认值
  if (updatedPluginSrcSettings.enableAssetUpload === undefined) {
     updatedPluginSrcSettings.enableAssetUpload = defaultPluginSettings.enableAssetUpload;
  }
  
  console.log("[DEBUG] enableAssetUpload value:", (updatedPluginSrcSettings as any).enableAssetUpload);

  userPluginSettings = updatedPluginSrcSettings as PluginSettings;
  console.log("[DEBUG] getUserSettings - Final settings:", userPluginSettings);
  return userPluginSettings;
};

const initSettings = async () => {
  console.log("[DEBUG] initSettings - Initializing plugin settings");
  await getUserSettings();
  postSettingsChanged(userPluginSettings);
  console.log("[DEBUG] initSettings - Calling safeRun with settings");
  safeRun(userPluginSettings, { isPreview: true, triggerType: "init" });
};

// Used to prevent running from happening again.
let isLoading = false;
const safeRun = async (settings: PluginSettings, options: { isPreview?: boolean; triggerType?: string } = {}) => {
  console.log(
    "[DEBUG] safeRun - Called with isLoading =",
    isLoading,
    "selection =",
    figma.currentPage.selection,
  );
  if (isLoading === false) {
    try {
      isLoading = true;
      console.log("[DEBUG] safeRun - Starting run execution");
      await run(settings, options);
      console.log("[DEBUG] safeRun - Run execution completed");
      // hack to make it not immediately set to false when complete. (executes on next frame)
      setTimeout(() => {
        console.log("[DEBUG] safeRun - Resetting isLoading to false");
        isLoading = false;
      }, 1);
    } catch (e) {
      console.log("[DEBUG] safeRun - Error caught in execution");
      isLoading = false; // Make sure to reset the flag on error
      if (e && typeof e === "object" && "message" in e) {
        const error = e as Error;
        console.log("error: ", error.stack);
        figma.ui.postMessage({ type: "error", error: error.message });
      } else {
        // Handle non-standard errors or unknown error types
        const errorMessage = String(e);
        console.log("Unknown error: ", errorMessage);
        figma.ui.postMessage({
          type: "error",
          error: errorMessage || "Unknown error occurred",
        });
      }

      // Send a message to reset the UI state
      figma.ui.postMessage({ type: "conversion-complete", success: false });
    }
  } else {
    console.log(
      "[DEBUG] safeRun - Skipping execution because isLoading =",
      isLoading,
    );
  }
};

const standardMode = async () => {
  console.log("[DEBUG] standardMode - Starting standard mode initialization");
  figma.showUI(__html__, { width: 450, height: 700, themeColors: true });
  await initSettings();

  // Listen for selection changes
  figma.on("selectionchange", async () => {
    console.log(
      "[DEBUG] selectionchange event - New selection:",
      figma.currentPage.selection,
    );
    safeRun(userPluginSettings, { isPreview: true, triggerType: "selection" });

    // New: Sync selection tags to UI
    const selection = figma.currentPage.selection;
    let currentTag = { type: "", id: "", fullTag: "" };
    let aiInstruction = "";
    let isStatic = false;

    if (selection.length === 1) {
      const node = selection[0];
      const name = node.name;

      // Parse Tag
      if (name.startsWith("#slot:")) {
        const parts = name.split(":");
        currentTag = { type: parts[1] || "img", id: parts[2] || "", fullTag: name };
      } else if (name.startsWith("#list:")) {
        const parts = name.split(":");
        currentTag = { type: "list", id: parts[1] || "", fullTag: name };
      } else if (name.startsWith("#canvas:")) {
         const parts = name.split(":");
         currentTag = { type: "canvas", id: parts[1] || "", fullTag: name };
      }

      // Check for static
      if (name.startsWith("#static")) {
        isStatic = true;
      }

      // Check for AI Instruction (look for child #prompt)
      if ("children" in node) {
        const promptNode = (node as ChildrenMixin).children.find(child => child.name === "#prompt" && child.type === "TEXT") as TextNode;
        if (promptNode) {
          aiInstruction = promptNode.characters;
        }
      }
      
      // Also check if self is #prompt
      if (node.name === "#prompt" && node.type === "TEXT") {
          aiInstruction = (node as TextNode).characters;
      }
    }

    figma.ui.postMessage({
      type: "update-selection-tags",
      data: {
        currentTag,
        aiInstruction,
        isStatic
      }
    });
  });

  // Listen for page changes
  figma.loadAllPagesAsync();
  figma.on("documentchange", () => {
    console.log("[DEBUG] documentchange event triggered");
    // Node: This was causing an infinite load when you try to export a background image from a group that contains children.
    // The reason for this is that the code will temporarily hide the children of the group in order to export a clean image
    // then restores the visibility of the children. This constitutes a document change so it's restarting the whole conversion.
    // In order to stop this, we disable safeRun() when doing conversions (while isLoading === true).
    safeRun(userPluginSettings, { isPreview: true, triggerType: "document" });
  });

  figma.ui.onmessage = async (msg) => {
    console.log("[DEBUG] figma.ui.onmessage", msg);

    if (msg.type === "pluginSettingWillChange") {
      const { key, value } = msg as SettingWillChangeMessage<unknown>;
      console.log(`[DEBUG] Setting changed: ${key} = ${value}`);
      (userPluginSettings as any)[key] = value;
      figma.clientStorage.setAsync("userPluginSettings", userPluginSettings);
      safeRun(userPluginSettings, { isPreview: true, triggerType: "setting" });
    } else if (msg.type === "copy-code-request") {
      console.log("[DEBUG] copy-code-request message received");
      safeRun(userPluginSettings, { isPreview: false, triggerType: "copy" });
    } else if (msg.type === "get-selection-json") {
      console.log("[DEBUG] get-selection-json message received");

      const nodes = figma.currentPage.selection;
      if (nodes.length === 0) {
        figma.ui.postMessage({
          type: "selection-json",
          data: { message: "No nodes selected" },
        });
        return;
      }
      const result: {
        json?: SceneNode[];
        oldConversion?: any;
        newConversion?: any;
      } = {};

      try {
        result.json = (await Promise.all(
          nodes.map(
            async (node) =>
              (
                (await node.exportAsync({
                  format: "JSON_REST_V1",
                })) as any
              ).document,
          ),
        )) as SceneNode[];
      } catch (error) {
        console.error("Error exporting JSON:", error);
      }

      try {
        const newNodes = await nodesToJSON(nodes, userPluginSettings);
        const removeParent = (node: any) => {
          if (node.parent) {
            delete node.parent;
          }
          if (node.children) {
            node.children.forEach(removeParent);
          }
        };
        newNodes.forEach(removeParent);
        result.newConversion = newNodes;
      } catch (error) {
        console.error("Error in new conversion:", error);
      }

      const nodeJson = result;

      console.log("[DEBUG] Exported node JSON:", nodeJson);

      // Send the JSON data back to the UI
      figma.ui.postMessage({
        type: "selection-json",
        data: nodeJson,
      });
    } else if (msg.type === "apply-tag") {
      const { tag } = msg as any;
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.notify("Please select a layer first.");
        return;
      }
      for (const node of selection) {
        node.name = tag;
      }
      figma.notify(`Applied tag: ${tag}`);
      // Trigger update
      safeRun(userPluginSettings, { isPreview: true, triggerType: "selection" });
    } else if (msg.type === "add-ai-instruction") {
      await figma.loadFontAsync({ family: "Inter", style: "Regular" });
      const selection = figma.currentPage.selection;
      let parent: BaseNode & ChildrenMixin = figma.currentPage;
      if (selection.length > 0 && "children" in selection[0]) {
        parent = selection[0] as BaseNode & ChildrenMixin;
      }

      const textNode = figma.createText();
      textNode.characters = "在此输入 AI 指令...";
      textNode.name = "#prompt";
      textNode.fills = [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }]; // Red color
      textNode.fontSize = 14;
      textNode.visible = false; // Hidden by default

      if (parent !== figma.currentPage) {
         parent.appendChild(textNode);
         textNode.x = 0;
         textNode.y = 0;
      } else {
         textNode.x = figma.viewport.center.x;
         textNode.y = figma.viewport.center.y;
      }
      figma.currentPage.selection = [textNode];
      figma.notify("Added hidden #prompt layer");
    } else if (msg.type === "update-ai-instruction") {
       const { text } = msg as any;
       await figma.loadFontAsync({ family: "Inter", style: "Regular" });
       const selection = figma.currentPage.selection;
       if (selection.length === 0) return;
       
       const node = selection[0];
       let promptNode: TextNode | null = null;

       if (node.name === "#prompt" && node.type === "TEXT") {
          promptNode = node as TextNode;
       } else if ("children" in node) {
          promptNode = (node as ChildrenMixin).children.find(child => child.name === "#prompt" && child.type === "TEXT") as TextNode | null;
       }

       if (promptNode) {
          promptNode.characters = text;
          figma.notify("Updated AI instruction");
       } else {
          // If trying to update but no prompt node exists, maybe create one? 
          // For now, let's just notify error or ignore. 
          // Better: auto create if parent selected.
          if ("children" in node) {
             const textNode = figma.createText();
             textNode.characters = text;
             textNode.name = "#prompt";
             textNode.fills = [{ type: "SOLID", color: { r: 1, g: 0, b: 0 } }];
             textNode.fontSize = 14;
             textNode.visible = false;
             (node as ChildrenMixin & BaseNode).appendChild(textNode);
             textNode.x = 0;
             textNode.y = 0;
             figma.notify("Created and updated #prompt");
          }
       }
    } else if (msg.type === "toggle-static") {
       const selection = figma.currentPage.selection;
       if (selection.length === 0) {
          figma.notify("Select a layer first");
          return;
       }
       const node = selection[0];
       if (node.name.startsWith("#static")) {
          // Remove #static
          node.name = node.name.replace("#static", "").trim() || "Layer";
          figma.notify("Removed #static tag");
       } else {
          // Add #static
          node.name = `#static ${node.name}`;
          figma.notify("Marked as #static");
       }
       safeRun(userPluginSettings, { isPreview: true, triggerType: "selection" });
    } else if (msg.type === "flatten-layer") {
       // Deprecated legacy handler, keep just in case or redirect
       const selection = figma.currentPage.selection;
       if (selection.length === 0) return;
       // ... existing logic ...
       // But we want to replace it. Let's just remove the old logic block or make it do nothing to avoid confusion.
       // Actually user asked to CHANGE "One click flatten" to "Mark as static".
       // So I will just redirect to toggle-static logic here if called, 
       // but UI will call toggle-static.
    } else if (msg.type === "check-layers") {
       const selection = figma.currentPage.selection;
       let warnings: string[] = [];
       const checkNode = (node: SceneNode) => {
          if (node.type === "GROUP") {
             warnings.push(`Layer "${node.name}" is a Group. Recommend changing to Frame for better layout support.`);
          }
          // Check naming
          if (node.name.startsWith("#")) {
             // Valid tag?
             const validTags = ["#slot", "#list", "#canvas", "#static", "#ignore", "#prompt"];
             const tag = node.name.split(":")[0];
             if (!validTags.includes(tag) && !validTags.some(t => node.name.startsWith(t))) {
                warnings.push(`Unknown tag in layer "${node.name}".`);
             }
          }
          if ("children" in node) {
             for (const child of node.children) {
                checkNode(child as SceneNode);
             }
          }
       };
       for (const node of selection) {
          checkNode(node);
       }
       if (warnings.length > 0) {
          figma.notify(warnings[0] + (warnings.length > 1 ? ` (+${warnings.length - 1} more)` : ""));
          console.warn("Layer Checks:", warnings);
       } else {
          figma.notify("Layer structure looks good!");
       }
    }
  };
};

const codegenMode = async () => {
  console.log("[DEBUG] codegenMode - Starting codegen mode initialization");
  // figma.showUI(__html__, { visible: false });
  await getUserSettings();

  figma.codegen.on(
    "generate",
    async ({ language, node }: CodegenEvent): Promise<CodegenResult[]> => {
      console.log(
        `[DEBUG] codegen.generate - Language: ${language}, Node:`,
        node,
      );

      const convertedSelection = await nodesToJSON([node], userPluginSettings);
      console.log(
        "[DEBUG] codegen.generate - Converted selection:",
        convertedSelection,
      );

      switch (language) {
        case "tailwind":
        case "tailwind_jsx":
          return [
            {
              title: "Code",
              code: await tailwindMain(convertedSelection, {
                ...userPluginSettings,
                tailwindGenerationMode:
                  language === "tailwind_jsx" ? "jsx" : "html",
              }),
              language: "HTML",
            },
            {
              title: "Tailwind Colors",
              code: (await retrieveGenericSolidUIColors("Tailwind"))
                .map((d) => {
                  let str = `${d.hex};`;
                  if (d.colorName !== d.hex) {
                    str += ` // ${d.colorName}`;
                  }
                  if (d.meta) {
                    str += ` (${d.meta})`;
                  }
                  return str;
                })
                .join("\n"),
              language: "JAVASCRIPT",
            },
            {
              title: "Text Styles",
              code: tailwindCodeGenTextStyles(),
              language: "HTML",
            },
          ];
        default:
          break;
      }

      const blocks: CodegenResult[] = [];
      return blocks;
    },
  );
};

switch (figma.mode) {
  case "default":
  case "inspect":
    console.log("[DEBUG] Starting plugin in", figma.mode, "mode");
    standardMode();
    break;
  case "codegen":
    console.log("[DEBUG] Starting plugin in codegen mode");
    codegenMode();
    break;
  default:
    console.log("[DEBUG] Unknown plugin mode:", figma.mode);
    break;
}
