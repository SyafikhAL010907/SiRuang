import dynamic from 'next/dynamic';
import { DenahGedungSkeleton } from '@/components/Skeletons';

const MainGedungLE = dynamic(
  () => import('@/components/DenahVisual/DenahGedungLE/MainGedungLE'),
  {
    loading: () => <DenahGedungSkeleton />,
  }
);

export default function DenahLEPage() {
  return <MainGedungLE />;
}
