import "../pages/Pages.scss";

const Footer: React.FC = () => {
  return (
    <footer>
      This page has been created by{" "}
      <a href="https://github.com/d-0-t" rel="noreferrer" target="_blank">
        <span className="sr-only">Dot</span>
        <span aria-hidden="true">d0t</span>
      </a>
      . Data source:{" "}
      <a href="https://swpc.noaa.gov/" rel="noreferrer" target="_blank">
        SWPC NOAA
      </a>
      .
    </footer>
  );
};

export default Footer;
