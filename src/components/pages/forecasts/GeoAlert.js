import '../Pages.css';
import React from 'react';
import Parser from '../../parser/TxtParser';
const parser = new Parser();

class GeoAlert extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      data: null
    }
  }
  componentDidMount() {
    this.loadData();
  }
  loadData() {
    fetch('https://services.swpc.noaa.gov/text/wwv.txt')
    .then((r) => r.text())
    .then(text  => {
      let geoAlert = text.replace(/\n/g,"<br/>");
      let parsedGeoAlertArr = parser.GeoAlertParser(geoAlert);
      let issueDate = new Date(parsedGeoAlertArr[1]);
      issueDate = issueDate.toString();
      this.setState({
        data: geoAlert,
        geoAlertMsg: {
          title: parsedGeoAlertArr[0],
          date: parsedGeoAlertArr[1],
          dateLocal: issueDate,
          author: parsedGeoAlertArr[2],
          info: {
            details: parsedGeoAlertArr[3][0],
            observed: parsedGeoAlertArr[3][1],
            predicted: parsedGeoAlertArr[3][2]
          }
        }
      })
    })  
  }
  render() {
    if (!this.state.data) {
      return <div />
    }
    return (
      <div className="container">
      <div id="geo-alert">

        <h2>Geophysical Observations and Predictions</h2>
        <p>
          <b>Issued (UTC):</b> {this.state.geoAlertMsg.date}<br/>
          <b>Issued (local):</b> {this.state.geoAlertMsg.dateLocal}<br/>
          {this.state.geoAlertMsg.author}
        </p>

        <article>
          <h3>Predictions</h3>
          <p>{this.state.geoAlertMsg.info.predicted}</p>
          <h3>Observations</h3>
          <p>{this.state.geoAlertMsg.info.observed}</p>
          <h3>Geophysical Alert Message</h3>
          <div dangerouslySetInnerHTML=
          {{__html: this.state.geoAlertMsg.info.details}} />
        </article>

      </div>
    </div>
    )
  }
}

export default GeoAlert;