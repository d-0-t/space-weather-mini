import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type DragEvent,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import CloseIcon from "@mui/icons-material/Close";
import { Link } from "react-router-dom";

import { useDialogModal } from "../../../../Dialog/useDialogModal";
import {
  DEFAULT_DASHBOARD_LAYOUT,
  PANEL_LABELS,
  getBucketColumns,
  loadDashboardLayout,
  movePanel,
  saveDashboardLayout,
  useLayoutBucket,
} from "../../dashboardLayout";
import type {
  DashboardLayout,
  DashboardPanelId,
  LayoutBucket,
} from "../../dashboardLayout";

import "./ArrangeModal.scss";

/** The three Layout buckets, in their canonical order. */
const BUCKETS: readonly LayoutBucket[] = ["1-column", "2-column", "3-column"];

/** The reorder lists' names per bucket: the 1-column list plus the A/B/C columns. */
const COLUMN_LABELS: Record<LayoutBucket, readonly string[]> = {
  "1-column": ["Panels"],
  "2-column": ["Column A", "Column B"],
  "3-column": ["Column A", "Column B", "Column C"],
};

/**
 * One-line reasons under the rows of the two Dashboard panels that render
 * nothing while empty, so an absent panel is never a mystery. The Pinned
 * webcams note links to the webcams page, where pinning happens (the modal
 * dismisses first, discarding the draft like every other dismiss path);
 * Possible locations carries the two eligibility reasons (a quiet aurora
 * and the darkness a town needs, per the Reach towns rules).
 */
const CONDITIONAL_PANEL_NOTES: Partial<
  Record<DashboardPanelId, (dismiss: () => void) => ReactNode>
> = {
  "pinned-webcams": (dismiss) => (
    <>
      Only shown if you have pinned{" "}
      <Link to="/webcams" onClick={dismiss}>
        webcams
      </Link>
      .
    </>
  ),
  "possible-locations": () => (
    <>Only shown when the aurora is strong enough and the sky is dark enough.</>
  ),
};

/**
 * The Arrange modal (dashboard-layout ticket 07, CONTEXT.md "Arrange
 * modal"): the Dashboard header's native dialog for rearranging panels,
 * one reorder list per Layout bucket. Mounted only while open, so the
 * draft re-seeds from storage on every open. All edits live inside the
 * dialog: Apply persists every bucket and commits to the Dashboard,
 * Cancel, X, Escape and the backdrop discard, and a closed dialog hands
 * focus back to the trigger button (the Time modal pattern, shared through
 * useDialogModal). The dialog is named by its visible heading
 * (aria-labelledby), never aria-label.
 */
