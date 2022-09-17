const express = require('express');
const { json } = require('express');
const cors = require('cors');
const { CronJob } = require('cron');
const { koyfinJob } = require('./handler');
const { CrawlKoyfin } = require('./crawl-koyfin');

const SERVER_PORT = 3000;

async function main() {
    // global datastorage to use
    const crawlingDataStorage = [];

    /*
        Crawling Job Registering
        follow same pattern as koyfin
        1) make object with key, schedule(cron expression), task(function to do), data(data output of cronjob), status(does it succed on last attempt?)
        2) initialize data - maybe just fire up task function at the beginning
        3) push it to data storage
    */
    class Koyfin {
        constructor(key, schedule) {
            this.key = key;
            this.schedule = schedule;
            this.data = null;
            this.status = false;
        }
        async task() {
            let rawString;
            try {
                rawString = await koyfinJob();
            } catch (e) {
                rawString = '';
                this.status = false;
                console.log(`[${(new Date()).toISOString()}][${this.key}] job failed. Error:\n${JSON.stringify(e)}`);
                return;
            }
            this.data = rawString;
            this.status = true;
            console.log(`[${(new Date()).toISOString()}][${this.key}] job completed`);
        } 
    }

    const crawlKoyfin = new CrawlKoyfin();

    const koyfin = new Koyfin('koyfin', '0 * * * *');
    await koyfin.task();
    console.log(koyfin);
    crawlingDataStorage.push(koyfin);

    // fire cron job
    crawlingDataStorage.forEach(({ schedule, task }) => {
        const job = new CronJob(schedule, task, null, true, 'Asia/Seoul'); 
        job.start();
    });

    // HTTP Service
    const app = express();
    

    app.use(cors());
    app.use(json());

    app.get('/', (_, res) => {
        res.status(200).send("Crawler Service");
    });

    app.get('/:key', (req, res) => {
        const key = req.params.key;

        const filtered = crawlingDataStorage.filter(job => job.key == key);
        if (filtered.length == 0) {
            res.status(400).send('Invalid key');
            return;
        }

        const [ target ] = filtered;
        if (!target.status) {
            res.status(503).send('Currently unavailable. Please refer to log');
            return;
        }
        res.status(200).send(target.data);
    });

    app.listen(SERVER_PORT, () => {
        console.log(`Crawler Service is listening on localhost:${ SERVER_PORT }`);
    });
}

main();