interface DescriptionProps {
  description: string;
}

export default function Description({ description }: DescriptionProps) {
  const trimmedDescription = description.length > 2400
    ? `${description.slice(0, 2400).trimEnd()}...`
    : description;
  const paragraphs = trimmedDescription
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold text-neutral-900">Description</h2>
      <div className="max-w-3xl space-y-4 text-[15px] leading-8 text-neutral-700">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-wrap break-words">
            {paragraph}
          </p>
        ))}
      </div>
    </section>
  );
}
