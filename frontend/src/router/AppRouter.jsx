import { Route, Routes } from "react-router-dom";
import Crowdfunding from "../pages/Crowdfunding.jsx";
import Shop from "../pages/Shop.jsx";
import Wallet from "../pages/Wallet.jsx";
import Profile from "../pages/Profile.jsx";

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Crowdfunding />} />
      <Route path="/shop" element={<Shop />} />
      <Route path="/wallet" element={<Wallet />} />
      <Route path="/profile" element={<Profile />} />
    </Routes>
  );
}

export default AppRouter;
