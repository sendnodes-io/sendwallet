<img src="./docs/img/sendwallet-doc.jpg"/>

# SendWallet - https://sendwallet.net

Welcome to the official repo of SendWallet.

Get the ease of accessing your $POKT with our secure SendWallet browser extension.

The SendWallet is your gateway to the Pocket Network and broader ecosystem. Full EVM support soon.

## Looking to integrate SendWallet into your site?

SendWallet can turn your site into a Dapp on Pocket Network. You will be able to prepare and request transactions for your users to approve. Start here with [our integration guide](/docs/integration.md)!

## 🙋‍♀️ First time here?

Start with our amazing docs, https://docs.sendwallet.net/.

More questions, please find us on:

- [Twitter](https://twitter.com/SendWallet)
- [Discord](https://discord.gg/Gh76tPkjTn)
- [Telegram](https://t.me/send_wallet)

## 👩🏻‍💻 Contributing

SendNodes, Inc. is looking for amazing contributors to make SendWallet the best browser extension wallet. Feel free to fork the repo and start shipping code! For the latest news on our roadmap and milestones, please join our Discord server.

## 👷‍♀️ Building

You'll need a few tools to get started.

> ⚠️ SendWallet is built using x86_64 CPUs. Arm64 is not currently supported.

- NodeJS v16
- Yarn
- Python 3

From the root of the project run the following commands:

```sh
yarn install
yarn build:webext --  --config-name chrome # or firefox
```

Or just fancy building it without installing a bunch of extra stuff and you have Docker installed. (Or, you are the Firefox Extension Review Team 🦊.) Just run from the root of the project.

```sh
docker run --platform=linux/x86_64 -it --rm -v $(pwd):/app node:16 bash -c "cd app && yarn install && yarn build:webext"
```

Once that finishes, please find the built files in the `./apps/webext/dist` directory. Then, visit <a href="chrome://extensions">chrome://extensions</a> load the `./apps/webext/dist/chrome` directory as an unpacked extension.

### Prepare safari build (highly experimental)

```sh
xcrun safari-web-extension-converter --project-location ./ios \
  --app-name SendWallet  \
  --bundle-identifier com.sendnodes.sendwallet \
  --force \
  ./dist/safari
```
