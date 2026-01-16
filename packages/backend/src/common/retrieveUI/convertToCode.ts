import { PluginSettings } from "types";
import { tailwindMain } from "../../tailwind/tailwindMain";
import { htmlMain } from "../../html/htmlMain";

export const convertToCode = async (
  nodes: SceneNode[],
  settings: PluginSettings,
) => {
  if (settings.framework === "HTML") {
    return (await htmlMain(nodes, settings)).html;
  }
  return await tailwindMain(nodes, settings);
};
