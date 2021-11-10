'use strict';

module.exports.scrap = async (event) => {

  const chromium = require('chrome-aws-lambda');
  const https = require('https')
  const http = require('http')

  /* Account and URL Info */
  const loginUrl = "https://app.koyfin.com/login";
  const watchlistUrl =
    "https://app.koyfin.com/myd/4af3aeda-0dfc-417d-a102-3f4c030d10e9";
  const loginInfo = {
    email: "handongtalent@gmail.com",
    password: "nasdaq15000!",
  };

 

  let fileStr;


  try {
    /********************************* */
    /* STEP 1. Start Puppeteer browser */
    /********************************* */

    const browser = await chromium.puppeteer.launch({
      args: chromium.args, 
      defaultViewport: {
        width: 3000,
        height: 5000
      }, 
      executablePath: await chromium.executablePath, 
      headless: true, ignoreHTTPSErrors: true, 
    });

    /********************** */
    /* STEP 2. Koyfin Login */
    /********************** */
    const page = await browser.newPage();
    await page.setDefaultNavigationTimeout(0); 
    await page.goto(loginUrl, { waitUntil: "networkidle0" });
  
    /* Enter email & password  */
    let emailInput = await page.waitForSelector("input[name=email]");
    let passwordInput = await page.waitForSelector("input[name=password]");
  
    await emailInput.type(loginInfo.email);
    await passwordInput.type(loginInfo.password);
  
    /* Login */
    await page.click('button[type="submit"]');

    /********************* */
    /* STEP 3. Scrap Data */
   /***********************/
  
   /* Navigate to My Dashboard -> Nasdaq100 Watchlist */
   await page.goto(watchlistUrl, { waitUntil: "networkidle0" });
 
   await page.waitForSelector(".base-table-row__root___2xxa_");
 
  fileStr = await page.evaluate(async () => {
 
       /* Function to convert csv row */
     const getConvertedCSVRows = (arr) => {
         let baseStr = "";
         arr.forEach((item, idx) => {
         if (item.textContent !== "") {
             let removedCommaStr = item.textContent.replace(/[,•]/g, '');
             baseStr += removedCommaStr + ",";
         }
         });
         baseStr = baseStr.replace(/,$/, "\r\n");
 
         return baseStr;
     };
 
     /* Click 'Full Display' (To render all column data) */
     //@ts-ignore
     await document.querySelector( ".koy-panel__stdHeaderActions___3LKQf").childNodes[1].click();
 
     /* Table Column Names */
   
     let columnRows = getConvertedCSVRows(
       //@ts-ignore
       document.querySelector(".header__headerRow___VI7O3").childNodes
     );
 
     /* Table Body Data*/
     let bodyRows = "";
     //@ts-ignore
     document
       .getElementsByClassName("base-table-row__root___2xxa_")
       //@ts-ignore
       .forEach((tickerRow, idx) => {
         let tickerRowStr = getConvertedCSVRows(tickerRow.childNodes);
         bodyRows += tickerRowStr;
       });
 
     return columnRows + bodyRows;
   });


  }catch(e){
   
    return {
      statusCode: 500,
      body: JSON.stringify(e)
    }
  } finally {

    const data = {
      data: fileStr
    }
    
    const sendData = JSON.stringify(data)

  const options = {
    hostname: 'talent-handong.site',
    port: 80,
    path: '/api/ndxBook/next',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': sendData.length
    }
  }
  console.log(sendData)
  const req = http.request(options, res => {
    
    return {
      statusCode: 200,
      res
    }

    res.on('data', d => {
      process.stdout.write(d)
    })
  })


  req.on('error', error => {
    console.error(error)
  })

  req.write(sendData)
  req.end()

  
}   
  return {
    statusCode: 200,
    data: {
      
    },
  };

  }

  

 
 

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // return { message: 'Go Serverless v1.0! Your function executed successfully!', event };

