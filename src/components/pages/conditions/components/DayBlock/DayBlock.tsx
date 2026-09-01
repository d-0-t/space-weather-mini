import "./DayBlock.scss";
import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";
import type { DaylightDay } from "../../../../../data/sun";
import LuminosityTimeline from "../LuminosityTimeline/LuminosityTimeline";

const POLAR_COPY: Record<NonNullable<DaylightDay["polar"]>, string> = {
  "midnight-sun": "Sun does not set today",
  "polar-night": "Sun does not rise today",
};

interface DayBlockProps {
  heading: string;
  day: DaylightDay;
}

const DayBlock: React.FC<DayBlockProps> = ({ heading, day }) => {
  const bodyId = `conditions-day-${heading.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-body`;
  return (
    <section className="conditions__day">
      <CollapsiblePanel heading={<h2>{heading}</h2>} bodyId={bodyId}>
        {day.polar !== null ? (
          <p className="conditions__polar-note">{POLAR_COPY[day.polar]}</p>
        ) : null}
        <LuminosityTimeline day={day} />
      </CollapsiblePanel>
    </section>
  );
};

export default DayBlock;
