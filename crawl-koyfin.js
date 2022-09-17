const puppeteer = require('puppeteer');

const LOGIN_URL = "https://app.koyfin.com/login";

/**
 * @member
*/
class KoyfinInfo {
    email;
    password;
    watchlistUrl;
}

class CrawlKoyfin {
    #info;

    /**
     * @description
     * @param {KoyfinInfo} info
    */
    constructor(info) {
        this.#info = info;
    }

    /**
     * @return {}
    */
    async run() {

        const browser = await puppeteer.launch({
            defaultViewport: {
                width: 3000,
                height: 6000,
            },
            headless: true,
            ignoreHTTPSErrors: true
        });
        const page = await browser.newPage();

        await page.goto(LOGIN_URL, { waitUntil: "networkidle0" });

        /* enter email & password  */
        let emailInput = await page.waitForSelector("input[name=email]");
        let passwordInput = await page.waitForSelector("input[name=password]");

        await emailInput.type(this.#info.email);
        await passwordInput.type(this.#info.password);

        /* login */
        await page.click('button[type="submit"]');

        await page.waitForNetworkIdle()
        await page.goto(this.#info.watchlistUrl, {waitUntil: "networkidle0" });

        await page.waitForSelector("div[class^=base-table-row__root]");

        const data = await page.evaluate(async () => {
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

                console.debug(baseStr);
                return baseStr;
            };


            document.getElementsByClassName("fa-compress-wide")[0].parentElement.click();

            /* table column names */
            let columnRows = getConvertedCsvRows(
                //@ts-ignore
                document.querySelector("div[class^=sortable-header-row__sortableHeaderRow]").childNodes
            );

            /* table body data*/
            let bodyRows = "";
            //@ts-ignore
            document.getElementById("unclassified").childNodes[0].childNodes
            //@ts-ignore
                .forEach((tickerRow, idx) => {
                    let tickerrowStr = getConvertedCsvRows(tickerRow.childNodes);
                    bodyRows += tickerrowStr;
            });

            return columnRows + bodyRows;
        });


        console.debug(JSON.stringify(data));

        await browser.close();

    }
}

(async () => {
    const crawlKoyfin = new CrawlKoyfin({ 
        email: "handongtalent@gmail.com",
        password: "nasdaq15000!",
        watchlistUrl: "https://app.koyfin.com/myd/4af3aeda-0dfc-417d-a102-3f4c030d10e9"
    });

    await crawlKoyfin.run();
})();

module.exports = { CrawlKoyfin, KoyfinInfo };