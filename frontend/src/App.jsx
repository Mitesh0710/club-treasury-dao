import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useWallet } from "./hooks/useWallet";
import { useContract } from "./hooks/useContract";
import Navbar from "./components/Navbar";
import Home from "./pages/Home";
import Members from "./pages/Members";
import Proposals from "./pages/Proposals";
import Treasury from "./pages/Treasury";
import Demo from "./pages/Demo";

function App() {
  const wallet = useWallet();
  const { role } = useContract(wallet.signer, wallet.provider, wallet.account);

  return (
    <BrowserRouter>
      <Navbar
        truncatedAddress={wallet.truncatedAddress}
        role={role}
        isConnected={!!wallet.account}
        onConnect={wallet.connectWallet}
        isConnecting={wallet.isConnecting}
      />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home wallet={wallet} />} />
          <Route path="/members" element={<Members wallet={wallet} />} />
          <Route path="/proposals" element={<Proposals wallet={wallet} />} />
          <Route path="/treasury" element={<Treasury wallet={wallet} />} />
          <Route path="/demo" element={<Demo wallet={wallet} />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;