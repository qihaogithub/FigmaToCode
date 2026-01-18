# AI_Demo 生成系统需求规格说明书 (PRD)

| 项目名称     | Design Spec Live Preview (DSLP)                              |
| :----------- | :----------------------------------------------------------- |
| **文档版本** | v4.2 (Optimized)                                             |
| **最后更新** | 2026-01-14                                                   |
| **核心策略** | Canvas 缩放 + OpenCode Agent + 可视化纠错 + 动态 Schema      |
| **技术路径** | Next.js + Modified FigmaToCode + Sandpack + Figma Plugin API |

---

## 1. 业务背景与目标

### 1.1 痛点分析

传统设计交付中，UI 设计规范仅以文档和静态图形式存在。运营设计师在制作具体活动资源时，无法预知资源在真实代码环境（如手机端）下的渲染效果，导致：

1.  **理解偏差**：无法直观感知交互逻辑和动态布局。
2.  **返工率高**：资源上线后发现尺寸或遮挡问题，需重新设计。

### 1.2 系统目标

打造一套**"所见即所得"**的可配置 Demo 生成系统。

1.  **设计侧**：通过 AI 将 Figma 稿自动转换为高保真、可交互的 React Demo。
2.  **运营侧**：提供无需代码的 Web 配置台，支持实时替换素材、调整文案、预览动态效果并导出配置包。
3.  **系统侧：**设计规范 CMS 和活动管理系统可通过接口调用 Demo，实现设计规范的直观展示和活动页面的快速配置。

## 2. 用户角色

| 角色            | 职责描述    | 核心诉求                                                        |
| :-------------- | :---------- | :-------------------------------------------------------------- |
| **UI 设计师**   | Demo 生产者 | 仅需简单标记 Figma 图层，即可生成高还原度 Demo，无需编写代码。  |
| **运营设计师**  | Demo 使用者 | 在 Web 端配置图片/文案/视频，实时预览效果，导出配置包交付上线。 |
| **研发/管理员** | 系统维护者  | 维护通用 SDK 组件库，监控 AI 生成质量，管理活动 Demo 库。       |

## 3. 系统架构概览

### 3.1 核心理念

**"插件产出骨架，AI 注入灵魂，SDK 托底能力"**

- **Figma 插件 (Modified FigmaToCode)**：负责"硬"工作。用户在插件中配置好标记后，导出高还原度的 **Raw JSX Fragment** (仅组件渲染部分，无外壳)。这套代码已经具备了准确的布局（Flex/Grid）和基础组件结构（`<SdkImage>`, `<SdkList>`）。
- **用户 (Human in the Loop)**：作为搬运工和决策者。将 Raw JSX 粘贴至 AI 工作台，并可输入自然语言指令（如"加个倒计时"）或保持默认。
- **AI Agent (Orchestrator)**：作为"工程经理"，拥有多种 **Skills (工具)**。它分析用户输入的代码和指令，自主决策：
  - **Scaffolding (脚手架补全)**：将用户投喂的 JSX 片段包裹进标准的 React 组件模板中，自动补充 import 和 export。
  - 若代码已完善：直接调用 `SchemaExtractor` 工具生成配置，不修改代码。
  - 若有逻辑需求：调用 `CodeRefactorer` 注入交互逻辑。
  - 若需重构：调用 `LayoutTransformer` 优化结构。
- **SDK (Demo SDK)**：提供现成的组件与能力底座，确保代码运行的稳定性。

### 3.2 技术架构图谱

| 层级 | 技术选型 | 职责说明 |
| :--- | :--- | :--- |
| **源头层** | Figma Plugin | **Producer**: 图层清洗、标记、导出 Raw Code (User Copy-Paste) |
| **智能层** | Agent + Skills | **Orchestrator**: 意图识别、工具调度 (Schema提取/逻辑注入/代码清洗) |
| **运行层** | Sandpack (React) | **Runtime**: 浏览器端实时编译、Canvas 缩放预览 |
| **能力层** | Demo SDK | **Library**: 通用组件、配置面板渲染器、资源校验逻辑 |
| **应用层** | Next.js | **Workbench**: AI 工作台、代码投喂入口、预览面板 |

## 4. 核心协议：DSLP (Design Spec Live Protocol)

