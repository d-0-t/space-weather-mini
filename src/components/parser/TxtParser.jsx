let spaceRegex = /[\s][\s]+/g;

class Parser {
  Splitter(text, splitterArray) {
    let splitText = text;
    for (let i = 0; i < splitterArray.length; i++) {
      splitText = splitText.replace(splitterArray[i], "<SPLITTER_CELL>");
    }
    splitText = splitText.split("<SPLITTER_CELL>");
    return splitText;
  }
  FirstSpaceRemover(text) {
    text = text.split("");
    text.shift();
    text = text.join("");
    return text;
  }
  WordWrapper(text) {
    text = text
      .replaceAll("<br/><br/>", "<DOUBLEBREAK>")
      .replaceAll("<br/>", " ")
      .replaceAll("<DOUBLEBREAK>", "<br/><br/>");
    return text;
  }
  realLineBreak(text) {
    return text
      .replaceAll("<br/><br/>", "<DOUBLE_BR>")
      .replaceAll(".<br/>", "<PROPER_BR>")
      .replaceAll("<br/>", " ")
      .replaceAll("<PROPER_BR>", ".<br/>")
      .replaceAll("<DOUBLE_BR>", "<br/><br/>");
  }
  DateParser(dateNasaUTC, colonPosition) {
    if (colonPosition === undefined) {
      colonPosition = 14;
    }
    return [
      dateNasaUTC.slice(0, colonPosition),
      ":",
      dateNasaUTC.slice(colonPosition, dateNasaUTC.length),
    ].join("");
  }

  GeoAlertParser(geoAlert) {
    let split1 = [
      ":Product: ",
      ":Issued: ",
      "<br/># ",
      "<br/>#<br/>#",
      "<br/>#<br/>",
    ];
    let split2 = ["<br/><br/>", "<br/><br/>"];
    let filteredString = this.Splitter(geoAlert, split1);
    // Remove empty/unwanted data
    filteredString.shift();
    filteredString.splice(3, 1);
    filteredString[0] = filteredString[0].replace(" wwv.txt<br/>", "");
    // Fix date format for later use
    filteredString[1] = this.DateParser(filteredString[1]);
    filteredString[3] = this.Splitter(filteredString[3], split2);
    filteredString[3][2] = filteredString[3][2].replace("<br/>", "");

    return filteredString;
  }

  WeeklyParser(weekly) {
    let split1 = [
      ":Product: ",
      ":Issued: ",
      "<br/># ",
      "<br/>#<br/>#",
      "<br/>#<br/>",
    ];
    let split2 = [
      "Highlights of Solar and Geomagnetic Activity",
      "Forecast of Solar and Geomagnetic Activity",
    ];
    let split3 = ["<br/>", "<br/><br/>"];

    let filteredString = this.Splitter(weekly, split1);
    // Remove empty/unwanted line(s)
    filteredString.shift();
    filteredString[0] = filteredString[0].replace("<br/>", "");
    // Fix date format for later use
    filteredString[1] = this.DateParser(filteredString[1]);
    // Remove unwanted lines
    filteredString[2] = filteredString[2].split("<br/>").shift();
    filteredString.splice(3, 1);
    filteredString[3] = this.Splitter(filteredString[3], split2);
    filteredString[3].shift();
    filteredString[3][0] = this.Splitter(filteredString[3][0], split3);
    filteredString[3][1] = this.Splitter(filteredString[3][1], split3);
    filteredString[3][0][0] = split2[0];
    filteredString[3][1][0] = split2[1];
    filteredString[3][0][2] = this.WordWrapper(filteredString[3][0][2]);
    filteredString[3][1][2] = this.WordWrapper(filteredString[3][1][2]);

    return filteredString;
  }

  TwentySevenDays(xdays) {
    let split1 = [
      ":Product: ",
      " 27DO.txt<br/>:Issued: ",
      "<br/># ",
      "<br/># ",
      "<br/># ",
      "<br/>#<br/>#",
      "<br/>#",
      "<br/>#",
      "<br/>#",
      "<br/>#",
      "<br/>",
    ];
    let filteredString = this.Splitter(xdays, split1);
    // Remove empty/unwanted line(s)
    filteredString.shift();
    filteredString.splice(3, 7);
    let tableData = filteredString[3].split("<br/>");
    while (tableData[tableData.length - 1] === "") {
      tableData.pop();
    }
    // Prepare table section for "tablefication" :)
    let count = 0;
    while (count < tableData.length) {
      tableData[count] = tableData[count].split(spaceRegex);
      count++;
    }
    // Turn the table into renderable html
    function tableMaker27() {
      let rows = "";
      count = 0;
      while (count < tableData.length) {
        rows +=
          '<tr class="' +
          getKpClass(tableData[count][3]) +
          '"><td className="tableDate">' +
          tableData[count][0] +
          "</td><td className='radioFlux'>" +
          tableData[count][1] +
          "</td><td className='indexA'>" +
          tableData[count][2] +
          "</td><td className='indexKp'>" +
          tableData[count][3] +
          "</td></tr>";
        count++;
      }
      return rows;
    }
    let tableHead27 = `<thead><tr>
    <th className="tableHeader" scope="col">UTC<br/>Date</th>
    <th className="tableHeader" scope="col">Radio Flux<br/>(10.7 cm)</th>
    <th className="tableHeader" scope="col">Planetary<br/>A Index</th>
    <th className="tableHeader" scope="col">Largest<br/>Kp Index</th>
    </tr></thead>`;
    let htmlTable27 =
      "<table id='table27days'>" +
      tableHead27 +
      "<tbody>" +
      tableMaker27() +
      "</tbody></table>";

    // Remove useless ugly table from the basic info
    filteredString.pop();
    // Fix date
    filteredString[1] = this.DateParser(filteredString[1]);
    // One could also return "tableData", but I'm not gonna use it
    return [filteredString, htmlTable27];
  }

