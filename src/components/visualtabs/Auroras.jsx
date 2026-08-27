import "../pages/Pages.scss";
import FullSizeModal from "../FullSizeModal";

const AURORA_IMAGE_URLS = {
  north: "https://services.swpc.noaa.gov/images/animations/ovation/north/latest.jpg",
  south: "https://services.swpc.noaa.gov/images/animations/ovation/south/latest.jpg",
};

const auroraAlt = (pole) => `Aurora Forecast (latest) - ${pole} Pole`;

function VisualAuroras() {
  return (
    <div className="container">
      <article>
        <h2>Latest Aurora Forecast (30min)</h2>
        <div className="aurora-images">
          <FullSizeModal
            label="Aurora forecast, latest, North Pole, full size"
            triggerClassName="aurora-images__tile"
            trigger={
              <img alt={auroraAlt("North")} src={AURORA_IMAGE_URLS.north} />
            }
          >
            <img alt={auroraAlt("North")} src={AURORA_IMAGE_URLS.north} />
          </FullSizeModal>
          <FullSizeModal
            label="Aurora forecast, latest, South Pole, full size"
            triggerClassName="aurora-images__tile"
            trigger={
              <img alt={auroraAlt("South")} src={AURORA_IMAGE_URLS.south} />
            }
          >
            <img alt={auroraAlt("South")} src={AURORA_IMAGE_URLS.south} />
          </FullSizeModal>
        </div>
        <p>
          Source:{" "}
          <a href="https://www.swpc.noaa.gov/products/aurora-30-minute-forecast">
            SWPC NOAA
          </a>
        </p>
      </article>
    </div>
  );
}

export default VisualAuroras;