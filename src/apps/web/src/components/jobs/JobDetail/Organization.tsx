interface OrganizationProps {
  name: string;
  city: string;
  province: string;
  industry?: string;
  website?: string;
  description?: string;
}

export default function Organization({
  name,
  city,
  province,
  industry,
  website,
  description,
}: OrganizationProps) {
  return (
    <section className="border-t border-neutral-200 pt-6">
      <h2 className="text-xl font-semibold text-neutral-900 mb-3">About {name}</h2>
      <div className="max-w-3xl space-y-2 text-sm">
        <p className="text-neutral-700">
          <span className="font-medium">Location:</span> {city}, {province}
        </p>
        {industry && (
          <p className="text-neutral-700">
            <span className="font-medium">Industry:</span> {industry}
          </p>
        )}
        {website && (
          <p className="text-neutral-700">
            <span className="font-medium">Website:</span>{" "}
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-[#8b2332] hover:underline"
            >
              {website}
            </a>
          </p>
        )}
        {description && (
          <p className="text-neutral-700 mt-3 whitespace-pre-wrap">{description}</p>
        )}
      </div>
    </section>
  );
}
