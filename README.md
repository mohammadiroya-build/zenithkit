# Deployment package

The prebuilt app is in `dist/`, and the contract drafting endpoint is in `workers/contracts.mjs`.

## Deploy from GitHub

Commit the contents of this archive at the root of the repository connected to Cloudflare Workers Builds, not inside an additional folder. Keep `wrangler.jsonc`, `workers/` and `dist/` together. The existing Worker name is preserved in its configuration.

With the [default Workers Builds settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), the build command can stay empty. Cloudflare installs its pinned deployment CLI automatically and reads the static asset directory, assistant route, and separate production and [Preview bindings](https://developers.cloudflare.com/workers/previews/configuration/) from `wrangler.jsonc`. No separate frontend build, local dependency installation, or client-side API key is needed.

For static hosting, upload the contents of `dist/` to the web root. The compiler, OpenZeppelin sources and quick templates come from that directory. Custom description-to-Solidity drafting needs the same-origin Worker endpoint configured in the full package. A static upload cannot run that endpoint.

## Contract workspace

- Custom compiler and Contract Assistant require an explicit choice of Solidity 0.8.28 or 0.8.24 before typing or pasting. Both versions target EVM Paris. Pasted source must have a compatible pragma.
- OpenZeppelin Contracts and Contracts Upgradeable 5.0.2 are included. Imports may use the scoped package name, the `@5.0.2` suffix, or a `node_modules/` prefix. For other libraries and versions, upload the required `.sol` files or use Standard JSON with embedded sources and remappings. If an upload overrides the bundled unversioned package with different source, supply that package's full dependency tree rather than mixing releases.
- Quick templates compile in the browser without an account or model download. Hosted drafting passes custom and multilingual requests through the Workers AI binding. [Cloudflare's usage allowance and billing](https://developers.cloudflare.com/workers-ai/platform/pricing/) apply at the account level; rate limits are not a global spending cap.
- Hosted drafting receives the description and, for compiler repair, the draft and compiler error. Do not include credentials or private source. Review the source before deploying.
- Existing ready-contract artifacts are retained. New transparent proxy deployments use the 0.8.28 proxy and ProxyAdmin artifacts; legacy artifacts remain available for existing contracts.
- Implementation and proxy transactions are estimated separately. A proxy needs two approvals. Use the wallet's quoted amount before signing and the receipt fee after confirmation.
- Verify compares runtime bytecode on Zenith with the compilation output without submitting a transaction. It does not publish or verify source on the [Zenith explorer](https://docs.zenith.network/zenith-testnet).

## Smoke check

Open `/#/deploy`. In Contract Assistant, select a compiler and build the Number storage example. On the Worker deployment, try a custom request. Switch to Custom compiler, select the same version, and paste the Solidity. Repeat for the other compiler. No wallet or private key is needed for compilation.
