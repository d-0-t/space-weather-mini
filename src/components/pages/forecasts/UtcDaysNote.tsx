import { useDisplayTimezone } from "../../DisplayTimezone/DisplayTimezoneContext";

/**
 * The muted note above the UTC-dated tables (27-day outlook, daily
 * geomagnetic indices, ticket 04): their date cells are aggregates of
 * NOAA's UTC days, so the note renders only while Local is chosen – in
 * UTC mode the dates already read as the visitor's own.
 */
const UtcDaysNote: React.FC = () => {
  const { displayTimezone } = useDisplayTimezone();
  if (displayTimezone !== "local") return null;
  return (
    <p className="utc-note">
      Dates are NOAA&apos;s UTC days. They may not match your device&apos;s
      dates.
    </p>
  );
};

export default UtcDaysNote;
