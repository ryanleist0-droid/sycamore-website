import Image from "next/image";

/**
 * PhotoGallery — responsive image grid for /community and inline section
 * groupings on marketing pages. Design spec §3.12 image radius (14px),
 * 4:3 aspect, real Sycamore content only.
 *
 * Two ways to use:
 *   - <PhotoGallery name="backpack-drive" /> — looks up the named set below.
 *     Preferred in MDX (next-mdx-remote/rsc can't parse JS array literals
 *     inside JSX attributes, so inline `images={[...]}` fails at build time).
 *   - <PhotoGallery images={[{src,alt}, ...]} /> — for ad-hoc use in TSX.
 */
export type PhotoGalleryImage = {
  src: string;
  alt: string;
};

export const PHOTO_GALLERIES: Record<string, PhotoGalleryImage[]> = {
  "backpack-drive": [
    { src: "/images/sycamore_backpack-drive_001.jpg", alt: "Sycamore drivers carrying donation bags into Burke Street School" },
    { src: "/images/sycamore_backpack-drive_002.jpg", alt: "Burke Street School entrance during the backpack drive" },
    { src: "/images/sycamore_backpack-drive_003.jpg", alt: "Driver bringing supplies up the ramp to the school" },
    { src: "/images/sycamore_backpack-drive_004.jpg", alt: "Team members unpacking backpacks in the school hallway" },
    { src: "/images/sycamore_backpack-drive_005.jpg", alt: "Sorting backpacks for distribution" },
    { src: "/images/sycamore_backpack-drive_006.jpg", alt: "Multiple team members handling colorful backpacks for students" },
  ],
  "christmas-drive": [
    { src: "/images/sycamore_christmas-drive_001.jpg", alt: "Sycamore driver receiving donations in front of the local drop-off" },
    { src: "/images/sycamore_christmas-drive_002.jpg", alt: "Team and volunteers at the donation drop-off" },
    { src: "/images/sycamore_christmas-drive_003.jpg", alt: "Donation drive in progress" },
  ],
  "thanksgiving-meal": [
    { src: "/images/sycamore_thanksgiving-meal_001.jpg", alt: "Thanksgiving meal setup at the station" },
    { src: "/images/sycamore_thanksgiving-meal_002.jpg", alt: "Tables of food being prepared" },
    { src: "/images/sycamore_thanksgiving-meal_003.jpg", alt: "Team and community members at the Thanksgiving event" },
    { src: "/images/sycamore_thanksgiving-meal_004.jpg", alt: "Sharing the meal with the team and community" },
  ],
};

export function PhotoGallery({
  name,
  images,
}: {
  name?: keyof typeof PHOTO_GALLERIES | string;
  images?: PhotoGalleryImage[];
}) {
  const resolved: PhotoGalleryImage[] =
    images ?? (name ? PHOTO_GALLERIES[name] ?? [] : []);

  if (resolved.length === 0) return null;

  return (
    <div className="not-prose my-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {resolved.map((img) => (
        <div
          key={img.src}
          className="relative aspect-[4/3] overflow-hidden rounded-[14px] bg-bg-page"
        >
          <Image
            src={img.src}
            alt={img.alt}
            fill
            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
