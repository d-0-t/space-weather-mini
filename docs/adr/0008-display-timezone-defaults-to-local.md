# Display timezone defaults to Local

Space weather data is UTC-native (NOAA SWPC), but the app now renders every absolute timestamp in a chaser-chosen Display timezone — Local (the device zone) or UTC — with Local as the default and UTC as the opt-in. Normal visitors cannot mentally convert UTC, while the UTC-fluent minority can find and flip the one setting; only one zone is ever shown, and the two UTC-dated tables (27-day outlook, daily geomagnetic indices) deliberately keep UTC date cells because their rows aggregate NOAA UTC days and cannot be honestly relabeled.

## Considered options

- **UTC default**: preserves today's display and chaser muscle memory, but buries the app's primary audience (casual visitors) in conversions.
- **Local | UTC | Both (three-state)**: keeps today's dual Issued lines, but perpetuates the clutter the setting is meant to remove.

## Consequences

- Tests asserting UTC strings flip to local-mode expectations or pin UTC explicitly per file.
- All components obtain the Display timezone from a shared context; no per-component zone defaults remain.
- Local-conditions times are rendered in the device zone even when the geocoded place sits in another timezone — the place's clock is never displayed.
