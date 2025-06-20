import { getConfigSync, getLogoUrl } from "../config/configUtils";
import Providers from "@/providers";
import "./globals.css";

const config = getConfigSync();

export const metadata = {
  title: config.appTitle,
  description: "OC Achievement Management System",
  icons: {
    icon: getLogoUrl(config.logoUrl),
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
