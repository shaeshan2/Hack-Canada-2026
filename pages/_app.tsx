import type { AppProps } from "next/app";
import { UserProvider } from "@auth0/nextjs-auth0/client";
import { SocketProvider } from "../contexts/SocketContext";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <UserProvider>
      <SocketProvider>
        <Component {...pageProps} />
      </SocketProvider>
    </UserProvider>
  );
}
