import '../Pages.css';
import '../Tables.css';
import React from 'react';
import Parser from '../../parser/TxtParser';
const parser = new Parser();

class ThreeDaysReport extends React.Component {
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
    fetch('https://services.swpc.noaa.gov/text/3-day-forecast.txt')
    .then((r) => r.text())
    .then(text  => {
      let data3days = text.replace(/\n/g,"<br/>");
      data3days = parser.ThreeDays(data3days);

      let issueDate = new Date(data3days[0][1]);
      issueDate = issueDate.toString();

      console.log(data3days);

      this.setState({
        data: data3days,
        info: {
          title: data3days[0][0],
          date: data3days[0][1],
          dateLocal: issueDate,
          author: data3days[0][2]
        },
        descriptions: {
          geomagnetism: {
            title: data3days[0][3][0],
            details: data3days[0][3][1],
            regionale: data3days[0][3][2],
          },
          solarRadiation: {
            title: data3days[0][4][0],
            details: data3days[0][4][1],
            regionale: data3days[0][4][2],
          },
          radioBlackouts: {
            title: data3days[0][5][0],
            details: data3days[0][5][1],
            regionale: data3days[0][5][2],
          }
        },
        tables: {
          table_kp: data3days[1],
          table_srs: data3days[2],
          table_radio: data3days[3]
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
      <div id="3-days">

        <h2>{this.state.info.title}</h2>
        <p><b>Issued (UTC):</b> {this.state.info.date}<br/>
        <b>Issued (local):</b> {this.state.info.dateLocal}<br/>
        {this.state.info.author}
        </p>

        <article>
          <h3>{this.state.descriptions.geomagnetism.title}</h3>
          <p>
            <div dangerouslySetInnerHTML=
            {{__html: this.state.descriptions.geomagnetism.details}} />
          </p>
          <div dangerouslySetInnerHTML=
          {{__html: this.state.tables.table_kp}} />
          <p>
            <div dangerouslySetInnerHTML=
            {{__html: this.state.descriptions.geomagnetism.regionale}} />
          </p>
        </article>

        <article>
          <h3>{this.state.descriptions.solarRadiation.title}</h3>
          <p>
            <div dangerouslySetInnerHTML=
            {{__html: this.state.descriptions.solarRadiation.details}} />
          </p>
          <div dangerouslySetInnerHTML=
          {{__html: this.state.tables.table_srs}} />
          <p>
            <div dangerouslySetInnerHTML=
            {{__html: this.state.descriptions.solarRadiation.regionale}} />
          </p>
        </article>

        <article>
          <h3>{this.state.descriptions.radioBlackouts.title}</h3>
          <p>
            <div dangerouslySetInnerHTML=
            {{__html: this.state.descriptions.radioBlackouts.details}} />
          </p>
          <div dangerouslySetInnerHTML=
          {{__html: this.state.tables.table_radio}} />
          <p>
            <div dangerouslySetInnerHTML=
            {{__html: this.state.descriptions.radioBlackouts.regionale}} />
          </p>
        </article>

      </div>
    </div>
    )
  }
}

export default ThreeDaysReport;