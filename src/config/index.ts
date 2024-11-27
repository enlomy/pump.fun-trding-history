import dotenv from 'dotenv'
import { Connection, PublicKey } from '@solana/web3.js'
dotenv.config()

export const geyserURL = process.env.GEYSER_URL!
export const programId = new PublicKey("6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P");
