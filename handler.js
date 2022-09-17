'use strict';

async function koyfinJob () {
	/* account and url info */
	const loginUrl = "https://app.koyfin.com/login";
	const watchlistUrl = "https://app.koyfin.com/myd/4af3aeda-0dfc-417d-a102-3f4c030d10e9";
	const loginInfo = {
		email: "handongtalent@gmail.com",
		password: "nasdaq15000!",
	};

	/********************************* */
	/* step 1. start puppeteer browser */
	/********************************* */
	const chromium = require('chrome-aws-lambda');
	const path = await chromium.executablePath;
	puppeteer = chromium.puppeteer;

	console.log("starting...");

	const browser = await puppeteer.launch({
		args: chromium.args,
		defaultViewport: {
			width: 3000,
			height: 5000
		}, 
		executablePath: path,
		headless: true,
		ignoreHTTPSErrors: true
	}); 

	/********************** */
	/* step 2. koyfin login */
	/********************** */
	const page = await browser.newPage();
	await page.setDefaultNavigationTimeout(0); 
	await page.goto(loginUrl, { waitUntil: "networkidle0" });

	/* enter email & password  */
	let emailInput = await page.waitForSelector("input[name=email]");
	let passwordInput = await page.waitForSelector("input[name=password]");

	await emailInput.type(loginInfo.email);
	await passwordInput.type(loginInfo.password);

	/* login */
	await page.click('button[type="submit"]');

	/********************* */
	/* step 3. scrap data */
	/***********************/

	/* navigate to my dashboard -> nasdaq100 watchlist */
	await page.goto(watchlistUrl, { waitUntil: "networkidle0" });
	
	await page.waitForSelector(".base-table-row__root___2xxa_");
	
	fileStr = await page.evaluate(async () => {
		/* function to convert csv row */
		const getConvertedCsvRows = (arr) => {
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

		/* click 'full display' (to render all column data) */
		//@ts-ignore
		await document.querySelector( ".koy-panel__stdHeaderActions___3LKQf").childNodes[1].click();
	
		/* table column names */
		let columnRows = getConvertedCsvRows(
			//@ts-ignore
			document.querySelector(".header__headerRow___VI7O3").childNodes
		);

		/* table body data*/
		let bodyRows = "";
		//@ts-ignore
		document.getElementsByClassName("base-table-row__root___2xxa_")
		//@ts-ignore
			.forEach((tickerRow, idx) => {
				let tickerrowStr = getConvertedCsvRows(tickerRow.childNodes);
				bodyRows += tickerrowStr;
		});
	
		return columnRows + bodyRows;
	});
	const data = {
		data: fileStr
	}
	return JSON.stringify(data)
}

async function scrap (event) {
	let data;
	try {
 		data = await koyfinJob();
	} catch (e) {
		return {
			statusCode: 500,
			body: JSON.stringify(e)
		}
	}

	const http = new XMLHttpRequest();
	const url = 'http://talent-handong.site/api/ndxbook/next';
	http.open('POST', url, true);

	//Send the proper header information along with the request
	http.setRequestHeader('Content-type', 'application/json');

	http.onreadystatechange = function() { //Call a function when the state changes.
		if(http.readyState == 4 && http.status == 200) {
			return {
				status: 200,
				data: data
			};
		}
	}
	http.timeout = 5000; // time in milliseconds
	http.ontimeout = function (e) {
		return {
			statusCode: 500,
			body: JSON.stringify(e)
		}
	};
	http.send(crawlResultRawString);
}   

module.exports = { koyfinJob, scrap };
 
// Use this code if you don't use the http event with the LAMBDA-PROXY integration
// return { message: 'Go Serverless v1.0! Your function executed successfully!', event };

