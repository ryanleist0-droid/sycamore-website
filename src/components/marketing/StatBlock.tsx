/**
 * StatBlock — addendum §3.11.
 *
 * Four-tile strip rendered below the home hero. Each tile pairs a large
 * value (numeric or short text) with a smaller label underneath. One of
 * the home stats is non-numeric ("Veteran-owned"); rendering is uniform
 * across both shapes — the value slot is just a string.
 */
export type Stat = {
  value: string;
  label: string;
};

export function StatBlock({ stats }: { stats: Stat[] }) {
  return (
    <section className="marketing-container py-12 md:py-16">
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, idx) => (
          <div
            key={`${stat.label}-${idx}`}
            className="rounded-2xl border border-border-subtle bg-bg-surface px-5 py-6 md:px-6 md:py-7"
          >
            <dt className="sr-only">{stat.label}</dt>
            <dd>
              <span className="block text-[24px] md:text-[28px] lg:text-[32px] font-extrabold text-text-primary leading-[1.1] tracking-tight">
                {stat.value}
              </span>
              <span className="mt-2 block text-[12px] md:text-[13px] uppercase tracking-[1.25px] font-semibold text-text-tertiary">
                {stat.label}
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
