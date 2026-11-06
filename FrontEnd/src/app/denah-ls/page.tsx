import dynamic from 'next/dynamic';
import { DenahGedungSkeleton } from '@/components/Skeletons';

const MainGedungLS = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLS/MainGedungLS'),
  {
    loading: () => <DenahGedungSkeleton />,
  }
);

export default function DenahLSPage() {
  return <MainGedungLS />;
}
