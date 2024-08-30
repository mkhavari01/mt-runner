function getDailyMinEquity(data) {
  // console.log("data is: ",data)
  // console.log("last data is: ",data[data.length])
  // console.log("last data is: ",data[data.length -1])
  // console.log("last data is: ",data[data.length -2])
  const equityByDate = {};

  for (const entry of data) {
      const date = entry.Time.split('T')[0]; // Extract the date part
      const equity = entry.Equity;

      if (!equityByDate[date] || equity < equityByDate[date]) {
          equityByDate[date] = equity;
      }
  }

  return equityByDate;
}

async function main() {
  const result = await fetch("https://socket.unfxco.com/analys/equity_chart", {
    headers: {
      accept: "*/*",
      "accept-language": "en-US,en;q=0.9,fa;q=0.8",
      "content-type": "text/plain;charset=UTF-8",
      "sec-ch-ua":
        '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      Referer: "https://unfxb.com/",
      "Referrer-Policy": "strict-origin-when-cross-origin",
    },
    body: '{"Group":"demo\\\\PROP Trading Normal","Login":"272802","StartBalance":10000}',
    method: "POST",
  });
  const response = await result.json()
  console.log("result is: ", response);
  const dailyMinEquity = getDailyMinEquity(response.Chart);
  console.log(dailyMinEquity);

}

main()