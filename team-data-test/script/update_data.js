// to be ran from github actions

// dependencies
require('dotenv').config();
const fs = require('fs');



async function downloadAllFRCData() { // updates all frc team data in build/frc-team-data

    // get passwords from .env
    const env_username = process.env.FRC_USERNAME;
    const env_apiKey = process.env.FRC_API_KEY

    // get credentials to get data from the api 
    const credentials = getCredentials(env_username, env_apiKey);

        // start at page one
        let pageNumber = 1;

        let totalYearData = [];

        while (true) {
            let pageData = await getPageData(pageNumber, credentials, 2026);

            // if missing pageData, break
            if (pageData === null || !pageData.teams || pageNumber > pageData.pageTotal) {
                console.error("pageData ran out on page: " + pageNumber);
                break;
            }

            // add the page to the year and move on the next page
            totalYearData = totalYearData.concat(pageData.teams);
            // console.log("Page gotten: " + pageNumber)
            pageNumber++

        }

        saveJsonData(totalYearData,);

    }


async function saveJsonData(jsonData) {
    if (jsonData.length > 0) {
        fs.writeFileSync(`./team-data-test/build/frc-team-data/teams.json`, JSON.stringify(jsonData, null, 2));
        console.log(`jsonData saved to teams.json`)
    } else {
    }
}

async function getPageData(pageNumber, credentials, year) {

    const url = `https://frc-api.firstinspires.org/v3.0/${year}/teams?page=${pageNumber}`;

    try {
        const response = await fetch(url, {
            headers: {
                'Authorization': `Basic ${credentials}`,
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            console.error("Response failed");
            return null;
        }

        const rawText = await response.text();

        return JSON.parse(rawText);

    } catch (error) {
        console.error("Error: couldn't get page data: " + error);
    }

    return null;
}

function getCredentials(username, password) {
    if (!username || !password) { // if missing username or password
        console.error('Error: null username or password');
        process.exit(1);
    }
    return Buffer.from(`${username}:${password}`).toString('base64');
}

downloadAllFRCData();

