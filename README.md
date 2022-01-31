# Matomo Slack Bot

Posts weekly site stats in Slack, like this:

> [okfde](https://github.com/okfde/): 1000 visits
>
> > [okfde/froide](https://github.com/okfde/froide): 800 visits
> >
> > [okfde/matomo-slack-bot](https://github.com/okfde/matomo-slack-bot): 160 visits

## How to install

1. Fork this repo.
2. Create a [Slack Webhook](https://api.slack.com/messaging/webhooks) and save the URL as a Github Secret named `SLACK_WEBHOOK` (repo settings -> Secrets -> Actions).
3. Create a Matomo Token by navigating to Settings -> Personal -> Security -> Authentification tokens and save it as secret `MATOMO_TOKEN`.
4. Create the secrets `MATOMO_SERVER` with your Matomo URL (e.g. `https://matomo.example.com`), `SITE_ID` with your Matomo site identifier (can be found in the dashboard url: `/index.php?module=CoreHome&action=index&idSite=123&...`, in this case `123`) and `SITE_URL` (your website's URL, e.g. `https://example.com`)
5. Trigger the action manually to test it by going to Actions -> post -> Run workflow.
6. By default, the bot will send the updates every Monday on 10 AM CEST. You can change this in the [workflow file](.github/workflows/post.yml).
