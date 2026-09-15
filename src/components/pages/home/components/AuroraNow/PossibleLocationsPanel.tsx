import { useQuery } from "@tanstack/react-query";

import CollapsiblePanel from "../../../../CollapsiblePanel/CollapsiblePanel";
import { fetchKpObserved } from "../kp-panel/kp-panel";
import ReachTowns from "./ReachTowns";
import { useReachTowns } from "./useReachTowns";

/**
 * Possible locations Dashboard panel (ticket 01): the Reach towns list as
 * its own collapsible unit, headed Possible locations, with unchanged
 * eligibility and ranking. Renders nothing when no town qualifies (the
 * Reach towns honesty rule) or while the Kp feed has not landed. The Kp
 * query reuses the Aurora now panel's key, so TanStack Query dedupes to one
 * network fetch; the town rows come from the shared useReachTowns hook and
 * ride into the list as a prop, so shell and rows share one selection.
 */
const PossibleLocationsPanel: React.FC = () => {
  const observedQuery = useQuery({
    queryKey: ["planetary-k-index", "live"],
    queryFn: fetchKpObserved,
    refetchInterval: 5 * 60 * 1000,
    refetchIntervalInBackground: false,
    staleTime: 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const data = observedQuery.data;
  const currentKp = data && data.length > 0 ? data[data.length - 1].Kp : null;
  const towns = useReachTowns(currentKp);

  if (currentKp === null || towns.length === 0) return null;

  return (
    <article className="possible-locations-panel">
      <CollapsiblePanel
        heading={<h2>Possible locations</h2>}
        bodyId="possible-locations-panel-body"
      >
        <ReachTowns kp={currentKp} towns={towns} />
      </CollapsiblePanel>
    </article>
  );
};

export default PossibleLocationsPanel;
