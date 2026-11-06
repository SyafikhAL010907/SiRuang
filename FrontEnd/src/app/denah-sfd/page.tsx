import dynamic from 'next/dynamic';
import { DenahGedungSkeleton } from '@/components/Skeletons';

const MainGedungSFD = dynamic(
  () => import('@/components/DenahVisual/DenahGedungSFD/MainGedungSFD'),
  {
    loading: () => <DenahGedungSkeleton />,
  }
);

export default function DenahSFDPage() {
  return <MainGedungSFD />;
}
