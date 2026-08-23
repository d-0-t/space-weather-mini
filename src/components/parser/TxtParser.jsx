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

  DiscussionParser(discussion) {
    // Arrays of splitters on different levels
    let split1 = [
      ":Product: ",
      "Solar Activity",
      "Energetic Particle",
      "Solar Wind",
      "Geospace",
    ];
    let split2 = [".24 hr Summary...", ".Forecast..."];
    let split3 = [":Issued: ", "<br/># "];
    let split4 = ["<br/>", "#"];
    let filteredString = this.Splitter(discussion, split1);
    // Get rid of unwanted data cell, then do another split
    filteredString.shift();
    filteredString[0] = this.Splitter(filteredString[0], split3);
    // Split details
    for (let i = 0; i < filteredString[0].length; i++) {
      filteredString[0][i] = filteredString[0][i]
        .replaceAll(split4[0], "")
        .replace(split4[1], "");
    }
    // Wrap and split sections
    for (let i = 1; i < filteredString.length; i++) {
      filteredString[i] = filteredString[i].replace(/<br\/>/g, " ");
      filteredString[i] = this.Splitter(filteredString[i], split2);
      filteredString[i].shift();
      for (let j = 0; j < filteredString[i].length; j++) {
        filteredString[i][j] = filteredString[i][j].replace("  ", "");

        if (filteredString[i][j][0] === " ") {
          filteredString[i][j] = this.FirstSpaceRemover(filteredString[i][j]);
        }
      }
    }
    // Fix date format
    filteredString[0][1] = this.DateParser(filteredString[0][1]);

    return filteredString;
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

  ThreeDays(three) {
    let split1 = [
      ":Product: ",
      "<br/>:Issued: ",
      "<br/># ",
      "<br/>#<br/>A. NOAA ",
      "<br/><br/>B. NOAA ",
      "<br/><br/>C. NOAA ",
    ];

    let filteredString = this.Splitter(three, split1);
    // Remove empty cell
    filteredString.shift();
    // Fix date
    filteredString[1] = this.DateParser(filteredString[1]);

    // Some line breaks are unwanted.
    // Remove <br/> if it's not at the end of the sentence.
    filteredString[3] = this.realLineBreak(filteredString[3]);
    filteredString[3] = filteredString[3].split("<br/><br/>");

    // Let's make our Kp index table
    let table_kp = filteredString[3]
      .splice(2, 2)
      .join("<TITLE_BR>")
      .split("<TITLE_BR>");
    table_kp[1] = table_kp[1]
      .replace(" 00-03UT", "<HEAD>00-03UT")
      .split("<HEAD>");

    // This will be the table head:
    table_kp[1][0] = table_kp[1][0].split(spaceRegex);
    // And this will be its body:
    table_kp[1][1] = table_kp[1][1].split(spaceRegex);
    table_kp[1][1].pop();
    // We want 8 rows, each with 4 cell, for convenience
    let table_kp_body = [[], [], [], [], [], [], [], []];
    for (let i = 0; i < 32; i += 4) {
      table_kp_body[i / 4].push(
        table_kp[1][1][i + 0],
        table_kp[1][1][i + 1],
        table_kp[1][1][i + 2],
        table_kp[1][1][i + 3]
      );
    }
    table_kp[1][1] = table_kp_body;

    // Second table: solar radiation storm
    filteredString[4] = this.realLineBreak(filteredString[4]);
    filteredString[4] = filteredString[4].split("<br/><br/>");
    // We want a table head
    let table_srs = filteredString[4].splice(2, 2);
    table_srs[1] = table_srs[1].replace(" S1", "<HEAD>S1").split("<HEAD>");
    filteredString[4].splice(3, 2);
    table_srs[1][0] = table_srs[1][0].split(spaceRegex);
    table_srs[1][1] = table_srs[1][1].split(spaceRegex);

    // Third table: radio blackout forecast
    filteredString[5] = this.realLineBreak(filteredString[5]);
    filteredString[5] = filteredString[5].split("<br/><br/>");

    let table_radio = filteredString[5].splice(2, 2);
    table_radio[1] = table_radio[1].replace(" R1", "<HEAD>R1").split("<HEAD>");
    filteredString[5].splice(3, 2);
    table_radio[1][0] = table_radio[1][0].split(spaceRegex);
    table_radio[1][1] = table_radio[1][1]
      .replace(" R3", "<SPLIT>R3")
      .split("<SPLIT>");
    table_radio[1][1][0] = table_radio[1][1][0].split(spaceRegex);
    table_radio[1][1][1] = table_radio[1][1][1].split(spaceRegex);

    // Construct html table 1
    let htmlTable3KpHead =
      `<thead><tr>
    <th className="tableHeader" scope="col"></th>
    <th className="tableHeader" scope="col">` +
      table_kp[1][0][1] +
      `</th>
    <th className="tableHeader" scope="col">` +
      table_kp[1][0][2] +
      `</th>
    <th className="tableHeader" scope="col">` +
      table_kp[1][0][3] +
      `</th>
    </tr></thead>`;
    function tableMaker3Kp(tableData) {
      let rows = "";
      let count = 0;

      while (count < tableData.length) {
        rows += '<tr><td class="date">' + tableData[count][0] + "</td>";
        for (let i = 1; i < 4; i++) rows += getCell(tableData[count][i]);
        rows += "</tr>";
        count++;
      }
      return rows;
    }
    let htmlTable3Kp =
      "<table id='table3days_kp'>" +
      htmlTable3KpHead +
      "<tbody>" +
      tableMaker3Kp(table_kp[1][1]) +
      "</tbody></table>";

    // Construct html table 2
    let htmlTable3SrsHead =
      `<thead><tr>
    <th className="tableHeader" scope="col"></th>
    <th className="tableHeader" scope="col">` +
      table_srs[1][0][1] +
      `</th>
    <th className="tableHeader" scope="col">` +
      table_srs[1][0][2] +
      `</th>
    <th className="tableHeader" scope="col">` +
      table_srs[1][0][3] +
      `</th>
    </tr></thead>`;
    let htmlTable3SrsBody =
      '<tbody><tr><td rowTitle="' +
      table_srs[1][1][0] +
      '" className="valAtDate">' +
      table_srs[1][1][0] +
      '</td><td percent="' +
      table_srs[1][1][1] +
      '" className="valAtDate">' +
      table_srs[1][1][1] +
      '</td><td percent="' +
      table_srs[1][1][2] +
      '" className="valAtDate">' +
      table_srs[1][1][2] +
      '</td><td percent="' +
      table_srs[1][1][3] +
      '" className="valAtDate">' +
      table_srs[1][1][3] +
      "</td></tr></tbody>";
    let htmlTable3Srs =
      "<table id='table3days_srs'>" +
      htmlTable3SrsHead +
      htmlTable3SrsBody +
      "</table>";

    // Construct html table 3
    let htmlTable3radioHead =
      `<thead><tr>
    <th className="tableHeader" scope="col"></th>
    <th className="tableHeader" scope="col">` +
      table_radio[1][0][1] +
      `</th>
    <th className="tableHeader" scope="col">` +
      table_radio[1][0][2] +
      `</th>
    <th className="tableHeader" scope="col">` +
      table_radio[1][0][3] +
      `</th>
    </tr></thead>`;
    function tableMaker3Radio(tableData) {
      let rows = "";
      let count = 0;
      while (count < tableData.length) {
        rows +=
          '<tr><td rowTitle="' +
          tableData[count][0] +
          '" className="valAtDate">' +
          tableData[count][0] +
          '</td><td percent="' +
          tableData[count][1] +
          '" className="valAtDate">' +
          tableData[count][1] +
          '</td><td percent="' +
          tableData[count][2] +
          '" className="valAtDate">' +
          tableData[count][2] +
          '</td><td percent="' +
          tableData[count][3] +
          '" className="valAtDate">' +
          tableData[count][3] +
          "</td></tr>";
        count++;
      }
      return rows;
    }
    let htmlTable3radio =
      "<table id='table3days_radio'>" +
      htmlTable3radioHead +
      "<tbody>" +
      tableMaker3Radio(table_radio[1][1]) +
      "</tbody></table>";

    return [
      filteredString /*table_kp, table_srs, table_radio,*/,
      htmlTable3Kp,
      htmlTable3Srs,
      htmlTable3radio,
    ];
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

function getCell(value) {
  return '<td class="valAtDate ' + getKpClass(value) + '"">' + value + "</td>";
}

export default Parser;