DSLP 是本系统的核心协议，旨在建立 Figma 设计稿、AI 生成代码与配置面板之间的确定性映射。为了消除 AI 幻觉，我们定义了一套严格的 JSON Schema 规范和图层命名规则。

### 4.1 协议分层

DSLP 协议分为三层：

1.  **Tagging Layer (标记层)**: 定义 Figma 图层的命名规则，作为解析引擎的输入。
2.  **Mapping Layer (映射层)**: 定义 Figma 节点到 SDK 组件的转换逻辑。
3.  **Schema Layer (配置层)**: 定义生成的 `config.schema.json` 结构，驱动配置面板渲染。

### 4.2 Tagging Layer (Figma 命名规范)

为了确保解析引擎能够准确识别组件，我们制定了以下命名规范（支持正则表达式匹配）：

| 标记类型             | 命名规则 (Regex)    | 说明                                             | 示例                                           |
| :------------------- | :------------------ | :----------------------------------------------- | :--------------------------------------------- |
| **插槽 (Slot)**      | `#slot:<type>:<id>` | 标记可替换的资源区域                             | `#slot:img:banner_bg`, `#slot:text:title_main` |
| **容器 (Container)** | `#list:<id>`        | 标记可重复列表容器                               | `#list:product_list`                           |
| **画布 (Canvas)**    | `#canvas:<id>`      | 标记自由布局区域                                 | `#canvas:floating_icons`                       |
| **静态 (Static)**    | `#static`           | 标记不需要解析为代码的复杂装饰组，导出为单张图片 | `#static` (Group/Frame)                        |
| **忽略 (Ignore)**    | `#ignore`           | 标记不需要导出的辅助图层                         | `#ignore`                                      |
| **指令 (Prompt)**    | `#prompt`           | 标记隐藏文本层，作为 AI 提示词                   | `#prompt` (Text Node)                          |

**支持的插槽类型 (`<type>`)**:

- `img`: 图片资源
- `text`: 文本内容
- `video`: 视频资源
- `lottie`: Lottie 动画
- `svga`: SVGA 动画
- `audio`: 音频资源

### 4.3 Mapping Layer (组件映射逻辑)

解析引擎 (Modified FigmaToCode) 将根据 Tagging Layer 的标记，生成对应的 SDK 组件代码。

#### 4.3.1 Slot 映射

- **Figma**: `#slot:img:hero_banner` (Rectangle Node)
- **React Code**:
  ```tsx
  <SdkImage
    id="hero_banner"
    style={{ width: 375, height: 500, objectFit: "cover" }}
    defaultSrc="https://cdn.example.com/assets/hero_banner_hash.png" // 原始设计稿切图
  />
  ```

#### 4.3.2 List 映射

- **Figma**: `#list:goods_grid` (AutoLayout Frame)
  - Child 1: `item_card` (Component Instance)
- **React Code**:
  ```tsx
  <SdkList
    id="goods_grid"
    direction="vertical" // 自动识别 AutoLayout 方向
    gap={12} // 自动识别 ItemSpacing
    renderItem={(item, index) => <ItemCardComponent {...item} key={index} />}
  />
  ```

### 4.4 Schema Layer (数据定义规范)

`config.schema.json` 遵循 JSON Schema Draft-07 标准，专注于数据的类型定义和校验，不再包含复杂的 UI 布局信息。

