"use client";

import { useState, useEffect } from "react";
import { Copy, Check, Loader2 } from "lucide-react";
import copy from "copy-to-clipboard";
import { cn } from "../lib/utils";

interface CopyButtonProps {
  value: string;
  className?: string;
  showLabel?: boolean;
  successDuration?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onCopyRequest?: () => Promise<string | void>;
}

export function CopyButton({
  value,
  className,
  showLabel = true,
  successDuration = 750,
  onMouseEnter,
  onMouseLeave,
  onCopyRequest,
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isCopied) {
      const timer = setTimeout(() => {
        setIsCopied(false);
      }, successDuration);

      return () => clearTimeout(timer);
    }
  }, [isCopied, successDuration]);

  const handleCopy = async () => {
    try {
      if (onCopyRequest) {
        setIsLoading(true);
        const result = await onCopyRequest();
        setIsLoading(false);
        if (typeof result === "string") {
          copy(result);
        } else {
           // If void, maybe copyRequest handled copy or just updated the value prop?
           // Assuming if string is returned, copy it.
           // If nothing returned, use the current value prop which might have been updated?
           // The safest is to use the returned value.
           copy(value);
        }
      } else {
        copy(value);
      }
      setIsCopied(true);
    } catch (error) {
      console.error("Failed to copy text: ", error);
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      disabled={isLoading}
      className={cn(
        `inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md transition-all duration-300`,
        isCopied
          ? "bg-primary text-primary-foreground"
          : "bg-neutral-100 dark:bg-neutral-700 dark:hover:bg-muted-foreground/30 text-foreground",
        className,
        `relative`,
        isLoading && "cursor-wait opacity-70"
      )}
      aria-label={isCopied ? "Copied!" : "Copy to clipboard"}
    >
      <div className="relative h-4 w-4 mr-1.5">
        <span
          className={`absolute inset-0 transition-all duration-200 ${
            isCopied || isLoading
              ? "opacity-0 scale-75 rotate-[-10deg]"
              : "opacity-100 scale-100 rotate-0"
          }`}
        >
          <Copy className="h-4 w-4 text-foreground" />
        </span>
        <span
          className={`absolute inset-0 transition-all duration-200 ${
            isCopied && !isLoading
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-75 rotate-[10deg]"
          }`}
        >
          <Check className="h-4 w-4 text-primary-foreground" />
        </span>
        <span
          className={`absolute inset-0 transition-all duration-200 ${
            isLoading
              ? "opacity-100 scale-100 rotate-0"
              : "opacity-0 scale-75 rotate-[10deg]"
          }`}
        >
          <Loader2 className="h-4 w-4 animate-spin text-foreground" />
        </span>
      </div>

      {showLabel && (
        <span className="font-medium">
          {isLoading ? "生成中..." : isCopied ? "已复制" : "复制"}
        </span>
      )}

      {isCopied && (
        <span
          className="absolute inset-0 rounded-md animate-pulse bg-primary/10"
          aria-hidden="true"
        />
      )}
    </button>
  );
}
