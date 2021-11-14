import '../Pages.css';
import '../Tables.css';
import React from 'react';
import Parser from '../../parser/TxtParser';
const parser = new Parser();

class TwentySevenDays extends React.Component {
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
    fetch('https://services.swpc.noaa.gov/text/27-day-outlook.txt')
    .then((r) => r.text())
    .then(text  => {
      let data27 = text.replace(/\n/g,"<br/>");
      let info27 = parser.TwentySevenDays(data27)[0];
      let issueDate = new Date(info27[1]);
      issueDate = issueDate.toString();
      console.log(info27);
      let htmlTable27 = parser.TwentySevenDays(data27)[1];
      this.setState({
        data: data27,
        table: htmlTable27,
        info: {
          title: info27[0],
          date: info27[1],
          dateLocal: issueDate,
          author: info27[2]
        }
      })
    })  
  }
  render() {
    if (!this.state.table) {
      return <div />
    }
    return (
      <div className="container">
      <div id="27-days">

        <h2>{this.state.info.title}</h2>
        <p><b>Issued (UTC):</b> {this.state.info.date}<br/>
        <b>Issued (local):</b> {this.state.info.dateLocal}<br/>
        {this.state.info.author}
        </p>

        <article>
          <h3>Table</h3>
          <div dangerouslySetInnerHTML=
          {{__html: this.state.table}} />
        </article>

      </div>
    </div>
    )
  }
}

export default TwentySevenDays;