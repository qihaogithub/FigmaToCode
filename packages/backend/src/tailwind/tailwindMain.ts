import { retrieveTopFill } from "../common/retrieveFill";
import { indentString } from "../common/indentString";
import { addWarning } from "../common/commonConversionWarnings";
import { getVisibleNodes } from "../common/nodeVisibility";
import { getPlaceholderImage, exportNodeAsBase64PNG } from "../common/images";
import { TailwindTextBuilder } from "./tailwindTextBuilder";
import { TailwindDefaultBuilder } from "./tailwindDefaultBuilder";
import { tailwindAutoLayoutProps } from "./builderImpl/tailwindAutoLayout";
import { renderAndAttachSVG } from "../altNodes/altNodeUtils";
import { AltNode, PluginSettings, TailwindSettings } from "types";

export let localTailwindSettings: PluginSettings;
let previousExecutionCache: {
  style: string;
  text: string;
  openTypeFeatures: Record<string, boolean>;
}[] = [];
const SELF_CLOSING_TAGS = ["img"];

export const tailwindMain = async (
  sceneNode: Array<SceneNode>,
  settings: PluginSettings,
  options?: { isPreview?: boolean },
): Promise<string> => {
  localTailwindSettings = settings;
  previousExecutionCache = [];

  let result = await tailwindWidgetGenerator(sceneNode, settings, options);

  // Remove the initial newline that is made in Container
  if (result.startsWith("\n")) {
    result = result.slice(1);
  }

  return result;
};

const tailwindWidgetGenerator = async (
  sceneNode: ReadonlyArray<SceneNode>,
  settings: TailwindSettings,
  options?: { isPreview?: boolean },
): Promise<string> => {
  const visibleNodes = getVisibleNodes(sceneNode);
  const promiseOfConvertedCode = visibleNodes.map(
    convertNode(settings, options),
  );
  const code = (await Promise.all(promiseOfConvertedCode)).join("");
  return code;
};

const convertNode =
  (settings: TailwindSettings, options?: { isPreview?: boolean }) =>
  async (node: SceneNode): Promise<string> => {
    if (settings.embedVectors && (node as any).canBeFlattened) {
      const altNode = await renderAndAttachSVG(node);
      if (altNode.svg) {
        return tailwindWrapSVG(altNode, settings);
      }
    }

    switch (node.type) {
      case "RECTANGLE":
      case "ELLIPSE":
        return tailwindContainer(node, "", "", settings, options);
      case "GROUP":
        return tailwindGroup(node, settings, options);
      case "FRAME":
      case "COMPONENT":
      case "INSTANCE":
      case "COMPONENT_SET":
        return tailwindFrame(node, settings, options);
      case "TEXT":
        return tailwindText(node, settings);
      case "LINE":
        return tailwindLine(node, settings);
      case "SECTION":
        return tailwindSection(node, settings, options);
      case "VECTOR":
        if (!settings.embedVectors) {
          addWarning("不支持矢量图");
        }
        return tailwindContainer(
          { ...node, type: "RECTANGLE" } as any,
          "",
          "",
          settings,
          options,
        );
      default:
        addWarning(`不支持 ${node.type} 类型的节点`);
    }
    return "";
  };

const tailwindWrapSVG = (
  node: AltNode<SceneNode>,
  settings: TailwindSettings,
): string => {
  if (!node.svg) return "";

  const builder = new TailwindDefaultBuilder(node, settings)
    .addData("svg-wrapper")
    .position();

  return `\n<div${builder.build()}>\n${indentString(node.svg ?? "")}</div>`;
};

const tailwindGroup = async (
  node: GroupNode,
  settings: TailwindSettings,
  options?: { isPreview?: boolean },
): Promise<string> => {
  // Ignore the view when size is zero or less or if there are no children
  if (node.width < 0 || node.height <= 0 || node.children.length === 0) {
    return "";
  }

  const builder = new TailwindDefaultBuilder(node, settings)
    .blend()
    .size()
    .position();

  if (builder.attributes || builder.style) {
    const attr = builder.build("");
    const generator = await tailwindWidgetGenerator(
      node.children,
      settings,
      options,
    );
    return `\n<div${attr}>${indentString(generator)}\n</div>`;
  }

  return await tailwindWidgetGenerator(node.children, settings, options);
};

export const tailwindText = (
  node: TextNode,
  settings: TailwindSettings,
): string => {
  const layoutBuilder = new TailwindTextBuilder(node, settings)
    .commonPositionStyles()
    .textAlignHorizontal()
    .textAlignVertical();

  const styledHtml = layoutBuilder.getTextSegments(node);
  previousExecutionCache.push(...styledHtml);

  let content = "";
  if (styledHtml.length === 1) {
    const segment = styledHtml[0];
    layoutBuilder.addAttributes(segment.style);

    const getFeatureTag = (features: Record<string, boolean>): string => {
      if (features.SUBS === true) return "sub";
      if (features.SUPS === true) return "sup";
      return "";
    };

    const additionalTag = getFeatureTag(segment.openTypeFeatures);
    content = additionalTag
      ? `<${additionalTag}>${segment.text}</${additionalTag}>`
      : segment.text;
  } else {
    content = styledHtml
      .map((style) => {
        const tag =
          style.openTypeFeatures.SUBS === true
            ? "sub"
            : style.openTypeFeatures.SUPS === true
              ? "sup"
              : "span";

        return `<${tag} class="${style.style}">${style.text}</${tag}>`;
      })
      .join("");
  }

  return `\n<div${layoutBuilder.build()}>${content}</div>`;
};

