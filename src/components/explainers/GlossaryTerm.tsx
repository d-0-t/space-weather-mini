import { Link } from "react-router-dom";

import HelpPopover from "../HelpPopover/HelpPopover";
import { getGlossaryEntry } from "./glossary";
import "./glossary-term.scss";

interface GlossaryTermProps {
  /** Anchor id of the explainer entry, e.g. "kp-index". */
  termId: string;
  /** Visible label – must match the CONTEXT.md term verbatim. */
  children: React.ReactNode;
}

/**
 * An accessible, keyboard-focusable glossary term. It renders as a real
 * button inside running prose (valid inline, unlike the old link) and opens
 * the shared glossary entry in a HelpPopover at the term, so the reader never
 * loses their place by navigating away. The popover body is the same entry the
 * Explainers page renders, verbatim, and offers a quiet link to the full
 * glossary anchor for readers who want the page. A term with no entry renders
 * as plain text rather than a dead control.
 */
const GlossaryTerm: React.FC<GlossaryTermProps> = ({ termId, children }) => {
  const entry = getGlossaryEntry(termId);
  if (!entry) return <>{children}</>;

  return (
    <HelpPopover
      className="glossary-term"
      popoverClassName="glossary-term__popover"
      content={{
        label: entry.title,
        text: entry.body,
        footnote: (
          <Link to={`/explainers#${entry.id}`}>Read the full glossary</Link>
        ),
      }}
      trigger={<span className="glossary-term__label">{children}</span>}
    />
  );
};

export default GlossaryTerm;
