import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";
import AuroraSummary from "./AuroraSummary";

/**
 * Summary Dashboard panel (ticket 01): the Interpreter paragraph as its own
 * collapsible unit, headed Summary, with its time-ahead selector, As-of line
 * and Aurora guide link. Reuses the expert panels' query keys, so no refetch.
 */
const SummaryPanel: React.FC = () => (
  <article className="summary-panel">
    <CollapsiblePanel
      heading={<h2>Summary</h2>}
      bodyId="summary-panel-body"
    >
      <AuroraSummary />
    </CollapsiblePanel>
  </article>
);

export default SummaryPanel;
