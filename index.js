const axios = require('axios');
const fs = require('fs');
const path = 'leads.csv';
const ObjectsToCsv = require('objects-to-csv');

const api_key = 'YOUR_API_KEY';
const now = Date.now();
let results = [];

async function makeRequest(firstName, lastName, domain) {
    try {
        const result = await axios({
            method: 'get',
            url: `https://api.lusha.com/person?firstName=${firstName}&lastName=${lastName}&domain=${domain}`,
            headers: {
                api_key,
            },
        });

        if (result.data)
            results.push(result.data.data);

        if (results.length > 10) {
            await writeToCSV();
        }
    } catch (err) {
        console.error(err);
    }
}

(async function () {
        const readStream = fs.createReadStream(path, { encoding: 'utf8' });

        for await (const chunk of readStream) {
            const contacts = chunk.split('\r\n').map(r => r.split(','));

            contacts.shift(); // remove the headers row

            for (const contact of contacts) {
                const [_, firstName, lastName, domain] = contact;

                if (!domain)
                    continue;

                const domains = domain.split(';');

                if (domains.length > 1) {
                    await Promise.all([
                        makeRequest(firstName, lastName, extractDomainFromEmail(domains[0])),
                        makeRequest(firstName, lastName, extractDomainFromEmail(domains[1])),
                    ]);
                } else {
                    await makeRequest(firstName, lastName, extractDomainFromEmail(domains[0]));
                }
            }
        }
    }
)();

async function writeToCSV() {
    const csv = new ObjectsToCsv(results);

    await csv.toDisk(`${now}-result.csv`, { append: true, allColumns: true });
    results = [];
}

function extractDomainFromEmail(email) {
    return email.split('@')[1];
}
