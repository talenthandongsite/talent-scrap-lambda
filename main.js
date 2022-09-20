const puppeteer = require('puppeteer');

const NAVIGATION_TIMEOUT = 10000;
const TIMEOUT = 100000;

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
        defaultViewport: {
            width: 3600,
            height: 4000,
        },
        headless: true,
        ignoreHTTPSErrors: true
    });
    const page = await browser.newPage();

    page.setDefaultNavigationTimeout(NAVIGATION_TIMEOUT);
    page.setDefaultTimeout(TIMEOUT);

    await page.goto(LOGIN_URL, { waitUntil: "networkidle0" });
    await page.waitForNetworkIdle();

    const emailInput = await page.$("input[name=email]");
    const passwordInput = await page.$("input[name=password]");

    await emailInput.type(email);
    await passwordInput.type(password);

    await page.click('button[type="submit"]');
    await page.waitForNetworkIdle()
    
    await page.goto(WATCHLIST_URL, {waitUntil: "networkidle0" });
    await page.waitForNetworkIdle()

    const userBlocked = await page.$("div[class^=registered-users-only-message__root]");
    if (userBlocked) throw new Error("Somethings whent wrong while login to website");

    await page.waitForSelector("div[class^=base-table-row__root]", {timeout: 0});

    await page.click("button:has(> i.fa-compress-wide");

    const col = [];

    const headerRowSelector = "div[class^=sortable-header-row__sortableHeaderRow] > div > div > div[class^=header-cell-content__headerCellContent]";
    const headerRows = await page.$$eval(headerRowSelector, divs => divs.map(div => div.textContent.replace(/[,•]/g, '')));
    if (!headerRows || headerRows.length == 0) throw new Error("Something went wrong with getting header");
    col.push(headerRows);

    const bodyRowSelector = "#unclassified > div > div[class^=base-table-row__root]";
    const bodyRowCount = await page.$$eval(bodyRowSelector, divs => divs.length);
    if (!bodyRowCount || bodyRowCount == 0) throw new Error("Something went wrong with getting table body count");

    for (let i = 0; i < bodyRowCount; i++) {
        const selector = `${bodyRowSelector}:nth-child(${i + 1}) > div`;
        const rows = await page.$$eval(selector, divs => divs.map(div => div.textContent.replace(/[,•]/g, '')));
        if (!rows || rows.length) throw new Error("Something went wrong while getting table body");
        col.push(rows);
    }

    await browser.close();

    return col;
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
    process.stdout.write(JSON.stringify(JSON.stringify(data)) + '\n');

})();

module.exports = { crawlNasdaqData };