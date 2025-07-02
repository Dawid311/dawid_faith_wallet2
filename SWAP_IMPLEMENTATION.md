# Thirdweb Universal Bridge Implementation

## Übersicht

Die Dawid Faith Wallet implementiert jetzt echte Token-Swaps über die 1inch DEX API anstatt simulierter Transaktionen.

## Implementierte Features

### 1. Echte Preisschätzungen
- Integration mit 1inch Quote API
- Live-Marktpreise für D.FAITH → POL Swaps
- Automatische Exchange-Rate Berechnung
- Fallback auf Standard-Rate bei API-Fehlern

### 2. Smart Contract Token-Approvals
- Echte ERC-20 Approval-Transaktionen
- Verwendung des 1inch Router Contracts
- Automatische Allowance-Überprüfung
- Thirdweb Integration für Transaktions-Handling

### 3. DEX-Swap Execution
- Echte 1inch DEX API Integration
- Raw-Transaction Handling über Thirdweb
- Transaktions-Status Verfolgung
- Error-Recovery und Retry-Mechanismus

### 4. Verbessertes Error-Handling
- Detaillierte Fehlermeldungen
- UI-States für verschiedene Szenarien:
  - Input (Eingabe)
  - Approve (Token-Freigabe)
  - Swap (Tausch wird durchgeführt)
  - Success (Erfolgreich)
  - Error (Fehler mit Retry-Option)

## Technische Details

### Contract-Adressen
```javascript
// 1inch Router (Polygon)
0x111111125421cA6dc452d289314280a0f8842A65

// D.FAITH Token
0x67f1439bd51Cfb0A46f739Ec8D5663F41d027bff

// POL/WMATIC Token
0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270
```

### API Endpoints
```javascript
// 1inch Quote API
https://api.1inch.dev/swap/v6.0/137/quote

// 1inch Swap API
https://api.1inch.dev/swap/v6.0/137/swap
```

### Environment Variables
```bash
NEXT_PUBLIC_1INCH_API_KEY=your_api_key_here
NEXT_PUBLIC_TEMPLATE_CLIENT_ID=your_thirdweb_client_id
```

## Workflow

1. **Benutzer gibt Swap-Betrag ein**
   - calculateEstimate() wird aufgerufen
   - 1inch Quote API für echte Preise
   - checkApprovalStatus() prüft Token-Freigaben

2. **Token-Approval (wenn nötig)**
   - handleApproval() bereitet ERC-20 approve() vor
   - Transaktion über Thirdweb sendTransaction
   - UI zeigt "approve" Status

3. **Swap-Execution**
   - executeThirdwebSwap() ruft 1inch Swap API auf
   - Raw-Transaction wird über Thirdweb gesendet
   - UI zeigt "swap" Status
   - Success/Error Handling

4. **Balance Update**
   - fetchBalances() aktualisiert Token-Balances
   - UI kehrt zum Ausgangszustand zurück

## Fallback-Verhalten

- Bei API-Fehlern: Detaillierte Fehlermeldungen
- Bei Netzwerk-Fehlern: Retry-Mechanismus
- Bei Contract-Fehlern: Error-State mit Details

## Sicherheit

- Slippage-Schutz (Standard 1%)
- Minimum-Output Berechnung
- Gas-Schätzungen über 1inch
- Smart Contract Validierung
