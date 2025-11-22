import './globals.css';
import { UserProvider } from '@/context/UserContext';

export const metadata = {
    title: 'Blindtest Web App',
    description: 'A premium blindtest experience',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <UserProvider>
                    {children}
                </UserProvider>
            </body>
        </html>
    );
}
