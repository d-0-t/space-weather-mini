class Parser {
  Prediction1h(data) {
    let tableData = Object.entries(data);
    let tableArr = [];

    for (let property in tableData) {
      let dateVal = tableData[property][1].model_prediction_time;
      let date = new Date(dateVal);
      let newDate = [
        date.getYear() + 1900,
        date.getMonth() + 1,
        date.getDate(),
        date.getHours(),
        date.getMinutes(),
      ];

      let i = 0;
      while (i < newDate.length) {
        if (String(newDate[i]).length === 1) {
          newDate[i] = "0" + String(newDate[i]);
        }
        i++;
      }

      //YYYY.MM.DD.hh:mm
      let newDateFormat =
        newDate[0] +
        "." +
        newDate[1] +
        "." +
        newDate[2] +
        ". " +
        newDate[3] +
        ":" +
        newDate[4];

      let kIndex = tableData[property][1].k;
      tableArr.push([newDateFormat, kIndex]);
    }

    return tableArr;
  }
}

export default Parser;
