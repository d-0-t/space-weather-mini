import "./DayBlock.scss";
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

const DayBlock: React.FC<DayBlockProps> = ({ heading, day }) => (
  <section className="conditions__day">
    <h2>{heading}</h2>
    {day.polar !== null ? (
      <p className="conditions__polar-note">{POLAR_COPY[day.polar]}</p>
    ) : null}
    <LuminosityTimeline day={day} />
  </section>
);

export default DayBlock;