const tailwindFrame = async (
  node: FrameNode | InstanceNode | ComponentNode | ComponentSetNode,
  settings: TailwindSettings,
  options?: { isPreview?: boolean },
): Promise<string> => {
  const childrenStr = await tailwindWidgetGenerator(
    node.children,
    settings,
    options,
  );

  const clipsContentClass =
    node.clipsContent && "children" in node && node.children.length > 0
      ? "overflow-hidden"
      : "";
  let layoutProps = "";

  if (node.layoutMode !== "NONE") {
    layoutProps = tailwindAutoLayoutProps(node, node);
  }

  // Combine classes properly, ensuring no extra spaces
  const combinedProps = [layoutProps, clipsContentClass]
    .filter(Boolean)
    .join(" ");

  return await tailwindContainer(
    node,
    childrenStr,
    combinedProps,
    settings,
    options,
  );
};

export const tailwindContainer = async (
  node: SceneNode &
    SceneNodeMixin &
    BlendMixin &
    LayoutMixin &
    GeometryMixin &
    MinimalBlendMixin,
  children: string,
  additionalAttr: string,
  settings: TailwindSettings,
  options?: { isPreview?: boolean },
): Promise<string> => {
  // Ignore the view when size is zero or less
  if (node.width < 0 || node.height < 0) {
    return children;
  }

  const builder = new TailwindDefaultBuilder(node, settings)
    .commonPositionStyles()
    .commonShapeStyles();

  if (!builder.attributes && !additionalAttr) {
    return children;
  }

  const build = builder.build(additionalAttr);

  // Determine if we should use img tag
  let tag = "div";
  let src = "";
  let inlineStyle = "";
  const topFill = retrieveTopFill(node.fills);

  if (topFill?.type === "IMAGE") {
    if (options?.isPreview) {
      // In preview mode, we want to see the actual image
      const base64 = await exportNodeAsBase64PNG(node as any, true);
      if (base64) {
        if (!("children" in node) || node.children.length === 0) {
          tag = "img";
          src = ` src="${base64}"`;
        } else {
          // Use inline style for background image in preview to avoid massive class names
          // and ensure it works even if Tailwind config doesn't support arbitrary values perfectly
          const styleProp =
            settings.tailwindGenerationMode === "jsx"
              ? `style={{ backgroundImage: 'url(${base64})' }}`
              : `style="background-image: url('${base64}')"`;
          inlineStyle = ` ${styleProp}`;
        }
      }
    } else {
      addWarning("图像填充被占位符替换");
      const imageURL = getPlaceholderImage(node.width, node.height);

      if (!("children" in node) || node.children.length === 0) {
        tag = "img";
        src = ` src="${imageURL}"`;
      } else {
        builder.addAttributes(`bg-[url(${imageURL})]`);
      }
    }
  }

  // Generate appropriate HTML
  if (children) {
    return `\n<${tag}${build}${src}${inlineStyle}>${indentString(children)}\n</${tag}>`;
  } else if (
    SELF_CLOSING_TAGS.includes(tag) ||
    settings.tailwindGenerationMode === "jsx"
  ) {
    return `\n<${tag}${build}${src}${inlineStyle} />`;
  } else {
    return `\n<${tag}${build}${src}${inlineStyle}></${tag}>`;
  }
};

export const tailwindLine = (
  node: LineNode,
  settings: TailwindSettings,
): string => {
  const builder = new TailwindDefaultBuilder(node, settings)
    .commonPositionStyles()
    .commonShapeStyles();

  return `\n<div${builder.build()}></div>`;
};

export const tailwindSection = async (
  node: SectionNode,
  settings: TailwindSettings,
  options?: { isPreview?: boolean },
): Promise<string> => {
  const childrenStr = await tailwindWidgetGenerator(
    node.children,
    settings,
    options,
  );
  const builder = new TailwindDefaultBuilder(node, settings)
    .size()
    .position()
    .customColor(node.fills, "bg");

  const build = builder.build();
  return childrenStr
    ? `\n<div${build}>${indentString(childrenStr)}\n</div>`
    : `\n<div${build}></div>`;
};

export const tailwindCodeGenTextStyles = (): string => {
  if (previousExecutionCache.length === 0) {
    return "// No text styles in this selection";
  }

  return previousExecutionCache
    .map((style) => `// ${style.text}\n${style.style.split(" ").join("\n")}`)
    .join("\n---\n");
};