#### 4.4.1 Schema 结构示例

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "hero_banner": {
      "type": "object",
      "title": "主视觉 Banner",
      "properties": {
        "src": {
          "type": "string",
          "format": "uri",
          "x-ui-validation": {
            "maxSize": 512000,
            "width": 750,
            "height": 1000
          }
        },
        "link": {
          "type": "string",
          "format": "uri",
          "title": "跳转链接"
        }
      }
    },
    "goods_grid": {
      "type": "array",
      "title": "商品列表",
      "items": {
        "$ref": "#/definitions/ItemCard"
      }
    }
  }
}
```

### 4.5 Layout Layer (界面布局规范)

`ui.layout.json` 采用扁平化树结构 (Flat Tree) 描述配置面板的 UI 布局，通过 `scope` 属性与 Schema 中的数据字段进行绑定。

#### 4.5.1 Layout 结构示例

```json
{
  "root": "main_tabs",
  "elements": {
    "main_tabs": {
      "type": "Tabs",
      "children": ["tab_basic", "tab_style"]
    },
    "tab_basic": {
      "type": "TabPane",
      "props": { "title": "基础设置" },
      "children": ["group_banner", "list_goods"]
    },
    "group_banner": {
      "type": "Group",
      "props": { "title": "主视觉设置" },
      "children": ["input_banner_img", "input_banner_link"]
    },
    "input_banner_img": {
      "type": "Control",
      "props": { 
        "scope": "#/properties/hero_banner/properties/src", 
        "label": "Banner 图片",
        "widget": "image-upload"
      }
    },
    "input_banner_link": {
      "type": "Control",
      "props": { 
        "scope": "#/properties/hero_banner/properties/link", 
        "label": "跳转链接" 
      }
    },
    "list_goods": {
      "type": "Control",
      "props": {
        "scope": "#/properties/goods_grid",
        "label": "商品配置"
      }
    },
    "tab_style": {
      "type": "TabPane",
      "props": { "title": "样式微调" },
      "children": []
    }
  }
}
```

#### 4.5.2 核心优势

*   **布局灵活**：支持 Tabs、Collapse、Grid 等复杂布局，打破了 JSON Schema 线性排列的限制。
*   **数据解耦**：UI 结构的调整不影响底层数据模型。
*   **局部更新**：扁平化结构便于 AI 通过 JSON Patch 进行局部修改。

---

## 5. 功能模块一：Figma 插件 (独立子系统)

**注意**：Figma 插件已拆分为独立子项目进行开发，详细需求请见 **[Figma 插件需求规格说明书](./02-Figma插件需求说明书.md)**。

本模块主要作为数据清洗与编译器入口，核心职责包括：

1.  **智能标记 (Tagging)**：提供辅助面板，快速应用 DSLP 协议标记（如 `#slot`, `#list`）。
2.  **资源预处理**：自动处理静态图层 (`#static`) 并上传 CDN。
3.  **Code 导出**：生成符合 DSLP 规范的 Raw React Code。

---

## 6. 功能模块二：AI 工作台 (Web Workbench)

**定位**：代码组装与智能化处理中心，中文界面。

### 6.1 界面布局

- **左侧：代码投喂与交互区**

  - **投喂/输入区 (Input Area)**：
    - **多模态输入框**：底部提供一个综合输入框，支持三种类型的输入：
      1.  **代码 (Paste Code)**：粘贴 Figma 插件导出的 Raw JSX 片段。
      2.  **图片 (Upload Image)**：上传参考图或设计稿截图，辅助 AI 理解。
      3.  **文件 (Upload File)**：上传其他文档或资源。
    - **Prompt Input**：输入自然语言指令（e.g., "给商品列表加个交替变色效果"）。

  - **内容展示区 (Display Area)**：提供 Tab 切换功能：
    - **Tab 1: AI Chat (交互记录)**：展示与 Agent 的对话历史、思考过程 (Thinking) 和工具调用结果。
    - **Tab 2: Final Code (最终代码)**：展示经过 AI 处理补全后的完整 React 组件代码 (包含 import/export)，即右侧预览区实际运行的代码。

- **中间：实时预览区**
  - **Canvas Scaling**：容器强制 `transform: scale()`，模拟不同设备视口，保证设计稿 1:1 显示。
  - **可视化交互**：支持点击预览区元素，自动将对应的代码片段引用到 Chat 中，方便针对性修改。

- **右侧：动态配置面板**
    - **双驱动渲染**：由 `config.schema.json` (数据定义) 和 `ui.layout.json` (布局定义) 共同驱动。
    - **实时联动**：修改表单配置，中间预览区实时更新。

### 6.2 关键交互流程 (Agentic Workflow)

采用了 **"Agent + Skills"** 的架构，由 AI 根据用户意图自主决定处理路径。

1.  **用户动作**：粘贴 Raw Code -> (可选) 输入 Prompt -> 点击"执行"。
2.  **Agent 思考 (Reasoning)**：
    - *User Intent*: 用户想做什么？（仅预览？加逻辑？改样式？）
    - *Code Analysis*: 代码质量如何？（已经是 DSLP 规范？还是纯 HTML？）
