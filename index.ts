import WebSocket from 'ws';
import { geyserURL, programId } from './src/config'
import { TransactionType } from './src/type'
import { createDoc } from './src/prisma'

const ws = new WebSocket(geyserURL);

const sendRequest = (ws: WebSocket) => {
    const request = {
        jsonrpc: '2.0',
        id: 420,
        method: 'transactionSubscribe',
        params: [
            {
                failed: false,
                vote: false,
                accountInclude: [programId.toBase58()],
            },
            {
                commitment: 'confirmed',
                encoding: 'jsonParsed',
                transactionDetails: 'full',
                maxSupportedTransactionVersion: 0,
            },
        ],
    };
    ws.send(JSON.stringify(request));
}

const startPing = (ws: WebSocket) => {
    setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
            console.log('Ping sent');
        }
    }, 30000); // Ping every 30 seconds
}

ws.on('open', function open() {
    console.log('WebSocket is open');
    sendRequest(ws);
    startPing(ws)
});

ws.on('message', async function incoming(data) {
    const messageStr = data.toString('utf8');
    try {
        const messageObj = JSON.parse(messageStr);
        const result = messageObj.params.result;
        const logs = result.transaction.meta.logMessages;
        if (logs && logs.some((log: any) => log.includes('Program log: Instruction: Transfer'))) {
            const signatures = result.transaction.transaction.signatures;
            const innerInstructions = result.transaction.meta.innerInstructions;
            const accountKeys = result.transaction.transaction.message.accountKeys;
            const signer = accountKeys.filter((item: any) => item.signer).map((item: any) => item.pubkey)
            const instructions = result.transaction.transaction.message.instructions;
            const postBalances = result.transaction.meta.postBalances;
            const postTokenBalances = result.transaction.meta.postTokenBalances;
            const preBalances = result.transaction.meta.preBalances;
            const preTokenBalances = result.transaction.meta.preTokenBalances;

            let decimal = 0, preSolBalance = 0, postSolBalance = 0, preTokenbalance = 0, postTokenbalance = 0
            let owner = '', mint = ''

            preTokenBalances.map((item: any) => {
                if (signer.includes(item.owner)) {
                    preTokenbalance = item.uiTokenAmount.uiAmount
                    decimal = item.uiTokenAmount.decimals
                    mint = item.mint
                    owner = item.owner
                }
            })

            postTokenBalances.map((item: any) => {
                if (signer.includes(item.owner)) {
                    postTokenbalance = item.uiTokenAmount.uiAmount
                    decimal = item.uiTokenAmount.decimals
                    mint = item.mint
                    owner = item.owner
                }
            })

            if (owner && preTokenbalance && postTokenbalance) {
                const idx = accountKeys.map((item: any) => item.pubkey).indexOf(owner)
                preSolBalance = preBalances[idx]
                postSolBalance = postBalances[idx]
            }

            if (preSolBalance && postSolBalance) {
                const tokenAmountChange = (postTokenbalance - preTokenbalance)
                const solAmountChange = (postSolBalance - preSolBalance) / Math.pow(10, 9)

                let type: TransactionType

                if (tokenAmountChange != 0 && solAmountChange != 0) {
                    if (tokenAmountChange > 0) type = 'Buy'
                    else type = 'Sell'
                    createDoc(owner, mint, tokenAmountChange, solAmountChange, type, signatures[0])
                }
            }
        }
    } catch (err) {
        console.error('Websocket message error:', err)
     }
});

ws.on('error', function error(err) {
    console.error('WebSocket error:', err);
});

ws.on('close', function close() {
    console.log('WebSocket is closed');
});
