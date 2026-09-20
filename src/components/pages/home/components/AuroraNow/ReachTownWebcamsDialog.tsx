import CloseIcon from "@mui/icons-material/Close";
import { useId, useRef, useState } from "react";
import type { RefObject } from "react";
import { createPortal } from "react-dom";


import { useDialogModal } from "../../../../Dialog/useDialogModal";
import type {
  WebcamImageEntry,
  WebcamLiveEntry,
} from "../../../../../data/webcams";
import { useDisplayTimezone } from "../../../../DisplayTimezone/DisplayTimezoneContext";
import { formatClock } from "../../../../../products/display-time";
import {
  cacheBustedSrc,
  CountryFlag,
  formatLatitude,
} from "../../../webcams/webcam-card-parts";

import "./ReachTownWebcamsDialog.scss";

/** A town cam the Possible locations panel can show: image and live cards. */
type TownCam = WebcamImageEntry | WebcamLiveEntry;

/**
 * One cam of the town, in the shape the webcam card shows: flag + name +
 * latitude title, the operator's still, the honest freshness line and the
 * source attribution. The still is cache-busted on open so the dialog never
 * serves a stale frame, and it stays still – the panel never polls an
 * operator's feed on its own (ADR-0003 discipline); the live card's true
 * frames flow on the webcams page.
 */
const ReachTownWebcam: React.FC<{ cam: TownCam }> = ({ cam }) => {
  const { displayTimezone } = useDisplayTimezone();
  // Frozen on open: the parent's 60 s tick re-renders rows, and a computed
  // src would cache-bust on every render – polling the operator's feed
  // while the dialog is open (ADR-0003 discipline).
  const [src] = useState(() => cacheBustedSrc(cam.imageUrl));
  const [loadedAt] = useState(() => new Date());
  return (
    <section className="reach-town-webcams__cam">
      <h4 className="reach-town-webcams__cam-title">
        {/* <CountryFlag
          country={cam.country}
          className="reach-town-webcams__cam-flag"
        />{" "} */}
        {cam.name} · {formatLatitude(cam.latitude)}
      </h4>
      <img src={src} alt={cam.alt} className="reach-town-webcams__cam-img" />
      {cam.type === "live" ? (
        <p className="reach-town-webcams__cam-freshness">
          Loaded {formatClock(loadedAt, displayTimezone)}. Placeholder frame –
          live frames flow on the webcams page.
        </p>
      ) : (
        <p className="reach-town-webcams__cam-freshness">
          Loaded {formatClock(loadedAt, displayTimezone)}. Refreshes every{" "}
          {cam.cadenceMinutes} min
          {cam.note ? ` ${cam.note}` : ""}.
        </p>
      )}
      {cam.type === "live" && cam.note ? (
        <p className="reach-town-webcams__cam-note">{cam.note}</p>
      ) : null}
      <p className="reach-town-webcams__cam-attribution">
        Source:{" "}
        <a href={cam.siteUrl} target="_blank" rel="noopener noreferrer">
          {cam.operator}
        </a>
      </p>
    </section>
  );
};

/**
 * The town's webcam dialog (the Possible locations panel's camera seam): a
 * native <dialog> in the image-modal geometry, one card section per webcam
 * the town owns, mounted only while open so no still is fetched before the
 * visitor asks for the town (ADR-0003 discipline). The dialog portals to
 * document.body: the rows live in the Dashboard's re-arrangeable columns
 * and the list reorders on its 60 s tick, and a modal dialog that React
 * displaces (remove + reinsert) loses its top-layer seat while staying
 * open – it would then paint behind the site content. Portaling keeps the
 * dialog's DOM address fixed through every re-arrangement. Narrow
 * viewports stack the cams as one scrolling column; a multi-cam town takes
 * the landscape room (md and up: desktop, tablets, rotated phones) with
 * the sections flowing side by side. Named by its visible heading
 * (aria-labelledby), closed by Escape, the X or a backdrop pointerdown,
 * and focus returns to the town's camera icon (the Time modal pattern,
 * shared through useDialogModal).
 */
const ReachTownWebcamsDialog: React.FC<{
  /** The reach town's display name, e.g. "Tromsø". */
  town: string;
  cams: TownCam[];
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}> = ({ town, cams, triggerRef, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogLabelId = useId();

  useDialogModal({
    dialogRef,
    triggerRef,
    onClose,
    openOnMount: true,
    backdropDismiss: true,
  });

  return createPortal(
    <dialog
      ref={dialogRef}
      className={`image-modal reach-town-webcams${
        cams.length > 1 ? " reach-town-webcams--multi" : ""
      }`}
      aria-labelledby={dialogLabelId}
    >
      <h3 id={dialogLabelId} className="reach-town-webcams__heading">
        <CountryFlag
          country={cams[0].country}
          className="reach-town-webcams__cam-flag"
        />{" "}
        {town}, {cams[0].country} webcams
      </h3>
      <div className="reach-town-webcams__cams">
        {cams.map((cam) => (
          <ReachTownWebcam key={cam.id} cam={cam} />
        ))}
      </div>
      <button
        type="button"
        className="btn--secondary image-modal__close"
        title="Close"
        onClick={() => dialogRef.current?.close()}
      >
        <CloseIcon fontSize="small" />
        <span className="sr-only">Close</span>
      </button>
    </dialog>,
    document.body,
  );
};

export default ReachTownWebcamsDialog;
