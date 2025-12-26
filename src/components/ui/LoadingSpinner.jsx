import React from "react";
import { Loader2 } from "lucide-react";

export function LoadingSpinner({ size = "md", className = "" }) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-10 h-10",
    xl: "w-16 h-16",
  };

  return (
    <Loader2
      className={`animate-spin text-amber-500 ${sizeClasses[size] || sizeClasses.md} ${className}`}
    />
  );
}

export function LoadingOverlay({ message = "Wird geladen..." }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-stone-500 dark:text-stone-400">{message}</p>
    </div>
  );
}

export function LoadingInline({ message }) {
  return (
    <div className="flex items-center gap-2 text-stone-500 dark:text-stone-400">
      <LoadingSpinner size="sm" />
      {message && <span className="text-sm">{message}</span>}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse bg-white dark:bg-stone-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-stone-200 dark:bg-stone-700 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-stone-200 dark:bg-stone-700 rounded w-1/3" />
          <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-1/4" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-full" />
        <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-5/6" />
        <div className="h-3 bg-stone-200 dark:bg-stone-700 rounded w-4/6" />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
