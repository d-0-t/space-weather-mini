import '../Pages.css';
import React from 'react';
import Parser from '../../parser/TxtParser';
const parser = new Parser();

class WeeklyReport extends React.Component {
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
    fetch('https://services.swpc.noaa.gov/text/weekly.txt')
    .then((r) => r.text())
    .then(text  => {
      let weekly = text.replace(/\n/g,"<br/>");
      let weeklyData = parser.WeeklyParser(weekly);
      let issueDate = new Date(weeklyData[1]);
      issueDate = issueDate.toString();

      this.setState({
        data: weekly,
        weeklyReport: {
          title: weeklyData[0],
          date: weeklyData[1],
          dateLocal: issueDate,
          author: weeklyData[2],
          info: {
            highlights: {
              title: weeklyData[3][0][0],
              fromTo: weeklyData[3][0][1],
              description: weeklyData[3][0][2]
            },
            forecast: {
              title: weeklyData[3][1][0],
              fromTo: weeklyData[3][1][1],
              description: weeklyData[3][1][2]
            }
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
      <div id="weekly-discussion">

        <h2>{this.state.weeklyReport.title}</h2>
        <p>
          <b>Issued (UTC):</b> {this.state.weeklyReport.date}<br/>
          <b>Issued (local):</b> {this.state.weeklyReport.dateLocal}<br/>
          {this.state.weeklyReport.author}
        </p>
        <article>
          <h3>{this.state.weeklyReport.info.forecast.title}</h3>
          <b>{this.state.weeklyReport.info.forecast.fromTo}</b><br/>
          <div dangerouslySetInnerHTML={{__html: this.state.weeklyReport.info.forecast.description}} />
        </article>

        <article>
          <h3>{this.state.weeklyReport.info.highlights.title}</h3>
          <b>{this.state.weeklyReport.info.highlights.fromTo}</b><br/>
          <div dangerouslySetInnerHTML={{__html: this.state.weeklyReport.info.highlights.description}} />
        </article>
      </div>
    </div>
    )
  }
}

export default WeeklyReport;