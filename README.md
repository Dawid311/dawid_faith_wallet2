
# Dawid Faith Wallet - Thirdweb Next.js Starter

Ein fortgeschrittenes Wallet mit echten DEX-Swaps für D.FAITH und D.INVEST Token auf Polygon.

## Features

- ✅ **Thirdweb Integration**: Vollständige Wallet-Konnektivität mit multiple Auth-Optionen
- ✅ **Echte Token-Balances**: Live-Abruf von D.FAITH und D.INVEST Balances
- ✅ **1inch DEX Integration**: Echte Token-Swaps mit Marktpreisen
- ✅ **Smart Contract Approval**: Automatische Token-Freigaben für Swaps
- ✅ **Transaction History**: Live-Transaktionshistorie über Polygonscan API
- ✅ **Responsive UI**: Moderne, dunkle UI mit Gold-Akzenten

## Neue Swap-Funktionalität

Die Anwendung implementiert jetzt echte Token-Swaps über die 1inch DEX API:

### Funktionsweise:
1. **Preisschätzung**: Echte Marktpreise über 1inch Quote API
2. **Token-Approval**: Smart Contract Freigabe für den 1inch Router
3. **Swap-Ausführung**: Echte DEX-Transaktionen über 1inch
4. **Fallback**: Simulierte Swaps wenn API nicht verfügbar

### Unterstützte Swaps:
- D.FAITH ↔ POL (Polygon)
- Erweiterbar für weitere Token-Paare

## Installation

```bash
npx thirdweb create app --next
```

## Environment Variables

Erstelle eine `.env.local` Datei mit folgenden Variablen:

```bash
# Thirdweb
NEXT_PUBLIC_TEMPLATE_CLIENT_ID=your_thirdweb_client_id

# 1inch API für DEX Swaps
NEXT_PUBLIC_1INCH_API_KEY=your_1inch_api_key_here

# Polygonscan API für Transaction History
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

### API Keys erhalten:

1. **Thirdweb Client ID**: [thirdweb Dashboard](https://thirdweb.com/dashboard)
2. **1inch API Key**: [1inch Developer Portal](https://portal.1inch.io/)
3. **Polygonscan API Key**: [Polygonscan API](https://polygonscan.com/apis)

## Token Contracts (Polygon)

```javascript
D.FAITH Token:  0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff
D.INVEST Token: 0x72a428F03d7a301cEAce084366928b99c4d757bD
Staking Contract: 0xe730555afA4DeA022976DdDc0cC7DBba1C98568A
```

## Installation

Install the template using [thirdweb create](https://portal.thirdweb.com/cli/create)

```bash
  npx thirdweb create app --next
```

## Environment Variables

To run this project, you will need to add the following environment variables to your .env file:

`CLIENT_ID`

To learn how to create a client ID, refer to the [client documentation](https://portal.thirdweb.com/typescript/v5/client). 

## Run locally

Install dependencies

```bash
yarn
```

Start development server

```bash
yarn dev
```

Create a production build

```bash
yarn build
```

Preview the production build

```bash
yarn start
```

## Resources

- [Documentation](https://portal.thirdweb.com/typescript/v5)
- [Templates](https://thirdweb.com/templates)
- [YouTube](https://www.youtube.com/c/thirdweb)
- [Blog](https://blog.thirdweb.com)

## Need help?

For help or feedback, please [visit our support site](https://thirdweb.com/support)
