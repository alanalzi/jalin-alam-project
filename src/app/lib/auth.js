import GoogleProvider from "next-auth/providers/google";
import createConnection from './db';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
  callbacks: {
    async signIn({ user, account, profile }) {
      if (!user.email) return false;

      let connection;
      try {
        connection = await createConnection();

        // 1. Cek apakah user sudah terdaftar di tabel 'users'
        const [userRows] = await connection.execute('SELECT id FROM users WHERE email = ?', [user.email]);

        if (userRows.length > 0) {
          // Update existing user image if it changed
          await connection.execute(
            'UPDATE users SET image_url = ? WHERE email = ?',
            [user.image, user.email]
          );
          return true; // Sudah terdaftar, boleh login
        }

        // 2. Jika belum terdaftar, cek apakah email ada di 'user_whitelist'
        const [whitelistRows] = await connection.execute('SELECT id FROM user_whitelist WHERE email = ?', [user.email]);

        if (whitelistRows.length > 0) {
          // Email diundang, buatkan akun baru
          await connection.execute(
            'INSERT INTO users (name, email, role, image_url) VALUES (?, ?, ?, ?)',
            [user.name, user.email, 'RnD', user.image] // Default role
          );

          await connection.execute('DELETE FROM user_whitelist WHERE email = ?', [user.email]);

          console.log(`New user created from whitelist: ${user.email}`);
          return true;
        }

        console.log(`Unauthorized login attempt blocked: ${user.email}`);
        return false;
      } catch (error) {
        console.error('Error in signIn callback:', error);
        return false;
      } finally {
        if (connection) connection.release();
      }
    },
    async jwt({ token, user }) {
      if (token?.email) {
        let connection;
        try {
          connection = await createConnection();
          const [rows] = await connection.execute('SELECT id, role FROM users WHERE email = ?', [token.email]);
          if (rows.length > 0) {
            token.id = rows[0].id;
            token.role = rows[0].role;
          }
        } catch (error) {
          console.error('Error in jwt callback:', error);
        } finally {
          if (connection) connection.release();
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
  },
};
