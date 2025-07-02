import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Dawid Faith Wallet",
  description: "Dawid Faith Wallet - D.FAITH & D.INVEST Token Management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <ThirdwebProvider>{children}</ThirdwebProvider>
        </Providers>
      </body>
    </html>
  );
}
