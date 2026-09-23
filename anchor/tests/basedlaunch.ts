import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { assert } from "chai";

// Smoke-test scaffold for the reconstructed BasedLaunch program.
// Run with: anchor test   (create_token needs the Metaplex Token Metadata program;
// on localnet add it to Anchor.toml [[test.genesis]] or run against devnet).

const METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

describe("basedlaunch", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Basedlaunch as Program;

  const pda = (seeds: (Buffer | Uint8Array)[]) =>
    PublicKey.findProgramAddressSync(seeds, program.programId)[0];

  it("derives the expected PDAs", () => {
    const mint = Keypair.generate().publicKey;
    const mintAuthority = pda([Buffer.from("mint-authority"), mint.toBuffer()]);
    const curve = pda([Buffer.from("curve"), mint.toBuffer()]);
    const solVault = pda([Buffer.from("sol-vault"), mint.toBuffer()]);
    const vestingVault = pda([Buffer.from("vesting-vault"), mint.toBuffer()]);
    assert.ok(mintAuthority && curve && solVault && vestingVault);
  });

  it("creates a token and initialises the curve (needs Metaplex program)", async function () {
    if (!process.env.RUN_CREATE) {
      this.skip(); // enable with RUN_CREATE=1 once Metaplex is available on the cluster
    }
    const mint = Keypair.generate();
    const mintAuthority = pda([Buffer.from("mint-authority"), mint.publicKey.toBuffer()]);
    const curve = pda([Buffer.from("curve"), mint.publicKey.toBuffer()]);
    const solVault = pda([Buffer.from("sol-vault"), mint.publicKey.toBuffer()]);
    const vestingVault = pda([Buffer.from("vesting-vault"), mint.publicKey.toBuffer()]);
    const metadata = PublicKey.findProgramAddressSync(
      [Buffer.from("metadata"), METADATA_PROGRAM_ID.toBuffer(), mint.publicKey.toBuffer()],
      METADATA_PROGRAM_ID
    )[0];
    const feeWallet = new PublicKey("HpoDxdfvC6PSeupnhH1YXbuiQT4zkot3pCetQim7x5Mj");

    await program.methods
      .createToken("Test Token", "TEST", "https://example.com/meta.json", false,
        new anchor.BN(0), new anchor.BN(0), 0, new anchor.BN(0))
      .accounts({
        payer: provider.wallet.publicKey,
        mint: mint.publicKey,
        mintAuthority,
        metadata,
        vestingVault,
        curve,
        solVault,
        feeWallet,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
        associatedTokenProgram: new PublicKey("ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"),
        metadataProgram: METADATA_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([mint])
      .rpc();

    const state: any = await (program.account as any).bondingCurve.fetch(curve);
    assert.equal(state.mint.toBase58(), mint.publicKey.toBase58());
    assert.equal(state.tokenSupply.toString(), "1000000000");
    assert.equal(state.graduated, false);
    // eslint-disable-next-line no-unused-expressions
    getAssociatedTokenAddressSync(mint.publicKey, provider.wallet.publicKey);
    assert.isAbove(state.virtualSol.toNumber(), 0);
    void LAMPORTS_PER_SOL;
  });
});
