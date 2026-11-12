// app/debug/page.tsx
import { cookies } from 'next/headers';

export default async function DebugPage() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  
  return (
    <div>
      <h1>Debug Cookies</h1>
      <pre>{JSON.stringify(allCookies, null, 2)}</pre>
    </div>
  );
}