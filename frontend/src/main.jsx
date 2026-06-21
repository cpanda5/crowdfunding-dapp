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
            colorPrimary: "#176b5b",
            borderRadius: 6,
            fontFamily:
              "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
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
