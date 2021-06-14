import got from 'got';

const { MATOMO_SERVER, MATOMO_TOKEN, MATOMO_SITE_ID, SLACK_WEBHOOK } =
	process.env;
const MIN_VISITS = 20;

const matomoUrl = `${MATOMO_SERVER}/index.php?date=previous1&period=week&expanded=1&filter_limit=100&force_api_session=1&format=JSON&idSite=${MATOMO_SITE_ID}&method=Actions.getPageUrls&module=API&segment=&token_auth=${MATOMO_TOKEN}`;

const stats = await got
	.get(matomoUrl)
	.json()
	.catch(error => console.log(error.response.body));

const firstPeriod = Object.keys(stats)[0];
const pageTree = stats[firstPeriod];

let level = 0;
const mapPage = page => ({
	label: page.label,
	visits: page.nb_visits,
	subTree:
		level++ === 0 &&
		page.subtable?.map(mapPage).filter(page => page.visits >= MIN_VISITS)
});

const pages = pageTree
	.map(page => {
		level = 0;
		return mapPage(page);
	})
	.filter(page => page.visits >= MIN_VISITS);

const pageToMd = page => {
	let text = `*${page.label}*: _${page.visits} visits_\n`;

	if (page.subTree) {
		text += page.subTree
			.map(pageToMd)
			.map(t => `> ${t}`)
			.join('');
	}

	return text.length > 3000 ? text.slice(0, 2999) + '…' : text;
};

const attachments = [
	{
		color: '#0034a5',
		blocks: pages.map(page => ({
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: pageToMd(page)
			}
		}))
	}
];

const matomoUiLink = `${MATOMO_SERVER}/index.php?module=CoreHome&action=index&idSite=${MATOMO_SITE_ID}&period=week&date=yesterday#?idSite=${MATOMO_SITE_ID}&period=week&date=yesterday&segment=&category=General_Actions&subcategory=General_Pages`;

const message = {
	blocks: [
		{
			type: 'section',
			text: {
				type: 'mrkdwn',
				text: `Here are the stats for ${firstPeriod} from <${matomoUiLink}|Matomo>.`
			}
		}
	],
	attachments
};

try {
	await got.post(SLACK_WEBHOOK, { json: message });
	console.log('sent!');
} catch (error) {
	console.log(error.response.body);
}
