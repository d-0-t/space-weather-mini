import "../Pages.scss";
import "./Home.scss";
import VisualAuroras from "../../visualtabs/Auroras";
import Live from "./components/Live/Live";
import SolarWind from "./components/SolarWind/SolarWind";
import Magnetosphere from "./components/Magnetosphere/Magnetosphere";
import PredictedSolarWind from "./components/PredictedSolarWind/PredictedSolarWind";

const Home: React.FC = () => {
  return (
    <div className="home">
      <h1>Home</h1>
      <div className="home__flow">
        <Live />
        <VisualAuroras />
        <SolarWind />
        <Magnetosphere />
        <PredictedSolarWind />
      </div>
    </div>
  );
};

export default Home;
