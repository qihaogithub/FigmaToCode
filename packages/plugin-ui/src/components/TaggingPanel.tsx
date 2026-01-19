import React, { useState, useEffect } from "react";
import { Layers, FileText, CheckCircle, Image as ImageIcon, Pencil, X, AlertTriangle, ArrowDown, ArrowRight, Layout, Zap } from "lucide-react";

// Modal Component
const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean; onClose: () => void; title: string; children: React.ReactNode }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-[90%] max-w-sm p-4 animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded text-muted-foreground">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// Confirm Dialog Component
const ConfirmDialog = ({ isOpen, onConfirm, onCancel, title, message }: { isOpen: boolean; onConfirm: () => void; onCancel: () => void; title: string; message: string }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-card border border-border rounded-xl shadow-2xl w-[90%] max-w-sm p-4 animate-in zoom-in-95 fade-in duration-200">
        <div className="flex items-start gap-3 mb-4">
          <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground">{message}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted">
            取消
          </button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground">
            确认切换
          </button>
        </div>
      </div>
    </div>
  );
};

type TaggingType = "resource" | "interaction";

const TaggingPanel = () => {
  const [slotType, setSlotType] = useState("img");
  const [slotId, setSlotId] = useState("");
  const [listId, setListId] = useState("");
  const [aiInstruction, setAiInstruction] = useState("");
  const [isStatic, setIsStatic] = useState(false);
  const [currentTagType, setCurrentTagType] = useState("");
  const [autoLayoutMode, setAutoLayoutMode] = useState("NONE");
  const [checkWarnings, setCheckWarnings] = useState<string[]>([]);
  
  // Modal states
  const [showResourceModal, setShowResourceModal] = useState(false);
  const [pendingResourceType, setPendingResourceType] = useState("");
  const [resourceInputValue, setResourceInputValue] = useState("");
  
  // Tab & Confirm states
  const [activeTaggingTab, setActiveTaggingTab] = useState<TaggingType>("resource");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingTabSwitch, setPendingTabSwitch] = useState<TaggingType | null>(null);

  // Determine if resource tag is currently set
  const hasResourceTag = ["img", "text", "video", "lottie", "svga", "unity", "color"].includes(currentTagType);
  const hasInteractionTag = ["list", "canvas"].includes(currentTagType);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const msg = event.data?.pluginMessage;
      if (!msg) return;

      if (msg.type === "update-selection-tags") {
        const { currentTag, aiInstruction: promptText, isStatic: staticStatus, autoLayoutMode: newLayoutMode } = msg.data;
        
        setAiInstruction(promptText || "");
        setIsStatic(staticStatus);
        setCurrentTagType(currentTag.type);
        setAutoLayoutMode(newLayoutMode);

        if (currentTag.type === "list" || currentTag.type === "canvas") {
           setListId(currentTag.id);
           setSlotId("");
           setActiveTaggingTab("interaction");
        } else if (["img", "text", "video", "lottie", "svga", "unity", "color"].includes(currentTag.type)) {
           setSlotType(currentTag.type);
           setSlotId(currentTag.id);
           setListId("");
           setActiveTaggingTab("resource");
        } else {
           setListId("");
           setSlotId("");
        }

        postMessage("check-layers");
      } else if (msg.type === "check-layers-result") {
          setCheckWarnings(msg.data.warnings || []);
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

  const toggleStatic = () => {
      postMessage("toggle-static");
      setIsStatic(!isStatic);
  };

  // Handle tab switch with confirmation
  const handleTabSwitch = (newTab: TaggingType) => {
      if (newTab === activeTaggingTab) return;
      
      // Check if switching away from a set tag
      if ((activeTaggingTab === "resource" && hasResourceTag) || 
          (activeTaggingTab === "interaction" && hasInteractionTag)) {
          setPendingTabSwitch(newTab);
          setShowConfirmDialog(true);
      } else {
          setActiveTaggingTab(newTab);
      }
  };

  const confirmTabSwitch = () => {
      if (pendingTabSwitch) {
          setActiveTaggingTab(pendingTabSwitch);
      }
      setShowConfirmDialog(false);
      setPendingTabSwitch(null);
  };

  const cancelTabSwitch = () => {
      setShowConfirmDialog(false);
      setPendingTabSwitch(null);
  };

  // Resource handling
  const handleResourceClick = (type: string) => {
      setPendingResourceType(type);
      setResourceInputValue(type === slotType ? slotId : "");
      setShowResourceModal(true);
  };

  const confirmResourceInput = () => {
      if (!resourceInputValue) return;
      setSlotType(pendingResourceType);
      setSlotId(resourceInputValue);
      applyTag(`#slot:${pendingResourceType}:${resourceInputValue}`);
      setShowResourceModal(false);
  };

  const handleEditResourceName = () => {
      setPendingResourceType(slotType);
      setResourceInputValue(slotId);
      setShowResourceModal(true);
  };

  // Interaction handling  
  const handleInteractionClick = (type: "vertical" | "horizontal" | "canvas") => {
      if (type === "vertical") {
          const id = listId || "list";
          postMessage("set-layout-mode", { mode: "VERTICAL" });
          applyTag(`#list:${id}`);
      } else if (type === "horizontal") {
          const id = listId || "list";
          postMessage("set-layout-mode", { mode: "HORIZONTAL" });
          applyTag(`#list:${id}`);
      } else if (type === "canvas") {
          const id = "default";
          postMessage("set-layout-mode", { mode: "NONE" });
          applyTag(`#canvas:${id}`);
      }
  };

  const updateAiInstruction = (text: string) => {
      setAiInstruction(text);
      postMessage("update-ai-instruction", { text });
  };

  const resourceTypes = [
      { id: "img", label: "图片" },
      { id: "text", label: "文本" },
      { id: "color", label: "色值" },
      { id: "video", label: "视频" },
      { id: "lottie", label: "Lottie" },
      { id: "svga", label: "Svga" },
      { id: "unity", label: "Unity" },
  ];

  const getResourceLabel = (id: string) => resourceTypes.find(t => t.id === id)?.label || id;

  return (
    <div className="flex flex-col h-full bg-background text-foreground text-sm">
      {/* Top Bar: Set as Slice */}
      <div className="p-4 pb-3">
          <button
            className={`w-full py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-all ${
                isStatic 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
            onClick={toggleStatic}
          >
            <ImageIcon size={18} />
            {isStatic ? "已设为切图 (#static)" : "设为切图 (#static)"}
          </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-5">
        
        {/* Tagging Type Tabs */}
        <div className={`transition-opacity ${isStatic ? "opacity-40 pointer-events-none" : "opacity-100"}`}>
            <div className="flex gap-1 p-1 bg-muted rounded-lg">
                <button
                    className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        activeTaggingTab === "resource"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => handleTabSwitch("resource")}
                >
                    <Layers size={14} /> 资源标记
                </button>
                <button
                    className={`flex-1 py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                        activeTaggingTab === "interaction"
                            ? "bg-background shadow-sm text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => handleTabSwitch("interaction")}
                >
                    <Zap size={14} /> 交互标记
                </button>
            </div>

            {/* Resource Tagging Content */}
            {activeTaggingTab === "resource" && (
                <div className="mt-4 space-y-3">
                    {/* Title with current resource name display */}
                    {hasResourceTag && slotId && (
                        <div className="flex items-center justify-between py-2 px-3 bg-primary/10 rounded-lg border border-primary/20">
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">当前资源：</span>
                                <span className="text-xs font-medium text-primary">{getResourceLabel(slotType)}: {slotId}</span>
                            </div>
                            <button 
                                onClick={handleEditResourceName}
                                className="p-1 hover:bg-primary/20 rounded text-primary"
                                title="编辑资源名称"
                            >
                                <Pencil size={12} />
                            </button>
                        </div>
                    )}
                    
                    <div className="flex flex-wrap gap-2">
                        {resourceTypes.map(type => (
                            <button
                                key={type.id}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                                    slotType === type.id && hasResourceTag
                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                        : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"
                                }`}
                                onClick={() => handleResourceClick(type.id)}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Interaction Tagging Content */}
            {activeTaggingTab === "interaction" && (
                <div className="mt-4 space-y-3">
                    <div className="flex flex-wrap gap-2">
                        <button
                            className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                                currentTagType === "list" && autoLayoutMode === "VERTICAL"
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                            onClick={() => handleInteractionClick("vertical")}
                        >
                            <ArrowDown size={14} /> 纵向列表
                        </button>
                        <button
                            className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                                 currentTagType === "list" && autoLayoutMode === "HORIZONTAL"
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                            onClick={() => handleInteractionClick("horizontal")}
                        >
                            <ArrowRight size={14} /> 横向列表
                        </button>
                        <button
                            className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                                currentTagType === "canvas"
                                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                    : "bg-card border-border hover:border-primary/50 hover:bg-muted/50"
                            }`}
                            onClick={() => handleInteractionClick("canvas")}
                        >
                            <Layout size={14} /> 自由画布
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* AI Instruction */}
        <div className="space-y-2">
             <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground">
                <FileText size={14} />
                添加提示词
            </h3>
            <textarea
                className="w-full min-h-[80px] p-3 rounded-lg border bg-muted/20 text-xs resize-y focus:ring-1 focus:ring-primary outline-none transition-shadow"
                placeholder="在此输入 AI 指令 (随编辑自动更新)..."
                value={aiInstruction}
                onChange={(e) => updateAiInstruction(e.target.value)}
            />
        </div>

        {/* Optimization Suggestions */}
        <div className="space-y-2">
             <div className="flex items-center justify-between">
                <h3 className="text-xs font-semibold flex items-center gap-2 text-muted-foreground">
                    <CheckCircle size={14} />
                    优化建议
                </h3>
                {checkWarnings.length === 0 && (
                     <span className="text-[10px] text-green-500 font-medium flex items-center gap-1">
                         <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Healthy
                     </span>
                )}
            </div>
            
            {checkWarnings.length > 0 ? (
                <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                    <ul className="list-disc list-inside text-xs text-orange-800 dark:text-orange-300 space-y-1">
                        {checkWarnings.map((warn, i) => (
                            <li key={i}>{warn}</li>
                        ))}
                    </ul>
                </div>
            ) : (
                <div className="text-xs text-muted-foreground p-3 border border-dashed rounded-lg text-center">
                    当前选区无优化建议。
                </div>
            )}
        </div>

      </div>

      {/* Resource Name Modal */}
      <Modal 
        isOpen={showResourceModal} 
        onClose={() => setShowResourceModal(false)} 
        title={`设置${getResourceLabel(pendingResourceType)}资源名称`}
      >
        <div className="space-y-3">
          <input 
            className="w-full h-10 px-3 text-sm rounded-lg border bg-background focus:ring-1 focus:ring-primary outline-none"
            value={resourceInputValue}
            onChange={(e) => setResourceInputValue(e.target.value)}
            placeholder="输入资源名称 (如: banner_img)..."
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button 
              onClick={() => setShowResourceModal(false)}
              className="px-4 py-2 text-xs rounded-lg border border-border hover:bg-muted"
            >
              取消
            </button>
            <button 
              onClick={confirmResourceInput}
              className="px-4 py-2 text-xs rounded-lg bg-primary text-primary-foreground"
              disabled={!resourceInputValue}
            >
              确定
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialog when switching tabs */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        onConfirm={confirmTabSwitch}
        onCancel={cancelTabSwitch}
        title="切换标记类型"
        message={activeTaggingTab === "resource" 
            ? "切换到交互标记后，当前的资源标记将会被替换。确认继续？"
            : "切换到资源标记后，当前的交互标记将会被替换。确认继续？"
        }
      />
    </div>
  );
};

export default TaggingPanel;
