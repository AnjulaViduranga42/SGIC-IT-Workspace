import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/auth';

export default async function IndexPage() {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  const payload = session ? await decrypt(session) : null;

  if (payload) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
