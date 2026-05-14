import { cn } from "@/lib/utils";

/**
 * PhotoPlaceholder — addendum §4.14.
 *
 * Used during D1–D2 before real Sycamore photography lands. Pure CSS,
 * no external image. Stays in the codebase post-cutover as a graceful
 * fallback for future surfaces without imagery ready on day-zero.
 */
export function PhotoPlaceholder({
  className,
  label = "photography pending",
}: {
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "relative w-full aspect-[4/3] rounded-[14px] overflow-hidden",
        "bg-[linear-gradient(135deg,_#3a8a64_0%,_#2e6e51_100%)]",
        "flex flex-col items-center justify-center text-white",
        className,
      )}
      role="img"
      aria-label={`Placeholder — ${label}`}
    >
      <span className="text-[28px] font-extrabold opacity-85 tracking-tight">
        Sycamore
      </span>
      <span className="mt-2 text-[11px] uppercase tracking-[1.5px] text-white/70">
        placeholder · {label}
      </span>
    </div>
  );
}
