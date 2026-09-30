import React from "react";
import ReactDOM from "react-dom/client";
import { AuthProvider, AuthProviderProps } from "react-oidc-context";
import { App } from "./App";
import "./index.css";

const cognitoAuthConfig: AuthProviderProps = {
  authority:
    import.meta.env.VITE_COGNITO_AUTHORITY ||
    "https://cognito-idp.us-east-1.amazonaws.com/us-east-1_T7FaZwE2p",
  client_id:
    import.meta.env.VITE_COGNITO_CLIENT_ID ||
    "3eqs900kmd3koe333lg6jl4pl2",
  redirect_uri: `${window.location.origin}/`,
  response_type: "code",
  scope: "openid email profile",
  onSigninCallback: () => {
    // Strip code and state from URL after successful sign-in
    window.history.replaceState({}, document.title, window.location.pathname);
  },
};

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider {...cognitoAuthConfig}>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
