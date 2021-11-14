import '../Pages.css';
import React from 'react';
import Parser from '../../parser/TxtParser';
import EstimatedPlanetKGraph from '../../visualtabs/EstPlanetK-Graph';
const parser = new Parser();

class DailyReport extends React.Component {
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
    fetch('https://services.swpc.noaa.gov/text/daily-geomagnetic-indices.txt')
    .then((r) => r.text())
    .then(text  => {
      let daily = text.replace(/\n/g,"<br/>");
      daily = parser.DailyParser(daily);
      let issueDate = new Date(daily[0][1]);
      issueDate = issueDate.toString(); 
      this.setState({
        data: daily,
        info: {
          title: daily[0][0],
          date: daily[0][1],
          dateLocal: issueDate,
          author: daily[0][2]
        },
        table: daily[1]
      })
    })  
  }
  render() {
    if (!this.state.data) {
      return <div />
    }
    return (
      <div className="container">
      <div id="daily-discussion">

        <h2>{this.state.info.title}</h2>
        <p><b>Issued (UTC):</b> {this.state.info.date}<br/>
        <b>Issued (local):</b> {this.state.info.dateLocal}<br/>
        {this.state.info.author}
        </p>

        <article>
          <h3>Last 30 Days - Geomagnetic Data</h3>
          <div dangerouslySetInnerHTML={{__html: this.state.table}} />
        </article>

        <EstimatedPlanetKGraph />

      </div>
    </div>
    )
  }
}

export default DailyReport;