import Head from "next/head";
import "../styles/globals.css";

export default function App({ Component, pageProps }) {
  return (
    <>
      <Head>
        <title>IntelliDocs AI</title>
        <meta name="description" content="Chat with your documents using AI" />
      </Head>
      <Component {...pageProps} />
    </>
  );
}
