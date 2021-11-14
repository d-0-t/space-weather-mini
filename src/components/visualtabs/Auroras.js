import '../pages/Pages.css' ;

function VisualAuroras() {
  return (
    <div className="container">
      <article>
        <h2>Latest Aurora Forecast (30min)</h2>
        <div id="auroraImages">
          <a id="img-aurora-north" rel="noreferrer" href="https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg"><img alt="Aurora Forecast (latest) - NORTH POLE" src="https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg" /></a>
          <a id="img-aurora-south" rel="noreferrer" href="https://services.swpc.noaa.gov/images/animations/ovation/south/latest.jpg"><img alt="Aurora Forecast (latest) - SOUTH POLE" src="https://services.swpc.noaa.gov/images/animations/ovation/south/latest.jpg" /></a>
        </div>
        <p>Source: <a href="https://www.swpc.noaa.gov/products/aurora-30-minute-forecast">SWPC NOAA</a></p>
      </article>
    </div>
  );
}

export default VisualAuroras;
