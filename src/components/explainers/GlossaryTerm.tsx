import { Link } from "react-router-dom";
import "./glossary-term.scss";

interface GlossaryTermProps {
  /** Anchor id of the explainer entry, e.g. "kp-index". */
  termId: string;
  /** Visible label – must match the CONTEXT.md term verbatim. */
  children: React.ReactNode;
}

/**
 * An accessible, keyboard-focusable link into the explainers glossary.
 * Renders as a React Router Link so navigation stays inside the SPA and the
 * hash scrolls to the matching explainer section. The link is styled with a
 * dotted underline so it reads as a glossary term in running prose, but it is
 * never hover-only: it is a real focusable anchor with a visible focus ring.
 */
const GlossaryTerm: React.FC<GlossaryTermProps> = ({ termId, children }) => {
  return (
    <Link to={`/explainers#${termId}`} className="glossary-term">
      {children}
    </Link>
  );
};

export default GlossaryTerm;
