const puppeteer = require('puppeteer');

const LOGIN_URL = "https://app.koyfin.com/login";
const WATCHLIST_URL = "https://app.koyfin.com/myd/4af3aeda-0dfc-417d-a102-3f4c030d10e9";

/**
 * @description This function conducts crawling of Nasdaq data from external source.
 * @param email {string} email address of account. This must be provided.
 * @param password {string} password for account. This must be provided.
 * @returns {string[][]} Array of strings with data. All data are stored as string. First row of array is header, 1~n elements are body row, and last row is summary row.
*/
async function crawlNasdaqData(email, password) {

    if (!email || !password) throw new Error("email, password parameter must be provided");

    const browser = await puppeteer.launch({
        timeout: 100000,
        defaultViewport: {
            width: 3000,
            height: 6000,
        },
        headless: true,
        ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();

    await page.goto(LOGIN_URL, { waitUntil: "networkidle0" });

    let emailInput = await page.waitForSelector("input[name=email]");
    let passwordInput = await page.waitForSelector("input[name=password]");

    await emailInput.type(email);
    await passwordInput.type(password);


    await page.click('button[type="submit"]');
    await page.waitForNetworkIdle()
    
    await page.goto(WATCHLIST_URL, {waitUntil: "networkidle0" });
    await page.waitForSelector("div[class^=base-table-row__root]");

    const data = await page.evaluate(async () => {
        function getConvertedCsvRows(elementArray) {
            const row = [];
            elementArray.forEach((item) => {
                if (item.textContent !== "") {
                    let removedCommaStr = item.textContent.replace(/[,•]/g, '');
                    row.push(removedCommaStr);
                }
            });
            return row;
        };

        document.getElementsByClassName("fa-compress-wide")[0].parentElement.click();

        const col = [];

        /* table column names */
        const headerRowElements = document.querySelector("div[class^=sortable-header-row__sortableHeaderRow]").childNodes;
        const columnRows = getConvertedCsvRows(headerRowElements);
        col.push(columnRows);

        /* table body data*/
        const bodyRowElements = document.getElementById("unclassified").childNodes[0].childNodes
        bodyRowElements.forEach((tickerRow) => {
            const eachRow = getConvertedCsvRows(tickerRow.childNodes);
            col.push(eachRow);
        });

        return col;
    });

    await browser.close();

    return data;
}

/**
 * @description Main function of this script. This function is for running this script standalone. If crawling is required as imported functions, import crawlNasdaqData function and use it.
 * @arguments 1) email, 2) password must be provided
*/
(async () => {
    let email;
    let password;

    if (process.argv.length < 4) throw new Error("must provide email, password arguments");
    email = process.argv[2];
    password = process.argv[3];

    const data = await crawlNasdaqData(email, password);
    process.stdout.write(JSON.stringify(data) + '\n');

})();

module.exports = { crawlNasdaqData };