3.  **Skill 调度 (Action)**：
    - **路径 A (标准化/预览)**：用户无指令 或 指令为"整理一下"。
      - 调用 `Skill: SchemaExtractor`: 扫描代码中的 `<Sdk*>` 组件和 Props，反向生成 `config.schema.json`。
      - 调用 `Skill: LayoutGenerator`: 基于数据结构生成默认的 `ui.layout.json`，自动对字段进行合理分组（如将样式相关字段放入"样式微调" Tab）。
      - 调用 `Skill: CodeFormatter`: 移除冗余注释，确保引用了正确的 SDK。
    - **路径 B (逻辑注入)**：用户指令 "加倒计时"。
      - 调用 `Skill: ASTReader`: 读取现有组件结构。
      - **Reasoning**: 编写 `useCountdown` Hook，找到对应文本节点绑定数据。
      - 调用 `Skill: CodePatcher`: 仅更新受影响的 AST 节点，保持其他布局不变。
4.  **结果输出**：Web 端接收到更新后的 `App.tsx`、`config.schema.json` 和 `ui.layout.json`，刷新预览。

---

## 7. 功能模块三：SDK 与运行时 (Consumer)

**定位**：提供通用能力的底座，被 AI 生成的代码引用。

### 7.1 通用组件库 (Demo SDK)

- **`<SdkImage />`**：封装了 `object-fit`、懒加载、错误占位图。
- **`<SdkVideo />`**：封装了静音自动播放、封面图逻辑。
- **`<SdkList />`**：提供基于 React Beautiful DND 的拖拽排序能力。

### 7.2 资源校验与管理

#### 校验规则

- **图片**：大小、尺寸、格式，由 Demo 制作者在 Schema 中指定
- **视频**：大小、格式、时长限制，由 Demo 制作者在 Schema 中指定
- **音频**：大小、格式，由 Demo 制作者在 Schema 中指定

#### 错误提示

- 校验不通过时，抛出 Toast 错误提示，并询问用户是否继续，若继续，则可以继续渲染。
- 提供具体的错误原因和优化建议（如"图片尺寸超出限制，建议压缩至 750px 宽度以内"）

### 7.3 导入导出 (Zip Bundle)

- **导出**：将 `config.json`（配置数据） + `resources/`（本地素材）打包为 ZIP。
- **导入**：解压 ZIP -> 校验版本号与 Schema 匹配度 -> 恢复应用状态。

## 8、系统集成

### 8.1 预览组件调用接口

#### 组件嵌入方式

| 嵌入模式       | 特点                         | 适用场景     |
| :------------- | :--------------------------- | :----------- |
| **Shadow DOM** | 样式隔离，脚本共享，性能优异 | 内部可信代码 |
| **Iframe**     | 完全隔离，安全性高           | 第三方集成   |

#### 组件接口参数

| 参数名           | 类型     | 必填 | 说明                             |
| :--------------- | :------- | :--- | :------------------------------- |
| `demoId`         | string   | 是   | Demo 唯一标识                    |
| `config`         | object   | 是   | 配置数据对象，需符合 Schema 定义 |
| `mode`           | string   | 否   | 预览/编辑模式，默认为 preview    |
| `onConfigChange` | function | 否   | 配置变更回调函数                 |

#### REST API 接口

| 接口             | 方法 | 说明                                           |
| :--------------- | :--- | :--------------------------------------------- |
| `/api/demos/:id` | GET  | 获取 Demo 模板，返回代码、Schema、预览图等信息 |
| `/api/demos`     | GET  | 获取 Demo 列表，返回所有 Demo 的基本信息       |

### 8.2 与设计规范 CMS 的集成

#### 预览组件嵌入规范

- 设计规范 CMS 在文档中以 JSON 格式嵌入预览组件配置
- 配置包含：demoId、默认配置、是否允许覆盖配置等
- 支持资源替换机制：CMS 用户上传资源后，通过接口更新 Demo 配置
- SDK 组件自动校验资源尺寸、格式、大小，校验不通过时显示错误提示

#### 资源校验集成

- 提供 SDK 校验能力，支持自定义校验规则（最大宽度、最大大小、允许格式等）
- 校验结果包含：是否通过、错误信息、优化建议

