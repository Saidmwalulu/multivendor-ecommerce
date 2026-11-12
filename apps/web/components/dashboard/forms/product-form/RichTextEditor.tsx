"use client";

import React, { useMemo } from "react";
import dynamic from "next/dynamic";

// Dynamically import jodit-react with SSR disabled for Next.js compatibility
const JoditReact = dynamic(() => import("jodit-react"), { ssr: false });

interface JoditEditorWrapperProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function JoditEditorWrapper({
  value,
  onChange,
  placeholder,
}: JoditEditorWrapperProps) {
  const config = useMemo(
    () => ({
      readonly: false,
      toolbarSticky: false,
      placeholder: placeholder || "Detailed product description...",
      height: 300,
      toolbarButtonSize: "small" as const,
      buttons: [
        "bold",
        "italic",
        "underline",
        "strikethrough",
        "|",
        "font",
        "fontsize",
        "brush", // Color picker (Text & Background color)
        "|",
        "ul",
        "ol",
        "|",
        "align",
        "undo",
        "redo",
        "|",
        "link",
        "fullsize",
      ],
    }),
    [placeholder]
  );

  return (
    <div className="w-full text-black">
      <JoditReact
        value={value}
        config={config}
        onBlur={(newContent) => onChange(newContent)}
      />
    </div>
  );
}