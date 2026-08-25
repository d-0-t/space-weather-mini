import { Link } from "react-router-dom";

import "../Pages.scss";
import "./Home.scss";
import VisualAuroras from "../../visualtabs/Auroras";
import Live from "./components/Live/Live";
import KpLiveDashboard from "./components/KpLiveDashboard/KpLiveDashboard";
import LiveBanner from "./components/LiveBanner/LiveBanner";

const Home: React.FC = () => {
  return (
    <div className="home">
      <h1>Home</h1>
      <div className="home__flow">
        <Live />
        <VisualAuroras />
        <KpLiveDashboard />
        {/* <LiveBanner /> */}
      </div>
    </div>
  );
};

export default Home;
