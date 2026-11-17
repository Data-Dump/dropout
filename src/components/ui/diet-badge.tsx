import React from "react";
import { DietType } from "@/types";
import { cn } from "@/lib/utils";

interface DietBadgeProps {
  type: DietType;
  showLabel?: boolean;
  className?: string;
  size?: "sm" | "md";
}

export function DietBadge({ type, showLabel = false, className, size = "md" }: DietBadgeProps) {
  const isVeg = type === "veg";
  const isNonVeg = type === "non-veg";
  const isEgg = type === "egg";

  const sizeClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const shapeSize = size === "sm" ? "h-1.5 w-1.5" : "h-2 w-2";

  return (
    <div className={cn("inline-flex items-center gap-1.5", className)}>
      <div
        className={cn(
          "flex items-center justify-center rounded-[3px] border p-0.5",
          sizeClass,
          isVeg && "border-emerald-600 bg-white",
          isNonVeg && "border-rose-600 bg-white",
          isEgg && "border-amber-600 bg-white"
        )}
        title={isVeg ? "Vegetarian" : isNonVeg ? "Non-Vegetarian" : "Contains Egg"}
      >
        {isVeg && (
          <div className={cn("rounded-full bg-emerald-600", shapeSize)} />
        )}
        {isNonVeg && (
          <div
            className={cn(
              "w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-rose-600",
              size === "sm" ? "border-b-[5px]" : ""
            )}
          />
        )}
        {isEgg && (
          <div className={cn("rounded-full bg-amber-600", shapeSize)} />
        )}
      </div>

      {showLabel && (
        <span
          className={cn(
            "text-xs font-medium uppercase tracking-wider",
            isVeg && "text-emerald-700",
            isNonVeg && "text-rose-700",
            isEgg && "text-amber-700"
          )}
        >
          {isVeg ? "Veg" : isNonVeg ? "Non-Veg" : "Egg"}
        </span>
      )}
    </div>
  );
}
