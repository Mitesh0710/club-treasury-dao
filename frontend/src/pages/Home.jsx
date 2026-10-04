import { useContract } from "../hooks/useContract";

function Home({ wallet }) {
  const {
    account,
    truncatedAddress,
    connectWallet,
    isConnecting,
    isMetaMaskInstalled,
    isCorrectNetwork,
    error,
  } = wallet;

  const { role, treasuryBalance } = useContract(wallet.signer, wallet.provider, wallet.account);

  if (!isMetaMaskInstalled) {
    return (
      <div className="page home-page">
        <div className="card">
          <h2>MetaMask Not Found</h2>
          <p>Please install MetaMask to use the College Club DAO.</p>
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Install MetaMask
          </a>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <div className="page home-page">
        <div className="card">
          <h2>Welcome to the College Club DAO</h2>
          <p>Connect your wallet to view your role, the treasury balance, and vote on proposals.</p>
          <button className="btn btn-primary" onClick={connectWallet} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
          {error && <p className="error-text">{error}</p>}
        </div>
      </div>
    );
  }

  if (!isCorrectNetwork) {
    return (
      <div className="page home-page">
        <div className="card">
          <h2>Wrong Network</h2>
          <p>Please switch to the Sepolia or Hardhat network in MetaMask.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page home-page">
      <div className="card">
        <h2>Welcome back</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">Wallet Address</span>
            <span className="info-value">{truncatedAddress}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Role</span>
            <span className="info-value">{role}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Treasury Balance</span>
            <span className="info-value">
              {treasuryBalance !== null ? `${treasuryBalance} ETH` : "Loading..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;