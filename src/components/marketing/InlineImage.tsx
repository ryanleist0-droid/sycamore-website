import Image from "next/image";

/**
 * InlineImage — single image inside MDX body. Wraps next/image with the same
 * 14px radius + 4:3 aspect treatment used by PhotoGallery and the home hero,
 * so section anchors and inline placements visually match across the site.
 */
export function InlineImage({
  src,
  alt,
  aspect = "4/3",
}: {
  src: string;
  alt: string;
  aspect?: "4/3" | "16/9" | "21/9";
}) {
  const aspectClass =
    aspect === "16/9"
      ? "aspect-[16/9]"
      : aspect === "21/9"
        ? "aspect-[21/9]"
        : "aspect-[4/3]";

  return (
    <div
      className={`not-prose my-8 relative w-full ${aspectClass} overflow-hidden rounded-[14px] bg-bg-page`}
    >
      <Image
        src={src}
        alt={alt}
        fill
        sizes="(min-width: 1024px) 720px, 100vw"
        className="object-cover"
      />
    </div>
  );
}
