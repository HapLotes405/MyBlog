import type { Metadata } from 'next';
import 'highlight.js/styles/github-dark.css';
import './globals.css';
import Providers from '@/context/Providers';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export const metadata: Metadata = {
  title: "HapLotes405's Wiki",
  description: "HapLotes405's Wiki — 技术笔记、博客与游戏",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>
          <Header />
          <main>{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