  DailyParser(daily) {
    let split1 = [
      ":Product: ",
      "DGD.txt<br/>:Issued: ",
      "<br/>#<br/>#",
      "<br/>#",
      "#",
      "#",
      "#",
      "#",
      "#",
      "#",
      "#",
      "#",
      "#",
      "#",
    ];
    let filteredString = this.Splitter(daily, split1);
    // Remove empty/unwanted line(s)
    filteredString.shift();
    filteredString[1] = this.DateParser(filteredString[1], 2);
    while (filteredString[2][0] === " ") {
      filteredString[2] = this.FirstSpaceRemover(filteredString[2]);
    }
    filteredString.splice(3, 7);
    filteredString[3] = this.Splitter(filteredString[3], ["<br/>"]);
    // Fix sub-header (remove empty cell)
    filteredString[3][0] = filteredString[3][0].split(spaceRegex);
    filteredString[3][0].shift();
    // Construct table body rows
    // Put space before minus signs to fix splitting issue
    filteredString[3][1] = filteredString[3][1].replaceAll("-", " -");
    filteredString[3][1] = filteredString[3][1].split("<br/>");

    for (let i = 0; i < filteredString[3][1].length - 1; i++) {
      // Split at date (first cell)
      let dateSplit = filteredString[3][1][i].match(
        /[\d]{4}[ ][\d]{2}[ ][\d]{2}/
      );
      filteredString[3][1][i] = filteredString[3][1][i].split(/[\s]+/g);
      filteredString[3][1][i].splice(0, 3);
      filteredString[3][1][i].unshift(dateSplit + "");
    }
    filteredString[3][1].pop();

    // Construct html table header and subheader
    let htmlTableHead = `<thead><tr>
    <th className="tableHeader" scope="col" colspan="1"></th>
    <th className="tableHeader" scope="col" colspan="9">Middle Latitude<br/>(Fredericksburg)</th>
    <th className="tableHeader" scope="col" colspan="9">High Latitude<br/>(College)</th>
    <th className="tableHeader" scope="col" colspan="9">Estimated<br/>Planetary</th>
    </tr></thead>`;
    function tableSubHeaderConstructor(subHeadArray) {
      let colspan;
      let counter = 0;
      let subHead = '<tr className="tableSubHeaderRow">';
      while (counter < subHeadArray.length) {
        if (counter === 0 || counter % 2 === 1) {
          colspan = "1";
        } else {
          colspan = 8;
        }
        subHead +=
          '<td cellType="tableSubHeader" colspan="' +
          colspan +
          '">' +
          subHeadArray[counter] +
          "</td>";
        counter++;
      }
      return subHead + "</tr>";
    }
    let htmlTableSubHead = tableSubHeaderConstructor(filteredString[3][0]);

    // Construct html body
    function htmlTableBodyConstructor(bodyArray) {
      let i = 0;
      let j;
      let bodyOfTable = "<tbody>" + htmlTableSubHead;
      while (i < bodyArray.length) {
        j = 0;
        bodyOfTable += "<tr>";
        while (j < bodyArray[i].length) {
          let valueIndicator;
          if (j === 1 || j === 10 || j === 19) {
            valueIndicator = "a-value";
          } else {
            valueIndicator = "kp-value";
          }
          const isKp = valueIndicator === "kp-value";

          bodyOfTable +=
            '<td cellType="tableBody" ' +
            'class="' +
            (isKp ? getKpClass(bodyArray[i][j]) : "a-value") +
            '">' +
            bodyArray[i][j] +
            "</td>";
          j++;
        }
        bodyOfTable += "</tr>";
        i++;
      }
      bodyOfTable += "</tbody>";
      return bodyOfTable;
    }

    let htmlTableBody = htmlTableBodyConstructor(filteredString[3][1]);

    let htmlTable =
      '<table id="table30days">' + htmlTableHead + htmlTableBody + "</table>";

    return [filteredString, htmlTable];
  }
}

function getKpClass(value) {
  const val = Number(value);
  if (isNaN(val) || value < 1) return "kp01";

  const a = Math.floor(value);
  const b = Math.ceil(value);
  if (value < 9) {
    if (a === b) return "kp" + a + (a + 1);
    else return "kp" + a + b;
  }
  return "kp9";
}

export default Parser;
