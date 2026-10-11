-- Sandbox keypair support: a KeyPair can now be a live pair (pk_live_/sk_live_)
-- or a sandbox pair (pk_test_/sk_test_). Server-to-server auth with a sandbox
-- pair sets req.sandboxMode = true, letting SDK/backend integrations exercise
-- checkout sessions and orders end-to-end against sandbox.

-- AlterTable
ALTER TABLE "KeyPair" ADD COLUMN "isSandbox" BOOLEAN NOT NULL DEFAULT false;
