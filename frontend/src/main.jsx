import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ConfigProvider } from "antd";
import App from "./App.jsx";
import { Web3Provider } from "./context/Web3Context.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <ConfigProvider
        theme={{
          token: {
            colorPrimary: "#3f5e50",
            colorLink: "#3f5e50",
            colorTextHeading: "#1a1a1a",
            colorText: "#2a2a28",
            colorBgContainer: "#fcfbf7",
            colorBorder: "#e0d9c8",
            colorBorderSecondary: "#e6e0d2",
            borderRadius: 4,
            borderRadiusLG: 6,
            controlHeight: 40,
            fontSize: 15,
            fontFamily:
              "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, 'Noto Sans SC', sans-serif"
          },
          components: {
            Layout: { headerBg: "transparent", headerPadding: 0 },
            Card: { borderRadiusLG: 6 },
            Button: { fontWeight: 600, primaryShadow: "none" }
          }
        }}
      >
        <Web3Provider>
          <App />
        </Web3Provider>
      </ConfigProvider>
    </BrowserRouter>
  </React.StrictMode>
);
