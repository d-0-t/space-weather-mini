import "../Pages.scss";
import "./Home.scss";
import VisualAuroras from "../../visualtabs/Auroras";
import Live from "./components/Live/Live";
import SpaceWeatherNow from "./components/SpaceWeatherNow/SpaceWeatherNow";

const Home: React.FC = () => {
  return (
    <div className="home">
      <h1>Home</h1>
      <div className="home__flow">
        <Live />
        <SpaceWeatherNow />
        <VisualAuroras />
      </div>
    </div>
  );
};

export default Home;