#### 双向联动

| 交互方式        | 说明                                                         |
| :-------------- | :----------------------------------------------------------- |
| **规范 → Demo** | 点击规范资源卡片 → Demo 对应位置高亮（通过组件方法直接调用） |
| **Demo → 规范** | 点击 Demo 元素 → 规范资源卡片高亮（通过回调函数通知）        |
| **高亮样式**    | 可配置（边框、阴影、颜色等）                                 |

### 8.3 与活动管理系统的集成

#### 集成方式

- 活动管理系统通过设计规范 CMS 间接调用预览组件
- 在页面详情页嵌入预览组件，支持编辑模式
- 运营设计师配置资源后自动校验
- 支持导出配置包（包含 config.json 和 resources/ 目录）

#### 规范驱动配置

- 页面详情页集成预览组件，实时预览资源配置效果
- 自动校验资源是否符合设计规范
- 校验不通过时提供优化建议

### 8.4 Demo 标准化规范

#### Demo 目录结构

```
demo-template/
├── App.tsx              # 主组件代码
├── config.schema.json   # 配置 Schema 定义
├── preview.png          # 预览缩略图
├── metadata.json        # 模板元数据
└── resources/           # 默认资源目录（可选）
    ├── images/          # 默认图片
    └── icons/           # 默认图标
```

#### metadata.json 规范

| 字段           | 类型   | 说明                                      |
| :------------- | :----- | :---------------------------------------- |
| `id`           | string | 模板唯一标识                              |
| `name`         | string | 模板名称                                  |
| `category`     | string | 模板分类（如"活动页面"、"组件库"等）      |
| `version`      | string | 版本号，遵循语义化版本规范（SemVer）      |
| `author`       | string | 作者信息                                  |
| `createdAt`    | string | 创建时间                                  |
| `description`  | string | 模板描述                                  |
| `tags`         | array  | 标签数组，便于检索                        |
| `dependencies` | object | 依赖列表（如 `@scope/demo-sdk` 版本要求） |

#### config.schema.json 规范

- 遵循 JSON Schema Draft-07 规范
- 定义所有可配置项的类型、描述、默认值
- 每个字段包含：
  - `type`：数据类型（string、number、object、array 等）
  - `description`：字段描述
  - `widget`：表单控件类型（image-upload、text-input、color-picker 等）
  - `validation`：校验规则（maxLength、maxWidth、maxSize、formats 等）
  - `default`：默认值（可选）

### 8.5 版本管理与兼容性

#### Demo 版本控制

- 每个 Demo 支持多版本管理（如 v1.0、v1.1、v2.0）
- 版本号遵循语义化版本规范（主版本.次版本.修订版本）

#### 兼容性处理

- 旧版配置包导入新版 Demo 时需进行字段兼容性检查
- 提供版本迁移工具，自动转换旧配置格式
- 不兼容的配置项需提示用户手动调整

---

## 9. 业务规则逻辑

### 9.1 Demo 管理

- **Demo 入库**：设计师在工作台确认效果无误后，点击"发布 Demo"，生成 Demo 快照存入活动库。
- **版本控制**：支持同一 Demo 的多个版本（v1.0, v1.1），旧版配置包导入新版 Demo 时需进行字段兼容性检查。

### 9.2 Demo 展示

- 宫格展示所有 Demo，支持搜索、筛选，点击进入 Demo 详情页

### 9.3 Demo 详情页

- **页面布局**：左侧 Demo 实时预览区，右侧配置面板

* **资源校验**：用户上传资源，自动校验格式、尺寸、大小等

* **资源导入导出**：资源包包含 config.json（配置面板配置） 和 resources/ （用户上传资源）目录，生成 ZIP 资源包。

### 9.3 异常处理

| 异常场景       | 系统行为                                                               |
| :------------- | :--------------------------------------------------------------------- |
| **Token 超限** | AI 提示"组件过于复杂"，建议拆分为多个子组件或使用 `#static` 合并图层。 |
| **解析失败**   | FigmaToCode 无法识别的布局回退为 Absolute 定位，并标记警告。           |
| **运行时崩溃** | Sandpack 捕获 Error Boundary，显示错误堆栈，允许用户"撤销"上一步操作。 |

