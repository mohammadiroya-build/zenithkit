# Zenith Kit

Zenith Kit is a Zenith Testnet playground. The prebuilt site is in `dist/`, and the contract drafting endpoint is in `workers/contracts.mjs`

## Deploy from GitHub

The existing `zenithkit` Cloudflare Workers Builds connection deploys the `main` branch. The [standard deploy command](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) reads `wrangler.jsonc` in the repository root. No separate site build or client-side API key is needed. The lockfile and Node version file pin the tools for [Cloudflare's build environment](https://developers.cloudflare.com/workers/ci-cd/builds/build-image/)

## Contract workspace

- Quick templates compile in your browser without an account or model download. Hosted drafting takes custom or multilingual requests directly through a Workers AI binding on your Cloudflare account, so you do not need to add a key to the frontend
- Gemma 4 runs within [Cloudflare’s Workers AI allocation](https://developers.cloudflare.com/workers-ai/platform/pricing/) on the Free plan. The allowance is shared at account level. Paid plans can incur overage charges. The Worker uses client and shared per-location rate limits, not a global spending cap
- Hosted drafting receives the description and, for a compiler repair, the draft and compiler error. Do not include credentials or private source. Treat all drafts as unaudited. Time limits, cancellation and manual Solidity input remain available
- Ready contracts use compact artifacts when the build comparison shows a smaller deployment footprint. The compiler versions, settings, ABIs and contract sources are reproducible using `node tools/build-deploy-artifacts.mjs /path/to/solc-0.8.30/soljson.js`. Prior artifacts remain available for older deployments
- Each implementation and proxy transaction gets a fresh Zenith RPC gas estimate. When available, recent included tips inform the EIP-1559 quote, with an RPC or wallet fallback. A proxy still costs more than direct deployment and needs a second approval. Use the wallet’s quoted amount before signing and the receipt fee after confirmation
- Verify reads runtime bytecode from Zenith and compares it with the selected compile output without creating a transaction. It does not mean source has been published or verified by the [Zenith explorer](https://docs.zenith.network/zenith-testnet). Where constructor immutables or metadata are excluded, the result says so

## Smoke check

Open `/#/deploy`. Build the Number storage example, then try a custom request if Workers AI is enabled. Switch to Custom compiler, paste copied Solidity, and check that compilation succeeds. Verify can be tested with a known address without paying gas. Neither the wallet nor a private key is needed for the smoke check
