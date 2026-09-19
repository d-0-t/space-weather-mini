import { Link } from "react-router-dom";

import "./Pages.scss";
import { useHashScroll } from "./useHashScroll";

/**
 * The "Install & Alerts" page of the About submenu (ticket 07): the mobile
 * install steps moved here from the This-site page and extended with the
 * Home-Screen step iOS requires for push, plus honest background-alert
 * documentation and the no-accounts privacy note. The install heading is the
 * deep-link target of the alert settings' failure panels, so the component
 * scrolls to the heading the URL hash names.
 */
const InstallAlerts: React.FC = () => {
  useHashScroll();

  return (
    <div className="container">
      <h1>Install &amp; Alerts</h1>

      <article>
        <p>
          This page holds the steps for installing the app on a phone, and what
          the background alerts do once it is installed. The alert settings
          themselves sit behind the <strong>Alerts button</strong> on the{" "}
          <Link to="/">Dashboard</Link>.
        </p>

        <h2 id="install">Install on mobile</h2>
        <p>
          Installing puts the site on your Home Screen as an app. You get its
          icon for quick access, and the last fetched data stays on the phone
          for offline reading.
        </p>
        <h3>Android</h3>
        <ol>
          <li>Go to this website using your smartphone&apos;s browser.</li>
          <li>Tap the three vertical dots in the top-right corner.</li>
          <li>
            Tap <strong>Install</strong> and <strong>Create shortcut</strong> or{" "}
            <strong>Add to Home screen</strong>, then <strong>confirm</strong>.
          </li>
          <li>Run the app from the Home Screen.</li>
        </ol>
        <h3>iPhone (iOS 16.4 or later)</h3>
        <ol>
          <li>Open this website in Safari.</li>
          <li>Tap the Share button.</li>
          <li>
            Scroll down, tap <strong>Add to Home Screen</strong>, then{" "}
            <strong>Add</strong>.
          </li>
          <li>Open the app from the Home Screen.</li>
        </ol>
        <p>
          On iPhone, background alerts only work from an app installed this way.
          A plain Safari tab can show alerts while it is open, but it cannot
          receive pokes with the browser closed around it.
        </p>

        <h2>What background alerts do</h2>
        <p>
          With background alerts on, when something matches your Alert
          threshold, your alert type toggles and your Live alert settings, it
          pokes you, even with the app closed.
        </p>
        <p>
          Quiet days send nothing. The daily outlook pokes only when the
          next-24h Kp forecast breaches your Alert threshold.
        </p>

        <h2>My data</h2>
        <p>
          There are no accounts and your alert settings are unique to your
          device.
        </p>
        <p>
          The alert sender <strong>receives</strong>:
        </p>
        <ol>
          <li>The push address (unique to your device),</li>
          <li>Your alert threshold,</li>
          <li>The alert type toggles,</li>
          <li>The live alert settings,</li>
          <li>
            The stored place with its short name and timezone, chosen by you.
          </li>
        </ol>
        <p>
          The alert sender <strong>does not receive</strong>:
        </p>
        <ul>
          <li>Your personal information (name, email, etc.),</li>
          <li>Your device&apos;s current location.</li>
        </ul>
      </article>
    </div>
  );
};

export default InstallAlerts;
