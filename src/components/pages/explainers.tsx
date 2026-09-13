import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { GLOSSARY_ENTRIES } from "../explainers/glossary";
import "./Pages.scss";
import "./explainers.scss";

const Explainers: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const hash = location.hash || window.location.hash;
    if (hash) {
      const id = hash.slice(1);
      document.getElementById(id)?.scrollIntoView();
    }
  }, [location.hash]);

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
