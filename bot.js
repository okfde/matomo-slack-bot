import got from 'got';

const { MATOMO_SERVER, MATOMO_TOKEN, MATOMO_SITE_ID, SLACK_WEBHOOK, SITE_URL } =
	process.env;
const MIN_VISITS = 20;

const matomoUrl = `${MATOMO_SERVER}/index.php?date=previous1&period=week&expanded=1&filter_limit=100&force_api_session=1&format=JSON&idSite=${MATOMO_SITE_ID}&method=Actions.getPageUrls&module=API&segment=&token_auth=${MATOMO_TOKEN}`;

const stats = await got
	.get(matomoUrl)
	.json()
	.catch(error => console.log(error.response.body) && process.exit(1));

const firstPeriod = Object.keys(stats)[0];
const pageTree = stats[firstPeriod];

const isSignificant = (visits, parent) => {
	const sorted = parent.map(p => p.nb_visits).sort((a, b) => a - b);
	const mid = Math.ceil(parent.length / 2);

	const median =
		parent.length % 2 === 0
			? (sorted[mid] + sorted[mid - 1]) / 2
			: sorted[mid - 1];

	return visits >= median;
};

const prettyPath = (...sections) =>
	sections.map(s => s.replace(/^\/?(.*?)\/?$/, '$1')).join('/');

const goodPage = page =>
	!page.label.endsWith('/index') && !/^\/?[\?&]/.test(page.label);

const flattenTree = (tree, parent) => {
	const done = [];

	for (const page of tree) {
		const label = prettyPath(parent.label, page.label);
		const cleaned = { label, visits: page.nb_visits };

		const subPages = page.subtable?.filter(goodPage);

		if (subPages?.length) {
			done.push(...flattenTree(subPages, cleaned));
		} else if (cleaned.visits >= MIN_VISITS) {
			done.push(cleaned);
		}
	}

	return done
		.slice(0, 12)
		.filter(goodPage)
		.sort((a, b) => b.visits - a.visits);
};

const pageToMd = page => {
	const link = `<${SITE_URL + '/' + page.label.replace('/index', '')}|${
		page.label
	}>`;
	return `${link}: _${page.visits} visits_\n`;
};

const treeToBlocks = (tree, level = 0) => {
	const blocks = [];

	for (const page of tree) {
		const { label, nb_visits: visits } = page;

		if (!isSignificant(visits, tree)) continue;
		if (visits <= MIN_VISITS) continue;
		if (level > 3) continue;

		let text = pageToMd({ label, visits });

		if (page.subtable?.length) {
			const subtree = flattenTree(page.subtable, page);
			text += subtree
				.map(pageToMd)
				.map(t => `> ${t}`)
				.join('');
		}

		text = text.length > 3000 ? text.slice(0, 2999) + '…' : text;

		blocks.push({
			type: 'section',
			text: {
				type: 'mrkdwn',
				text
			}
		});
	}

	return blocks;
};

const attachments = [
	{
		color: '#0034a5',
		blocks: treeToBlocks(pageTree)
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