const ArrangeModal: React.FC<{
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onApply: (layout: DashboardLayout) => void;
}> = ({ triggerRef, onClose, onApply }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onApplyRef = useRef(onApply);
  onApplyRef.current = onApply;
  const dialogLabelId = useId();

  useDialogModal({
    dialogRef,
    triggerRef,
    onClose,
    openOnMount: true,
    backdropDismiss: true,
  });

  // Open on the bucket the Dashboard is showing right now; the tabs reach
  // the other two buckets.
  const currentBucket = useLayoutBucket();
  const [tab, setTab] = useState<LayoutBucket>(currentBucket);
  const [draft, setDraft] = useState<DashboardLayout>(() =>
    loadDashboardLayout(localStorage),
  );
  const columns = getBucketColumns(draft, tab);

  // Row moves hand focus to the moved row so arrow keys can keep going.
  const [focusPanel, setFocusPanel] = useState<DashboardPanelId | null>(null);
  const dragSource = useRef<{
    bucket: LayoutBucket;
    col: number;
    index: number;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    col: number;
    index: number;
  } | null>(null);

  // Refocus the moved row after the draft change has rendered.
  useLayoutEffect(() => {
    if (!focusPanel) return;
    const row = dialogRef.current?.querySelector<HTMLLIElement>(
      `[data-panel-id="${focusPanel}"]`,
    );
    row?.focus();
    setFocusPanel(null);
  }, [focusPanel, draft]);

  const writeBucket = (next: DashboardPanelId[][]): void => {
    if (tab === "1-column") {
      setDraft({ ...draft, single: next[0] });
    } else if (tab === "2-column") {
      setDraft({
        ...draft,
        double: next as [DashboardPanelId[], DashboardPanelId[]],
      });
    } else {
      setDraft({
        ...draft,
        triple: next as [
          DashboardPanelId[],
          DashboardPanelId[],
          DashboardPanelId[],
        ],
      });
    }
  };

  /** One move: buttons and arrow keys drive the same dialog-only edit. */
  const move = (
    fromCol: number,
    fromIndex: number,
    toCol: number,
    toIndex: number,
    panelId: DashboardPanelId,
  ): void => {
    if (toCol < 0 || toCol >= columns.length) return;
    const length = columns[fromCol]?.length ?? 0;
    if (fromIndex < 0 || fromIndex >= length) return;
    writeBucket(
      movePanel(
        getBucketColumns(draft, tab),
        fromCol,
        fromIndex,
        toCol,
        toIndex,
      ),
    );
    setFocusPanel(panelId);
  };

  const onRowKeyDown = (
    event: KeyboardEvent<HTMLLIElement>,
    col: number,
    index: number,
    panelId: DashboardPanelId,
  ): void => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      move(col, index, col, index - 1, panelId);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      move(col, index, col, index + 1, panelId);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      move(col, index, col - 1, columns[col - 1]?.length ?? 0, panelId);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      move(col, index, col + 1, columns[col + 1]?.length ?? 0, panelId);
    }
  };

  const onTablistKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const index = BUCKETS.indexOf(tab);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      setTab(BUCKETS[(index + 1) % BUCKETS.length]);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      setTab(BUCKETS[(index + BUCKETS.length - 1) % BUCKETS.length]);
    }
  };

  const onRowDragStart = (
    event: DragEvent<HTMLLIElement>,
    col: number,
    index: number,
  ): void => {
    dragSource.current = { bucket: tab, col, index };
    event.dataTransfer?.setData("text/plain", String(index));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  };

  const onRowDragOver = (
    event: DragEvent<HTMLLIElement>,
    col: number,
    index: number,
  ): void => {
    if (!dragSource.current) return;
    event.preventDefault();
    // The row owns its position: keep the list's end-of-list target from
    // overwriting it via bubbling.
    event.stopPropagation();
    setDropTarget({ col, index });
  };

  const onListDragOver = (
    event: DragEvent<HTMLUListElement>,
    col: number,
  ): void => {
    if (!dragSource.current) return;
    event.preventDefault();
    setDropTarget({ col, index: columns[col]?.length ?? 0 });
  };

  const onDrop = (
    event: DragEvent<HTMLElement>,
    col: number,
    index: number,
  ): void => {
    event.preventDefault();
    const source = dragSource.current;
    if (
      source &&
      source.bucket === tab &&
      columns[source.col]?.[source.index] !== undefined
    ) {
      writeBucket(movePanel(columns, source.col, source.index, col, index));
    }
    dragSource.current = null;
    setDropTarget(null);
  };

  const onDragEnd = (): void => {
    dragSource.current = null;
    setDropTarget(null);
  };

  const dismiss = () => dialogRef.current?.close();

  const apply = () => {
    saveDashboardLayout(localStorage, draft);
    onApplyRef.current(draft);
    dialogRef.current?.close();
  };

  const reset = () => {
    setDraft(DEFAULT_DASHBOARD_LAYOUT);
    setFocusPanel(null);
  };

  const panelLabel = (id: DashboardPanelId): string => PANEL_LABELS[id] ?? id;

  return (
    <dialog
      ref={dialogRef}
      className="arrange-dialog"
      aria-labelledby={dialogLabelId}
    >
      <h3 id={dialogLabelId}>Rearrange</h3>
      <p className="arrange-dialog__note">
        Drag a panel, use the arrow buttons or the arrow keys. How many columns
        the Dashboard shows depends on your screen or window size. Nothing moves
        on the Dashboard until you Apply.
      </p>
      <div
        className="arrange-dialog__tabs"
        role="tablist"
        aria-label="Layout buckets"
        onKeyDown={onTablistKeyDown}
      >
        {BUCKETS.map((bucket) => (
          <button
            key={bucket}
            type="button"
            role="tab"
            id={`arrange-tab-${bucket}`}
            aria-selected={tab === bucket}
            aria-controls={`arrange-panel-${bucket}`}
            tabIndex={tab === bucket ? 0 : -1}
            className="arrange-dialog__tab"
            onClick={() => setTab(bucket)}
          >
            {bucket}
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`arrange-panel-${tab}`}
        aria-labelledby={`arrange-tab-${tab}`}
        className={`arrange-dialog__panel arrange-dialog__panel--${tab}`}
      >
        {columns.map((column, colIndex) => {
          const labelId = `arrange-col-label-${colIndex}`;
          return (
            <div className="arrange-dialog__column" key={colIndex}>
              {columns.length > 1 ? (
                <span className="arrange-dialog__column-name" id={labelId}>
                  {COLUMN_LABELS[tab][colIndex]}
                </span>
              ) : (
                <span className="sr-only" id={labelId}>
                  {COLUMN_LABELS[tab][colIndex]}
                </span>
              )}
              <ul
                className="arrange-dialog__list"
                aria-labelledby={labelId}
                onDragOver={(event) => onListDragOver(event, colIndex)}
                onDrop={(event) =>
                  onDrop(event, colIndex, columns[colIndex]?.length ?? 0)
                }
              >
                {column.map((id, rowIndex) => {
                  const isDropTarget =
                    dropTarget?.col === colIndex &&
                    dropTarget?.index === rowIndex;
                  const note = CONDITIONAL_PANEL_NOTES[id]?.(dismiss);
                  return (
                    <li
                      key={id}
                      data-panel-id={id}
                      tabIndex={0}
                      draggable
                      className={`arrange-dialog__row${
                        isDropTarget ? " arrange-dialog__row--drop" : ""
                      }`}
                      onKeyDown={(event) =>
                        onRowKeyDown(event, colIndex, rowIndex, id)
                      }
                      onDragStart={(event) =>
                        onRowDragStart(event, colIndex, rowIndex)
                      }
                      onDragOver={(event) =>
                        onRowDragOver(event, colIndex, rowIndex)
                      }
                      onDrop={(event) => {
                        // The row owns its target: keep the list's
                        // end-of-list drop from also firing via bubbling.
                        event.stopPropagation();
                        onDrop(event, colIndex, rowIndex);
                      }}
                      onDragEnd={onDragEnd}
                    >
                      <span className="arrange-dialog__row-copy">
                        <span className="arrange-dialog__row-label">
                          {panelLabel(id)}
                        </span>
                        {note ? (
                          <span className="arrange-dialog__row-note">
                            {note}
                          </span>
                        ) : null}
                      </span>
                      <span className="arrange-dialog__row-controls">
                        <button
                          type="button"
                          tabIndex={-1}
                          title={`Move ${panelLabel(id)} up`}
                          onClick={() =>
                            move(colIndex, rowIndex, colIndex, rowIndex - 1, id)
                          }
                        >
                          <ArrowUpwardIcon fontSize="small" />
                          <span className="sr-only">
                            Move {panelLabel(id)} up
                          </span>
                        </button>
                        <button
                          type="button"
                          tabIndex={-1}
                          title={`Move ${panelLabel(id)} down`}
                          onClick={() =>
                            move(colIndex, rowIndex, colIndex, rowIndex + 1, id)
                          }
                        >
                          <ArrowDownwardIcon fontSize="small" />
                          <span className="sr-only">
                            Move {panelLabel(id)} down
                          </span>
                        </button>
                        {colIndex > 0 ? (
                          <button
                            type="button"
                            tabIndex={-1}
                            title={`Move ${panelLabel(id)} left`}
                            onClick={() =>
                              move(
                                colIndex,
                                rowIndex,
                                colIndex - 1,
                                columns[colIndex - 1]?.length ?? 0,
                                id,
                              )
                            }
                          >
                            <ArrowBackIcon fontSize="small" />
                            <span className="sr-only">
                              Move {panelLabel(id)} left
                            </span>
                          </button>
                        ) : null}
                        {colIndex < columns.length - 1 ? (
                          <button
                            type="button"
                            tabIndex={-1}
                            title={`Move ${panelLabel(id)} right`}
                            onClick={() =>
                              move(
                                colIndex,
                                rowIndex,
                                colIndex + 1,
                                columns[colIndex + 1]?.length ?? 0,
                                id,
                              )
                            }
                          >
                            <ArrowForwardIcon fontSize="small" />
                            <span className="sr-only">
                              Move {panelLabel(id)} right
                            </span>
                          </button>
                        ) : null}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="arrange-dialog__actions">
        <button type="button" className="btn--secondary" onClick={reset}>
          Reset to default
        </button>
        <button type="button" className="btn--secondary" onClick={dismiss}>
          Cancel
        </button>
        <button type="button" className="btn--primary" onClick={apply}>
          Apply
        </button>
      </div>
      <button
        type="button"
        className="btn--secondary arrange-dialog__close"
        title="Close"
        onClick={dismiss}
      >
        <CloseIcon fontSize="small" />
        <span className="sr-only">Close</span>
      </button>
    </dialog>
  );
};

export default ArrangeModal;
