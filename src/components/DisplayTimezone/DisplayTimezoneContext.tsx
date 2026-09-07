import { createContext, useCallback, useContext, useState } from "react";
import type { ReactNode } from "react";

import {
  loadDisplayTimezone,
  saveDisplayTimezone,
  type DisplayTimezone,
} from "../../products/display-timezone";

export interface DisplayTimezoneContextValue {
  displayTimezone: DisplayTimezone;
  setDisplayTimezone: (displayTimezone: DisplayTimezone) => void;
}

const DisplayTimezoneContext =
  createContext<DisplayTimezoneContextValue | null>(null);

/**
 * Provides the Display timezone setting app-wide from the app root (ticket
 * 02): every consumer re-renders live when the chaser applies a change in
 * the Time modal, without reload, on every page. The choice persists across
 * visits; Local is the default (ADR-0008).
 */
export const DisplayTimezoneProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [displayTimezone, setDisplayTimezoneState] = useState(() =>
    loadDisplayTimezone(localStorage),
  );
  const setDisplayTimezone = useCallback((next: DisplayTimezone) => {
    setDisplayTimezoneState(next);
    saveDisplayTimezone(localStorage, next);
  }, []);
  return (
    <DisplayTimezoneContext.Provider
      value={{ displayTimezone, setDisplayTimezone }}
    >
      {children}
    </DisplayTimezoneContext.Provider>
  );
};

export function useDisplayTimezone(): DisplayTimezoneContextValue {
  const value = useContext(DisplayTimezoneContext);
  if (value === null) {
    throw new Error(
      "useDisplayTimezone must be used inside DisplayTimezoneProvider",
    );
  }
  return value;
}
