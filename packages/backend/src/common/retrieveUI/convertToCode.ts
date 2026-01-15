import { PluginSettings } from "types";
import { tailwindMain } from "../../tailwind/tailwindMain";

export const convertToCode = async (
  nodes: SceneNode[],
  settings: PluginSettings,
) => {
  return await tailwindMain(nodes, settings);
};
