"use client";

import Navbar from "../components/Navbar";
import MyTokenInfo from "../components/MyTokenInfo";

export default function Home() {
  return (
    <main className="p-4 min-h-[100vh] flex flex-col items-center container max-w-screen-lg mx-auto">
      <Navbar />
      <MyTokenInfo />
    </main>
  );
}
