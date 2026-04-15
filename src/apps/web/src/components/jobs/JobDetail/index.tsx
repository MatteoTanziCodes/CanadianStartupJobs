import type { JobWithRichData } from "@/data/api/jobs";
import Header from "./Header";
import SalaryRange from "./SalaryRange";
import Description from "./Description";
import Organization from "./Organization";
import Tags from "./Tags";
import Apply from "./Apply";
import Footer from "./Footer";

interface JobDetailProps {
  job: JobWithRichData;
}

export default function JobDetail({ job }: JobDetailProps) {
  const {
    title,
    company,
    city,
    province,
    remoteOk,
    salaryMin,
    salaryMax,
    description,
    jobBoardUrl,
    postingUrl,
    isAtAStartup,
    organization,
    tags,
    createdAt: created_at_timestamp,
    updatedAt: updated_at_timestamp,
  } = job;

  const created_at_date = new Date(created_at_timestamp);
  const updated_at_date = new Date(updated_at_timestamp);

  return (
    <article className="mx-auto flex max-w-4xl flex-col gap-8 overflow-visible">
      <Header
        title={title}
        company={company}
        city={city}
        province={province}
        remoteOk={remoteOk}
        isAtAStartup={isAtAStartup ?? false}
        salaryMin={salaryMin}
        salaryMax={salaryMax}
      />

      <SalaryRange salaryMin={salaryMin} salaryMax={salaryMax} />

      <Description description={description} />

      {organization && (
        <Organization
          name={organization.name}
          city={organization.city}
          province={organization.province}
          industry={organization.industry}
          website={organization.website}
          description={organization.description}
        />
      )}

      <Tags
        provinces={tags.provinces}
        experienceLevels={tags.experienceLevels}
        industries={tags.industries}
        jobTypes={tags.jobTypes}
        roles={tags.roles}
      />

      <Apply jobBoardUrl={jobBoardUrl} postingUrl={postingUrl} />

      <Footer createdAt={created_at_date} updatedAt={updated_at_date} />
    </article>
  );
}
