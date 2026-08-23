import { useQuery } from "@tanstack/react-query";

import "../Pages.scss";
import "./weekly-report.scss";

import {
  WEEKLY_REPORT_URL,
  parseWeeklyReport,
  type WeeklySection,
} from "../../../products/weekly-report";
import { formatIssuedLocal } from "../../../products/product-header";
import GlossaryTerm from "../../explainers/GlossaryTerm";

const fetchWeeklyReport = async () => {
  const response = await fetch(WEEKLY_REPORT_URL);
  if (!response.ok) {
    throw new Error(`NOAA returned ${response.status}`);
  }
  return parseWeeklyReport(await response.text());
};

const SectionArticle: React.FC<{ section: WeeklySection }> = ({ section }) => (
  <article className="weekly-report__section">
    <h2>{section.title}</h2>
    <p className="weekly-report__date-range">{section.dateRange}</p>
    <p className="weekly-report__prose">{section.body}</p>
  </article>
);

const WeeklyReport: React.FC = () => {
  const { data, isPending, isError } = useQuery({
    queryKey: ["weekly-report"],
    queryFn: fetchWeeklyReport,
  });

  return (
    <div className="container weekly-report" id="weekly-discussion">
      {isPending && (
        <p className="weekly-report__status" aria-busy="true">
          Loading weekly report…
        </p>
      )}
      {isError && !data && (
        <p className="weekly-report__status">
          Couldn't load the weekly report. Please check back later.
        </p>
      )}
      {isError && data && (
        <p className="weekly-report__status">
          Couldn't refresh the weekly report — showing the last data.
        </p>
      )}
      {data && (
        <>
          <h1>Weekly Report</h1>
          <p>
            <b>Issued (UTC):</b> {data.issued}
            <br />
            <b>Issued (local):</b> {formatIssuedLocal(data.issued)}
            <br />
            {data.author}
          </p>
          <p className="weekly-report__explainers">
            Learn more: <GlossaryTerm termId="weekly-report">Weekly report</GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="kp-index">Kp index</GlossaryTerm>
            {" · "}
            <GlossaryTerm termId="a-index">A index</GlossaryTerm>
          </p>
          <SectionArticle section={data.forecast} />
          <SectionArticle section={data.highlights} />
        </>
      )}
    </div>
  );
};

export default WeeklyReport;
