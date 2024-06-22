const fs = require('fs');
const path = require('path');
const readline = require('readline');
const solanaWeb3 = require('@solana/web3.js');
const bip39 = require('bip39');
const { derivePath } = require('ed25519-hd-key');
const { Keypair, Transaction, SystemProgram } = solanaWeb3;

// Fungsi untuk mengambil input dari pengguna
function prompt(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer);
        });
    });
}

async function getSolanaAddressFromMnemonic(mnemonic) {
    // Generate seed buffer from mnemonic
    const seed = await bip39.mnemonicToSeed(mnemonic);
    //console.log('Seed:', seed.toString('hex'));
    
    // Derive the keypair using the correct derivation path
    const path = "m/44'/501'/0'"; // Solana derivation path
    const derivedSeed = derivePath(path, seed.toString('hex')).key;
    //console.log('Derived Seed:', derivedSeed.toString('hex'));
    const keypair = Keypair.fromSeed(derivedSeed);

    // Get the public key (address)
    const publicKey = keypair.publicKey.toBase58();

    return { publicKey, keypair };
}

async function sendSolana(senderKeypair, receiverAddress, amount, index) {
    try {
        const connection = new solanaWeb3.Connection("https://devnet.sonic.game", "confirmed");

        // Check sender's balance
        const senderPublicKey = senderKeypair.publicKey.toBase58();
        const senderBalance = await connection.getBalance(new solanaWeb3.PublicKey(senderPublicKey));

        const lamportsToSend = Math.round(amount * solanaWeb3.LAMPORTS_PER_SOL);

        // Build transaction
        const transaction = new Transaction().add(
            SystemProgram.transfer({
                fromPubkey: senderKeypair.publicKey,
                toPubkey: new solanaWeb3.PublicKey(receiverAddress),
                lamports: lamportsToSend,
            })
        );

        // Sign transaction
        const signature = await solanaWeb3.sendAndConfirmTransaction(
            connection,
            transaction,
            [senderKeypair]
        );

        console.log(`Transaction ${index}: Berhasil !`);
    } catch (error) {
        console.error(`Error sending transaction ${index}:`, error);
    }
}

function readReceiverAddressesFromFile() {
    const filePath = path.join(__dirname, 'penerima.txt');
    const addresses = fs.readFileSync(filePath, 'utf8').split('\n').map(address => address.trim()).filter(Boolean);
    return addresses;
}

(async () => {
    try {
        // Meminta input dari pengguna untuk frase mnemonic
        const mnemonic = await prompt('Masukkan frase mnemonic: ');

        const { publicKey, keypair } = await getSolanaAddressFromMnemonic(mnemonic);
        console.log('Your Solana address:', publicKey);

        const receiverAddresses = readReceiverAddressesFromFile();

        // Loop untuk mengirim transaksi dengan delay 5 detik
        for (let i = 0; i < receiverAddresses.length; i++) {
            const randomAmount = Math.random() * (0.000044 - 0.0000011) + 0.0000011;
            const receiverAddress = receiverAddresses[i];

            // Kirim transaksi dengan delay
            await new Promise(resolve => setTimeout(resolve, 5000)); // 5 seconds delay
            await sendSolana(keypair, receiverAddress, randomAmount, i + 1);
        }
    } catch (error) {
        console.error('Error:', error);
    }
})();
