import { useDisplayTimezone } from "../../DisplayTimezone/DisplayTimezoneContext";
import { formatIssued } from "../../../products/display-time";

/**
 * The product header's Issued line (ticket 04): one rendered timestamp per
 * fact, in the Display timezone – "Issued (UTC)" in UTC mode, plain "Issued"
 * in Local mode – followed by the author line. Shared by every forecast
 * product page.
 */
const IssuedLine: React.FC<{ issued: string; author: string }> = ({
  issued,
  author,
}) => {
  const { displayTimezone } = useDisplayTimezone();
  return (
    <p>
      <b>{displayTimezone === "utc" ? "Issued (UTC):" : "Issued:"}</b>{" "}
      {formatIssued(issued, displayTimezone)}
      <br />
      {author}
    </p>
  );
};

export default IssuedLine;
