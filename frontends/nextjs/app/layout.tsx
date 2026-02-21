import type { Metadata } from "next";
import "./globals.css";
import { UsernameProvider } from "@/lib/context/UsernameContext";
import { Header } from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "MLAD Forum",
  description: "Multi-lang app demo frontend",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <UsernameProvider>
          <Header />
          <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        </UsernameProvider>
      </body>
    </html>
  );
}
