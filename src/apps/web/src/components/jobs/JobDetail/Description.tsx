interface DescriptionProps {
  description: string;
}

export default function Description({ description }: DescriptionProps) {
  const paragraphs = description
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <section>
      <h2 className="text-xl font-semibold text-neutral-900 mb-3">Description</h2>
      <div className="prose prose-sm max-w-none text-neutral-700">
        {paragraphs.map((paragraph, index) => (
          <p key={index} className="whitespace-pre-wrap">{paragraph}</p>
        ))}
      </div>
    </section>
  );
}
