declare module '#auth-utils' {
  interface User {
    role?: 'admin'
    label?: string
  }

  interface SecureSessionData {
    adminKeyFingerprint?: string
  }
}

export {}
