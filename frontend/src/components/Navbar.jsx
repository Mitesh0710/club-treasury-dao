import { Link, useLocation } from "react-router-dom";

function Navbar({ truncatedAddress, role, isConnected, onConnect, isConnecting }) {
  const location = useLocation();

  const links = [
    { to: "/", label: "Home" },
    { to: "/members", label: "Members" },
    { to: "/proposals", label: "Proposals" },
    { to: "/treasury", label: "Treasury" },
    { to: "/demo", label: "Demo" },
  ];

  return (
    <nav className="navbar">
      <div className="navbar-brand">College Club DAO</div>
      <div className="navbar-links">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={location.pathname === link.to ? "nav-link active" : "nav-link"}
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="navbar-wallet">
        {isConnected ? (
          <div className="wallet-info">
            <span className="wallet-role">{role}</span>
            <span className="wallet-address">{truncatedAddress}</span>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={onConnect} disabled={isConnecting}>
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;