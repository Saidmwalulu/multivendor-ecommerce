"use client";

import { useCallback, useEffect, useState } from "react";
import { useRef } from "react";
import Image from "next/image";
import { Camera, User, X } from "lucide-react";

import { cn } from "@/lib/utils";

interface ImageUploadProps {
  disabled?: boolean;
  onChange: (value: string) => void;
  onRemove: (value: string) => void;
  value: string[];
  dontShowPreview?: boolean;
}

const MAX_SIZE = 8 * 1024 * 1024; // 8MB

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  value,
  onChange,
  disabled,
  onRemove,
  dontShowPreview,
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(value?.[0] ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isReading, setIsReading] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);

  // Keep preview in sync if the field's value is set/reset externally
  // (e.g. loading an existing category in edit mode).
  useEffect(() => {
    setPreview(value?.[0] || null);
  }, [value]);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      if (!ACCEPTED.includes(file.type)) {
        setError("Please choose a PNG, JPG, or WEBP image.");
        return;
      }

      if (file.size > MAX_SIZE) {
        setError("Image must be smaller than 8 MB.");
        return;
      }

      try {
        setIsReading(true);

        const base64 = await fileToBase64(file);

        setPreview(base64);
        setFileName(file.name);
        onChange(base64);
      } catch {
        setError("Couldn't read that image. Please try again.");
      } finally {
        setIsReading(false);
      }
    },
    [onChange]
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];

      if (file && !disabled) {
        handleFile(file);
      }
    },
    [handleFile, disabled]
  );

  const handleRemove = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setPreview(null);
      setFileName(null);
      onRemove(value?.[0] ?? "");
      onChange("");
    },
    [onRemove, onChange, value]
  );

  return (
    <div className="flex flex-col items-center">
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload profile picture"
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={cn(
          "group relative flex size-[230px] cursor-pointer items-center justify-center rounded-full border-2 border-dashed bg-background transition-all",
          "hover:border-primary",
          isDragging && "scale-105 border-primary bg-muted",
          disabled && "cursor-not-allowed opacity-60"
        )}
      >
        {preview && !dontShowPreview ? (
          <Image
            src={preview}
            alt="Profile preview"
            fill
            className="rounded-full object-cover"
          />
        ) : (
          <User className="h-20 w-20 text-muted-foreground" strokeWidth={1.5} />
        )}

        <div
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity",
            "group-hover:opacity-100",
            isDragging && "opacity-100"
          )}
        >
          <Camera className="h-16 w-16 text-white" />
        </div>

        <div className="absolute bottom-2 right-2 flex size-16 items-center justify-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110">
          <Camera className="h-8 w-8" />
        </div>

        {preview && (
          <button
            type="button"
            aria-label="Remove image"
            onClick={handleRemove}
            className="absolute top-2 right-2 flex size-8 items-center justify-center rounded-full bg-black/60 text-white transition-transform hover:scale-110"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED.join(",")}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      <p className="mt-3 text-center text-sm text-muted-foreground">
        {isReading
          ? "Reading image..."
          : fileName
          ? fileName
          : "Drag & drop or click avatar to upload"}
      </p>

      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}