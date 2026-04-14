import JobPageClient from "./pageClient";

interface JobPageProps {
  params: {
    id: string;
  };
}

export default async function JobPage({ params }: JobPageProps) {
  const { id } = await params;
  return <JobPageClient id={id} />;
}
