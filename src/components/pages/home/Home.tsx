import "../Pages.scss";
import "./Home.scss";
import AuroraNow from "./components/AuroraNow/AuroraNow";
import Forecast from "./components/Forecast/Forecast";
import SolarWind from "./components/SolarWind/SolarWind";
import Magnetosphere from "./components/Magnetosphere/Magnetosphere";

const Home: React.FC = () => {
  return (
    <div className="home">
      <h1>Home</h1>
      <div className="home__flow">
        <div className="home__flow__col">
          <AuroraNow />
          <Forecast />
        </div>
        <div className="home__flow__col">
          <SolarWind />
          <Magnetosphere />
        </div>
      </div>
    </div>
  );
};

export default Home;