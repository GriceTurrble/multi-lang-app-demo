import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/context/AuthProvider";
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
        <AuthProvider>
          <Header />
          <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