---

## 10. 技术实施关键点

### 10.1 FigmaToCode 引擎改造

原版引擎直接输出 HTML/Tailwind。我们需要改造其 Pipeline：

1.  **拦截器**：在生成 AST 阶段，拦截命名匹配 `/#slot:(.*)/` 的节点。
2.  **解析器**：解析 Tag 中的类型（img/text/video）和 ID。
3.  **替换器**：将该节点替换为对应的 `<SdkComponent />` (如 `<SdkImage />`, `<SdkText />`)，并注入 `id` 和 `data-figma-id`。
4.  **属性保留**：将 Figma 的 Width/Height/Fill 转换为 Props 传递给 SDK 组件，作为默认样式。

*(详细技术实现已迁移至 [Figma 插件需求规格说明书](./02-Figma插件需求说明书.md))*

### 10.2 AI System Prompt 策略
 
 Context:
 You are an intelligent agent responsible for transforming raw React JSX fragments (exported from Figma) into a fully functional, configurable Demo Component.
 
 Workflow:
 1. ANALYZE the User's Request and the Input Content (Code/Image/File).
 2. SCAFFOLDING (If input is raw JSX):
    - Wrap the JSX fragment in a standard React Functional Component structure.
    - Add necessary imports: `import React from 'react';` and `import { SdkImage, SdkList, ... } from '@demo-sdk/components';`.
    - Ensure `export default function App() { ... }`.
 3. DECIDE which strategy to use:
    - Strategy A (Optimization): If user says nothing or just "optimize", USE `extract_schema` AND `format_dslp`.
    - Strategy B (Modification): If user asks for logic (e.g., "add countdown"), REASON about the implementation, then output the modified code directly (or use injection tools).
    
 Rules:
 - TRUST the layout structure provided in the Input Code. Do not rewrite CSS unless explicitly asked.
 - ALWAYS ensure the `config.schema.json` matches the Props used in the code.
 - IF the Input Code already contains <SdkImage>, <SdkList>, etc., PRESERVE them.
 ```

### 10.3 局部更新机制 (In-place Refactoring)

为了避免 AI 每次重写整个文件导致 Token 消耗大且闪烁：

1.  前端通过 `data-figma-id` 锁定待修改的 DOM 节点。
2.  在 AST 中提取该节点的子树代码。
3.  仅将该子树代码 + 用户 Prompt 发送给 AI。
4.  接收 AI 返回的新代码，进行 AST 节点替换，重新生成源码。

---

## 13. 非功能需求

1.  **性能**：预览区渲染延迟 < 1s；配置面板输入防抖延迟 < 100ms。
2.  **兼容性**：生成的 Demo 需适配 iOS/Android Webview 内核。
3.  **安全性**：
    - Sandpack 运行在 iframe 沙箱中，禁止访问父级 Cookie/LocalStorage。
    - 上传资源需经过后端病毒扫描。

---

## 14. 交付物清单

1.  **Figma 插件安装包** (`.wgt` / 商店链接)
2.  **DSLP 协议规范文档** (PDF)
3.  **Web 工作台源码** (Next.js Repo)
4.  **Demo SDK NPM 包** (`@scope/demo-sdk`)
5.  **测试报告** (包含 Figma 复杂布局还原度测试、AI 生成可用性测试)
6.  **API 接口文档** (Swagger/OpenAPI 规范，包含所有接口定义、参数说明、响应格式)
7.  **集成指南** (面向设计规范 CMS 和活动管理系统的集成文档，包含快速开始、配置说明、常见问题)
8.  **组件使用手册** (预览组件的详细使用说明和示例，包含所有参数、方法、事件)

---

### 修改说明总结：

1.  **结构修正**：原第 8 章内容错乱，现已拆分为"7. SDK 与运行时"和"8. 业务规则逻辑"，逻辑更加清晰。
2.  **技术闭环**：补充了 Schema 生成机制，解释了配置面板的来源，解决了"AI 如何让面板动起来"的技术盲点。
3.  **角色清晰化**：移除了 AI 作为用户的设定，改为后台处理单元。
4.  **术语统一**：统一使用 "DSLP" 指代协议，"Workbench" 指代工作台。
