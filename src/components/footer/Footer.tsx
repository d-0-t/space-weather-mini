import "../pages/Pages.css";

const Footer: React.FC = () => {
  return (
    <div id="footer">
      This page has been created by{" "}
      <a href="https://github.com/d-0-t" rel="noreferrer" target="_blank">
        Dot
      </a>
      . Data source:{" "}
      <a href="https://swpc.noaa.gov/" rel="noreferrer" target="_blank">
        SWPC NOAA
      </a>
      .
    </div>
  );
};

export default Footer;
