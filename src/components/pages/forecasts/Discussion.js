import '../Pages.css';
import React from 'react';
import Parser from '../../parser/TxtParser';
const parser = new Parser();

class ForecastDiscussion extends React.Component {
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
    fetch('https://services.swpc.noaa.gov/text/discussion.txt')
    .then((r) => r.text())
    .then(text  => {
      let discussion = text.replace(/\n/g,"<br/>");
      let parsedDiscussionArr = parser.DiscussionParser(discussion);
      let issueDate = new Date(parsedDiscussionArr[0][1]);
      issueDate = issueDate.toString();
      this.setState({
        data: discussion,
        parsedDiscussion: {
          info: {
            title: parsedDiscussionArr[0][0],
            dateLocal: issueDate,
            date: parsedDiscussionArr[0][1],
            author: parsedDiscussionArr[0][2]
          },
          solarActivity: {
            daySummary: parsedDiscussionArr[1][0],
            forecast: parsedDiscussionArr[1][1]
          },
          energeticParticle: {
            daySummary: parsedDiscussionArr[2][0],
            forecast: parsedDiscussionArr[2][1]
          },
          solarWind: {
            daySummary: parsedDiscussionArr[3][0],
            forecast: parsedDiscussionArr[3][1]
          },
          geospace: {
            daySummary: parsedDiscussionArr[4][0],
            forecast: parsedDiscussionArr[4][1]
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
      <div id="nasa-discussion">

        <h2>Forecast Discussion</h2>
        <p><b>Issued (UTC):</b> {this.state.parsedDiscussion.info.date}<br/>
        <b>Issued (local):</b> {this.state.parsedDiscussion.info.dateLocal}<br/>
        {this.state.parsedDiscussion.info.author}
        </p>
        <article>
          <h3>Solar Activity</h3>
          <h4>Forecast</h4>
          <p>{this.state.parsedDiscussion.solarActivity.forecast}</p>
          <h4>24h Summary</h4>
          <p>{this.state.parsedDiscussion.solarActivity.daySummary}</p>
        </article>

        <article>
          <h3>Energetic Particle</h3>
          <h4>Forecast</h4>
          <p>{this.state.parsedDiscussion.energeticParticle.forecast}</p>
          <h4>24h Summary</h4>
          <p>{this.state.parsedDiscussion.energeticParticle.daySummary}</p>
        </article>

        <article>
          <h3>Solar Wind</h3>
          <h4>Forecast</h4>
          <p>{this.state.parsedDiscussion.solarWind.forecast}</p>
          <h4>24h Summary</h4>
          <p>{this.state.parsedDiscussion.solarWind.daySummary}</p>
        </article>

        <article>
          <h3>GeoSpace</h3>
          <h4>Forecast</h4>
          <p>{this.state.parsedDiscussion.geospace.forecast}</p>
          <h4>24h Summary</h4>
          <p>{this.state.parsedDiscussion.geospace.daySummary}</p>
        </article>

      </div>
    </div>
    )
  }
}

export default ForecastDiscussion;