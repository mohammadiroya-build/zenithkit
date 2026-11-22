# Deployment package

The prebuilt app is in `dist/`, and the contract drafting endpoint is in `workers/contracts.mjs`.

## Deploy from GitHub

Commit the contents of this archive at the root of the repository connected to Cloudflare Workers Builds, not inside an additional folder. Keep `wrangler.jsonc`, `workers/` and `dist/` together. The existing Worker name is preserved in its configuration.

With the [default Workers Builds settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), the build command can stay empty. Cloudflare installs its pinned deployment CLI automatically and reads the static asset directory, assistant route, and separate production and [Preview bindings](https://developers.cloudflare.com/workers/previews/configuration/) from `wrangler.jsonc`. No separate frontend build, local dependency installation, or client-side API key is needed.

For static hosting, upload the contents of `dist/` to the web root. The compiler, OpenZeppelin sources and quick templates come from that directory. Custom description-to-Solidity drafting needs the same-origin Worker endpoint configured in the full package. A static upload cannot run that endpoint.

## Contract workspace

- Custom compiler and Contract Assistant require an explicit choice of Solidity 0.8.28 or 0.8.24 before typing or pasting. Both versions target EVM Paris. Pasted source must have a compatible pragma.
- The Custom compiler collects imported sources recursively before sending a single Standard JSON input to Solidity. It resolves `@openzeppelin/` against a virtual `node_modules/`, using local assets, without requesting sources from a CDN. Standard JSON settings and custom remappings are preserved, except for the workspace's required Paris target, enabled optimizer, and deployable artifact output selection.
- OpenZeppelin Contracts and Contracts Upgradeable 5.0.2 remain the default. The Custom compiler also bundles legacy 4.9.6 sources for imports such as `security/ReentrancyGuard.sol` and `utils/math/SafeMath.sol`. Compatible unversioned legacy projects use the 4.9.6 tree. Use `@openzeppelin/contracts@4.9.6/...` or `@openzeppelin/contracts@5.0.2/...` to choose an exact release explicitly. A legacy `SafeMath.sol` can also be used alongside a modern guard. A pinned 5.0.2 import never substitutes a missing file from 4.9.6.
- Set the **OpenZeppelin release** selector to 4.9.6 or 5.0.2 to use that release for unversioned imports without automatic fallback. Explicitly versioned imports, uploaded sources, and custom remappings retain precedence. OpenZeppelin 4 `Ownable` takes no constructor argument; OpenZeppelin 5 `Ownable` takes an initial owner address. The workspace reports the mismatch without rewriting the source.
- **Use ownership example** loads an import-free, direct-deployment contract into the editor for either compiler. Its deployer is the fixed owner. **Restore previous draft** restores the source, uploaded files, and affected form settings. The draft is held in the current workspace, not saved across reloads.
- For other releases, cross-chain sources not included in the legacy bundle, or other libraries, upload the required `.sol` files or use Standard JSON with embedded sources and remappings. If an upload overrides a bundled package with different source, supply that package's full dependency tree rather than mixing releases. For a Standard JSON project containing multiple deployable contracts, enter `path:ContractName`.
- A Custom compile has a 90-second overall timeout covering dependency preparation, compiler startup, and code generation. It resolves only the imported dependency graph and does not generate deployment bytecode for bundled dependencies. The Contract Assistant keeps its existing compiler and timeout.
- Quick templates compile in the browser without a hosted request. This includes simple number and text storage descriptions in Persian and other supported template languages. Requests with additional requirements use hosted drafting, which receives the original text through the Workers AI binding. [Cloudflare's usage allowance and billing](https://developers.cloudflare.com/workers-ai/platform/pricing/) apply at the account level; rate limits are not a global spending cap.
- Hosted drafting receives the description and, for compiler repair, the draft and compiler error. Do not include credentials or private source. Review the source before deploying.
- Existing ready-contract artifacts are retained. New transparent proxy deployments use the 0.8.28 proxy and ProxyAdmin artifacts; legacy artifacts remain available for existing contracts.
- Implementation and proxy transactions are estimated separately. A proxy needs two approvals. Use the wallet's quoted amount before signing and the receipt fee after confirmation.
- Verify compares runtime bytecode on Zenith with the compilation output without submitting a transaction. It does not publish or verify source on the [Zenith explorer](https://docs.zenith.network/zenith-testnet).

## Smoke check

Open `/#/deploy`. In Contract Assistant, select a compiler and build the Number storage example. On the Worker deployment, try a custom request. Switch to Custom compiler, select the same version, and paste the Solidity. Repeat for the other compiler. No wallet or private key is needed for compilation.

The `dist/compiler/openzeppelin-4.9.6.json` asset is prebuilt from the pinned npm releases. To regenerate it for maintenance, run `node tools/vendor-openzeppelin.mjs /path/to/node_modules/@openzeppelin` with both official 4.9.6 packages installed there. This is not a Cloudflare build or deployment step. OpenZeppelin's [license](https://github.com/OpenZeppelin/openzeppelin-contracts/blob/v4.9.6/LICENSE) and the applicable third-party notices are included with the bundle.
