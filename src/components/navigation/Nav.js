import './Nav.css';
import { Link } from 'react-router-dom';

function Nav() {
  return (
    <div id="header" className="noselect">
      <div id="navLogo">Space Weather Mini</div>
      <div id="nav">
        <ul>
          <Link to='/' className="nava"><li>
            Home
          </li></Link>
          <li className="dropdown" id="forecasts">
            <Link to='/forecasts' className="nava">
              Forecasts &amp; Discussion
            </Link>
            <ul className="dropdown-content">
              <Link to='/forecasts/geoalert'>
                <li>
                Geophysical Alert
                </li>
              </Link>
              <Link to='/forecasts/daily'>
                <li>
                Daily Data
               </li>
              </Link>
              <Link to='/forecasts/3days'>
                <li>
                3 Day Report
                </li>
              </Link>
              <Link to='/forecasts/weekly'>
                <li>
                Weekly Report
               </li>
              </Link>
              <Link to='/forecasts/27days'>
                <li>
                27 Day Outlook
                </li>
              </Link>
              <Link to='/forecasts/discussion'>
                <li>
                Forecast Discussion
                </li>
              </Link>
            </ul>
          </li>
          <Link to='/about' className="nava"><li>
            About
          </li></Link>
        </ul>
      </div>
    </div>
  );
}

export default Nav;
