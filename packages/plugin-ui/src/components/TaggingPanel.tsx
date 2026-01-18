import React, { useState, useEffect } from "react";
import { InfoIcon, Layers, FileText, CheckCircle, Zap, Image as ImageIcon } from "lucide-react";

const TaggingPanel = () => {
  const [slotType, setSlotType] = useState("img");
  const [slotId, setSlotId] = useState("");
  const [listId, setListId] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [isStatic, setIsStatic] = useState(false);
  const [currentSelectionName, setCurrentSelectionName] = useState("");

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      if (msg.type === "update-selection-tags") {
        const { currentTag, aiInstruction: promptText, isStatic: staticStatus } = msg.data;
        
        // Reset or fill state
        setAiInstruction(promptText || "");
        setIsStatic(staticStatus);
        setCurrentSelectionName(currentTag.fullTag || "");

        if (currentTag.type === "list") {
           setListId(currentTag.id);
           setSlotId(""); // Clear other
        } else if (["img", "text", "video", "lottie"].includes(currentTag.type)) {
           setSlotType(currentTag.type);
           setSlotId(currentTag.id);
           setListId(""); // Clear other
        } else {
           // Clear inputs if no relevant tag found, but keep them editable for new tags
           setListId("");
           setSlotId("");
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const postMessage = (type: string, payload?: any) => {
    parent.postMessage(
      {
        pluginMessage: {
          type,
          ...payload,
        },
      },
      "*"
    );
  };

  const applyTag = (tag: string) => {
    postMessage("apply-tag", { tag });
  };

  const applySlot = () => {
    if (!slotId) return;
    applyTag(`#slot:${slotType}:${slotId}`);
  };

  const applyList = () => {
    if (!listId) return;
    applyTag(`#list:${listId}`);
  };

  const updateAiInstruction = (text: string) => {
      setAiInstruction(text);
      // Debounce could be good here, but for now direct update
      postMessage("update-ai-instruction", { text });
  };

  const toggleStatic = () => {
      postMessage("toggle-static");
      // Optimistic update
      setIsStatic(!isStatic);
  };

  return (
    <div className="flex flex-col gap-4 p-4 text-sm">
      {/* Smart Tagging Section */}
      <div className="flex flex-col gap-2">
        <h3 className="font-medium flex items-center gap-2">
          <Layers size={16} />
          智能标记 (Smart Tagging)
        </h3>
        
        <div className="p-3 bg-muted/50 rounded-lg flex flex-col gap-3">
          {currentSelectionName && (
              <div className="text-xs text-muted-foreground mb-1">
                  当前标记: <span className="font-mono text-primary">{currentSelectionName}</span>
              </div>
          )}

          {/* Slot Configuration */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground">插槽 (Slot)</label>
            <div className="flex gap-2">
              <select 
                className="h-8 rounded border bg-background px-2 text-xs"
                value={slotType}
                onChange={(e) => setSlotType(e.target.value)}
              >
                <option value="img">Image</option>
                <option value="text">Text</option>
                <option value="video">Video</option>
                <option value="lottie">Lottie</option>
              </select>
              <input
                type="text"
                placeholder="ID (e.g. banner)"
                className="flex-1 h-8 rounded border bg-background px-2 text-xs"
                value={slotId}
                onChange={(e) => setSlotId(e.target.value)}
              />
              <button
                className="h-8 px-3 bg-primary text-primary-foreground rounded text-xs font-medium"
                onClick={applySlot}
              >
                Apply
              </button>
            </div>
          </div>

          {/* List Configuration */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-muted-foreground">列表 (List)</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="List ID (e.g. goods_list)"
                className="flex-1 h-8 rounded border bg-background px-2 text-xs"
                value={listId}
                onChange={(e) => setListId(e.target.value)}
              />
              <button
                className="h-8 px-3 bg-primary text-primary-foreground rounded text-xs font-medium"
                onClick={applyList}
              >
                Apply
              </button>
            </div>
          </div>

          {/* Quick Tags */}
          <div className="flex flex-wrap gap-2 mt-2">
            <button 
              className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
              onClick={() => applyTag("#canvas:default")}
            >
              #canvas
            </button>
            <button 
              className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs"
              onClick={() => applyTag("#ignore")}
            >
              #ignore
            </button>
          </div>
        </div>
      </div>

      {/* AI Instruction Section */}
      <div className="flex flex-col gap-2">
        <h3 className="font-medium flex items-center gap-2">
          <FileText size={16} />
          AI 指令 (AI Instruction)
        </h3>
        <div className="flex flex-col gap-2">
            <textarea
                className="w-full min-h-[80px] p-2 rounded border bg-background text-xs resize-y"
                placeholder="在此输入 AI 指令 (例如: 这里的文字需要加一个倒计时逻辑...)"
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                onBlur={(e) => updateAiInstruction(e.target.value)} 
            />
            <div className="text-[10px] text-muted-foreground">
                * 编辑完成后自动保存，对应图层为隐藏的 #prompt
            </div>
             {!aiInstruction && (
                <button
                className="flex items-center justify-center gap-2 h-8 w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-md text-xs transition-colors"
                onClick={() => updateAiInstruction("在此输入 AI 指令...")}
                >
                <span>+ 创建 AI 指令层</span>
                </button>
             )}
        </div>
      </div>

      {/* Layer Preprocessing Section */}
      <div className="flex flex-col gap-2">
        <h3 className="font-medium flex items-center gap-2">
          <Zap size={16} />
          预处理 (Preprocessing)
        </h3>
        <button
          className={`flex items-center justify-center gap-2 h-9 w-full rounded-md text-xs transition-colors border ${
              isStatic 
                ? "bg-primary text-primary-foreground border-primary" 
                : "bg-background text-foreground border-input hover:bg-accent"
          }`}
          onClick={toggleStatic}
        >
          <ImageIcon size={14} />
          <span>{isStatic ? "已设为切图 (#static) - 点击取消" : "设为切图 (#static)"}</span>
        </button>
        <div className="text-[10px] text-muted-foreground px-1">
            * 标记为切图后，导出代码时将自动转为 &lt;img&gt; 标签，原图层结构保持不变。
        </div>
      </div>

      {/* Health Check Section */}
      <div className="flex flex-col gap-2">
        <h3 className="font-medium flex items-center gap-2">
          <CheckCircle size={16} />
          健康度检查 (Health Check)
        </h3>
        <button
          className="flex items-center justify-center gap-2 h-9 w-full border border-input hover:bg-accent hover:text-accent-foreground rounded-md text-xs transition-colors"
          onClick={() => postMessage("check-layers")}
        >
          <span>检查图层规范</span>
        </button>
      </div>
    </div>
  );
};

export default TaggingPanel;
