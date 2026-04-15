import LocationBadge from "@/components/jobs/Minor/LocationBadge";
import RemoteBadge from "@/components/jobs/Minor/RemoteBadge";
import StartupBadge from "../Minor/StartupBadge";


interface HeaderProps {
  title: string;
  company: string;
  city: string;
  province: string;
  remoteOk: boolean;
  isAtAStartup: boolean;
  salaryMin?: number;
  salaryMax?: number;
}

export default function Header({
  title,
  company,
  city,
  province,
  remoteOk,
  isAtAStartup,
  salaryMin,
  salaryMax,
}: HeaderProps) {
  const salary = salaryMin || salaryMax
    ? `$${salaryMin?.toLocaleString() ?? "—"} - $${salaryMax?.toLocaleString() ?? "—"}`
    : null;

  return (
    <header className="space-y-5">
      <div className="space-y-3">
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8b2332]">
          {company}
        </p>
        <h1 className="max-w-4xl text-3xl font-semibold leading-tight text-neutral-900 sm:text-4xl">
          {title}
        </h1>
        {salary && (
          <p className="text-xl font-medium text-neutral-800 sm:text-2xl">
            {salary}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-neutral-700">
        <LocationBadge city={city} province={province} />
        <RemoteBadge remoteOk={remoteOk} />
        {isAtAStartup && (
          <StartupBadge />
        )}
      </div>
    </header>
  );
}
