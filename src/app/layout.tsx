import type { Metadata } from "next";
import ThemeProvider from "@/components/ThemeProvider";
import { ChangesProvider } from "@/lib/ChangesContext";
import { POLinkProvider } from "@/lib/POLinkContext";

export const metadata: Metadata = {
  title: "Reichweitenplanungstool - Handlungsempfehlungen",
  description: "Sortiments- und Planungstool für Reichweitenplanung",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap"
        />
      </head>
      <body style={{ margin: 0 }}>
        <ThemeProvider>
          <ChangesProvider>
            <POLinkProvider>{children}</POLinkProvider>
          </ChangesProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
