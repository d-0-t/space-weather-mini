import "../pages/Pages.css";

function EstimatedPlanetKGraph() {
  return (
    <div className="container">
      <article>
        <h3>Estimated Planetary K-index (graph)</h3>
        <a
          id="img-planetary-k-index"
          rel="noreferrer"
          href="https://services.swpc.noaa.gov/images/geospacegeospace_3_hour.png"
        >
          <img
            alt="Estimated Planetary K-index"
            src="https://services.swpc.noaa.gov/images/geospacegeospace_3_hour.png"
          />
        </a>
        <p>
          Source:{" "}
          <a href="https://www.swpc.noaa.gov/products/planetary-k-index">
            SWPC NOAA
          </a>
        </p>
      </article>
    </div>
  );
}

export default EstimatedPlanetKGraph;
