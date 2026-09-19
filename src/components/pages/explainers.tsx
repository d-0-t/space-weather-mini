import { GLOSSARY_ENTRIES } from "../explainers/glossary";
import { useHashScroll } from "./useHashScroll";
import "./Pages.scss";
import "./explainers.scss";

const Explainers: React.FC = () => {
  useHashScroll();

  return (
    <div className="container explainers" id="explainers">
      <h1>Explainers</h1>
      <p className="explainers__intro">
        Plain-language definitions for every measure, phenomenon, and product
        the app shows.
      </p>

      {GLOSSARY_ENTRIES.map((entry) => (
        <article
          key={entry.id}
          id={entry.id}
          className="explainers__section"
          aria-labelledby={`${entry.id}-heading`}
        >
          <h2 id={`${entry.id}-heading`} className="explainers__title">
            {entry.title}
          </h2>
          <p className="explainers__body">{entry.body}</p>
        </article>
      ))}
    </div>
  );
};

export default Explainers;
