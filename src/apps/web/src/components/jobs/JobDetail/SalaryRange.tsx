interface SalaryRangeProps {
  salaryMin?: number;
  salaryMax?: number;
}

export default function SalaryRange({ salaryMin, salaryMax }: SalaryRangeProps) {
  if (!salaryMin && !salaryMax) {
    return null;
  }

  return (
    <section className="border-t border-neutral-200 pt-6">
      <h2 className="mb-3 text-xl font-semibold text-neutral-900">Salary Range</h2>
      <p className="text-lg text-neutral-700">
        ${salaryMin?.toLocaleString() ?? "—"} - ${salaryMax?.toLocaleString() ?? "—"}
      </p>
    </section>
  );
}
