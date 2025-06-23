import configManager from "../config/configManager";
import Providers from "@/providers";
import "./globals.css";

const config = configManager.getConfigFromLocalStorage();

export const metadata = {
  title: config.appTitle,
  icons: {
    icon: configManager.getLogoUrl(config.logoUrl),
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
