import ThemeRegistry from '@shared/theme/ThemeRegistry';

export const metadata = {
  title: 'सर्वेक्षण ऐप',
  description: 'सर्वेक्षण ऐप — घर सर्वेक्षण प्रबंधन',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#e8590c',
};

export default function RootLayout({ children }) {
  return (
    <html lang="hi">
      <body style={{ margin: 0 }}>
        <ThemeRegistry>{children}</ThemeRegistry>
      </body>
    </html>
  );
}
