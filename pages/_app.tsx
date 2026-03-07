import type { AppProps } from "next/app";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";
import { SocketProvider } from "../contexts/SocketContext";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import "../styles/globals.css";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Auth0Provider>
      <SocketProvider>
        <Component {...pageProps} />
      </SocketProvider>
    </Auth0Provider>
  );
}
