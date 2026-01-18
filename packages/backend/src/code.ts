import {
  addWarning,
  clearWarnings,
  warnings,
} from "./common/commonConversionWarnings";
import { postConversionComplete, postEmptyMessage } from "./messaging";
import { PluginSettings } from "types";
import { convertToCode } from "./common/retrieveUI/convertToCode";
import { generateHTMLPreview } from "./html/htmlMain";
import { oldConvertNodesToAltNodes } from "./altNodes/oldAltConversion";
import {
  getNodeByIdAsyncCalls,
  getNodeByIdAsyncTime,
  getStyledTextSegmentsCalls,
  getStyledTextSegmentsTime,
  nodesToJSON,
  processColorVariablesCalls,
  processColorVariablesTime,
  resetPerformanceCounters,
} from "./altNodes/jsonNodeConversion";

export const run = async (settings: PluginSettings, options: { isPreview?: boolean; triggerType?: string } = {}) => {
  resetPerformanceCounters();
  clearWarnings();

  const { framework, useOldPluginVersion2025 } = settings;
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    postEmptyMessage();
    return;
  }

  // Timing with Date.now() instead of console.time
  const nodeToJSONStart = Date.now();

  let convertedSelection: any;
  if (useOldPluginVersion2025) {
    convertedSelection = oldConvertNodesToAltNodes(selection, null);
    console.log("convertedSelection", convertedSelection);
  } else {
    convertedSelection = await nodesToJSON(selection, settings);
    console.log(`[benchmark] nodesToJSON: ${Date.now() - nodeToJSONStart}ms`);
    console.log("nodeJson", convertedSelection);
    // const removeParentRecursive = (obj: any): any => {
    //   if (Array.isArray(obj)) {
    //     return obj.map(removeParentRecursive);
    //   }
    //   if (obj && typeof obj === 'object') {
    //     const newObj = { ...obj };
    //     delete newObj.parent;
    //     for (const key in newObj) {
    //       newObj[key] = removeParentRecursive(newObj[key]);
    //     }
    //     return newObj;
    //   }
    //   return obj;
    // };
    // console.log("nodeJson without parent refs:", removeParentRecursive(convertedSelection));
  }

  console.log("[debug] convertedSelection", { ...convertedSelection[0] });

  // ignore when nothing was selected
  // If the selection was empty, the converted selection will also be empty.
  if (convertedSelection.length === 0) {
    postEmptyMessage();
    return;
  }

  const convertToCodeStart = Date.now();
  const code = await convertToCode(convertedSelection, settings, options);
  console.log(
    `[benchmark] convertToCode: ${Date.now() - convertToCodeStart}ms`,
  );

  const generatePreviewStart = Date.now();
  // Filter out #prompt nodes for HTML preview to avoid layout issues
  const previewNodes = convertedSelection.filter((node: any) => !node.name.startsWith("#prompt"));
  // Also recursively filter children
  const filterPrompts = (nodes: any[]) => {
     return nodes.map(node => {
         if ("children" in node && Array.isArray(node.children)) {
             return { ...node, children: filterPrompts(node.children.filter((c: any) => !c.name.startsWith("#prompt"))) };
         }
         return node;
     });
  };
  const filteredPreviewNodes = filterPrompts(previewNodes);

  const htmlPreview = await generateHTMLPreview(filteredPreviewNodes, settings);
  console.log(
    `[benchmark] generateHTMLPreview: ${Date.now() - generatePreviewStart}ms`,
  );
  console.log(
    "[DEBUG] htmlPreview content snippet:",
    htmlPreview.content.slice(0, 200),
  );

  console.log(
    `[benchmark] total generation time: ${Date.now() - nodeToJSONStart}ms`,
  );

  // Log performance statistics
  console.log(
    `[benchmark] getNodeByIdAsync: ${getNodeByIdAsyncTime}ms (${getNodeByIdAsyncCalls} calls, avg: ${(getNodeByIdAsyncTime / getNodeByIdAsyncCalls || 1).toFixed(2)}ms)`,
  );
  console.log(
    `[benchmark] getStyledTextSegments: ${getStyledTextSegmentsTime}ms (${getStyledTextSegmentsCalls} calls, avg: ${
      getStyledTextSegmentsCalls > 0
        ? (getStyledTextSegmentsTime / getStyledTextSegmentsCalls).toFixed(2)
        : 0
    }ms)`,
  );
  console.log(
    `[benchmark] processColorVariables: ${processColorVariablesTime}ms (${processColorVariablesCalls} calls, avg: ${
      processColorVariablesCalls > 0
        ? (processColorVariablesTime / processColorVariablesCalls).toFixed(2)
        : 0
    }ms)`,
  );

  const payload = {
    code,
    triggerType: options.triggerType,
    htmlPreview,
    settings,
    warnings: [...warnings],
  };
  console.log("[DEBUG] Sending conversion complete payload keys:", Object.keys(payload));
  // Explicitly verify code content existence
  if (!payload.code) {
      console.error("[DEBUG] Code is empty or undefined in payload!");
  }

  postConversionComplete(payload);
};
