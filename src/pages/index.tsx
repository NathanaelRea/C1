import Head from "next/head";
import C1 from "~/components";

export default function Home() {
  return (
    <>
      <Head>
        <title>Crypto tracking</title>
        <meta name="description" content="Crypto tracking" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <main className="flex min-h-screen flex-col items-center justify-center bg-black">
        <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16 ">
          <h1 className="text-xl font-extrabold tracking-tight text-white sm:text-[5rem]">
            C <span className="text-fuchsia-500">1</span>
          </h1>
          <C1 />
        </div>
      </main>
    </>
  );
}
